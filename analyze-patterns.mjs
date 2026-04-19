#!/usr/bin/env node
/**
 * analyze-patterns.mjs — Conversion Pattern Analysis for sales-ops
 *
 * Parses data/prospects.md + all linked reports, extracts dimensions
 * (archetype, industry, funding stage, access score, gaps), classifies
 * outcomes across the sales funnel, and outputs structured JSON.
 *
 * Run: node analyze-patterns.mjs          (JSON to stdout)
 *      node analyze-patterns.mjs --summary (human-readable table)
 *      node analyze-patterns.mjs --min-threshold 3
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
const REPORTS_DIR = join(ROOT, 'reports');

// --- CLI args ---
const args = process.argv.slice(2);
const summaryMode = args.includes('--summary');
const minThresholdIdx = args.indexOf('--min-threshold');
const MIN_THRESHOLD = minThresholdIdx !== -1 && args[minThresholdIdx + 1] !== undefined
  ? (Number.isNaN(parseInt(args[minThresholdIdx + 1])) ? 10 : parseInt(args[minThresholdIdx + 1]))
  : 10;

// --- Stage normalization (sales-ops) ---
const STAGE_ALIASES = {
  // sales-ops canonical
  'discovered': 'discovered', 'new': 'discovered', 'lead': 'discovered',
  'researched': 'researched', 'evaluated': 'researched', 'qualified-pending': 'researched',
  'contacted': 'contacted', 'outreached': 'contacted', 'touched': 'contacted', 'sent': 'contacted',
  'engaged': 'engaged', 'responded': 'engaged', 'replied': 'engaged',
  'meeting-booked': 'meeting-booked', 'meeting': 'meeting-booked', 'demo-booked': 'meeting-booked',
  'qualified': 'qualified', 'sql': 'qualified',
  'proposal': 'proposal', 'negotiation': 'proposal', 'pricing-sent': 'proposal',
  'closed-won': 'closed-won', 'won': 'closed-won', 'signed': 'closed-won',
  'closed-lost': 'closed-lost', 'lost': 'closed-lost',
  'no-fit': 'no-fit', 'disqualified': 'no-fit', 'skip': 'no-fit', 'dq': 'no-fit',
  'nurture': 'nurture', 'later': 'nurture',
};

function normalizeStage(raw) {
  const clean = String(raw).replace(/\*\*/g, '').trim().toLowerCase()
    .replace(/\s+\d{4}-\d{2}-\d{2}.*$/, '').trim();
  return STAGE_ALIASES[clean] || clean;
}

function classifyOutcome(stage) {
  const s = normalizeStage(stage);
  if (['closed-won'].includes(s)) return 'won';
  if (['closed-lost'].includes(s)) return 'lost';
  if (['meeting-booked', 'qualified', 'proposal'].includes(s)) return 'in-pipeline';
  if (['engaged'].includes(s)) return 'engaged';
  if (['contacted'].includes(s)) return 'contacted';
  if (['no-fit'].includes(s)) return 'no-fit';
  if (['nurture'].includes(s)) return 'nurture';
  return 'pending'; // discovered, researched
}

// --- Parse prospects.md ---
function parseTracker() {
  if (!existsSync(TRACKER_FILE)) return { entries: [], schema: 'sales' };
  const content = readFileSync(TRACKER_FILE, 'utf-8');
  const lines = content.split('\n');

  // Detect schema from header
  const header = lines.find(l => l.startsWith('|') && !l.includes('---'));
  const isSales = header && /contact.*stage/i.test(header);

  const entries = [];
  for (const line of lines) {
    if (!line.startsWith('|') || line.includes('---')) continue;
    if (/\|\s*#\s*\|/.test(line)) continue; // header
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
      // Legacy 8-col — treat role as contact/title for back-compat
      entries.push({
        num, date: parts[2], company: parts[3], contact: 'TBD', title: parts[4],
        stage: parts[6], score: parts[5], last_touch: '—', next_touch: '—',
        report: parts[8], notes: parts[9] || '',
      });
    }
  }
  return { entries, schema: isSales ? 'sales' : 'legacy' };
}

