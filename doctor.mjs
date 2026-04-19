#!/usr/bin/env node

/**
 * doctor.mjs — Setup validation for sales-ops
 * Checks all prerequisites and prints a pass/fail checklist.
 */

import { existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = __dirname;

// ANSI colors (only on TTY)
const isTTY = process.stdout.isTTY;
const green = (s) => isTTY ? `\x1b[32m${s}\x1b[0m` : s;
const red = (s) => isTTY ? `\x1b[31m${s}\x1b[0m` : s;
const dim = (s) => isTTY ? `\x1b[2m${s}\x1b[0m` : s;

function checkNodeVersion() {
  const major = parseInt(process.versions.node.split('.')[0]);
  if (major >= 18) {
    return { pass: true, label: `Node.js >= 18 (v${process.versions.node})` };
  }
  return {
    pass: false,
    label: `Node.js >= 18 (found v${process.versions.node})`,
    fix: 'Install Node.js 18 or later from https://nodejs.org',
  };
}

function checkDependencies() {
  if (existsSync(join(projectRoot, 'node_modules'))) {
    return { pass: true, label: 'Dependencies installed' };
  }
  return {
    pass: false,
    label: 'Dependencies not installed',
    fix: 'Run: npm install',
  };
}

async function checkPlaywright() {
  try {
    const { chromium } = await import('playwright');
    const execPath = chromium.executablePath();
    if (existsSync(execPath)) {
      return { pass: true, label: 'Playwright chromium installed' };
    }
    return {
      pass: false,
      label: 'Playwright chromium not installed',
      fix: 'Run: npx playwright install chromium',
    };
  } catch {
    return {
      pass: false,
      label: 'Playwright chromium not installed',
      fix: 'Run: npx playwright install chromium',
    };
  }
}

function checkPitch() {
  if (existsSync(join(projectRoot, 'pitch.md'))) {
    return { pass: true, label: 'pitch.md found' };
  }
  return {
    pass: false,
    label: 'pitch.md not found',
    fix: [
      'Create pitch.md in the project root with what you sell, value prop, pricing',
      'The onboarding flow in CLAUDE.md guides you through this',
    ],
  };
}

function checkCaseStudies() {
  if (existsSync(join(projectRoot, 'case-studies.md'))) {
    return { pass: true, label: 'case-studies.md found' };
  }
  return {
    pass: false,
    label: 'case-studies.md not found (optional but recommended)',
    fix: [
      'Create case-studies.md with your customer wins + metrics',
      'Without it, outreach drafts cannot reference named customers',
    ],
  };
}

function checkEnrichmentKeys() {
  const keys = {
    'Apollo':   'APOLLO_API_KEY',
    'Hunter':   'HUNTER_API_KEY',
    'Snov':     'SNOV_CLIENT_ID',
    'Prospeo':  'PROSPEO_API_KEY',
    'Skrapp':   'SKRAPP_API_KEY',
  };
  const set = Object.entries(keys).filter(([, envvar]) => !!process.env[envvar]);
  if (set.length === 0) {
    return {
      pass: true,  // optional — not a failure
      label: 'No lead enrichment API keys set (email lookups will be TBD)',
      fix: [
        'Optional. Copy .envrc.example to .envrc, sign up for any of the 5 sources, add your key',
        'See docs/LEAD_ENRICHMENT.md — Apollo free tier is the best starting point',
      ],
      warnOnly: true,
    };
  }
  const names = set.map(([name]) => name).join(', ');
  return { pass: true, label: `Lead enrichment keys set: ${names}` };
}

function checkProfile() {
  if (existsSync(join(projectRoot, 'config', 'profile.yml'))) {
    return { pass: true, label: 'config/profile.yml found' };
  }
  return {
    pass: false,
    label: 'config/profile.yml not found',
    fix: [
      'Run: cp config/profile.example.yml config/profile.yml',
      'Then edit it with your details',
    ],
  };
}

function checkPortals() {
  if (existsSync(join(projectRoot, 'portals.yml'))) {
    return { pass: true, label: 'portals.yml found' };
  }
  return {
    pass: false,
    label: 'portals.yml not found',
    fix: [
      'Run: cp templates/portals.example.yml portals.yml',
      'Then customize with your target companies',
    ],
  };
}

function checkFonts() {
  const fontsDir = join(projectRoot, 'fonts');
  if (!existsSync(fontsDir)) {
    return {
      pass: false,
      label: 'fonts/ directory not found',
      fix: 'The fonts/ directory is required for PDF generation',
    };
  }
  try {
    const files = readdirSync(fontsDir);
    if (files.length === 0) {
      return {
        pass: false,
        label: 'fonts/ directory is empty',
        fix: 'The fonts/ directory must contain font files for PDF generation',
      };
    }
  } catch {
    return {
      pass: false,
      label: 'fonts/ directory not readable',
      fix: 'Check permissions on the fonts/ directory',
    };
  }
  return { pass: true, label: 'Fonts directory ready' };
}

function checkAutoDir(name) {
  const dirPath = join(projectRoot, name);
  if (existsSync(dirPath)) {
    return { pass: true, label: `${name}/ directory ready` };
  }
  try {
    mkdirSync(dirPath, { recursive: true });
    return { pass: true, label: `${name}/ directory ready (auto-created)` };
  } catch {
    return {
      pass: false,
      label: `${name}/ directory could not be created`,
      fix: `Run: mkdir ${name}`,
    };
  }
}

async function main() {
  console.log('\nsales-ops doctor');
  console.log('================\n');

  const checks = [
    checkNodeVersion(),
    checkDependencies(),
    await checkPlaywright(),
    checkPitch(),
    checkProfile(),
    checkCaseStudies(),
    checkPortals(),
    checkEnrichmentKeys(),
    checkAutoDir('data'),
    checkAutoDir('output'),
    checkAutoDir('reports'),
  ];

  let failures = 0;
  let warnings = 0;

  for (const result of checks) {
    if (result.pass) {
      if (result.warnOnly && result.fix) {
        warnings++;
        console.log(`${dim('!')} ${result.label}`);
        const fixes = Array.isArray(result.fix) ? result.fix : [result.fix];
        for (const hint of fixes) console.log(`  ${dim('-> ' + hint)}`);
      } else {
        console.log(`${green('v')} ${result.label}`);
      }
    } else {
      failures++;
      console.log(`${red('x')} ${result.label}`);
      const fixes = Array.isArray(result.fix) ? result.fix : [result.fix];
      for (const hint of fixes) {
        console.log(`  ${dim('-> ' + hint)}`);
      }
    }
  }

  console.log('');
  if (failures > 0) {
    console.log(`Result: ${failures} issue${failures === 1 ? '' : 's'} found${warnings ? `, ${warnings} warning${warnings === 1 ? '' : 's'}` : ''}. Fix them and run \`npm run doctor\` again.`);
    process.exit(1);
  } else {
    const suffix = warnings ? ` (${warnings} optional warning${warnings === 1 ? '' : 's'})` : '';
    console.log(`Result: All required checks passed${suffix}. Run \`claude\` to start.`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('doctor.mjs failed:', err.message);
  process.exit(1);
});
