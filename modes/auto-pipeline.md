# Mode: auto-pipeline — Full Automatic Pipeline

When the user pastes a prospect target (URL, company name, LinkedIn company page, or a brief intent signal) without an explicit sub-command, run the whole pipeline in sequence.

## Step 0 — Resolve the target

If the input is a **URL**, extract the company context:

**Priority order:**

1. **Playwright (preferred):** Most company websites, LinkedIn pages, and job posts are SPAs. Use `browser_navigate` + `browser_snapshot` to render and read.
2. **WebFetch (fallback):** Static pages (company blogs, press releases).
3. **WebSearch (last resort):** Resolve the company by name + signals, gather context via search.

**If nothing works:** ask the user to paste the company info manually or share a screenshot.

**If the input is a plain company name or a contact name:** resolve to a primary domain via WebSearch, then treat as URL.

**If the input is a job post URL** (Greenhouse / Ashby / Lever / LinkedIn Jobs): this is an intent signal. Treat the hiring company as the prospect, extract the role title, and flag in the report that the prospect was surfaced via a hiring signal.

## Step 1 — Qualify (Blocks A-G)

Run exactly the `qualify` mode (read `modes/qualify.md` for all blocks A-F + Block G Prospect Legitimacy).

## Step 2 — Save report .md

Save the full evaluation to `reports/{###}-{company-slug}-{YYYY-MM-DD}.md` (format per `modes/qualify.md`).

Header includes `**Legitimacy:** {tier}` and `**URL:**` (the source URL or primary company domain).

## Step 3 — Optional outreach draft (only if score >= 4.5 AND legitimacy = High Confidence)

If the prospect clears both gates, offer to draft outreach:

> "This prospect scored {X.X}/5 with High Confidence legitimacy. Want me to draft Touch 1 outreach now? (`/sales-ops outreach {NNN}`)"

**Do NOT auto-draft.** Wait for the user's confirmation. The reason: auto-drafting would tempt the user to send without reviewing the qualification report first, breaking the HITL principle.

If the user says yes, invoke the `outreach` mode. Otherwise stop after Step 4.

## Step 4 — Update tracker

Write a TSV row to `batch/tracker-additions/{NNN}-{company-slug}.tsv` with columns per `_shared.md`. Stage defaults to `Researched` (or `No-Fit` if a disqualifier fired, or `Discovered` if legitimacy is Suspicious and the user should investigate manually).

Run `node merge-tracker.mjs` to append to `data/prospects.md`.

## Step 5 — Recommendation

Close with a one-line recommendation (same logic as qualify mode's final line):

- Score >= 4.5 AND legitimacy = High Confidence -> "Proceed to outreach. Run `/sales-ops outreach {NNN}`."
- Score 4.0-4.4 -> "Include in next batch cadence."
- Score 3.5-3.9 -> "Park in Nurture; revisit in 60 days."
- Score < 3.5 OR disqualifier fired -> "No-Fit. Do not pursue."
- Legitimacy = Suspicious -> "Investigate manually before any outreach." (overrides score-based rec)

**If any step fails**, keep going and mark the failed step as pending in the tracker's notes column.
