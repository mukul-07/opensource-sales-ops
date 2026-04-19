#!/usr/bin/env node
/**
 * merge-tracker.mjs — Merge batch tracker additions into the tracker.
 *
 * Supports two schemas, auto-detected from the tracker header:
 *
 *   Sales-ops (11 columns, current):
 *     | # | Date | Company | Contact | Title | Stage | Score | Last Touch | Next Touch | Report | Notes |
 *
 *   Career-ops legacy (8 columns + optional notes):
 *     | # | Date | Company | Role | Score | Status | PDF | Report | Notes |
 *
 * TSV additions in batch/tracker-additions/ must match the tracker schema.
 *
 * Dedup: company normalized + contact/role fuzzy match + report number match.
 * If duplicate with higher score → update in-place.
 * Validates stage/status against the canonical list (warns + defaults on miss).
 *
 * Run: node merge-tracker.mjs [--dry-run] [--verify]
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync, renameSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const ROOT = dirname(fileURLToPath(import.meta.url));

const TRACKER_FILE = existsSync(join(ROOT, 'data/prospects.md'))
  ? join(ROOT, 'data/prospects.md')
  : existsSync(join(ROOT, 'data/applications.md'))
    ? join(ROOT, 'data/applications.md')
    : join(ROOT, 'applications.md');

const ADDITIONS_DIR = join(ROOT, 'batch/tracker-additions');
const MERGED_DIR = join(ADDITIONS_DIR, 'merged');
const DRY_RUN = process.argv.includes('--dry-run');
const VERIFY = process.argv.includes('--verify');

mkdirSync(join(ROOT, 'data'), { recursive: true });
mkdirSync(ADDITIONS_DIR, { recursive: true });

// ── Canonical stages / statuses ──────────────────────────────────────

// Sales-ops stages (from templates/states.yml).
const SALES_STAGES = [
  'Discovered', 'Researched', 'Contacted', 'Engaged', 'Meeting-Booked',
  'Qualified', 'Proposal', 'Closed-Won', 'Closed-Lost', 'No-Fit', 'Nurture',
];

// Career-ops legacy statuses.
const LEGACY_STATUSES = [
  'Evaluated', 'Applied', 'Responded', 'Interview', 'Offer',
  'Rejected', 'Discarded', 'SKIP',
];

// Aliases → canonical. Includes Spanish legacy + sales-ops synonyms.
const ALIASES = {
  // Sales-ops synonyms
  'new': 'Discovered', 'lead': 'Discovered',
  'researched': 'Researched', 'qualified-pending': 'Researched', 'evaluated': 'Researched',
  'contacted': 'Contacted', 'outreached': 'Contacted', 'touched': 'Contacted',
  'engaged': 'Engaged', 'responded': 'Engaged', 'replied': 'Engaged',
  'meeting-booked': 'Meeting-Booked', 'meeting': 'Meeting-Booked', 'demo-booked': 'Meeting-Booked', 'call-booked': 'Meeting-Booked',
  'qualified': 'Qualified', 'sql': 'Qualified', 'mql-converted': 'Qualified',
  'proposal': 'Proposal', 'negotiation': 'Proposal', 'pricing-sent': 'Proposal',
  'closed-won': 'Closed-Won', 'won': 'Closed-Won', 'signed': 'Closed-Won',
  'closed-lost': 'Closed-Lost', 'lost': 'Closed-Lost',
  'no-fit': 'No-Fit', 'disqualified': 'No-Fit', 'skip': 'No-Fit', 'dq': 'No-Fit',
  'nurture': 'Nurture', 'later': 'Nurture', 'follow-up-q': 'Nurture',
  // Career-ops Spanish legacy
  'evaluada': 'Evaluated', 'condicional': 'Evaluated', 'hold': 'Evaluated',
  'aplicado': 'Applied', 'enviada': 'Applied', 'aplicada': 'Applied', 'sent': 'Applied',
  'respondido': 'Responded',
  'entrevista': 'Interview',
  'oferta': 'Offer',
  'rechazado': 'Rejected', 'rechazada': 'Rejected',
  'descartado': 'Discarded', 'descartada': 'Discarded', 'cerrada': 'Discarded', 'cancelada': 'Discarded',
  'no aplicar': 'SKIP', 'no_aplicar': 'SKIP', 'monitor': 'SKIP',
};

function validateStage(raw, schema) {
  const canonical = schema === 'sales' ? SALES_STAGES : LEGACY_STATUSES;
  const defaultStage = schema === 'sales' ? 'Researched' : 'Evaluated';

  const clean = String(raw).replace(/\*\*/g, '').replace(/\s+\d{4}-\d{2}-\d{2}.*$/, '').trim();
  const lower = clean.toLowerCase();

  for (const valid of canonical) {
    if (valid.toLowerCase() === lower) return valid;
  }
  if (ALIASES[lower]) {
    const aliased = ALIASES[lower];
    if (canonical.includes(aliased)) return aliased;
    // Alias resolves to a stage from the OTHER schema — default instead.
  }
  if (/^(duplicado|dup|repost)/i.test(lower)) {
    return schema === 'sales' ? 'No-Fit' : 'Discarded';
  }

  console.warn(`⚠️  Non-canonical stage "${raw}" → defaulting to "${defaultStage}"`);
  return defaultStage;
}

