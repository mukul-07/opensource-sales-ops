#!/usr/bin/env node
/**
 * followup-cadence.mjs — Sales Cadence Tracker for sales-ops
 *
 * Parses data/prospects.md + data/follow-ups.md, calculates cadence timing
 * for active prospects (Contacted / Engaged / Meeting-Booked), extracts
 * contacts from notes, and flags overdue entries.
 *
 * Run: node followup-cadence.mjs              (JSON to stdout)
 *      node followup-cadence.mjs --summary    (human-readable dashboard)
 *      node followup-cadence.mjs --overdue-only
 *      node followup-cadence.mjs --touch2-days 5
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const TRACKER_FILE = existsSync(join(ROOT, 'data/prospects.md'))
  ? join(ROOT, 'data/prospects.md')
  : existsSync(join(ROOT, 'data/applications.md'))
    ? join(ROOT, 'data/applications.md')
    : join(ROOT, 'applications.md');
const FOLLOWUPS_FILE = join(ROOT, 'data/follow-ups.md');

// --- CLI args ---
const args = process.argv.slice(2);
const summaryMode = args.includes('--summary');
const overdueOnly = args.includes('--overdue-only');
const touch2Idx = args.indexOf('--touch2-days');
const TOUCH_2_DAYS = touch2Idx !== -1 ? parseInt(args[touch2Idx + 1]) || 3 : 3;

// --- Cadence config (SDR outbound sequence) ---
// Defaults match modes/_profile.template.md. User can override per touch.
const CADENCE = {
  touch2_days: TOUCH_2_DAYS,      // Day 3: LinkedIn DM
  touch3_days: 7,                 // Day 7: Email new angle
  touch4_days: 12,                // Day 12: Phone or InMail
  touch5_days: 18,                // Day 18: Email breakup
  max_touches: 5,                 // Stop after breakup
  engaged_reply_window: 1,        // Reply within 24h = urgent
  engaged_followup_days: 3,       // Subsequent nudges to engaged prospects
  meeting_reminder_days: 1,       // Day before meeting: send confirmation
};

// --- Stage normalization ---
const STAGE_ALIASES = {
  'discovered': 'discovered', 'new': 'discovered', 'lead': 'discovered',
  'researched': 'researched', 'evaluated': 'researched',
  'contacted': 'contacted', 'outreached': 'contacted', 'touched': 'contacted', 'sent': 'contacted',
  'engaged': 'engaged', 'responded': 'engaged', 'replied': 'engaged',
  'meeting-booked': 'meeting-booked', 'meeting': 'meeting-booked',
  'qualified': 'qualified',
  'proposal': 'proposal',
  'closed-won': 'closed-won', 'won': 'closed-won',
  'closed-lost': 'closed-lost', 'lost': 'closed-lost',
  'no-fit': 'no-fit', 'skip': 'no-fit',
  'nurture': 'nurture',
};

const ACTIONABLE_STAGES = ['contacted', 'engaged', 'meeting-booked'];

function normalizeStage(raw) {
  const clean = String(raw).replace(/\*\*/g, '').trim().toLowerCase()
    .replace(/\s+\d{4}-\d{2}-\d{2}.*$/, '').trim();
  return STAGE_ALIASES[clean] || clean;
}

// --- Date helpers ---
function today() {
  return new Date(new Date().toISOString().split('T')[0]);
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  const cleaned = String(dateStr).trim();
  const m = cleaned.match(/\d{4}-\d{2}-\d{2}/);
  if (!m) return null;
  return new Date(m[0]);
}

function daysBetween(d1, d2) {
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}

function addDays(date, days) {
  if (!date) return null;
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().split('T')[0];
}

