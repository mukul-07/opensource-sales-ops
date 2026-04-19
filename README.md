# Sales-Ops

> AI Sales Development Representative (SDR) command center. Scan sources, qualify prospects, draft personalized outreach, run cadence, analyze conversion.

**Forked from [santifer/career-ops](https://github.com/santifer/career-ops).** That project was an AI job-search pipeline — qualify offers, draft applications, track outcomes. We're repurposing the same infrastructure for outbound sales: qualify accounts instead of offers, draft outreach instead of applications, track pipeline instead of applications.

```
┌─────────────────────────────────────────────────────────────┐
│  scan  ->  qualify  ->  outreach  ->  cadence  ->  patterns │
│   │          │            │            │            │       │
│   sources    ICP fit      HITL draft   follow-ups   what    │
│   + intent   + triggers   email / DM   touch 2-5    works   │
│   signals    + access     / call       + replies            │
└─────────────────────────────────────────────────────────────┘
```

## Quick start

**See [USAGE.md](USAGE.md) for the complete step-by-step guide** (setup, commands, what each one produces, free-tier reality check, troubleshooting).

Fast path:

```bash
git clone https://github.com/mukul-07/opensource-sales-ops.git
cd opensource-sales-ops
npm install
node doctor.mjs      # shows what's missing

# Set up the 4 user-layer files (details in USAGE.md):
cp config/profile.example.yml config/profile.yml
cp templates/portals.example.yml portals.yml
cp modes/_profile.template.md modes/_profile.md
# Create pitch.md and case-studies.md from scratch

# (Optional) Lead-enrichment API keys — see docs/LEAD_ENRICHMENT.md
cp .env.local.example .env.local

# Run Claude Code:
claude

# In the session:
/sales-ops                    # discovery menu
/sales-ops {company-url}      # auto-pipeline: qualify + report + tracker
/sales-ops scan               # discover new prospects via manual + Apollo + WebSearch
/sales-ops pipeline           # qualify the URLs in data/pipeline.md
```

## What it does

- **Scan.** Hits target accounts' ATS (Greenhouse / Ashby / Lever) via public API — presence of relevant job posts is a buying-intent signal. Plus WebSearch fallbacks and optional lead-DB integration (Apollo / Hunter / Clay).
- **Qualify.** Full A-G evaluation of each prospect: account snapshot, ICP fit, buying signals, decision-maker map, outreach angle, objection prep, legitimacy. Writes a report and updates the tracker.
- **Outreach.** Drafts 3 variants per channel (email, LinkedIn DM) plus call opener and voicemail — all HITL. Never sends. The user reviews, picks, and sends.
- **Cadence.** Tracks touches per prospect, flags overdue, drafts next-touch with a different angle each time. Breakup message at touch 5.
- **Patterns.** Conversion analysis: what industries / archetypes / score ranges / channels convert. Recommends ICP tweaks, score floors, disqualifiers.

## Principles

- **HITL (human in the loop) is non-negotiable.** sales-ops drafts. You send.
- **Quality over volume.** A qualified, personalized touch beats 100 generic sends. The system actively discourages low-fit outreach.
- **Customize, don't fight.** The buyer archetypes, voice, cadence, scoring, and ICP are all meant to be edited for YOUR motion. Ask the agent to change things — it can.
- **Your data stays yours.** `pitch.md`, `config/profile.yml`, `modes/_profile.md`, `data/*`, `reports/*`, `output/*`, `case-studies.md` are the user layer. System updates never touch them.

## Status

**v0.1.0 — early fork, v0 in progress.** Core flow works but expect rough edges:

- Upstream update pull is intentionally disabled. Re-enable in [update-system.mjs](update-system.mjs) by repointing URLs to your own fork.
- Some `.mjs` scripts still use career-ops field names (archetype, remote policy, etc.). They run correctly but the field semantics are being repurposed gradually.
- No CRM integration in v0. Tracker is markdown-only (`data/prospects.md`).
- Language localization removed from v0. English only. Add back per-market if needed.

## Stack

- Node.js (mjs modules), Playwright (scraping + verification)
- YAML config, Markdown data
- Claude Code (primary) + OpenCode (secondary) as the agent runtimes

## Ethical notes

- Don't fake case studies, don't manufacture urgency, don't namedrop people you don't know.
- Don't run mass sends. The point of this is better-targeted, not more-frequent.
- Respect prospect attention. Every cold touch costs someone 30 seconds; make it worth reading.

## License

MIT — see [LICENSE](LICENSE). Originally forked from [santifer/career-ops](https://github.com/santifer/career-ops) (also MIT).