// --- Parse a single qualify report ---
function parseReport(reportPath) {
  if (!existsSync(reportPath)) return null;
  const content = readFileSync(reportPath, 'utf-8');
  const report = {
    archetype: null,
    industry: null,
    employees: null,
    fundingStage: null,
    geography: null,
    legitimacy: null,
    estAcv: null,
    blockAScore: null,
    blockBScore: null,
    blockCScore: null,
    blockDScore: null,
    disqualifiers: [],
  };

  const plain = content.replace(/\*\*/g, '');

  // Header metadata
  const archMatch = plain.match(/Archetype:\s*([^\n]+)/i);
  if (archMatch) report.archetype = archMatch[1].trim();

  const legitMatch = plain.match(/Legitimacy:\s*([^\n]+)/i);
  if (legitMatch) report.legitimacy = legitMatch[1].trim();

  const acvMatch = plain.match(/Est ACV:\s*([^\n]+)/i);
  if (acvMatch) report.estAcv = acvMatch[1].trim();

  // Block A table fields
  const industryMatch = plain.match(/\|\s*Industry\s*\|\s*([^|]+)\|/i);
  if (industryMatch) report.industry = industryMatch[1].trim();

  const empMatch = plain.match(/\|\s*Employees\s*\|\s*([^|]+)\|/i);
  if (empMatch) report.employees = empMatch[1].trim();

  const fundingMatch = plain.match(/\|\s*Funding stage\s*\|\s*([^|]+)\|/i);
  if (fundingMatch) report.fundingStage = fundingMatch[1].trim();

  const geoMatch = plain.match(/\|\s*HQ\s*\|\s*([^|]+)\|/i) || plain.match(/\|\s*Geography\s*\|\s*([^|]+)\|/i);
  if (geoMatch) report.geography = geoMatch[1].trim();

  // Block scores (Block B = ICP Fit overall; others vary)
  const icpFitRegex = /ICP Fit score:\s*([\d.]+)\s*\/\s*5/i;
  const buyingSignalRegex = /Block C score:\s*([\d.]+)\s*\/\s*5/i;
  const accessRegex = /Access score:\s*([\d.]+)\s*\/\s*5/i;

  const icpMatch = plain.match(icpFitRegex);
  if (icpMatch) report.blockBScore = parseFloat(icpMatch[1]);

  const bsMatch = plain.match(buyingSignalRegex);
  if (bsMatch) report.blockCScore = parseFloat(bsMatch[1]);

  const accessMatch = plain.match(accessRegex);
  if (accessMatch) report.blockDScore = parseFloat(accessMatch[1]);

  // Disqualifier mentions
  const dqMatch = plain.match(/disqualifier fired:?\s*([^\n]+)/i);
  if (dqMatch) report.disqualifiers.push(dqMatch[1].trim());

  return report;
}

// --- Classify geography into buckets ---
function classifyGeo(raw) {
  if (!raw) return 'unknown';
  const lower = raw.toLowerCase();
  if (/\b(european union|eu|united kingdom|uk|germany|france|spain|italy|netherlands|poland|sweden|ireland)\b/.test(lower)) return 'eu-uk';
  if (/\b(united states|us|usa|canada|mexico)\b/.test(lower)) return 'north-america';
  if (/\b(india|singapore|japan|australia|apac)\b/.test(lower)) return 'apac';
  return 'other';
}

// --- Classify company size into ICP buckets ---
function classifySize(employees) {
  if (!employees) return 'unknown';
  const nums = String(employees).match(/[\d,]+/g);
  if (nums) {
    const max = Math.max(...nums.map(n => parseInt(n.replace(/,/g, ''))));
    if (max <= 10) return 'too-small';
    if (max <= 50) return 'smb';
    if (max <= 200) return 'mid-market-low';
    if (max <= 500) return 'mid-market-high';
    if (max <= 2000) return 'enterprise';
    return 'large-enterprise';
  }
  return 'unknown';
}

// --- Classify funding stage ---
function classifyFunding(raw) {
  if (!raw) return 'unknown';
  const lower = raw.toLowerCase();
  if (/\b(pre-seed|seed)\b/.test(lower)) return 'seed';
  if (/\bseries a\b/.test(lower)) return 'series-a';
  if (/\bseries b\b/.test(lower)) return 'series-b';
  if (/\bseries c\b/.test(lower)) return 'series-c';
  if (/\bseries d\b/.test(lower) || /\bseries e\b/.test(lower) || /\blate-stage\b/.test(lower)) return 'series-d-plus';
  if (/\bpublic\b/.test(lower) || /\bipo\b/.test(lower)) return 'public';
  if (/\bbootstrap/.test(lower)) return 'bootstrapped';
  return 'unknown';
}

