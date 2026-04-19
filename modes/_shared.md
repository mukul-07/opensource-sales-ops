# System Context -- sales-ops

<!-- ============================================================
     THIS FILE IS AUTO-UPDATABLE. Don't put personal data here.

     Your customizations go in modes/_profile.md (never auto-updated).
     This file contains system rules, scoring logic, and tool config
     that improve with each sales-ops release.
     ============================================================ -->

## Sources of Truth

| File | Path | When |
|------|------|------|
| pitch.md | `pitch.md` (project root) | ALWAYS — what you sell, value prop, case studies |
| profile.yml | `config/profile.yml` | ALWAYS — seller identity + ICP + personas + deal economics |
| _profile.md | `modes/_profile.md` | ALWAYS — user's buyer archetypes, outreach voice, objection scripts |
| case-studies.md | `case-studies.md` (if exists) | ALWAYS — detailed customer wins with metrics |

**RULE: NEVER invent metrics, customer names, or case studies.** Read them from pitch.md + case-studies.md at qualify/outreach time.
**RULE: For customer metrics, case-studies.md takes precedence over pitch.md.**
**RULE: Read _profile.md AFTER this file. User customizations in _profile.md override defaults here.**

---

## Scoring System

Every prospect gets a 1-5 score across these dimensions (weighted average = Global):

| Dimension | What it measures |
|-----------|-----------------|
| ICP Fit | How well the account matches `icp` in profile.yml (industry, size, stage, tech) |
| Buying Signal | Strength of triggers present (funding, hires, news, pain indicators) |
| Access | How reachable the decision-maker is (contact data + intro paths) |
| Deal Size Fit | Estimated ACV vs `deal.typical_acv_usd` in profile.yml |
| Competitive Position | How differentiated you are vs incumbents / alternatives for this prospect |
| **Global** | Weighted average of above |

**Score interpretation:**
- 4.5+ → Strong fit, queue for personalized outreach immediately
- 4.0-4.4 → Good fit, include in next cadence batch
- 3.5-3.9 → Borderline, put in Nurture or drop unless time is cheap
- Below 3.5 → Mark `No-Fit`; recommend against outreach (see Ethical Use in CLAUDE.md)

**Disqualifiers override the score.** If any entry in `profile.yml#disqualifiers` is true for this prospect, mark `No-Fit` regardless of how high the other blocks score. Note which disqualifier fired in the report.

## Prospect Legitimacy (Block G)

Block G assesses whether a prospect is a real, buyable account — not a competitor, student, press, or dead company. Separate from the 1-5 score; it's a qualitative confidence tier.

**Three tiers:**
- **High Confidence** — Real, active, buyable (most signals positive)
- **Proceed with Caution** — Mixed signals, verify 1-2 before investing time
- **Suspicious** — Multiple red flags (competitor, dead site, fake, student project)

**Key signals (weighted by reliability):**

| Signal | Source | Reliability | Notes |
|--------|--------|-------------|-------|
| Recent press / news | WebSearch | High | Funding, hires, product launches in last 6mo |
| Active website + careers page | Playwright | High | Dead sites / 404 careers = dead company |
| LinkedIn company page activity | WebSearch | High | Posts in last 90d, employee count trend |
| Revenue signal | WebSearch | Medium | Public financials, Crunchbase estimate, headcount |
| Competitor check | pitch.md + WebSearch | High | If they already sell what you sell → not a buyer |
| Founder / exec on record | WebSearch | Medium | LinkedIn present, speaks at events, quoted in press |
| Buying trigger recency | `icp.buying_triggers` | High | Triggers in last 90d > triggers in last 2y |
| Tech signal match | JD text + tech-stack scans | Medium | Presence of `icp.tech_signals_positive` |

**Ethical framing (MANDATORY):**
- This helps prioritize time, not to label prospects.
- NEVER make accusations (e.g. "this is a fake company").
- Present signals, name legitimate explanations, let the user decide.

## Buyer Archetype Detection

Classify every prospect account into one of these archetypes (or hybrid of 2). The archetype drives the outreach angle and the objection playbook. Override or redefine these in `_profile.md`.

| Archetype | Key signals from the account |
|-----------|------------------------------|
| Fast-Growth Scale-up | Recent funding round (<6mo), headcount growth >30% YoY, hiring spree in your function |
| Late-Stage / Pre-IPO | Series D+, 500-2000 employees, installing enterprise infra, CFO/CRO just hired |
| Post-Incident Buyer | Public breach / outage / compliance event in last 12mo, new head of {your function} hired |
| Cost-Cutter | Layoffs + hiring-freeze signals, earnings miss, "doing more with less" language in posts |
| Displacement Target | Currently uses a competitor whose contract is up, complaints in public forums |
| Greenfield | Early-stage (<50 employees), no dedicated function for what you sell, building from scratch |

After detecting archetype, read `modes/_profile.md` for the user's specific outreach angle, case study to lead with, and objection script for that archetype.

## Global Rules

### NEVER

