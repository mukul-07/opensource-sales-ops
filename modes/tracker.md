# Mode: tracker — Prospect Tracker

Read and display `data/prospects.md`.

**Tracker format:**

```markdown
| # | Date | Company | Contact | Title | Stage | Score | Last Touch | Next Touch | Report | Notes |
```

**Stages** (full list in `templates/states.yml`):
`Discovered` -> `Researched` -> `Contacted` -> `Engaged` -> `Meeting-Booked` -> `Qualified` -> `Proposal` -> `Closed-Won` / `Closed-Lost` / `No-Fit` / `Nurture`

- `Discovered` = surfaced by scan, not yet qualified
- `Researched` = qualification report written, pending outreach decision
- `Contacted` = first touch sent (email / LinkedIn / call)
- `Engaged` = prospect replied or visibly engaged
- `Meeting-Booked` = discovery call on the calendar
- `Qualified` = discovery done, BANT/MEDDIC confirmed
- `Proposal` = pricing / proposal sent, in negotiation
- `Closed-Won` / `Closed-Lost` = decided
- `No-Fit` = ICP miss or disqualifier fired — do not pursue
- `Nurture` = not now, revisit in 60-90 days

If the user asks to update a stage, edit the matching row in place (editing existing entries is fine; adding new rows still goes through TSV + `merge-tracker.mjs`).

## Stats to display

- Total prospects tracked
- By stage
- Avg qualification score
- Reply rate (Contacted -> Engaged)
- Meeting rate (Engaged -> Meeting-Booked)
- Win rate (Proposal -> Closed-Won)
- Total pipeline value (sum of Est ACV for Active stages)
- Oldest active prospect (days since last touch)

## Example output

```
Tracker summary — 2026-04-18
----------------------------
78 prospects | 14 active in outreach | 6 in pipeline

By stage:
  Researched       12
  Contacted        22
  Engaged           8
  Meeting-Booked    4
  Qualified         3
  Proposal          2
  Closed-Won        2
  Closed-Lost       5
  No-Fit           16
  Nurture           4

Avg score: 4.1/5
Reply rate:   8/22 = 36%
Meeting rate: 4/8  = 50%
Win rate:     2/7  = 29%

Pipeline value (active): $480K
Oldest active: Acme Corp, Touch 4, 22d since last touch (ALERT)

Top-3 overdue:
  Acme Corp (22d) — recommend: move to Nurture or breakup
  Beta Inc  (14d) — recommend: Touch 4 per cadence
  Gamma Co  (12d) — recommend: Touch 3 per cadence
```