// --- Main analysis ---
function analyze() {
  const { entries, schema } = parseTracker();

  if (entries.length === 0) {
    return { error: 'No prospects found in tracker.' };
  }

  // Enrich
  const enriched = entries.map(e => {
    const reportMatch = e.report.match(/\]\(([^)]+)\)/);
    const reportPath = reportMatch ? join(ROOT, reportMatch[1]) : null;
    const reportData = reportPath ? parseReport(reportPath) : null;
    const outcome = classifyOutcome(e.stage);
    const score = parseFloat(String(e.score).replace(/[^\d.]/g, '')) || 0;

    return {
      ...e,
      normalizedStage: normalizeStage(e.stage),
      outcome,
      score,
      report: reportData,
      geoBucket: classifyGeo(reportData?.geography || ''),
      sizeBucket: classifySize(reportData?.employees || ''),
      fundingBucket: classifyFunding(reportData?.fundingStage || ''),
    };
  });

  // Count entries beyond Researched
  const active = enriched.filter(e => !['researched', 'discovered'].includes(e.normalizedStage));
  if (active.length < MIN_THRESHOLD) {
    return {
      error: `Not enough data: ${active.length}/${MIN_THRESHOLD} prospects beyond Researched. Run more outreach and come back later.`,
      current: active.length,
      threshold: MIN_THRESHOLD,
    };
  }

  // --- Funnel ---
  const funnel = {};
  for (const e of enriched) {
    const s = e.normalizedStage;
    funnel[s] = (funnel[s] || 0) + 1;
  }

  // Stage-to-stage conversion rates
  const stageOrder = ['researched', 'contacted', 'engaged', 'meeting-booked', 'qualified', 'proposal', 'closed-won'];
  const stageConversion = [];
  for (let i = 0; i < stageOrder.length - 1; i++) {
    const fromCount = stageOrder.slice(i).reduce((sum, s) => sum + (funnel[s] || 0), 0);
    const toCount = stageOrder.slice(i + 1).reduce((sum, s) => sum + (funnel[s] || 0), 0);
    if (fromCount > 0) {
      stageConversion.push({
        from: stageOrder[i],
        to: stageOrder[i + 1],
        rate: Math.round((toCount / fromCount) * 100),
        fromCount,
        toCount,
      });
    }
  }

  // --- Score by outcome ---
  const scoresByOutcome = { won: [], lost: [], 'in-pipeline': [], engaged: [], contacted: [], 'no-fit': [], nurture: [], pending: [] };
  for (const e of enriched) {
    if (e.score > 0) scoresByOutcome[e.outcome].push(e.score);
  }

  const scoreStats = (arr) => {
    if (arr.length === 0) return { avg: 0, min: 0, max: 0, count: 0 };
    const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
    return {
      avg: Math.round(avg * 100) / 100,
      min: Math.min(...arr),
      max: Math.max(...arr),
      count: arr.length,
    };
  };

  const scoreComparison = Object.fromEntries(
    Object.entries(scoresByOutcome).map(([k, v]) => [k, scoreStats(v)])
  );

  // --- Archetype breakdown ---
  const archetypeMap = new Map();
  for (const e of enriched) {
    const arch = e.report?.archetype || 'Unknown';
    if (!archetypeMap.has(arch)) archetypeMap.set(arch, { total: 0, won: 0, lost: 0, 'in-pipeline': 0, engaged: 0, contacted: 0, 'no-fit': 0, nurture: 0, pending: 0 });
    const row = archetypeMap.get(arch);
    row.total++;
    row[e.outcome]++;
  }
  const archetypeBreakdown = [...archetypeMap.entries()].map(([archetype, data]) => ({
    archetype,
    ...data,
    winRate: data.total > 0 ? Math.round((data.won / data.total) * 100) : 0,
    meetingRate: data.total > 0 ? Math.round(((data['in-pipeline'] + data.won) / data.total) * 100) : 0,
  })).sort((a, b) => b.total - a.total);

  // --- Industry breakdown ---
  const industryMap = new Map();
  for (const e of enriched) {
    const ind = e.report?.industry || 'Unknown';
    if (!industryMap.has(ind)) industryMap.set(ind, { total: 0, won: 0, lost: 0, 'no-fit': 0, pending: 0 });
    const row = industryMap.get(ind);
    row.total++;
    if (['won', 'lost', 'no-fit'].includes(e.outcome)) row[e.outcome]++;
    else row.pending++;
  }
  const industryBreakdown = [...industryMap.entries()].map(([industry, data]) => ({
    industry, ...data,
    winRate: data.total > 0 ? Math.round((data.won / data.total) * 100) : 0,
  })).sort((a, b) => b.total - a.total);

  // --- Size + funding buckets ---
  const bucketBreakdown = (field) => {
    const map = new Map();
    for (const e of enriched) {
      const b = e[field];
      if (!map.has(b)) map.set(b, { total: 0, won: 0, 'no-fit': 0 });
      const row = map.get(b);
      row.total++;
      if (e.outcome === 'won') row.won++;
      if (e.outcome === 'no-fit') row['no-fit']++;
    }
    return [...map.entries()].map(([bucket, data]) => ({
      bucket, ...data,
      winRate: data.total > 0 ? Math.round((data.won / data.total) * 100) : 0,
    })).sort((a, b) => b.total - a.total);
  };

  const sizeBreakdown = bucketBreakdown('sizeBucket');
  const fundingBreakdown = bucketBreakdown('fundingBucket');
  const geoBreakdown = bucketBreakdown('geoBucket');

  // --- Disqualifier hit rate ---
  const dqCounts = new Map();
  for (const e of enriched) {
    if (!e.report?.disqualifiers) continue;
    for (const dq of e.report.disqualifiers) {
      dqCounts.set(dq, (dqCounts.get(dq) || 0) + 1);
    }
  }
  const disqualifierHits = [...dqCounts.entries()]
    .map(([dq, freq]) => ({ disqualifier: dq, frequency: freq, percentage: Math.round((freq / enriched.length) * 100) }))
    .sort((a, b) => b.frequency - a.frequency);

  // --- Score threshold ---
  const wonScores = scoresByOutcome.won;
  const minWonScore = wonScores.length > 0 ? Math.min(...wonScores) : 0;
  const scoreThreshold = {
    recommended: minWonScore > 0 ? Math.floor(minWonScore * 10) / 10 : 4.0,
    reasoning: wonScores.length > 0
      ? `Lowest score among Closed-Won is ${minWonScore}. No prospects below this score have closed yet.`
      : 'Not enough Closed-Won data to determine threshold. Default 4.0/5.',
  };

  // --- Recommendations ---
  const recommendations = [];

  const bestArchetype = archetypeBreakdown.filter(a => a.total >= 3).sort((a, b) => b.winRate - a.winRate)[0];
  if (bestArchetype && bestArchetype.winRate > 0) {
    recommendations.push({
      action: `Double down on "${bestArchetype.archetype}" (${bestArchetype.winRate}% win rate across ${bestArchetype.total} prospects)`,
      reasoning: `${bestArchetype.won} of ${bestArchetype.total} closed-won.`,
      impact: 'high',
    });
  }

  const worstArchetype = archetypeBreakdown.filter(a => a.total >= 3 && a.winRate === 0)[0];
  if (worstArchetype) {
    recommendations.push({
      action: `Stop pursuing "${worstArchetype.archetype}" (0 wins across ${worstArchetype.total} prospects)`,
      reasoning: `Archetype is misfit for your motion OR your targeting on this archetype is off.`,
      impact: 'high',
    });
  }

  const sizeLosers = sizeBreakdown.filter(s => s.total >= 3 && s['no-fit'] / s.total >= 0.5);
  for (const s of sizeLosers) {
    recommendations.push({
      action: `Tighten ICP size filters: "${s.bucket}" is ${Math.round((s['no-fit'] / s.total) * 100)}% No-Fit`,
      reasoning: `${s['no-fit']} of ${s.total} in this bucket failed ICP fit.`,
      impact: 'medium',
    });
  }

  if (minWonScore > 3.5 && wonScores.length >= 2) {
    recommendations.push({
      action: `Set outreach floor at ${scoreThreshold.recommended}/5`,
      reasoning: `No closed-won below ${minWonScore}/5. Outreach on lower-scored prospects is statistically wasted.`,
      impact: 'medium',
    });
  }

  // Date range
  const dates = enriched.map(e => e.date).filter(Boolean).sort();

  return {
    metadata: {
      total: enriched.length,
      schema,
      dateRange: { from: dates[0], to: dates[dates.length - 1] },
      analysisDate: new Date().toISOString().split('T')[0],
      byOutcome: {
        won: enriched.filter(e => e.outcome === 'won').length,
        lost: enriched.filter(e => e.outcome === 'lost').length,
        'in-pipeline': enriched.filter(e => e.outcome === 'in-pipeline').length,
        engaged: enriched.filter(e => e.outcome === 'engaged').length,
        contacted: enriched.filter(e => e.outcome === 'contacted').length,
        'no-fit': enriched.filter(e => e.outcome === 'no-fit').length,
        nurture: enriched.filter(e => e.outcome === 'nurture').length,
        pending: enriched.filter(e => e.outcome === 'pending').length,
      },
    },
    funnel,
    stageConversion,
    scoreComparison,
    archetypeBreakdown,
    industryBreakdown,
    sizeBreakdown,
    fundingBreakdown,
    geoBreakdown,
    disqualifierHits,
    scoreThreshold,
    recommendations,
  };
}