// --- Parse prospects.md (sales-ops 11-col or legacy 9-col) ---
function parseTracker() {
  if (!existsSync(TRACKER_FILE)) return { entries: [], schema: 'sales' };
  const content = readFileSync(TRACKER_FILE, 'utf-8');
  const lines = content.split('\n');

  const header = lines.find(l => l.startsWith('|') && !l.includes('---'));
  const isSales = header && /contact.*stage/i.test(header);

  const entries = [];
  for (const line of lines) {
    if (!line.startsWith('|') || line.includes('---')) continue;
    if (/\|\s*#\s*\|/.test(line)) continue;
    const parts = line.split('|').map(s => s.trim());
    const num = parseInt(parts[1]);
    if (isNaN(num) || num === 0) continue;

    if (isSales && parts.length >= 12) {
      entries.push({
        num, date: parts[2], company: parts[3], contact: parts[4], title: parts[5],
        stage: parts[6], score: parts[7], last_touch: parts[8], next_touch: parts[9],
        report: parts[10], notes: parts[11] || '',
      });
    } else if (parts.length >= 9) {
      entries.push({
        num, date: parts[2], company: parts[3], contact: 'TBD', title: parts[4],
        stage: parts[6], score: parts[5], last_touch: '—', next_touch: '—',
        report: parts[8], notes: parts[9] || '',
      });
    }
  }
  return { entries, schema: isSales ? 'sales' : 'legacy' };
}

// --- Parse follow-ups.md (touch history) ---
function parseFollowups() {
  if (!existsSync(FOLLOWUPS_FILE)) return [];
  const content = readFileSync(FOLLOWUPS_FILE, 'utf-8');
  const entries = [];
  for (const line of content.split('\n')) {
    if (!line.startsWith('|') || line.includes('---')) continue;
    if (/\|\s*#\s*\|/.test(line)) continue;
    const parts = line.split('|').map(s => s.trim());
    const num = parseInt(parts[1]);
    if (isNaN(num) || num === 0) continue;
    // Sales-ops follow-ups.md format:
    // | # | Prospect# | Date | Company | Contact | Touch# | Channel | Variant | Notes |
    entries.push({
      num,
      prospectNum: parseInt(parts[2]),
      date: parts[3],
      company: parts[4],
      contact: parts[5],
      touchNum: parseInt(parts[6]) || 1,
      channel: parts[7],
      variant: parts[8],
      notes: parts[9] || '',
    });
  }
  return entries;
}

// --- Parse last_touch field from tracker ---
// Format in prospects.md: "2026-04-18 email-A" or "—" or YYYY-MM-DD alone
function parseLastTouch(lastTouchField) {
  if (!lastTouchField || lastTouchField === '—' || lastTouchField === '-') return null;
  const m = lastTouchField.match(/(\d{4}-\d{2}-\d{2})/);
  if (!m) return null;
  return m[1];
}

// --- Extract contacts (emails/LinkedIn) from notes ---
function extractContacts(notes) {
  if (!notes) return [];
  const contacts = [];
  const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
  const linkedinRegex = /linkedin\.com\/in\/[\w-]+/gi;
  const emails = notes.match(emailRegex) || [];
  const linkedins = notes.match(linkedinRegex) || [];
  for (const email of emails) contacts.push({ type: 'email', value: email });
  for (const li of linkedins) contacts.push({ type: 'linkedin', value: li });
  return contacts;
}

function resolveReportPath(reportField) {
  if (!reportField) return null;
  const match = String(reportField).match(/\]\(([^)]+)\)/);
  if (!match) return null;
  const fullPath = join(ROOT, match[1]);
  return existsSync(fullPath) ? match[1] : null;
}

// --- Compute which touch # is next given history ---
function computeNextTouchNumber(touchCount, stage) {
  if (stage === 'engaged') return 'reply'; // different drafter branch
  if (stage === 'meeting-booked') return 'meeting-prep';
  return Math.min(touchCount + 1, CADENCE.max_touches + 1);
}

// --- Compute urgency ---
function computeUrgency(stage, daysSinceContact, daysSinceLastTouch, touchCount) {
  if (stage === 'engaged') {
    if (daysSinceLastTouch !== null && daysSinceLastTouch >= CADENCE.engaged_reply_window) return 'urgent';
    return 'waiting';
  }
  if (stage === 'meeting-booked') {
    // Assumes last_touch is the meeting booking date; real meeting date isn't tracked in this schema
    return 'waiting';
  }
  if (stage === 'contacted') {
    if (touchCount >= CADENCE.max_touches) return 'cold';
    const cadenceDays = [CADENCE.touch2_days, CADENCE.touch3_days, CADENCE.touch4_days, CADENCE.touch5_days];
    const nextDue = cadenceDays[touchCount - 1] || cadenceDays[cadenceDays.length - 1];
    if (daysSinceLastTouch !== null && daysSinceLastTouch >= nextDue) return 'overdue';
    if (daysSinceLastTouch === null && daysSinceContact >= CADENCE.touch2_days) return 'overdue';
    return 'waiting';
  }
  return 'waiting';
}

// --- Compute next touch date ---
function computeNextTouchDate(stage, contactDate, lastTouchDate, touchCount) {
  if (stage === 'engaged') {
    const base = lastTouchDate ? parseDate(lastTouchDate) : parseDate(contactDate);
    return addDays(base, CADENCE.engaged_followup_days);
  }
  if (stage === 'meeting-booked') return null;
  if (stage === 'contacted') {
    if (touchCount >= CADENCE.max_touches) return null;
    const cadenceDays = [CADENCE.touch2_days, CADENCE.touch3_days, CADENCE.touch4_days, CADENCE.touch5_days];
    const nextDue = cadenceDays[touchCount - 1] || cadenceDays[cadenceDays.length - 1];
    const base = lastTouchDate ? parseDate(lastTouchDate) : parseDate(contactDate);
    return addDays(base, nextDue);
  }
  return null;
}

