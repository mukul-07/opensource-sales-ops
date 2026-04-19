# Mode: qualify — Full A-G Prospect Evaluation

When the user pastes a prospect (company URL, LinkedIn page, job post, or a company name), deliver ALL 7 blocks (A-F evaluation + G legitimacy).

## Step 0 — Archetype Detection

Classify the prospect into one of the buyer archetypes from `modes/_profile.md` (fall back to those in `_shared.md` if `_profile.md` hasn't been customized). If it's hybrid, name the 2 closest. This determines:

- Which pain hypothesis to lead with in Block E
- Which case study from `_profile.md` to reference
- Which objection playbook to queue up in Block F

Before generating the blocks, use Playwright or WebFetch to verify the company is alive (website + careers/about page load). If the site is 404 or clearly dead, stop — write a minimal No-Fit report and flag in tracker.

## Block A — Account Snapshot

Table with:

- Company name
- Website + HQ country
- Industry (mapped to `icp.industries`)
- Employee count (range if exact unknown)
- Funding stage / last round / date
- Revenue or ARR signal (if public)
- Tech stack signals observed (mapped to `icp.tech_signals_positive` / `_negative`)
- TL;DR in 1 sentence

Source every fact. If a fact is inferred, label it `(inferred)` with the reasoning in one short clause.

## Block B — ICP Fit

Read `config/profile.yml#icp`. For each ICP dimension, score 1-5 and cite what from Block A supports the score:

| Dimension | Target (profile.yml) | Observed (Block A) | Score | Note |
|-----------|----------------------|--------------------|-------|------|
| Industry | ... | ... | ... | ... |
| Employee range | ... | ... | ... | ... |
| Funding stage | ... | ... | ... | ... |
| Geography | ... | ... | ... | ... |
| Tech signals | ... | ... | ... | ... |

**Disqualifier check:** Walk through every entry in `profile.yml#disqualifiers` and `_profile.md#your-disqualifiers-supplemental`. If any are true, stop the report here and mark `No-Fit` in the tracker with the firing disqualifier in Notes.

**Archetype-adapted framing** (per `_profile.md`):
- Fast-Growth Fintech → emphasize recent funding + hiring velocity
- Post-Incident Buyer → emphasize the incident + new hire context
- Vendor Displacement → emphasize incumbent complaints + renewal timing
- Greenfield Builder → emphasize headcount + function absence
- (and whatever else the user defined in `_profile.md`)

## Block C — Buying Signals

Use WebSearch to find evidence for each trigger in `profile.yml#icp.buying_triggers`. Table:

| Trigger | Evidence | Recency | Strength (1-5) |
|---------|----------|---------|----------------|
| Funding in last 6mo | ... | 2026-02 | 5 |
| Hired head of {function} in last 3mo | ... | — | 1 |
| Posted {N} relevant roles | ... | rolling | 4 |
| ... | ... | ... | ... |

**Strength score rubric:**
- 5: Explicit, dated, high-confidence (press release, SEC filing, official blog)
- 4: Strong indirect (LinkedIn post from exec, credible reporter)
- 3: Inferred from multiple weak signals
- 2: Rumor / old (6-12mo) / single unverified source
- 1: No evidence or contradicting evidence

Compute Block C score = max of strengths (not average — a single strong trigger is what makes a prospect timely).

## Block D — Access (Decision-Maker Map)

Find the 1-3 people who matter for this deal. For each, emit:

| Role | Name | Title | LinkedIn | Email | Confidence | Source | Intro path |
|------|------|-------|----------|-------|------------|--------|------------|

**`LinkedIn` column: emit the DIRECT profile URL**, not a search-query link. Use the resolution chain below. If you can't resolve a direct URL, write `TBD` plus the search URL as a human fallback — do NOT pretend a search URL is a profile URL.

**`Email` column: emit the best available address**, labeled with confidence.

**`Confidence` column: one of:**
- `verified-apollo`, `verified-hunter`, `verified-snov`, `verified-prospeo`, `verified-skrapp` — API returned an email and flagged it valid
- `verified-web` — email found published on the person's website, GitHub, blog, or a reputable source
- `TBD` — no email resolved via API or web; user must find it manually before outreach. **Never guess.**

**`Source` column:** name of the tool or search that produced the LinkedIn + email (e.g., `apollo`, `hunter + webscrape`, `websearch only`).

### Resolution chain (run in order, stop when you have enough)

**Step 1 — WebSearch for direct LinkedIn URL.** For each contact, run:
```
WebSearch: "{Full Name}" "{Company}" site:linkedin.com/in
```
The first or second result is usually the direct profile URL (`https://linkedin.com/in/slug` or country variants like `uk.linkedin.com/in/slug`). Emit that URL. If Google returns only company search links, note TBD.

**Step 2 — If `portals.yml#lead_db` has enabled sources, query them in order.** For each enabled source (Apollo → Hunter → Snov → Prospeo → Skrapp):

- Check if the env var from `api_key_env` is set. If not, skip this source silently.
- Call the endpoint via Bash `curl` with auth per the source's docs. The per-source setup lives in `docs/LEAD_ENRICHMENT.md`.
- Parse the response. Extract: name, title, LinkedIn URL, email, verification flag.
- Label every fact with its source (e.g., `email via apollo`).
- Merge results across sources by LinkedIn URL + email domain. If two sources return conflicting emails for the same person, keep both and flag: `email: jane@acme.com [apollo] | jane.doe@acme.com [hunter]`.

**Step 3 — If nothing resolves, emit TBD.** Do NOT guess an email. Do NOT apply a pattern like `firstname@domain` and label it "inferred" — pattern guessing bounces, damages sender reputation, and gets the user flagged as spam. If no API or web source returned a verified email, the Email column is `TBD` with a short note on what was tried and a suggestion:

> TBD — Apollo returned no match for this person. Recommend: find their email manually via the company's team page, a published talk, or a paid-tier lookup before outreach.

### Hard rules

- NEVER invent a LinkedIn URL. The URL must come from WebSearch or an API.
- NEVER invent or guess an email. Verified via API/web or `TBD`. No middle ground. Pattern inference (`firstname@domain`) is banned — it bounces.
- NEVER paste API keys. Keys come from env vars only.
- If a contact is a public founder / exec, a single reliable web citation is enough — don't burn 5 API calls on someone easy to find.
- If `lead_db` has zero enabled sources, Step 1 + Step 3 still produce usable output. The APIs are additive, not required.

### Economic buyer

Call out which contact is the Economic Buyer (per `profile.yml#personas` where `economic_buyer: true`). If you can't identify them from public sources, write `TBD` — do NOT invent.

### Access score (1-5)

- 5: EB identified with verified email + direct LinkedIn + warm intro path
- 4: EB identified with verified email + direct LinkedIn
- 3: EB identified with direct LinkedIn only (email TBD — user must resolve before outreach)
- 2: Only influencer / champion identifiable, not EB
- 1: No public contact data for anyone relevant

### Intro paths to check (via WebSearch)

- Mutual LinkedIn connections (if `profile.yml#seller.linkedin` is set)
- Shared alma maters / past companies with the seller's background
- Portfolio / investor overlap
- Content engagement (did the EB like / comment on anything relevant recently?)

## Block E — Outreach Angle

This is what the outreach mode will render into an actual email/DM. Draft the angle here; do not draft the full message yet — that happens when the user runs `/sales-ops outreach`.

| Field | Content |
|-------|---------|
| Trigger | The specific event from Block C you'll lead with |
| Pain hypothesis | The concrete problem the trigger creates, in their language |
| Relevance | The ONE metric or named customer (from `case-studies.md` via `_profile.md#your-go-to-case-studies`) that matches this archetype |
| Ask | The soft one-step ask (learn? 15-min chat? send a specific artifact?) |
| Subject line | 3-5 words, lowercase, specific. No "quick question" or "touching base". |

**Example (for an archetype = Fast-Growth Fintech):**

```
Trigger:        "Saw the Series C announcement + the 3 Risk roles posted since Feb"
Pain:           "At Series C with a growing risk team, homegrown rules start costing more engineering than vendor tooling"
Relevance:      "{similar-customer} switched from homegrown -> us in 3 weeks, cut chargebacks 40% ({customer-win-1})"
Ask:            "Worth 15 min to compare notes on how they structured the migration?"
Subject:        "series c + risk hiring"
```

## Block F — Objection Prep

For this archetype, list the top 3-5 objections the user should expect and pre-draft the response. Pull from `_profile.md#your-objection-playbook`; if the user hasn't customized it, fall back to `_shared.md` defaults.

| # | Likely objection | Response (from `_profile.md`) |
|---|-------------------|-------------------------------|
| 1 | ... | ... |
| 2 | ... | ... |
| 3 | ... | ... |

Also draft: the 1-2 discovery questions from `_profile.md#your-qualifying-questions` that best fit this archetype. These are what the user opens with on the first call, not the cold touch.

## Block F+ — Co-sell / Partnership Check (conditional)

**Emit this block ONLY if the prospect is an adjacent vendor, not a typical buyer.** Examples of "adjacent":

- They sell a complementary product to the same ICP the user sells to (e.g., they do AI security, user does AI Act compliance — both land in an AI buyer's stack)
- They integrate with or complement the user's product rather than competing with it
- They have a customer base that looks like the user's ICP (not just an ICP match themselves)

If any of the above is true, emit:

```
## F+) Co-sell / Partnership opportunity

This prospect is adjacent to your ICP, not directly in it:
- What they do: {1 line}
- Overlap with your motion: {specific complementary angle}
- Shared buyer profile: {who buys both}

Three paths forward:
  1. Treat as a regular customer (pitch the product direct)
  2. Explore a co-sell / referral partnership (they close for us, we close for them)
  3. Integration / OEM (bundle into their deliverable)

RECOMMEND: ask the user which path they want before generating outreach.
Different path = different outreach framing.
```

If none of the above applies (prospect is a pure ICP-match customer), SKIP this block entirely. Do not emit it for clarity.

**Why this block exists:** when a prospect's offering is adjacent/complementary to yours rather than a pure ICP fit, a report can surface an unprompted co-sell angle. Rather than picking a path by default, the system should ask the user — the motion (direct-sell vs partner vs integrate) is fundamentally different in outreach, discovery questions, and expected cycle length.

## Block G — Prospect Legitimacy

Assess whether this is a real, buyable company — not a competitor, dead business, student project, or stale record. This is qualitative; it does NOT affect the Global score but it DOES decide whether to proceed.

**Ethical framing:** Present observations, not accusations. Every signal has legitimate explanations. The user decides.

### Signals to check (in order):

**1. Liveness** (Playwright snapshot):
- Website loads, has content in last 12mo
- Careers / About page present
- LinkedIn company page has posts in last 90d

**2. Realness**:
- Press mentions in last 12mo
- Employees with active LinkedIn profiles
- Revenue / funding / headcount at least roughly consistent across sources

**3. Competitor check**:
- Does this company already sell what the user sells? Check pitch.md for category, then WebSearch `"{company}" "{category}"`.
- If YES -> not a buyer; flag Suspicious and stop further investment.

**4. Trigger recency**:
- Primary trigger from Block C < 90 days -> strong
- 90-180 days -> okay
- >180 days -> stale, caveat the report

**5. Contact signal**:
- Decision maker from Block D has LinkedIn activity in last 30d -> strong
- Present but inactive -> neutral
- No online presence for any listed exec -> suspicious

### Output format:

**Assessment:** One of:
- **High Confidence** — Real, active, buyable
- **Proceed with Caution** — Mixed signals, verify 1-2 before investing
- **Suspicious** — Competitor / dead / fake; do not pursue

**Signals table:** Each signal observed with finding and weight (Positive / Neutral / Concerning).

**Context Notes:** Caveats that explain concerning signals (quiet period, private company, regulated industry, etc.).

### Edge cases:

- **Private / stealth companies:** Limited public data is normal. Don't penalize for absence of press if the product exists.
- **Regulated industries** (banks, healthcare): Slower LinkedIn/press cadence is expected.
- **Companies outside the user's geography:** Language / locale may hide signals; note limited visibility rather than scoring Suspicious.
- **Recent name change / M&A:** WebSearch both old and new names before concluding dead.
- **No data available:** Default to "Proceed with Caution", never "Suspicious" without evidence.

---

## Post-qualification

**ALWAYS** after generating blocks A-G:

### 1. Save report .md

Save the full evaluation to `reports/{###}-{company-slug}-{YYYY-MM-DD}.md`.

- `{###}` = next sequential number (3 digits, zero-padded)
- `{company-slug}` = company name lowercase, dashes for spaces
- `{YYYY-MM-DD}` = today's date

**Report header:**

```markdown
# Qualification: {Company} — {Primary Contact or "TBD"}

**Date:** {YYYY-MM-DD}
**URL:** {company website or source URL}
**Archetype:** {detected}
**Score:** {X.X/5}
**Legitimacy:** {High Confidence | Proceed with Caution | Suspicious}
**Est ACV:** {USD range from Block B/C assessment}

---

## A) Account Snapshot
...

## B) ICP Fit
...

## C) Buying Signals
...

## D) Access (Decision-Maker Map)
...

## E) Outreach Angle
...

## F) Objection Prep
...

## G) Prospect Legitimacy
...

---

## Keywords
(15-20 keywords from the account's public footprint — used by patterns mode for conversion analysis)
```

### 2. Register in tracker

Write TSV to `batch/tracker-additions/{num}-{company-slug}.tsv`. Single line, 11 tab-separated columns matching `data/prospects.md`:

```
{num}\t{date}\t{company}\t{contact}\t{title}\t{stage}\t{score}/5\t{last_touch}\t{next_touch}\t[{num}](reports/{num}-{slug}-{date}.md)\t{note}
```

- `stage` = `Researched` (default after qualify) or `No-Fit` (if disqualifier fired)
- `score` = Global score, format `X.X/5`
- `last_touch` = `—` (no outreach yet)
- `next_touch` = date to first outreach (from `_profile.md` cadence Touch 1, usually today+0 or today+1)

Run `node merge-tracker.mjs` after writing the TSV (or rely on batch to merge at the end).

### 3. Recommendation

One line at the end of the report:

- Score >= 4.5 AND legitimacy=High Confidence -> **"Proceed to outreach. Run `/sales-ops outreach {num}`."**
- Score 4.0-4.4 -> **"Include in next batch cadence."**
- Score 3.5-3.9 -> **"Park in Nurture; revisit in 60 days."**
- Score < 3.5 OR disqualifier fired -> **"No-Fit. Do not pursue."**
- Legitimacy = Suspicious -> **"Investigate manually before any outreach."** (override score-based rec)
