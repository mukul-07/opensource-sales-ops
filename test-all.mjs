#!/usr/bin/env node

/**
 * test-all.mjs — Test suite for sales-ops
 *
 * Run before merging any PR or pushing changes.
 * Tests: syntax, scripts, data contract, personal data, paths, mode integrity.
 *
 * Usage:
 *   node test-all.mjs           # Run all tests
 *   node test-all.mjs --quick   # Skip slower tests
 */

import { execSync, execFileSync } from 'child_process';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const QUICK = process.argv.includes('--quick');

let passed = 0;
let failed = 0;
let warnings = 0;

function pass(msg) { console.log(`  v ${msg}`); passed++; }
function fail(msg) { console.log(`  x ${msg}`); failed++; }
function warn(msg) { console.log(`  ! ${msg}`); warnings++; }

function run(cmd, args = [], opts = {}) {
  try {
    if (Array.isArray(args) && args.length > 0) {
      return execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf-8', timeout: 30000, ...opts }).trim();
    }
    return execSync(cmd, { cwd: ROOT, encoding: 'utf-8', timeout: 30000, ...opts }).trim();
  } catch (e) {
    return null;
  }
}

function fileExists(path) { return existsSync(join(ROOT, path)); }
function readFile(path) { return readFileSync(join(ROOT, path), 'utf-8'); }

console.log('\nsales-ops test suite\n');

// ── 1. SYNTAX CHECKS ────────────────────────────────────────────

console.log('1. Syntax checks');

const mjsFiles = readdirSync(ROOT).filter(f => f.endsWith('.mjs'));
for (const f of mjsFiles) {
  const result = run('node', ['--check', f]);
  if (result !== null) {
    pass(`${f} syntax OK`);
  } else {
    fail(`${f} has syntax errors`);
  }
}

// ── 2. SCRIPT EXECUTION ─────────────────────────────────────────

console.log('\n2. Script execution (graceful on empty data)');

const scripts = [
  { name: 'verify-pipeline.mjs', expectExit: 0 },
  { name: 'normalize-statuses.mjs', expectExit: 0 },
  { name: 'dedup-tracker.mjs', expectExit: 0 },
  { name: 'merge-tracker.mjs', expectExit: 0 },
  { name: 'update-system.mjs check', expectExit: 0 },
  { name: 'doctor.mjs', allowFail: true },
];

for (const { name, allowFail } of scripts) {
  const result = run('node', name.split(' '), { stdio: ['pipe', 'pipe', 'pipe'] });
  if (result !== null) {
    pass(`${name} runs OK`);
  } else if (allowFail) {
    warn(`${name} exited with error (expected without user data)`);
  } else {
    fail(`${name} crashed`);
  }
}

// ── 3. LIVENESS CLASSIFICATION ──────────────────────────────────

console.log('\n3. Liveness classification');

try {
  const { classifyLiveness } = await import(pathToFileURL(join(ROOT, 'liveness-core.mjs')).href);

  const expiredPage = classifyLiveness({
    finalUrl: 'https://example.com/closed',
    bodyText: 'Company\nApply\nThe page you are looking for is no longer available.',
    applyControls: [],
  });
  if (expiredPage.result === 'expired') {
    pass('Expired pages are not revived by nav/footer "Apply" text');
  } else {
    fail(`Expired page misclassified as ${expiredPage.result}`);
  }

  const activePage = classifyLiveness({
    finalUrl: 'https://example.com/about',
    bodyText: [
      'About Us',
      'We are an AI security company.',
      'We are hiring for multiple roles across engineering, research, and product. Meet the team and learn what we are building across evaluation, deployment, and reliability.',
    ].join('\n'),
    applyControls: ['Apply for this Job'],
  });
  if (activePage.result === 'active') {
    pass('Visible apply controls still keep real pages active');
  } else {
    fail(`Active page misclassified as ${activePage.result}`);
  }
} catch (e) {
  fail(`Liveness classification tests crashed: ${e.message}`);
}

// ── 4. DATA CONTRACT ────────────────────────────────────────────

console.log('\n4. Data contract validation');

// System files that MUST exist.
const systemFiles = [
  'CLAUDE.md', 'VERSION', 'DATA_CONTRACT.md', 'USAGE.md',
  'modes/_shared.md', 'modes/_profile.template.md',
  'modes/qualify.md', 'modes/outreach.md', 'modes/scan.md',
  'modes/pipeline.md', 'modes/followup.md', 'modes/patterns.md',
  'modes/tracker.md', 'modes/batch.md', 'modes/auto-pipeline.md',
  'templates/states.yml', 'templates/portals.example.yml',
  '.claude/skills/sales-ops/SKILL.md',
  '.env.local.example',
];

for (const f of systemFiles) {
  if (fileExists(f)) {
    pass(`System file exists: ${f}`);
  } else {
    fail(`Missing system file: ${f}`);
  }
}

// User files must NOT be tracked (gitignored).
const userFiles = [
  'config/profile.yml', 'modes/_profile.md', 'portals.yml',
  'pitch.md', 'case-studies.md', '.env.local',
];
for (const f of userFiles) {
  const tracked = run('git', ['ls-files', f]);
  if (!tracked) {
    pass(`User file gitignored: ${f}`);
  } else {
    fail(`User file IS tracked (should be gitignored): ${f}`);
  }
}

