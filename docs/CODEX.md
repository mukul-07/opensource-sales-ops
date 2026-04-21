# Codex / other agent runtimes

sales-ops supports Codex (and any agent runtime that reads project-level `AGENTS.md` files) through the root [AGENTS.md](../AGENTS.md). That file points at [CLAUDE.md](../CLAUDE.md) + the mode files; your agent client gets the same routing and behavior as Claude Code.

## Prerequisites

- Agent client that reads project `AGENTS.md`
- Node.js 18+
- Playwright Chromium (required) — `npx playwright install chromium` — used for mandatory prospect verification and PDF rendering; batch mode falls back to WebFetch
- (Optional) direnv — auto-loads `.env.local`

## Install

```bash
git clone <your-fork>
cd sales-ops
npm install
node doctor.mjs
```

## User-layer setup

Same as for Claude Code. See [SETUP.md](SETUP.md). You need at minimum:

- `pitch.md` — what you sell
- `config/profile.yml` — ICP + personas + deal economics
- `modes/_profile.md` — buyer archetypes + voice + objection playbook
- `case-studies.md` — customer wins (optional but recommended)
- `.env.local` — API keys (optional)

## Invocation

If your Codex client supports slash commands, use them as documented in [USAGE.md](../USAGE.md):

```
/sales-ops https://prospect.com
/sales-ops scan
/sales-ops outreach 003
```

If not, invoke modes directly by telling the agent:

> "Run qualify on https://prospect.com. Load modes/_shared.md + modes/qualify.md first, then follow the qualify workflow."

## Mode dispatch without a skill router

Some clients don't support the `.claude/skills/sales-ops/SKILL.md` dispatch. Emulate by always reading:

1. `CLAUDE.md` (for data contract + rules)
2. `modes/_shared.md` (scoring, archetypes, writing rules)
3. The specific mode you want (`modes/qualify.md`, `modes/outreach.md`, etc.)
4. `modes/_profile.md` (user overrides)

Then execute the instructions in the mode file.

## Batch mode

Batch qualification uses `claude -p` subagents in the Claude Code path. For Codex or equivalent, replicate by:

1. Populate `batch/batch-input.tsv` with URLs
2. Run `batch/batch-runner.sh` or the equivalent in your runtime
3. Ensure each worker has a clean 200K-token context and loads the same mode files
4. Worker outputs: `reports/NNN-*.md` + `batch/tracker-additions/NNN.tsv`
5. After the batch, run `node merge-tracker.mjs`

See [modes/batch.md](../modes/batch.md) for the full contract.

## What doesn't port

- **Anything Claude Code-specific** (e.g., `TodoWrite` tool, slash-command routing, session context bias)
- **Skills** — `.claude/skills/*` works only inside Claude Code; other runtimes need to read mode files directly
- **The `/loop` and `/schedule` skills** for recurring scans are Claude Code only

The core reasoning (qualify, outreach, followup, patterns, scan) is plain markdown prompts. Any capable LLM agent can execute them.