function normalizeCompany(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function fuzzyMatch(a, b) {
  const wordsA = String(a).toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const wordsB = String(b).toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const overlap = wordsA.filter(w => wordsB.some(wb => wb.includes(w) || w.includes(wb)));
  return overlap.length >= 2;
}

function extractReportNum(reportStr) {
  if (!reportStr) return null;
  const m = String(reportStr).match(/\[(\d+)\]/);
  return m ? parseInt(m[1]) : null;
}

function parseScore(s) {
  if (!s) return 0;
  const m = String(s).replace(/\*\*/g, '').match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : 0;
}

// ── Schema detection ─────────────────────────────────────────────────

function detectSchema(headerLine) {
  if (!headerLine || !headerLine.startsWith('|')) return 'sales';
  const lower = headerLine.toLowerCase();
  // sales-ops has both Contact and Stage
  if (lower.includes('contact') && lower.includes('stage')) return 'sales';
  // legacy has Role + Status
  if (lower.includes('role') || lower.includes('rol')) return 'legacy';
  return 'sales';
}

// ── Parsing existing rows ────────────────────────────────────────────

function parseExistingRow(line, schema) {
  const parts = line.split('|').map(s => s.trim());
  // parts[0] and parts[last] are empty strings from leading/trailing |
  if (parts.length < 3) return null;

  if (schema === 'sales') {
    // | # | Date | Company | Contact | Title | Stage | Score | Last Touch | Next Touch | Report | Notes |
    if (parts.length < 12) return null;
    const num = parseInt(parts[1]);
    if (isNaN(num) || num === 0) return null;
    return {
      num,
      date: parts[2],
      company: parts[3],
      contact: parts[4],
      title: parts[5],
      stage: parts[6],
      score: parts[7],
      last_touch: parts[8],
      next_touch: parts[9],
      report: parts[10],
      notes: parts[11] || '',
      raw: line,
    };
  }

  // legacy
  if (parts.length < 9) return null;
  const num = parseInt(parts[1]);
  if (isNaN(num) || num === 0) return null;
  return {
    num,
    date: parts[2],
    company: parts[3],
    role: parts[4],
    score: parts[5],
    status: parts[6],
    pdf: parts[7],
    report: parts[8],
    notes: parts[9] || '',
    raw: line,
  };
}

// ── Parsing TSV additions ────────────────────────────────────────────

function parseTsvContent(content, filename, schema) {
  content = content.trim();
  if (!content) return null;

  let parts;

  // Pipe-delimited (markdown row) — best-effort, just route through splitting
  if (content.startsWith('|')) {
    parts = content.split('|').map(s => s.trim()).filter((p, i, arr) => !(i === 0 || i === arr.length - 1));
  } else {
    parts = content.split('\t');
  }

  if (schema === 'sales') {
    // Expected 11 columns: num, date, company, contact, title, stage, score, last_touch, next_touch, report, notes
    if (parts.length < 10) {
      console.warn(`⚠️  Skipping ${filename}: ${parts.length} fields (sales-ops needs 10-11)`);
      return null;
    }
    const addition = {
      schema: 'sales',
      num: parseInt(parts[0]),
      date: parts[1],
      company: parts[2],
      contact: parts[3] || 'TBD',
      title: parts[4] || '',
      stage: validateStage(parts[5], 'sales'),
      score: parts[6],
      last_touch: parts[7] || '—',
      next_touch: parts[8] || '—',
      report: parts[9],
      notes: parts[10] || '',
    };
    if (isNaN(addition.num) || addition.num === 0) {
      console.warn(`⚠️  Skipping ${filename}: invalid entry number`);
      return null;
    }
    return addition;
  }

  // legacy 8-9 col
  if (parts.length < 8) {
    console.warn(`⚠️  Skipping ${filename}: ${parts.length} fields (legacy needs 8-9)`);
    return null;
  }
  // Heuristic for col4/col5 swap (same as original)
  const col4 = parts[4].trim();
  const col5 = parts[5].trim();
  const col4LooksLikeScore = /^\d+\.?\d*\/5$/.test(col4) || col4 === 'N/A' || col4 === 'DUP';
  const col4LooksLikeStatus = /^(evaluated|applied|responded|interview|offer|rejected|discarded|skip)/i.test(col4);
  const col5LooksLikeStatus = /^(evaluated|applied|responded|interview|offer|rejected|discarded|skip)/i.test(col5);

  let statusCol, scoreCol;
  if (col4LooksLikeStatus && !col4LooksLikeScore) { statusCol = col4; scoreCol = col5; }
  else if (col4LooksLikeScore && col5LooksLikeStatus) { statusCol = col5; scoreCol = col4; }
  else { statusCol = col4; scoreCol = col5; }

  const addition = {
    schema: 'legacy',
    num: parseInt(parts[0]),
    date: parts[1],
    company: parts[2],
    role: parts[3],
    status: validateStage(statusCol, 'legacy'),
    score: scoreCol,
    pdf: parts[6] || '❌',
    report: parts[7],
    notes: parts[8] || '',
  };
  if (isNaN(addition.num) || addition.num === 0) return null;
  return addition;
}

// ── Row formatting ───────────────────────────────────────────────────

function formatRow(r, schema) {
  if (schema === 'sales') {
    return `| ${r.num} | ${r.date} | ${r.company} | ${r.contact || 'TBD'} | ${r.title || ''} | ${r.stage} | ${r.score} | ${r.last_touch || '—'} | ${r.next_touch || '—'} | ${r.report} | ${r.notes || ''} |`;
  }
  return `| ${r.num} | ${r.date} | ${r.company} | ${r.role} | ${r.score} | ${r.status} | ${r.pdf || '❌'} | ${r.report} | ${r.notes || ''} |`;
}

// ── Main ─────────────────────────────────────────────────────────────

if (!existsSync(TRACKER_FILE)) {
  console.log(`No tracker file found at ${TRACKER_FILE}. Nothing to merge into.`);
  process.exit(0);
}

const trackerContent = readFileSync(TRACKER_FILE, 'utf-8');
const trackerLines = trackerContent.split('\n');

// Find the header and detect schema
let headerIdx = -1;
for (let i = 0; i < trackerLines.length; i++) {
  if (trackerLines[i].startsWith('|') && !trackerLines[i].includes('---')) {
    headerIdx = i;
    break;
  }
}
const schema = detectSchema(trackerLines[headerIdx]);
console.log(`📐 Schema: ${schema === 'sales' ? 'sales-ops (11-col)' : 'career-ops legacy (9-col)'}`);

// Parse existing rows
const existing = [];
let maxNum = 0;

for (const line of trackerLines) {
  if (!line.startsWith('|') || line.includes('---')) continue;
  if (/\|\s*#\s*\|/.test(line)) continue; // header
  const row = parseExistingRow(line, schema);
  if (row) {
    existing.push(row);
    if (row.num > maxNum) maxNum = row.num;
  }
}

console.log(`📊 Existing: ${existing.length} entries, max #${maxNum}`);

// Read additions
if (!existsSync(ADDITIONS_DIR)) {
  console.log('No tracker-additions directory found.');
  process.exit(0);
}
const tsvFiles = readdirSync(ADDITIONS_DIR).filter(f => f.endsWith('.tsv'));
if (tsvFiles.length === 0) {
  console.log('✅ No pending additions to merge.');
  process.exit(0);
}
tsvFiles.sort((a, b) => (parseInt(a.replace(/\D/g, '')) || 0) - (parseInt(b.replace(/\D/g, '')) || 0));
console.log(`📥 Found ${tsvFiles.length} pending additions`);

let added = 0, updated = 0, skipped = 0;
const newLines = [];

for (const file of tsvFiles) {
  const content = readFileSync(join(ADDITIONS_DIR, file), 'utf-8').trim();
  const addition = parseTsvContent(content, file, schema);
  if (!addition) { skipped++; continue; }

  // Dedup: report number → entry number → company + contact/role fuzzy
  const reportNum = extractReportNum(addition.report);
  let duplicate = null;

  if (reportNum) {
    duplicate = existing.find(r => extractReportNum(r.report) === reportNum);
  }
  if (!duplicate) {
    duplicate = existing.find(r => r.num === addition.num);
  }
  if (!duplicate) {
    const normCo = normalizeCompany(addition.company);
    const addKey = schema === 'sales' ? (addition.contact || '') + ' ' + (addition.title || '') : addition.role;
    duplicate = existing.find(r => {
      if (normalizeCompany(r.company) !== normCo) return false;
      const existingKey = schema === 'sales' ? (r.contact || '') + ' ' + (r.title || '') : r.role;
      return fuzzyMatch(addKey, existingKey);
    });
  }

  if (duplicate) {
    const newScore = parseScore(addition.score);
    const oldScore = parseScore(duplicate.score);
    if (newScore > oldScore) {
      console.log(`🔄 Update: #${duplicate.num} ${addition.company} (${oldScore}→${newScore})`);
      const lineIdx = trackerLines.indexOf(duplicate.raw);
      if (lineIdx >= 0) {
        const merged = { ...duplicate, ...addition, num: duplicate.num, notes: `Re-eval ${addition.date} (${oldScore}→${newScore}). ${addition.notes}` };
        trackerLines[lineIdx] = formatRow(merged, schema);
        updated++;
      }
    } else {
      console.log(`⏭️  Skip: ${addition.company} (existing #${duplicate.num} ${oldScore} >= new ${newScore})`);
      skipped++;
    }
  } else {
    const entryNum = addition.num > maxNum ? addition.num : ++maxNum;
    if (addition.num > maxNum) maxNum = addition.num;
    const row = { ...addition, num: entryNum };
    newLines.push(formatRow(row, schema));
    added++;
    const contactPart = schema === 'sales' ? ` — ${addition.contact || 'TBD'}` : ` — ${addition.role}`;
    console.log(`➕ Add #${entryNum}: ${addition.company}${contactPart} (${addition.score})`);
  }
}

// Insert new lines after the separator row
if (newLines.length > 0) {
  let insertIdx = -1;
  for (let i = 0; i < trackerLines.length; i++) {
    if (trackerLines[i].includes('---') && trackerLines[i].startsWith('|')) {
      insertIdx = i + 1;
      break;
    }
  }
  if (insertIdx >= 0) {
    trackerLines.splice(insertIdx, 0, ...newLines);
  }
}

if (!DRY_RUN) {
  writeFileSync(TRACKER_FILE, trackerLines.join('\n'));
  if (!existsSync(MERGED_DIR)) mkdirSync(MERGED_DIR, { recursive: true });
  for (const file of tsvFiles) {
    renameSync(join(ADDITIONS_DIR, file), join(MERGED_DIR, file));
  }
  console.log(`\n✅ Moved ${tsvFiles.length} TSVs to merged/`);
}

console.log(`\n📊 Summary: +${added} added, 🔄${updated} updated, ⏭️${skipped} skipped`);
if (DRY_RUN) console.log('(dry-run — no changes written)');

if (VERIFY && !DRY_RUN) {
  console.log('\n--- Running verification ---');
  try { execFileSync('node', [join(ROOT, 'verify-pipeline.mjs')], { stdio: 'inherit' }); }
  catch { process.exit(1); }
}
