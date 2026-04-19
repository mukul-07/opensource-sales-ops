# Scripts

Reference for every Node script in sales-ops. For Claude Code slash commands, see [USAGE.md](../USAGE.md).

## Setup + health

| Command | Script | Purpose |
|---------|--------|---------|
| `npm run doctor` | `doctor.mjs` | Validates Node version, dependencies, user-layer files, enrichment keys. Run first thing in a fresh clone. |
| `npm run verify` | `verify-pipeline.mjs` | Tracker health check — validates canonical stages, report links, no duplicates. |

## Data processing

| Command | Script | Purpose |
|---------|--------|---------|
| `npm run merge` | `merge-tracker.mjs` | Merges batch-generated TSV rows into `data/prospects.md`. Auto-detects sales-ops 11-col vs career-ops 9-col schema. |
| `npm run dedup` | `dedup-tracker.mjs` | Removes duplicate entries (by company + contact fuzzy match). |
| `npm run normalize` | `normalize-statuses.mjs` | Maps stage aliases to canonical values (see `templates/states.yml`). |

## Analysis

| Command | Script | Purpose |
|---------|--------|---------|
| `npm run patterns` | `analyze-patterns.mjs` | Conversion-pattern analysis. Outputs JSON by default, `--summary` for human-readable. Needs 10+ prospects past Researched. |
| `npm run followup` | `followup-cadence.mjs` | Cadence tracker for active prospects. Flags overdue / urgent / cold per the 5-touch sequence. |

## Liveness

| Command | Script | Purpose |
|---------|--------|---------|
| `npm run liveness` | `check-liveness.mjs` | Verifies a URL is alive (site up, content present). Used in scan step for WebSearch results. |

## System updates

| Command | Script | Purpose |
|---------|--------|---------|
| `npm run update:check` | `update-system.mjs check` | Checks if an upstream update is available. **Disabled in this fork** — returns `fork-disabled`. Re-enable by repointing URLs to your own fork. |
| `npm run update` | `update-system.mjs apply` | Applies an upstream update (fork-disabled). |
| `npm run rollback` | `update-system.mjs rollback` | Rolls back the last upstream update. |

## Test suite

| Command | Script | Purpose |
|---------|--------|---------|
| `node test-all.mjs` | — | Full test suite: syntax, scripts, liveness classification, data contract, personal-data leak, path check, mode integrity, CLAUDE.md sections. |
| `node test-all.mjs --quick` | — | Same minus the slow checks. Use in pre-commit. |

## Script-level environment

Most scripts are zero-config — they read from fixed file paths under the project root. Scripts that hit external APIs read keys from env vars (loaded via `.env.local`):

- `APOLLO_API_KEY`
- `HUNTER_API_KEY`
- `SNOV_CLIENT_ID` + `SNOV_CLIENT_SECRET`
- `PROSPEO_API_KEY`
- `SKRAPP_API_KEY`

See [LEAD_ENRICHMENT.md](LEAD_ENRICHMENT.md) for setup.
