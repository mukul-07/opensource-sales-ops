---
name: sales-ops
description: AI SDR command center -- qualify prospects, draft outreach, run cadence, scan sources, track pipeline
user_invocable: true
args: mode
argument-hint: "[scan | qualify | outreach | followup | pipeline | batch | tracker | patterns | update]"
---

# sales-ops -- Router

## Mode Routing

Determine the mode from `{{mode}}`:

| Input | Mode |
|-------|------|
| (empty / no args) | `discovery` -- Show command menu |
| URL, company name, or LinkedIn page (no sub-command) | **`auto-pipeline`** |
| `qualify` | `qualify` |
| `outreach` | `outreach` |
| `followup` | `followup` |
| `tracker` | `tracker` |
| `pipeline` | `pipeline` |
| `scan` | `scan` |
| `batch` | `batch` |
| `patterns` | `patterns` |

**Auto-pipeline detection:** If `{{mode}}` is not a known sub-command AND looks like a prospect target (URL, company name, LinkedIn company page, domain, or a short phrase like "Series B fintech Acme") — execute `auto-pipeline`.

Heuristics for prospect-target detection:
- Any URL (https://...) with a recognizable company domain
- A LinkedIn company page URL
- A job post URL (treat the hiring company as the prospect; signal = they're hiring)
- A Crunchbase / Pitchbook URL
- A plain proper-noun company name of 1-3 words

If `{{mode}}` is not a sub-command AND doesn't look like a prospect target, show discovery.

---

## Discovery Mode (no arguments)

Show this menu:

```
sales-ops -- SDR Command Center

Available commands:
  /sales-ops {company/url}  -> AUTO-PIPELINE: qualify + report + tracker
  /sales-ops scan           -> Discover new prospects via manual accounts + Apollo
                               organizations/search + WebSearch queries
  /sales-ops pipeline       -> Qualify pending URLs from inbox (data/pipeline.md)
  /sales-ops qualify        -> Full A-G qualification of a single prospect
  /sales-ops outreach {#}   -> Draft multi-channel outreach (HITL, never sends)
  /sales-ops followup       -> Cadence tracker: overdue touches + next-touch drafts
  /sales-ops tracker        -> Pipeline overview (stages, reply/meeting/win rates)
  /sales-ops batch          -> Parallel qualification with claude -p workers
  /sales-ops patterns       -> Conversion pattern analysis

Inbox: add URLs to data/pipeline.md -> /sales-ops pipeline
Or paste a company URL / name directly to run the full pipeline.
```

---

## Context Loading by Mode

After determining the mode, load the files before executing:

### Modes that require `_shared.md` + their mode file:
Read `modes/_shared.md` + `modes/{mode}.md`.

Applies to: `auto-pipeline`, `qualify`, `outreach`, `followup`, `pipeline`, `scan`, `batch`.

### Standalone modes (only their mode file):
Read `modes/{mode}.md`.

Applies to: `tracker`, `patterns`.

### Modes delegated to a subagent:
For `scan`, `pipeline` (3+ URLs), and `batch`: launch as Agent with the content of `_shared.md` + `modes/{mode}.md` injected into the subagent prompt.

```
Agent(
  subagent_type="general-purpose",
  prompt="[content of modes/_shared.md]\n\n[content of modes/{mode}.md]\n\n[invocation-specific data]",
  description="sales-ops {mode}"
)
```

Execute the instructions from the loaded mode file.

---

## HITL Principle (MANDATORY — do NOT override)

sales-ops drafts. The user sends. Always.

- `outreach` and `followup` produce drafts for copy-paste. Never call send-email / post-message tools even if available.
- `auto-pipeline` never auto-drafts outreach. After qualification, suggest the user run `/sales-ops outreach {num}` explicitly.
- Stage transitions in `data/prospects.md` happen only after the user confirms they sent a touch.

Violating this breaks the whole ethical frame of the project. Read the "Ethical Use" section of CLAUDE.md.
