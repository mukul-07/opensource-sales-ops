# Mode: patterns -- Conversion Pattern Analysis

## Purpose

Analyze the prospect tracker and reports to find what converts and what doesn't. Surface which archetypes, industries, deal sizes, channels, and score ranges produce meetings and closed deals — and which ones waste time.

## Inputs

- `data/prospects.md` — Prospect tracker
- `reports/` — Qualification reports (Block A-G content)
- `config/profile.yml` — ICP + personas + deal economics
- `modes/_profile.md` — Your archetypes and case study mapping
- `portals.yml` — Sources config (for filter-update recommendations)

## Minimum threshold

Before running, check: does `data/prospects.md` have at least 10 entries with stage beyond `Researched` (i.e., Contacted / Engaged / Meeting-Booked / Qualified / Proposal / Closed-*)?

If not:
> "Not enough data yet — {N}/10 prospects have moved past qualification. Keep running outreach and come back when you have more outcomes."

Exit gracefully.

## Step 1 — Run analysis script

```bash
node analyze-patterns.mjs
```

Parse the JSON output. The script currently uses career-ops field names (archetype, remote policy, etc.); it will need a config pass in v0.1 to read sales-oriented fields. For now, interpret the existing categories as:

| Script field | Read as (sales-ops) |
|--------------|---------------------|
| archetype | buyer archetype from Block A of qualify report |
| remotePolicy | geography bucket (primary / secondary / excluded per ICP) |
| companySizeBreakdown | company size bucket per `icp.company_size` |
| techStackGaps | ICP misses — tech signals expected but absent |
| blockerAnalysis | which disqualifiers fired most often |

## Step 2 — Generate report

Write to `reports/pattern-analysis-{YYYY-MM-DD}.md`.

### Structure

```markdown
# Conversion Pattern Analysis -- {YYYY-MM-DD}

**Prospects analyzed:** {total}
**Date range:** {from} to {to}
**Outcomes:** {closed-won} won, {closed-lost} lost, {nurture} parked, {no-fit} dq'd, {active} active

---

## Conversion Funnel

| Stage | Count | % of total | % of previous stage |
|-------|-------|------------|----------------------|
| Researched | X | X% | — |
| Contacted | X | X% | X% |
| Engaged | X | X% | X% |
| Meeting-Booked | X | X% | X% |
| Qualified | X | X% | X% |
| Proposal | X | X% | X% |
| Closed-Won | X | X% | X% |

Two percentages matter: reply rate (Contacted -> Engaged) and meeting rate (Engaged -> Meeting-Booked).

## Score vs Outcome

| Outcome | Avg Score | Min | Max | Count |
|---------|-----------|-----|-----|-------|
| Closed-Won | X.X/5 | | | |
| Closed-Lost | ... | | | |
| Meeting-Booked (active) | ... | | | |
| No reply | ... | | | |

## Archetype Performance

Table: each archetype -> total, replies, meetings, won, conversion rates. Flag the best and worst.

## Industry / Segment Performance

Same table sliced by industry from `icp.industries`.

## Trigger Strength vs Outcome

How often does a Block C strength=5 trigger actually convert vs strength=3? This validates (or invalidates) the qualify scoring.

## Channel Performance

If data available, meeting rate by first-touch channel (email / LinkedIn / phone).

## Disqualifier Hit Rate

Which disqualifiers are firing most often? If one fires frequently, ICP may be miscalibrated OR the scan is surfacing wrong accounts.

## Recommended Score Threshold

Data-driven: below what score do no deals close? Use this as floor.

## Top Findings

Numbered list. Each finding: action + reasoning + impact estimate.

1. **[HIGH]** Action to take
   Reasoning behind it.
```

## Step 3 — Present summary

Condensed view for the user:

> **Pattern Analysis Complete** ({count} prospects, {date range})
>
> Key findings:
> - Fintech Series B-C converts at 22%, Series D+ at 4% — cut enterprise for now
> - Post-Incident archetype converts 3× the others when fresh (<60d from incident)
> - No closed-won below 4.2/5 — raise the outreach floor
>
> Full report: `reports/pattern-analysis-2026-04-18.md`

## Step 4 — Offer to apply recommendations

> "Apply any of these? I can:
> - Tighten `icp.company_size` in profile.yml to cut Series D+
> - Add a score floor in `_profile.md` for outreach triggering
> - Adjust buyer archetypes based on what converts
> - Disable `tracked_accounts` and `search_queries` that haven't produced anything
>
> Just say which, or 'all'."

If user agrees:
- ICP changes -> `config/profile.yml`
- Archetype / cadence changes -> `modes/_profile.md` (NEVER `_shared.md`)
- Score floor -> add under `patterns:` key in `config/profile.yml`
- Source changes -> `portals.yml`

## Outcome classification

| Stage | Outcome class |
|-------|---------------|
| Meeting-Booked, Qualified, Proposal, Closed-Won | **Positive** |
| Closed-Lost | **Negative** (lost a real deal) |
| No-Fit | **Self-filtered** (ICP or disqualifier) |
| Nurture | **Parked** (not now, maybe later) |
| Contacted, Engaged | **Active** (no outcome yet) |
| Discovered, Researched | **Pending** (no outreach yet) |
