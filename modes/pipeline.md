# Mode: pipeline — URL Inbox (Second Brain)

Process the backlog of prospect URLs in `data/pipeline.md`. The user adds URLs whenever they want; running `/sales-ops pipeline` qualifies them all at once.

## Workflow

1. **Read** `data/pipeline.md` — find unchecked items `- [ ]` in the "Pending" section.
2. **For each pending URL:**
   a. Compute the next sequential `REPORT_NUM` (read `reports/`, take max + 1).
   b. **Resolve the target**: company URL, LinkedIn company page, job post, or a plain company name.
   c. If the URL is inaccessible (login wall, 403) → mark `- [!]` with a note and continue.
   d. **Run the full auto-pipeline**: qualify Blocks A-G → report .md → tracker.
   e. **Move from "Pending" to "Processed"**: `- [x] #NNN | URL | Company | Contact | Score/5 | Stage`
3. **If 3+ URLs pending**, launch parallel agents (Agent tool with `run_in_background`) to speed through. See `batch.md`.
4. **When done**, show a summary table:

```
| # | Company | Contact | Score | Stage | Legitimacy | Recommendation |
```

## pipeline.md format

```markdown
## Pending
- [ ] https://acme.example.com
- [ ] https://jobs.ashbyhq.com/mercury | Mercury | (intent signal: 3 fraud roles)
- [!] https://private-lead-list.example.com — Error: auth required

## Processed
- [x] #143 | https://acme.example.com | Acme | Sarah (VP Risk) | 4.5/5 | Researched
- [x] #144 | https://smallco.example.com | SmallCo | TBD | 2.1/5 | No-Fit
```

## Smart target detection from URL

1. **Playwright (preferred):** `browser_navigate` + `browser_snapshot`. Works with all SPAs and JS-heavy sites.
2. **WebFetch (fallback):** static pages or when Playwright is unavailable.
3. **WebSearch (last resort):** resolve the company from the URL and do the research via search.

**Special cases:**
- **LinkedIn company pages**: often require login → mark `[!]` and ask the user to paste the visible text.
- **PDFs (decks, one-pagers)**: read directly with Read tool.
- **`local:` prefix**: read the local file. Example: `local:leads/enterprise-list.md` → read that file.
- **Plain company name** (no URL): run a targeted WebSearch to resolve the primary domain, then treat as a normal URL.

## Auto numbering

1. List all files in `reports/`.
2. Extract the number prefix (e.g., `142-acme...` → 142).
3. New number = max + 1.

## Setup check

Before processing any URL, run:

```bash
node doctor.mjs
```

If it reports missing files (pitch.md, profile.yml, case-studies.md), resolve those first. Enrichment-key warnings are optional; proceed without them if the user hasn't signed up yet.