// --- Main analysis ---
function analyze() {
  const { entries: prospects, schema } = parseTracker();
  if (prospects.length === 0) {
    return { error: 'No prospects found in tracker.' };
  }

  const followups = parseFollowups();

  const touchesByProspect = new Map();
  for (const fu of followups) {
    if (!touchesByProspect.has(fu.prospectNum)) touchesByProspect.set(fu.prospectNum, []);
    touchesByProspect.get(fu.prospectNum).push(fu);
  }

  const now = today();
  const entries = [];

  for (const p of prospects) {
    const stage = normalizeStage(p.stage);
    if (!ACTIONABLE_STAGES.includes(stage)) continue;

    // Use last_touch column from tracker if follow-ups file is missing/incomplete
    const lastTouchFromTracker = parseLastTouch(p.last_touch);
    const touches = touchesByProspect.get(p.num) || [];
    const touchCount = touches.length > 0 ? touches.length : (lastTouchFromTracker ? 1 : 0);

    // Baseline: when did the prospect first become Contacted?
    // Best we can do with current schema: tracker row date.
    const contactDate = p.date;
    const baseDate = parseDate(contactDate);
    if (!baseDate) continue;

    const daysSinceContact = daysBetween(baseDate, now);

    let lastTouchDate = null;
    let daysSinceLastTouch = null;
    if (touches.length > 0) {
      const sorted = [...touches].sort((a, b) => (a.date > b.date ? -1 : 1));
      lastTouchDate = sorted[0].date;
    } else if (lastTouchFromTracker) {
      lastTouchDate = lastTouchFromTracker;
    }
    if (lastTouchDate) {
      const d = parseDate(lastTouchDate);
      if (d) daysSinceLastTouch = daysBetween(d, now);
    }

    const urgency = computeUrgency(stage, daysSinceContact, daysSinceLastTouch, touchCount);
    const nextTouchDate = computeNextTouchDate(stage, contactDate, lastTouchDate, touchCount);
    const nextDate = nextTouchDate ? parseDate(nextTouchDate) : null;
    const daysUntilNext = nextDate ? daysBetween(now, nextDate) : null;
    const nextTouchNum = computeNextTouchNumber(touchCount, stage);

    const contacts = extractContacts(p.notes);
    const reportPath = resolveReportPath(p.report);

    entries.push({
      num: p.num,
      date: p.date,
      company: p.company,
      contact: p.contact,
      title: p.title,
      stage,
      score: p.score,
      notes: p.notes,
      reportPath,
      contacts,
      daysSinceContact,
      daysSinceLastTouch,
      touchCount,
      nextTouchNum,
      urgency,
      nextTouchDate,
      daysUntilNext,
    });
  }

  // Sort: urgent > overdue > waiting > cold
  const urgencyOrder = { urgent: 0, overdue: 1, waiting: 2, cold: 3 };
  entries.sort((a, b) => (urgencyOrder[a.urgency] ?? 9) - (urgencyOrder[b.urgency] ?? 9));

  const filtered = overdueOnly
    ? entries.filter(e => e.urgency === 'overdue' || e.urgency === 'urgent')
    : entries;

  return {
    metadata: {
      analysisDate: now.toISOString().split('T')[0],
      schema,
      totalTracked: prospects.length,
      actionable: entries.length,
      urgent: entries.filter(e => e.urgency === 'urgent').length,
      overdue: entries.filter(e => e.urgency === 'overdue').length,
      waiting: entries.filter(e => e.urgency === 'waiting').length,
      cold: entries.filter(e => e.urgency === 'cold').length,
    },
    entries: filtered,
    cadenceConfig: CADENCE,
  };
}

// --- Summary mode ---
function printSummary(result) {
  if (result.error) {
    console.log(`\n${result.error}\n`);
    return;
  }

  const { metadata, entries } = result;

  console.log(`\n${'='.repeat(80)}`);
  console.log(`  Sales Cadence Dashboard - ${metadata.analysisDate}`);
  console.log(`  ${metadata.totalTracked} prospects tracked, ${metadata.actionable} actionable`);
  console.log(`${'='.repeat(80)}\n`);

  if (entries.length === 0) {
    console.log('  No active prospects in outreach. Run /sales-ops outreach on qualified prospects to start.\n');
    return;
  }

  console.log(`  ${metadata.urgent} urgent | ${metadata.overdue} overdue | ${metadata.waiting} waiting | ${metadata.cold} cold\n`);

  console.log('  ' + '#'.padEnd(5) + 'Company'.padEnd(18) + 'Contact'.padEnd(20) + 'Stage'.padEnd(14) + 'Touch'.padEnd(6) + 'Days'.padEnd(6) + 'Next'.padEnd(13) + 'Urgency');
  console.log('  ' + '-'.repeat(90));

  for (const e of entries) {
    const nextStr = e.nextTouchDate || '-';
    console.log(
      '  ' +
      String(e.num).padEnd(5) +
      String(e.company).substring(0, 17).padEnd(18) +
      String(e.contact || 'TBD').substring(0, 19).padEnd(20) +
      e.stage.padEnd(14) +
      String(e.touchCount).padEnd(6) +
      String(e.daysSinceContact).padEnd(6) +
      nextStr.padEnd(13) +
      e.urgency.toUpperCase()
    );
  }

  console.log('');
}

// --- Run ---
const result = analyze();

if (summaryMode) {
  printSummary(result);
} else {
  console.log(JSON.stringify(result, null, 2));
}

if (result.error) process.exit(1);