// --- Summary mode ---
function printSummary(result) {
  if (result.error) {
    console.log(`\n${result.error}\n`);
    return;
  }

  const { metadata, funnel, stageConversion, scoreComparison, archetypeBreakdown, industryBreakdown, sizeBreakdown, fundingBreakdown, geoBreakdown, scoreThreshold, recommendations } = result;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  Conversion Pattern Analysis - ${metadata.analysisDate}`);
  console.log(`  ${metadata.total} prospects (${metadata.dateRange.from} to ${metadata.dateRange.to})`);
  console.log(`${'='.repeat(60)}\n`);

  console.log('FUNNEL');
  console.log('-'.repeat(40));
  const order = ['discovered', 'researched', 'contacted', 'engaged', 'meeting-booked', 'qualified', 'proposal', 'closed-won', 'closed-lost', 'no-fit', 'nurture'];
  for (const stage of order) {
    if (funnel[stage]) {
      const pct = Math.round((funnel[stage] / metadata.total) * 100);
      console.log(`  ${stage.padEnd(16)} ${String(funnel[stage]).padStart(3)} (${pct}%)`);
    }
  }

  if (stageConversion.length > 0) {
    console.log('\nSTAGE CONVERSION');
    console.log('-'.repeat(40));
    for (const c of stageConversion) {
      console.log(`  ${c.from.padEnd(16)} -> ${c.to.padEnd(16)} ${c.rate}%  (${c.toCount}/${c.fromCount})`);
    }
  }

  console.log('\nSCORE BY OUTCOME');
  console.log('-'.repeat(40));
  for (const [group, stats] of Object.entries(scoreComparison)) {
    if (stats.count > 0) {
      console.log(`  ${group.padEnd(14)} avg ${stats.avg}/5  (${stats.count} prospects, ${stats.min}-${stats.max})`);
    }
  }

  if (archetypeBreakdown.length > 0) {
    console.log('\nARCHETYPE PERFORMANCE');
    console.log('-'.repeat(40));
    for (const a of archetypeBreakdown) {
      console.log(`  ${a.archetype.padEnd(30)} ${String(a.total).padStart(3)} prospects, ${a.winRate}% win`);
    }
  }

  if (industryBreakdown.length > 0) {
    console.log('\nINDUSTRY PERFORMANCE');
    console.log('-'.repeat(40));
    for (const i of industryBreakdown.slice(0, 10)) {
      console.log(`  ${i.industry.padEnd(30)} ${String(i.total).padStart(3)} prospects, ${i.winRate}% win`);
    }
  }

  console.log(`\nSCORE THRESHOLD: ${scoreThreshold.recommended}/5`);
  console.log(`  ${scoreThreshold.reasoning}`);

  if (recommendations.length > 0) {
    console.log(`\nRECOMMENDATIONS`);
    console.log('='.repeat(60));
    for (let i = 0; i < recommendations.length; i++) {
      const r = recommendations[i];
      console.log(`  ${i + 1}. [${r.impact.toUpperCase()}] ${r.action}`);
      console.log(`     ${r.reasoning}`);
    }
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
