# Architecture

How sales-ops is wired together. For the operator view see [USAGE.md](../USAGE.md).

## One-sentence summary

sales-ops is an **LLM-first outbound SDR system**: the heavy reasoning (qualification, outreach drafting, follow-up generation) happens inside Claude via mode prompts; Node scripts handle file I/O, schema validation, and API calls.

## Layers

```
┌────────────────────────────────────────────────────────────┐
│  Claude Code CLI  (user types /sales-ops commands here)    │
└────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────┐
│  Skill router  (.claude/skills/sales-ops/SKILL.md)         │
│  parses argument -> dispatches to a mode file              │
└────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────┐
│  Mode files  (modes/*.md)                                  │
│  qualify / outreach / scan / pipeline / batch / followup / │
│  patterns / tracker / auto-pipeline                        │
│  Each mode loads modes/_shared.md + its own prompt         │
└────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────┐
│  LLM reasoning uses tools:                                 │
│  - Read/Write (pitch.md, profile.yml, _profile.md, ...)    │
│  - WebSearch (funding, press, LinkedIn URLs)               │
│  - WebFetch / Playwright (render company pages)            │
│  - Bash curl (Apollo/Hunter/Snov/... APIs)                 │
│  - Bash node (merge-tracker, verify-pipeline, ...)         │
└────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────┐
│  Data layer  (files under data/, reports/, output/)        │
│  data/prospects.md         (11-col tracker, source of truth)│
│  data/pipeline.md          (URL inbox — pending prospects)  │
│  data/scan-history.tsv     (dedup — seen URLs)              │
│  data/follow-ups.md        (touch history)                  │
│  reports/NNN-*.md          (qualification reports)          │
│  output/drafts/*.md        (outreach drafts for review)     │
│  batch/tracker-additions/  (TSV rows awaiting merge)        │
└────────────────────────────────────────────────────────────┘
```

## User layer vs System layer

See [DATA_CONTRACT.md](../DATA_CONTRACT.md) for the authoritative split.

**User layer** (gitignored, yours):
- `pitch.md`, `case-studies.md`
- `config/profile.yml`
- `modes/_profile.md`
- `portals.yml`
- `.env.local`
- `data/*`, `reports/*`, `output/*`

**System layer** (tracked, auto-updatable if you re-enable upstream):
- `CLAUDE.md`, `USAGE.md`, `README.md`, `DATA_CONTRACT.md`
- `modes/_shared.md`, `modes/_profile.template.md`, `modes/{qualify,outreach,...}.md`
- `.claude/skills/sales-ops/SKILL.md`
- `templates/states.yml`, `templates/portals.example.yml`
- All `*.mjs` scripts

**Rule:** customizations go in the user layer. Never edit system files for user-specific content — upstream updates will clobber them.

## Core scripts

### `doctor.mjs`

Pre-flight validation. Runs on first setup and any time the user suspects something's off. Checks Node version, dependencies, user-file existence, enrichment-key env vars.

### `merge-tracker.mjs`

The write side of the tracker. Mode files never write `data/prospects.md` directly — they emit TSV files to `batch/tracker-additions/`, and this script merges them. Why: dedup, schema validation, stage normalization, score-based update-in-place for duplicates.

Auto-detects **sales-ops 11-col schema** vs **career-ops 9-col legacy schema** from the tracker header, so users migrating from career-ops don't have to re-format history.

### `verify-pipeline.mjs`

Read-side tracker health check. Catches: non-canonical stages, broken report links, duplicate entries, malformed TSV in `tracker-additions/`.

### `analyze-patterns.mjs` + `followup-cadence.mjs`

Read `data/prospects.md` + linked reports, compute conversion patterns or cadence state, emit JSON (for LLM consumption) or `--summary` (for humans). No LLM dependency — deterministic output given the tracker state.

### `liveness-core.mjs` + `check-liveness.mjs`

Classifies a URL as alive / expired / uncertain from Playwright content. Used by `scan` mode for WebSearch results before they hit the pipeline.

### `update-system.mjs`

Intended to pull upstream updates to system files only (never touching user-layer files). **Disabled by default** in this fork — calls return `{"status": "fork-disabled"}`. Re-enable by repointing URLs at your own fork's main.

## Mode files

Every mode is a markdown file under `modes/` that reads as a prompt to the LLM. Two types:

**Modes that need scoring/rules context** load `modes/_shared.md` first:
`auto-pipeline`, `qualify`, `outreach`, `followup`, `pipeline`, `scan`, `batch`

**Standalone modes** don't:
`tracker`, `patterns`

`modes/_shared.md` contains: scoring system (A-G blocks), legitimacy tiers, buyer archetypes (override-able in `_profile.md`), global never/always rules, tool-usage table, outreach writing rules (no em-dashes, greeting required, banned phrases).

`modes/_profile.md` (user's copy of `_profile.template.md`) overrides `_shared.md` for user-specific content.

## The HITL boundary

sales-ops drafts. You send.

- No mode file calls send-email or post-message tools.
- `auto-pipeline` never auto-drafts outreach — it stops after qualify.
- Tracker stage transitions to `Contacted` / `Engaged` only after the user confirms.

This is enforced in prompt text across `modes/_shared.md`, `modes/outreach.md`, `modes/followup.md`, `modes/auto-pipeline.md`, and surfaced in `USAGE.md` and `README.md`. If a draft is ever sent without user approval, that's a rule violation, not intended behavior.

## Tracker schema (sales-ops 11 columns)

```
| # | Date | Company | Contact | Title | Stage | Score | Last Touch | Next Touch | Report | Notes |
```

Canonical stages defined in `templates/states.yml`. `merge-tracker.mjs` validates against this list.

## Source discovery

`modes/scan.md` runs 3 levels:

1. **`manual_accounts`** from `portals.yml` — user-curated targets, highest precision
2. **Apollo `organizations/search`** (if `lead_db.apollo.enabled: true` + `APOLLO_API_KEY` set) — ICP-filtered discovery, free tier works for company-level
3. **`search_queries`** via WebSearch — broad discovery by trigger-based queries

ATS scanning (Greenhouse/Ashby/Lever) was removed in v0 — signal-to-noise too low for typical sales-ops motions. See the delete commit message for rationale.

## Contact enrichment

`modes/qualify.md` Block D runs:

1. WebSearch for direct LinkedIn profile URL (`site:linkedin.com/in`)
2. Apollo `organizations/enrich` (company data — free) + `people/match` (contact data — paid-tier only)
3. Hunter `email-finder` / Snov / Prospeo / Skrapp — any enabled sources in `portals.yml`
4. If nothing resolves: emit `TBD`. **Never guess email patterns.**

## Testing

`test-all.mjs` runs:
1. Syntax check of every `.mjs`
2. Script execution (graceful on empty data)
3. Liveness classification unit tests
4. Data contract validation (files exist, user files gitignored)
5. Personal data leak check (upstream maintainer identifiers)
6. Absolute path check (no home-directory path leaks in code)
7. Mode file integrity + no-ATS-vocabulary leak check
8. CLAUDE.md required sections
9. VERSION semver

Current: 69 passed, 0 failed, 0 warnings.