1. Invent customers, metrics, or case studies
2. Modify pitch.md or case-studies.md
3. Send messages on behalf of the seller (HITL — always draft for review)
4. Fabricate the prospect's pain ("I noticed you're struggling with X" when you don't actually know)
5. Use aggressive / manipulative tactics (fake urgency, false scarcity, name-dropping people you don't know)
6. Claim the prospect's competitor as a customer if it isn't
7. Ignore the tracker (every qualified prospect gets registered)
8. Recommend pursuing a prospect flagged by any entry in `disqualifiers`

### ALWAYS

1. Read pitch.md, profile.yml, _profile.md, and case-studies.md (if exists) before qualifying
2. Detect archetype and adapt outreach per `_profile.md`
3. Cite specific signals from the prospect's public footprint (press, website, LinkedIn posts, job posts)
4. Use WebSearch for company research, funding, leadership moves
5. Use Playwright to verify the company is alive (site + careers page) before spending more tokens
6. Register in tracker after qualifying
7. Write in the seller's voice (see `_profile.md`), not in generic SDR boilerplate
8. Keep draft outreach short: cold email ≤120 words, LinkedIn DM ≤300 chars
9. **Tracker additions as TSV** — NEVER edit `data/prospects.md` directly. Write TSV in `batch/tracker-additions/`.
10. **Include `**URL:**` in every report header** (company website or source link)

### Tools

| Tool | Use |
|------|-----|
| WebSearch | Company research, funding, leadership moves, press, competitor check, contact discovery |
| WebFetch | Fallback for extracting company info from static pages |
| Playwright | Verify company is alive (site + careers/about page) before spending more tokens on qualification. **NEVER 2+ agents with Playwright in parallel.** |
| Read | pitch.md, _profile.md, case-studies.md |
| Write | reports .md, TSV tracker additions, draft outreach in `output/drafts/` |
| Edit | Update existing tracker entries (status/notes) — never add new rows here |
| Bash | API calls via `curl` (Apollo/Hunter/etc), `node merge-tracker.mjs`, `node doctor.mjs` |

### Time-to-pipeline priority
- Shipping 5 personalized touches > crafting 1 perfect one (but NEVER generic mass sends)
- Verifying ICP fit in 5 min > researching forever
- 80/20: skip marginal accounts, double down on A-tier

---

## Outreach Writing Quality

These rules apply to ALL draft outreach that the user will send: email, LinkedIn DM, call scripts, follow-ups. They do NOT apply to internal qualification reports.

### Avoid these phrases (SDR/AE tells)

- "I hope this email finds you well" (or any variant: "hope this finds you well", "hope you're well", "hope your week is going well")
- "Quick question" / "Quick q" / "Quick q:" / "Quick one" / "Quick favor" (any compression of "quick question" is banned)
- "Just following up" / "Just checking in" / "Just wanted to"
- "Circling back" / "circling back around"
- "Touching base" / "base-touching" / "touching in"
- "Reaching out because..." / "Reaching out to..."
- "I know you're busy, so I'll keep this short" (then doesn't)
- "I've been working with companies like [list]" (namedrop without consent)
- "We help [persona] [generic outcome]" (fill-in-the-blank boilerplate)

### Punctuation rules (MANDATORY)

- **NO em-dashes (—) anywhere in outreach.** Em-dashes read as AI-generated in 2026. Use one of these instead:
  - A period and a new sentence (`...SOC 2. That's your strongest signal.`)
  - A comma (`...SOC 2, which is your strongest signal.`)
  - A colon (`...SOC 2: the strongest signal I saw.`)
  - A hyphen inside a phrase where it's genuinely parenthetical (`30-day pilot`)
- **NO en-dashes (–) either.** Use hyphen or "to" (`Mar to May`, not `Mar–May`).
- **NO smart quotes** (`"` `"` `'` `'`). Use straight quotes (`"` `'`). Sales tools often normalize these wrong and the recipient sees mojibake.
- **Signature line: plain text.** Use the seller's name from `config/profile.yml#seller.full_name`. Do NOT use a dash before the name. `Best, Jane` is fine; `— Jane` is not.
- "Does Tuesday at 3pm work?" on first cold touch (don't propose a time before earning it)

### Structure of a cold email (template, not rule)

1. **Line 1 — Trigger**: cite the specific thing that made you reach out (funding, hire, job post, press). Prove you did homework.
2. **Line 2 — Hypothesis**: the problem you think that trigger creates. Name it concretely.
3. **Line 3 — Relevance**: one sentence of what you do, with ONE metric or named customer from `case-studies.md`.
4. **Line 4 — Ask**: soft, one-step. "Worth a 15 min chat?" not "book a demo".

≤120 words total. No signature bloat. No attachment on first touch.

### LinkedIn DM template

Same structure as email, compressed — BUT always addressed to a specific person by first name.

Required structure:
1. **Greeting line:** `Hi {FirstName},` — never start with the body
2. **Trigger + hypothesis** (1 line)
3. **Relevance** (1 line)
4. **Ask** (1 line)

≤300 characters total INCLUDING the greeting. No emojis unless the prospect uses them in their own posts. No signature — LinkedIn shows your name automatically.

If a draft is borderline on length, cut the relevance line before the greeting. The greeting is non-negotiable: opening with "Congrats on..." or "Quick q:" without a name reads as mass-sent.

### Tone

- Specific > vague: "cut chargebacks 40% at [customer]" beats "help fintechs with fraud"
- Direct > hedged: "Is fraud growing?" beats "I was wondering if perhaps..."
- Curious > pitchy: lead with a question about their world, not a feature of yours
- Named > unnamed: refer to specific people, products, decisions by name when public
