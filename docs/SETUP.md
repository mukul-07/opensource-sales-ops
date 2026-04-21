# Setup

Complete setup for sales-ops, from zero to first qualified prospect.

For the operator's manual (daily commands), see [USAGE.md](../USAGE.md).
For the high-level pitch, see [README.md](../README.md).

## Prerequisites

- **Node.js 18+**
- **Claude Code CLI** installed and authenticated
- (Optional) **direnv** — `brew install direnv` — auto-loads `.env.local` on `cd`
- **Playwright Chromium** (required) — `npx playwright install chromium` — for prospect verification, rendering JS-heavy sites, and PDF generation. Batch mode (`claude -p`) falls back to WebFetch.

## Install

```bash
git clone <your-fork-of-sales-ops>
cd sales-ops
npm install
node doctor.mjs
```

`doctor.mjs` will flag what's still missing. First run will show several warnings for user-layer files that don't exist yet — that's expected.

## User-layer files (the 4 + 1)

These are yours. Gitignored. sales-ops will never auto-update them.

### 1. `pitch.md` (required)

What you sell. Create in the project root. See [USAGE.md § First-time setup](../USAGE.md#first-time-setup) for the sections to include.

### 2. `config/profile.yml` (required)

```bash
cp config/profile.example.yml config/profile.yml
```

Fill in:
- `seller.*` — your identity (name, email, calendar link)
- `icp.*` — Ideal Customer Profile (industry, size, geography, funding, tech signals, buying triggers)
- `personas` — who signs the check
- `deal.*` — ACV range, sales cycle length, walk-away ACV
- `disqualifiers` — hard "do not pursue" rules

### 3. `modes/_profile.md` (required)

```bash
cp modes/_profile.template.md modes/_profile.md
```

This is where your motion lives:
- Your **buyer archetypes** (3-5 profiles)
- Your **outreach voice** (tone, banned phrases, signature moves)
- Your **case-study mapping** (archetype → which story to lead with)
- Your **objection playbook** (5-6 common objections + responses)
- Your **cadence timing** (touch days, channels, breakup)
- Your **qualifying questions** (for first calls)

Worth 30-60 minutes to get right. This is the biggest lever on draft quality.

### 4. `case-studies.md` (recommended)

Customer wins with metrics. Source of truth for outreach. sales-ops will **never** invent a customer; if this file doesn't have a fit, outreach falls back to pattern-level framing. See [USAGE.md](../USAGE.md) for format.

### 5. `.env.local` (optional but recommended)

For lead enrichment APIs.

```bash
cp .env.local.example .env.local
```

Edit and paste API keys per [docs/LEAD_ENRICHMENT.md](LEAD_ENRICHMENT.md). Never paste keys into `.envrc` (tracked in git) or `portals.yml` (the YAML references env var names, not the keys themselves).

If you use direnv: `direnv allow` in the project root.
Without direnv: `source .env.local` in your shell.

## Verify

```bash
node doctor.mjs
```

Expect all required checks to pass. Enrichment-key warning is optional — it only means you haven't set up Apollo/Hunter yet.

## First qualification

```bash
claude
```

Then inside Claude:

```
/sales-ops https://some-real-prospect.com
```

This triggers auto-pipeline: resolve → qualify (Blocks A-G) → write report to `reports/NNN-*.md` → append row to `data/prospects.md`.

Check:
- The report includes all 7 blocks with real content (not placeholders)
- The tracker row has 11 columns populated
- The recommendation at the end is consistent with the score

If any of those fails, see [USAGE.md § Troubleshooting](../USAGE.md#troubleshooting).

## What's next

- Weekly rhythm: [USAGE.md § A typical week](../USAGE.md#a-typical-week)
- Lead enrichment setup: [LEAD_ENRICHMENT.md](LEAD_ENRICHMENT.md)
- Architecture: [ARCHITECTURE.md](ARCHITECTURE.md)
- Customization: [CUSTOMIZATION.md](CUSTOMIZATION.md)
