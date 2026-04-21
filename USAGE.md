# Using sales-ops

A practical step-by-step guide to running sales-ops end-to-end. If you want the high-level overview, see [README.md](README.md).

---

## Table of contents

1. [First-time setup (15 min, once)](#first-time-setup)
2. [The 4 user-layer files](#the-4-user-layer-files)
3. [The commands, in order of frequency](#the-commands)
4. [What each command produces](#what-each-command-produces)
5. [Free-tier reality check](#free-tier-reality-check)
6. [The HITL rule (non-negotiable)](#the-hitl-rule)
7. [A typical week](#a-typical-week)
8. [Troubleshooting](#troubleshooting)

---

## First-time setup

### Prerequisites

- Node.js 18+ installed
- Claude Code CLI installed and authenticated
- Optional: direnv (`brew install direnv`) for automatic env-var loading

### Install

```bash
git clone <your-fork-of-sales-ops>
cd sales-ops
npm install
```

### Verify

```bash
node doctor.mjs
```

Expect checks for: Node version, dependencies, Playwright Chromium (required — run `npx playwright install chromium` if missing), pitch.md (missing at first), profile.yml (missing at first), case-studies.md (missing at first), portals.yml (missing at first).

All the "missing" ones get created in the next steps.

---

## The 4 user-layer files

These are YOUR files. They are gitignored. sales-ops will NEVER auto-update them.

### 1. `pitch.md` — what you sell

Create `pitch.md` in the project root. Cover:
- Product name and one-line description
- Value prop (in your words, not industry jargon)
- Top 3 differentiators
- Pricing tiers (approximate is fine)
- Target customer profile
- Website URL

Keep it under 2 pages. The LLM reads this whenever it drafts outreach.

### 2. `config/profile.yml` — ICP + deal economics

```bash
cp config/profile.example.yml config/profile.yml
```

Edit and fill in:
- `seller.full_name`, `seller.email`, `seller.company`, `seller.calendar_link`
- `icp.industries`, `icp.company_size`, `icp.geographies`, `icp.funding_stages`
- `icp.tech_signals_positive` / `_negative`
- `icp.buying_triggers` — events that signal a prospect is actively buying
- `personas` — which titles sign the check (mark `economic_buyer: true` for the real signer)
- `deal.typical_acv_usd`, `deal.sales_cycle_days`, `deal.walk_away_acv_usd`
- `disqualifiers` — hard "do not pursue" rules

Be specific. Vague ICPs produce vague qualification scores.

### 3. `modes/_profile.md` — your voice and archetypes

```bash
cp modes/_profile.template.md modes/_profile.md
```

Edit to define:
- **Your buyer archetypes** — 3-5 distinct profiles (e.g., "Post-Incident Buyer", "Greenfield Builder", "Compliance Stacker"). The LLM picks the best-matching archetype per prospect.
- **Your outreach voice** — tone rules, signature moves, phrases you never use
- **Your case-study mapping** — which case study to lead with for each archetype
- **Your objection playbook** — the 5-6 objections you hear most and your best response to each
- **Your cadence timing** — default touch days/channels
- **Your qualifying questions** — what you ask on the first discovery call

This is the file that most differentiates your output from generic SDR slop. Worth investing 30 minutes.

### 4. `case-studies.md` — customer wins

Your source of truth for every customer reference. Format per win:
- Customer name (real or anonymized like "a 25-person AI startup")
- Situation / problem
- Action / what you did
- Result with **specific metrics**
- Optional: quote from the champion
- Tags: which archetype this fits

sales-ops will **never** invent a customer. If `case-studies.md` doesn't have a relevant win for an archetype, outreach falls back to pattern-level framing ("most of our customers in this stage...") rather than fabricating.

### Optional: API keys for lead enrichment

Most users sign up for at least one enrichment source. See [docs/LEAD_ENRICHMENT.md](docs/LEAD_ENRICHMENT.md).

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and paste your API keys. NEVER paste keys into any other file. `.envrc` is tracked in git; `.env.local` is gitignored.

Supported sources:
- **Apollo.io** (free: company data) — https://www.apollo.io/sign-up
- **Hunter.io** (free: 25 emails + 50 verifications/mo) — https://hunter.io/users/sign_up
- Snov.io, Prospeo.io, Skrapp.io — additional email-finder sources

Then flip `enabled: true` for each you have a key for in [portals.yml](portals.yml) under `lead_db`.

---

## The commands

Start Claude Code in the project directory:

```bash
cd sales-ops
claude
```

Then use these inside the Claude session:

### Discovery

| Command | What it does |
|---------|--------------|
| `/sales-ops` | Show the command menu |
| `/sales-ops scan` | Find new prospects matching your ICP. Uses `manual_accounts` in portals.yml + Apollo `organizations/search` + WebSearch queries. Emits candidates to `data/pipeline.md`. |

### Qualification

| Command | What it does |
|---------|--------------|
| `/sales-ops {company-url}` | Auto-pipeline: resolve → qualify → report → tracker for one prospect |
| `/sales-ops {company-name}` | Same, if you only have a name |
| `/sales-ops qualify {company}` | Explicit single-prospect qualification |
| `/sales-ops pipeline` | Qualify every URL currently pending in `data/pipeline.md` |
| `/sales-ops batch` | Parallel qualification for 10+ URLs at once (uses `claude -p` subagents) |

### Outreach (HITL — never sends)

| Command | What it does |
|---------|--------------|
| `/sales-ops outreach {NNN}` | Draft 3 email variants + 3 LinkedIn DM variants per contact + call opener + voicemail for prospect #NNN |
| `/sales-ops followup` | Show overdue prospects by cadence stage, draft next-touch messages |

### Analysis

| Command | What it does |
|---------|--------------|
| `/sales-ops tracker` | Pipeline overview: stages, reply rate, meeting rate, win rate |
| `/sales-ops patterns` | Conversion-pattern analysis (requires 10+ prospects with outcomes) |

### Support scripts (outside Claude, in your shell)

| Command | What it does |
|---------|--------------|
| `node doctor.mjs` | Setup validation + enrichment-key detection |
| `node verify-pipeline.mjs` | Tracker health check (canonical stages, valid links, no duplicates) |
| `node merge-tracker.mjs` | Merge batch TSV additions into `data/prospects.md` |
| `node dedup-tracker.mjs` | Remove duplicate tracker entries |

---

## What each command produces

### `/sales-ops {company}` (auto-pipeline)

- `reports/NNN-{company}-{date}.md` — 7-block qualification (A: Account Snapshot, B: ICP Fit, C: Buying Signals, D: Decision-Maker Map, E: Outreach Angle, F: Objection Prep, G: Prospect Legitimacy)
- Tracker row in `data/prospects.md` with score, stage, report link
- A one-line recommendation at the bottom: Proceed / Nurture / No-Fit

### `/sales-ops outreach {NNN}`

- `output/drafts/NNN-{company}-touch1-{date}.md` (or similar) with:
  - Email: 3 variants per recipient (trigger-led, customer-led, question-led)
  - LinkedIn DM: 3 variants per recipient, ≤300 chars, `Hi {FirstName},` greeting
  - Call opener: 20-second script + discovery questions + soft close
  - Voicemail: 15-second script
  - "Before you send" review notes: fact-check items, warm-intro paths to investigate
  - Recommended variant with reasoning

**The tracker does NOT move to Contacted automatically.** You send the message yourself, then tell Claude "sent Variant A to James" — and only then does the tracker update.

### `/sales-ops scan`

- New candidates appended to `data/pipeline.md` (Pending section)
- Log entries in `data/scan-history.tsv` with source + date
- Summary printed: N accounts scanned, N candidates emitted, sources breakdown

### `/sales-ops tracker`

- Counts by stage (Discovered / Researched / Contacted / Engaged / Meeting-Booked / Qualified / Proposal / Closed-Won / Closed-Lost / No-Fit / Nurture)
- Avg qualification score
- Reply rate (Contacted → Engaged)
- Meeting rate (Engaged → Meeting-Booked)
- Win rate (Proposal → Closed-Won)
- Oldest active prospect with days since last touch

---

## Free-tier reality check

Honest table of what each data field actually looks like on a free-only setup:

| Field | Source | Coverage |
|-------|--------|----------|
| Company metadata (name, employees, funding, industry, LinkedIn URL) | Apollo `organizations/enrich` | 🟢 High — tested working on real companies |
| ICP filter discovery | Apollo `organizations/search` | 🟢 High — returns ~25 companies per query |
| Decision-maker names + titles | WebSearch + Apollo enrich | 🟡 Medium — usually surfaces 1-3 execs per company |
| Direct LinkedIn profile URL | WebSearch `site:linkedin.com/in` | 🟢 Good — most execs findable |
| Verified email | Hunter free (25/mo) / Snov / Prospeo / Skrapp | 🟡 Limited — ~125/mo combined across free tiers |
| Phone number | None on free tier | 🔴 Very limited — opt for paid Apollo or Lusha |
| Funding / press triggers | WebSearch | 🟢 High |
| Buying-signal recency | WebSearch | 🟢 High |

**Bottom line:** the free stack gives you company + LinkedIn coverage. Emails are partial. Phones are a gap. For full coverage including phones, Apollo Basic ($49/mo) is the cheapest single-vendor option.

---

## The HITL rule

**sales-ops drafts. You send. Always.**

- `outreach` and `followup` output drafts for copy-paste
- No tool in the pipeline has send-email or post-message access
- Tracker stage transitions to `Contacted` / `Engaged` only after you confirm you sent
- `/sales-ops auto-pipeline` never auto-drafts outreach — it stops after qualification and asks

This is non-negotiable. It's what keeps the system from becoming a spam cannon.

---

## A typical week

**Monday — Discovery**
```
/sales-ops scan
```
Review candidates in `data/pipeline.md`. Thin the list if needed.

**Tuesday — Qualification**
```
/sales-ops pipeline
```
Or if just a few: `/sales-ops {url}` per prospect. Sort tracker by score. Score ≥4.5 = today; 4.0-4.4 = this week; <4.0 = Nurture or skip.

**Wednesday — Outreach (HITL)**
For each 4.5+ prospect:
```
/sales-ops outreach {NNN}
```
Review variants, pick one, edit to your voice, send yourself, then tell Claude which variant you sent. Tracker moves to `Contacted`.

**Thursday-Friday — Follow-up**
```
/sales-ops followup
```
Drafts next touches for overdue prospects. Review and send each yourself.

**End of month — Learn**
```
/sales-ops patterns
```
Needs 10+ outcomes to be useful. Tells you which archetypes / industries / score ranges actually converted this month. Use it to tighten ICP for next month.

---

## Troubleshooting

### The system still behaves like career-ops / old mode files

You changed a mode file and the next command still acts old. Fix:
```bash
exit    # inside Claude Code
claude  # restart
```
Claude Code caches the mode files within a session. Fresh session picks up the latest.

### "Invalid access credentials" from Apollo

Your API key is wrong, expired, or got pasted with extra characters. Check:
```bash
echo "${APOLLO_API_KEY:0:3}..."
```
Expect an Apollo-formatted key (22 characters, alphanumeric + underscores). If this prints a shell command or garbage, open [.env.local](.env.local) and make sure the `APOLLO_API_KEY=""` line has only the key between the quotes.

**Never paste API keys into chat / tickets / screenshots.** If a key leaves your machine, rotate it at the source's dashboard.

### `doctor.mjs` says "No lead enrichment API keys set"

The env vars aren't loaded in the shell running doctor. If you use direnv: `direnv allow`. Otherwise: `source .env.local`. Then re-run `node doctor.mjs`.

### Tracker row got truncated / wrong columns

[merge-tracker.mjs](merge-tracker.mjs) auto-detects sales-ops (11 columns) vs career-ops legacy (9 columns). If you see weird truncation, run:
```bash
node merge-tracker.mjs --dry-run
```
...and check the top line — it should say `Schema: sales-ops (11-col)`. If not, the tracker header may have been corrupted; restore the header row and re-run.

### Outreach drafts have em-dashes / no greeting / other rule violations

Session context is biasing the LLM toward earlier bad outputs. Restart Claude Code (see first troubleshooting item). If it persists after restart, the prompt rules need tightening — open an issue with the exact output you saw.

### Apollo returns `API_INACCESSIBLE` on an endpoint

That endpoint is paid-tier only. On Apollo free, `organizations/enrich` and `organizations/search` work; `people/match`, `mixed_people/search`, and `organizations/job_postings` are paid. The system detects this and falls back to WebSearch silently.

### I want to find leads without providing any target list

Configure `search_queries` in [portals.yml](portals.yml) with queries matching your ICP (funding signals, compliance hires, EU expansion mentions). Then `/sales-ops scan` will run them and populate the pipeline. Apollo's `organizations/search` also does ICP-filtered discovery without any manual list — just tune the filters in the YAML.

### How do I reset everything and start over?

```bash
rm -f pitch.md case-studies.md config/profile.yml modes/_profile.md portals.yml .env.local
rm -rf data/prospects.md data/pipeline.md data/follow-ups.md reports/*.md
```

(User-layer files; the system layer is untouched.) Then re-do the [First-time setup](#first-time-setup).

---

## Next steps

- If your sales motion scales, read [docs/LEAD_ENRICHMENT.md](docs/LEAD_ENRICHMENT.md) for multi-source enrichment setup
- If you want to run `/sales-ops scan` on a schedule, see the `/loop` or `/schedule` Claude Code skills
- Read [CLAUDE.md](CLAUDE.md) for the data contract (what's user-layer vs system-layer), ethical use rules, and canonical stages

Questions? File an issue or ask inside Claude directly — the system can read its own code.