// ── 5. PERSONAL DATA LEAK CHECK ─────────────────────────────────

console.log('\n5. Personal data leak check');

// Identifiers that should NOT appear outside allowed files.
// Fork maintainers: add your own personal data here LOCALLY (name, email, phone,
// home directory path, company name) to catch accidental leaks before commits.
// Do NOT commit real personal data to this array in a public fork — the file
// itself is tracked. Use a git pre-commit hook or local-only check instead.
const leakPatterns = [
  // Example placeholders — replace locally, do not commit real values.
  // 'YOUR_NAME', 'YOUR_EMAIL@example.com', 'YOUR_COMPANY',
];

const scanExtensions = ['md', 'yml', 'html', 'mjs', 'sh', 'json'];
const allowedFiles = [
  // Standard project files that legitimately credit upstream
  'LICENSE', 'CITATION.cff', 'CONTRIBUTING.md', 'CHANGELOG.md',
  'CODE_OF_CONDUCT.md', 'GOVERNANCE.md', 'SECURITY.md', 'SUPPORT.md',
  '.github/SECURITY.md', '.github/FUNDING.yml',
  'README.md',  // Fork README can credit original
  'test-all.mjs',  // this file — contains the pattern list
];

const grepPathspec = scanExtensions.map(e => `'*.${e}'`).join(' ');

let leakFound = false;
for (const pattern of leakPatterns) {
  const result = run(`git grep -n "${pattern}" -- ${grepPathspec} 2>/dev/null`);
  if (result) {
    for (const line of result.split('\n')) {
      const file = line.split(':')[0];
      if (allowedFiles.some(a => file.includes(a))) continue;
      warn(`Upstream data in ${file}: "${pattern}"`);
      leakFound = true;
    }
  }
}
if (!leakFound) {
  pass('No upstream personal data leaks outside allowed files');
}

// ── 6. ABSOLUTE PATH CHECK ──────────────────────────────────────

console.log('\n6. Absolute path check');

const absPathResult = run(
  `git grep -n "/Users/" -- '*.mjs' '*.sh' '*.md' '*.yml' 2>/dev/null | grep -v README.md | grep -v LICENSE | grep -v CLAUDE.md | grep -v test-all.mjs | grep -v USAGE.md`
);
if (!absPathResult) {
  pass('No absolute paths in code files');
} else {
  for (const line of absPathResult.split('\n').filter(Boolean)) {
    fail(`Absolute path: ${line.slice(0, 100)}`);
  }
}

// ── 7. MODE FILE INTEGRITY ──────────────────────────────────────

console.log('\n7. Mode file integrity');

const expectedModes = [
  '_shared.md', '_profile.template.md',
  'qualify.md', 'outreach.md', 'followup.md',
  'scan.md', 'pipeline.md', 'batch.md',
  'tracker.md', 'patterns.md', 'auto-pipeline.md',
];

for (const mode of expectedModes) {
  if (fileExists(`modes/${mode}`)) {
    pass(`Mode exists: ${mode}`);
  } else {
    fail(`Missing mode: ${mode}`);
  }
}

const shared = readFile('modes/_shared.md');
if (shared.includes('_profile.md')) {
  pass('_shared.md references _profile.md');
} else {
  fail('_shared.md does NOT reference _profile.md');
}

// No ATS vocabulary should be in the modes (removed in v0)
const atsLeaks = ['tracked_companies', 'intent_filter.positive'];
let atsLeakFound = false;
for (const term of atsLeaks) {
  const result = run(`git grep -n "${term}" -- 'modes/*.md' 2>/dev/null`);
  if (result) {
    fail(`ATS vocabulary leaked into mode: ${term} (removed in v0)`);
    atsLeakFound = true;
  }
}
if (!atsLeakFound) pass('No ATS vocabulary in mode files');

// ── 8. CLAUDE.md INTEGRITY ──────────────────────────────────────

console.log('\n8. CLAUDE.md integrity');

const claude = readFile('CLAUDE.md');
const requiredSections = [
  'Data Contract', 'Update Check', 'Ethical Use',
  'Prospect Verification', 'Canonical Stages', 'TSV Format',
  'First Run', 'Onboarding',
];

for (const section of requiredSections) {
  if (claude.includes(section)) {
    pass(`CLAUDE.md has section: ${section}`);
  } else {
    fail(`CLAUDE.md missing section: ${section}`);
  }
}

// ── 9. VERSION FILE ─────────────────────────────────────────────

console.log('\n9. Version file');

if (fileExists('VERSION')) {
  const version = readFile('VERSION').trim();
  if (/^\d+\.\d+\.\d+$/.test(version)) {
    pass(`VERSION is valid semver: ${version}`);
  } else {
    fail(`VERSION is not valid semver: "${version}"`);
  }
} else {
  fail('VERSION file missing');
}

// ── SUMMARY ─────────────────────────────────────────────────────

console.log('\n' + '='.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed, ${warnings} warnings`);

if (failed > 0) {
  console.log('FAILED -- do NOT push/merge until fixed\n');
  process.exit(1);
} else if (warnings > 0) {
  console.log('Passed with warnings -- review before pushing\n');
  process.exit(0);
} else {
  console.log('All tests passed -- safe to push/merge\n');
  process.exit(0);
}
