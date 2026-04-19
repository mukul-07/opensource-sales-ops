# Mode: scan — Prospect Discovery

Find new prospects matching the user's ICP and land them in `data/pipeline.md` for the `qualify` mode to process.

**No custom scanner script.** Discovery runs LLM-driven via three sources configured in `portals.yml`:

1. **`manual_accounts`** — named targets the user cares about
2. **`lead_db`** — Apollo `organizations/search` (free tier supports ICP filtering), plus Hunter/Snov/Prospeo/Skrapp stubs when the user expands
3. **`search_queries`** — broad WebSearch for funding / compliance / persona / trigger signals

## Recommended invocation

Run as a subagent so the main context isn't filled with scrape output:

```
Agent(
  subagent_type="general-purpose",
  prompt="[contents of this file + portals.yml + config/profile.yml icp section]",
  run_in_background=True
)
```

## Workflow

### Step 1 — Read config

- `portals.yml` — sources config (manual_accounts + lead_db + search_queries)
- `config/profile.yml` — ICP (industries, employee range, funding stage, geography, tech signals, disqualifiers)
- `data/scan-history.tsv` — dedup history (URLs already seen)
- `data/prospects.md` — dedup against already-qualified companies
- `data/pipeline.md` — dedup against pending URLs

### Step 2 — Manual accounts (highest priority)

For each `manual_accounts` entry with `enabled: true`:
- Skip if the account's website/domain is already in scan-history, prospects.md, or pipeline.md.
- Emit `- [ ] {website} | {name} | TBD | manual add: {reason}` to pipeline.md.

### Step 3 — Apollo `organizations/search` (if enabled)

If `lead_db.apollo.enabled: true` AND `APOLLO_API_KEY` is set in the environment:

Call Apollo's company search to find companies matching the ICP:

```bash
curl -sS -X POST "https://api.apollo.io/api/v1/mixed_companies/search" \
  -H "x-api-key: $APOLLO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "q_organization_num_employees_ranges": ["1,10","11,50","51,200"],
    "organization_locations": ["European Union","United Kingdom","United States"],
    "organization_industry_tag_ids": [],
    "per_page": 25
  }'
```

Build the request body from `config/profile.yml#icp`:

- `q_organization_num_employees_ranges` → from `icp.company_size` (employees_min/max)
- `organization_locations` → from `icp.geographies.primary` + `secondary`
- `q_keywords` (optional) → terms from `icp.tech_signals_positive`
- `organization_industries` (paid-tier taxonomy; skip on free)

Parse the response:

- For each company not already in scan-history / prospects.md / pipeline.md
- Extract: `name`, `primary_domain`, `estimated_num_employees`, `latest_funding_stage`
- Apply quick disqualifier check (company_size, funding_stage, excluded_industries from profile.yml)
- Emit passing ones to pipeline.md with a short note: `apollo search: {employees}, {funding_stage}`

**If Apollo returns a 403 `API_INACCESSIBLE` error, log it and skip Apollo for this run.** The user is on a lower tier than the endpoint requires; continue with search_queries instead.

### Step 4 — WebSearch queries

For each `search_queries` entry with `enabled: true`:

- Run the WebSearch tool with the configured query.
- From each result, extract: `company name`, `primary URL`.
- Skip if already in scan-history / prospects.md / pipeline.md.
- Emit: `- [ ] {url} | {company} | TBD | websearch: {reason}`.

WebSearch results can be stale or imprecise. `qualify` mode will verify each candidate against ICP before writing a report.

### Step 5 — Liveness check (WebSearch results only)

For each new URL that came from WebSearch (Step 4), run Playwright (sequential, never in parallel):

- `browser_navigate` to the URL
- `browser_snapshot` to read content
- Dead site / 404 / wound-down company → mark `skipped_dead` in scan-history, skip.
- Alive → keep in pipeline.md.

Manual accounts (Step 2) and Apollo results (Step 3) don't need this check — they're already verified by the source.

### Step 6 — Log + summary

Append all new URLs to `data/scan-history.tsv`:

```
url	first_seen	source	company	reason	status
https://acme.example.com	2026-04-19	manual	Acme	already qualified	skipped_dup
https://example.com	2026-04-19	apollo	Example AI	12 employees, Series A	added
https://other.com	2026-04-19	websearch	Other Co	ai governance role	added
```

Print summary:

```
Prospect Scan - {YYYY-MM-DD}
=============================================
Manual accounts:            N enabled, N emitted, N already-tracked
Apollo org search:          N candidates, N emitted, N disqualified
WebSearch queries:          N run, N candidates, N live, N dead
Pipeline additions:         N

New prospects:
  + {company} | {source} | {reason}
  ...

-> Run /sales-ops pipeline to qualify them.
```

## Hard rules

- NEVER invent a company or URL. Every candidate must come from one of the three sources.
- NEVER paste API keys. Keys live in env vars only (see `docs/LEAD_ENRICHMENT.md`).
- NEVER run Playwright in parallel. Sequential-only for liveness checks.
- ALWAYS dedupe against scan-history, prospects.md, and pipeline.md before emitting.

## What this mode does NOT do

- No ATS scanning (Greenhouse / Ashby / Lever). Removed in v0 — see `docs/LEAD_ENRICHMENT.md` rationale or [#ATS-removed commit].
- No contact discovery at scan time. Contact enrichment (LinkedIn URLs, emails) happens in `qualify` mode Block D, per-prospect, using the enabled `lead_db` sources.

## Frequency

scan is a user-initiated action, not a daemon. Run it when you want fresh prospects — typically weekly. Heavy scan runs (many enabled search_queries) burn WebSearch tokens; adjust `enabled: true/false` per query based on what produces hits.
