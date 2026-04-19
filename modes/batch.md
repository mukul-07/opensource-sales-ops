# Mode: batch — Parallel Prospect Qualification

Two usage modes: **conductor --chrome** (navigates sources live with a logged-in Chrome session) or **standalone** (script over a pre-collected URL list).

## Architecture

```
Claude Conductor (claude --chrome --dangerously-skip-permissions)
  |
  |  Chrome: navigates sources (logged-in sessions: Apollo, LinkedIn, Sales Nav)
  |  Reads DOM directly — the user sees it all in real time
  |
  +- Prospect 1: reads company page + contact from DOM
  |     +-> claude -p worker -> report .md + TSV tracker line
  |
  +- Prospect 2: click next, read page + contact
  |     +-> claude -p worker -> report .md + TSV tracker line
  |
  +- End: merge tracker-additions -> prospects.md + summary
```

Each worker is a child `claude -p` with a clean 200K-token context. The conductor orchestrates; workers do the per-prospect qualification.

## Files

```
batch/
  batch-input.tsv               # URLs (from conductor or manual)
  batch-state.tsv               # Progress (auto-generated, gitignored)
  batch-runner.sh               # Standalone runner
  batch-prompt.md               # Worker system prompt
  logs/                         # One log per prospect (gitignored)
  tracker-additions/            # TSV lines to merge (gitignored)
```

## Mode A: Conductor --chrome

1. **Read state:** `batch/batch-state.tsv` → skip already-processed.
2. **Navigate source:** Chrome → search URL (e.g., Apollo search, LinkedIn Sales Nav list, Crunchbase filter).
3. **Extract URLs:** read DOM → extract list of prospect URLs → append to `batch-input.tsv`.
4. **For each pending URL:**
   a. Chrome: click the prospect → read the company/contact info from DOM.
   b. Save to `/tmp/batch-prospect-{id}.txt`.
   c. Compute the next sequential `REPORT_NUM`.
   d. Bash:
      ```bash
      claude -p --dangerously-skip-permissions \
        --append-system-prompt-file batch/batch-prompt.md \
        "Qualify this prospect. URL: {url}. Input: /tmp/batch-prospect-{id}.txt. Report: {num}. ID: {id}"
      ```
   e. Update `batch-state.tsv` (completed/failed + score + report_num).
   f. Log to `logs/{report_num}-{id}.log`.
   g. Chrome: go back → next prospect.
5. **Pagination:** no more on this page → click "Next" → repeat.
6. **End:** merge `tracker-additions/` → `data/prospects.md` + summary.

## Mode B: Standalone

```bash
batch/batch-runner.sh [OPTIONS]
```

Options:
- `--dry-run` — list pending without running
- `--retry-failed` — retry only failures
- `--start-from N` — resume from ID N
- `--parallel N` — run N workers in parallel
- `--max-retries N` — per-prospect retries (default: 2)

## batch-state.tsv format

```
id	url	status	started_at	completed_at	report_num	score	stage	error	retries
1	https://...	completed	2026-...	2026-...	002	4.5	Researched	-	0
2	https://...	failed	2026-...	2026-...	-	-	-	Error msg	1
3	https://...	pending	-	-	-	-	-	-	0
```

## Resumability

- Kill + restart → reads `batch-state.tsv` → skips completed.
- Lock file (`batch-runner.pid`) prevents double-run.
- Each worker is independent: failure on prospect #47 doesn't affect others.

## Workers (claude -p)

Each worker gets `batch/batch-prompt.md` as system prompt. Self-contained.

Worker output:
1. Report `.md` in `reports/`
2. TSV tracker line in `batch/tracker-additions/{id}.tsv`
3. JSON result on stdout (`{report_num, score, stage, legitimacy}`)

## Playwright in batch mode

Batch workers run in `claude -p` pipe mode, where Playwright is not available. Workers fall back to WebFetch. Mark such reports with `**Verification:** unconfirmed (batch mode)` in the header — the user can verify manually later with a regular `/sales-ops qualify` pass on any prospect that scores high.

## Error handling

| Error | Recovery |
|-------|----------|
| URL inaccessible | Worker fails → conductor marks `failed`, moves on |
| Company page behind login | Conductor tries DOM read; on fail → `failed` |
| Source changes layout | Conductor reasons over HTML, adapts |
| Worker crashes | Conductor marks `failed`, moves on. Retry with `--retry-failed`. |
| Conductor dies | Restart → reads state → skips completed |
| Contact data missing | Worker still writes report with `{contact: TBD}`; flag in Block D |
