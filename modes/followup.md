# Mode: followup -- Sales Cadence Tracker

## Purpose

Track multi-touch outreach cadence for active prospects. Flag overdue touches, draft the next touch using context from the qualification report, and log touches as the user sends them. **Never sends.**

## Inputs

- `data/prospects.md` — Prospect tracker
- `data/follow-ups.md` — Touch history (created on first use)
- `reports/` — Qualification reports for context
- `config/profile.yml` — Seller identity + personas
- `modes/_profile.md` — Cadence timing + objection playbook
- `pitch.md` — What you sell (for relevance framing)
- `case-studies.md` (if exists) — Customer wins

## Step 1 — Run cadence script

```bash
node followup-cadence.mjs
```

Parse the JSON output. It contains:

| Key | Contents |
|-----|----------|
| `metadata` | Analysis date, total tracked, actionable count, overdue/urgent/cold counts |
| `entries` | Per-prospect: company, contact, stage, days since last touch, touch count, urgency, next touch date, channel, report path |
| `cadenceConfig` | Rules from `_profile.md` (default: Touch 2 at day 3, Touch 3 at day 7, etc.) |

If no actionable entries:
> "No prospects are due for outreach. Run `/sales-ops scan` to find new accounts, or `/sales-ops qualify` on a pasted URL."

## Step 2 — Display dashboard

Sort by urgency: urgent > overdue > due > waiting > cold.

```
Cadence Dashboard — {date}
{N} prospects tracked, {N} actionable

| # | Company | Contact | Stage | Last Touch | Touches | Next | Urgency | Channel |
```

Visual indicators:
- **URGENT** — prospect replied (Engaged); respond within 24h
- **OVERDUE** — next-touch date has passed
- **DUE TODAY** — scheduled for today
- **waiting (X days)** — on track
- **COLD** — Touch 5 sent, no reply; time to breakup or Nurture

## Step 3 — Generate next-touch drafts

For **urgent** + **overdue** entries only. For each, read:

1. The linked qualification report (Block E outreach angle, Block F objections, Block D contact)
2. `pitch.md` + `case-studies.md`
3. `config/profile.yml#seller` for sender identity
4. `modes/_profile.md` for cadence timing and archetype -> case study mapping

### Touch 2 (first follow-up, touches == 1)

- Channel: whatever `_profile.md#your-cadence-timing` says for Touch 2 (default: LinkedIn DM)
- <=300 chars (DM) or <=80 words (email)
- **New angle** — do NOT repeat Touch 1. Options:
  - Fresh data point (recent earnings, new hire, new product launch from WebSearch)
  - Named case study if Touch 1 led with trigger
  - One specific question about their world

### Touch 3 (touches == 2)

- Channel per `_profile.md` (default: email)
- Reference the prior touches implicitly ("Following on my note last week — " is fine if specific; "circling back" is banned per `_shared.md`)
- Different case study / different angle than Touches 1-2
- <=100 words

### Touch 4 (touches == 3)

- Channel: phone or LinkedIn InMail per `_profile.md`
- For phone: draft voicemail + dial script
- For InMail: reference the specific industry event / signal that refreshes the premise

### Touch 5 — breakup (touches == 4)

- Channel: email
- Short. Structure: "Closing the loop — if this isn't the right time I'll stop pinging. If it is, one reply is all it takes."
- No guilt trips, no fake urgency.
- After sending, move prospect to `Nurture` (system prompts this).

### Responded / Engaged (URGENT)

Different drafter — the prospect said something. Draft a reply that:
1. References what they said specifically
2. Advances by ONE step (book the call, answer the question, send the requested artifact)
3. Has one clear next step, not three

Use `_profile.md#your-objection-playbook` if their reply is an objection. Otherwise pull from Block F of the qualification report.

### Cold (touches >= 5, no reply)

Do NOT draft another touch. Tell the user:
> "{Company} has had 5 touches with no reply. Options:
> - Move to `Nurture` — revisit in 60-90 days with a new trigger
> - Mark `Closed-Lost` if you've confirmed they're not buying
> - Escalate — try a different persona at the account (run `/sales-ops qualify` on a different name)"

## Step 4 — Present drafts

For each:

```
## Touch {N}: {Company} — {Contact} ({Title})

**Channel:** {Email | LinkedIn | Phone}
**Subject / Opener:** {subject line or opener}
**Days since last touch:** {N}
**Touches sent:** {N}
**Stage:** {current stage from tracker}

---

{draft text}

---

Review notes:
- {things to verify before sending}
- {inside knowledge user might add}
```

## Step 5 — Log on user confirm

After the user confirms a touch was sent:

1. If `data/follow-ups.md` doesn't exist, create it:
   ```markdown
   # Touch History

   | # | Prospect# | Date | Company | Contact | Touch# | Channel | Variant | Notes |
   |---|-----------|------|---------|---------|--------|---------|---------|-------|
   ```

2. Append a row.

3. Update `data/prospects.md` for this prospect:
   - `stage` stays `Contacted` (or transitions to `Engaged` if they replied)
   - `last_touch` -> today's date + channel (e.g. `2026-04-18 linkedin`)
   - `next_touch` -> date of next touch per cadence
   - `notes` -> short log of this touch

**IMPORTANT:** Only log touches the user confirms they actually sent.

## Step 6 — Summary

After drafts:

> **Cadence summary** ({date})
> - {N} prospects in active outreach
> - {N} urgent (replied) — drafts above
> - {N} overdue — drafts above
> - {N} due today — drafts above
> - {N} waiting — next dates shown
> - {N} cold — consider Nurture/Lost
>
> Confirm which ones you've sent so I can log them.

## Default cadence (override in `_profile.md`)

| Touch | Day | Channel | Max |
|-------|-----|---------|-----|
| 1 | Day 0 | Email | (first touch, from `outreach` mode) |
| 2 | Day 3 | LinkedIn DM | |
| 3 | Day 7 | Email (new angle) | |
| 4 | Day 12 | Phone or InMail | |
| 5 | Day 18 | Email (breakup) | Stop after this |

These can be overridden via `node followup-cadence.mjs --touch2-days N`.
