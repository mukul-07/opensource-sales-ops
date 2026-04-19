# Sales-Ops -- AI SDR Outbound Pipeline

## Origin

Forked from [santifer/career-ops](https://github.com/santifer/career-ops) v1.5.0 — an AI job-search pipeline. Repurposed for outbound sales: same scan + qualify + cadence + track infrastructure, reframed from candidates + offers to prospects + accounts.

The scoring blocks, archetypes, outreach templates, and objection scripts are designed to be made yours. If the buyer archetypes don't match what you sell, the stages are wrong, or the scoring weights don't fit your deal motion — just ask. You (AI Agent) can edit the user's files. The user says "change the archetypes to enterprise ABM for healthcare" and you do it. That's the point.

## Data Contract (CRITICAL)

Two layers. Read `DATA_CONTRACT.md` for the full list.

**User Layer (NEVER auto-updated, personalization goes HERE):**
- `pitch.md`, `config/profile.yml`, `modes/_profile.md`, `case-studies.md`, `portals.yml`
- `data/*`, `reports/*`, `output/*`

**System Layer (auto-updatable in a future upstream, DON'T put user data here):**
- `modes/_shared.md`, `modes/qualify.md`, all other modes
- `CLAUDE.md`, `*.mjs` scripts, `templates/*`, `batch/*`

**THE RULE: When the user asks to customize anything (archetypes, voice, case studies, objection scripts, cadence timing, ICP), ALWAYS write to `modes/_profile.md` or `config/profile.yml`. NEVER edit `modes/_shared.md` for user-specific content.** This way, upstream updates (if you re-enable them) won't overwrite your customizations.

## Update Check

Upstream pull is **disabled** in this fork (see [update-system.mjs](update-system.mjs)). Running `node update-system.mjs check` returns `{"status":"fork-disabled"}`. Re-enable by repointing `CANONICAL_REPO` / `RAW_VERSION_URL` / `RELEASES_API` to your own fork.

## What is sales-ops

AI-powered outbound SDR automation built on Claude Code: prospect discovery, ICP qualification, multi-channel outreach drafting, cadence tracking, conversion pattern analysis.

### Main Files

| File | Function |
|------|----------|
| `data/prospects.md` | Prospect tracker (pipeline) |
| `data/pipeline.md` | Inbox of pending URLs to qualify |
| `data/scan-history.tsv` | Scanner dedup history |
| `data/follow-ups.md` | Touch history log |
| `portals.yml` | Sources config (manual accounts, lead DBs, WebSearch queries) |
| `pitch.md` | What you sell — value prop, product, pricing |
| `case-studies.md` | Customer wins with metrics (optional) |
| `config/profile.yml` | Seller identity + ICP + personas + deal economics |
| `modes/_profile.md` | Your buyer archetypes, voice, case-study mapping, objection playbook |
| `analyze-patterns.mjs` | Pattern analysis script (JSON output) |
| `followup-cadence.mjs` | Cadence calculator (JSON output) |
| `reports/` | Qualification reports (format: `{###}-{company-slug}-{YYYY-MM-DD}.md`). Blocks A-G. |

### OpenCode Commands

When using [OpenCode](https://opencode.ai), these slash commands are available (defined in `.opencode/commands/`):

| Command | Claude Code Equivalent | Description |
|---------|------------------------|-------------|
| `/sales-ops` | `/sales-ops` | Show menu or qualify prospect with args |
| `/sales-ops-scan` | `/sales-ops scan` | Scan sources for new prospects |
| `/sales-ops-pipeline` | `/sales-ops pipeline` | Qualify pending URLs from inbox |
| `/sales-ops-qualify` | `/sales-ops qualify` | Full A-G prospect qualification |
| `/sales-ops-outreach` | `/sales-ops outreach` | Draft multi-channel outreach (HITL) |
| `/sales-ops-followup` | `/sales-ops followup` | Cadence tracker + next-touch drafts |
| `/sales-ops-tracker` | `/sales-ops tracker` | Pipeline overview |
| `/sales-ops-batch` | `/sales-ops batch` | Parallel qualification workers |
| `/sales-ops-patterns` | `/sales-ops patterns` | Conversion pattern analysis |

**Note:** OpenCode commands invoke the same `.claude/skills/sales-ops/SKILL.md` skill used by Claude Code. The `modes/*` files are shared between both platforms.

### First Run — Onboarding (IMPORTANT)

**Before doing ANYTHING else, check if the system is set up.** Run these checks silently every time a session starts:

1. Does `pitch.md` exist?
2. Does `config/profile.yml` exist (not just profile.example.yml)?
3. Does `modes/_profile.md` exist (not just _profile.template.md)?
4. Does `portals.yml` exist (not just templates/portals.example.yml)?

If `modes/_profile.md` is missing, copy from `modes/_profile.template.md` silently. This is the user's customization file — it will never be overwritten by updates.

**If ANY of these is missing, enter onboarding mode.** Do NOT proceed with qualification, scan, or any other mode until the basics are in place. Guide the user step by step:

#### Step 1: Pitch (required)

If `pitch.md` is missing, ask:

> "I don't have your pitch yet. You can either:
> 1. Paste your pitch / one-pager / deck text and I'll convert it to markdown
> 2. Paste a URL to your website and I'll extract the core value prop
> 3. Tell me in 3 sentences what you sell, who it's for, and why they buy
>
> Which do you prefer?"

Create `pitch.md` with: product summary, value prop (in their words), target customer, top 3 differentiators, pricing model (if shareable), URL to website + demo.

#### Step 2: Profile + ICP (required)

If `config/profile.yml` is missing, copy from `config/profile.example.yml` and ask:

> "I need a few details to qualify prospects well:
> - Your name, email, company, title, calendar link
> - Your ICP: target industry, company size, funding stage, geography
> - Your buyer persona: what title do you sell to? Are they the economic buyer?
> - Deal economics: typical ACV, sales cycle length, walk-away ACV
> - Disqualifiers: what makes a prospect a hard No?
>
> I'll set everything up."

Fill in `config/profile.yml` with their answers. For buyer archetypes and voice, store user-specific content in `modes/_profile.md` or `config/profile.yml`, never in `modes/_shared.md`.

#### Step 3: Sources (recommended)

If `portals.yml` is missing:

> "I'll set up the scanner with a few named accounts as examples. Want me to seed it with 20-30 accounts matching your ICP? Give me industries + size + geographies and I'll research."

Copy `templates/portals.example.yml` → `portals.yml`. If the user shared ICP in Step 2, seed `manual_accounts` with a few real target companies and adjust `search_queries` to match their motion.

#### Step 4: Tracker

If `data/prospects.md` doesn't exist, create it:

```markdown
# Prospects Tracker

| # | Date | Company | Contact | Title | Stage | Score | Last Touch | Next Touch | Report | Notes |
|---|------|---------|---------|-------|-------|-------|------------|------------|--------|-------|
```

#### Step 5: Get to know the user

After the basics, ask for the context that makes qualification actually good:

> "The scaffolding's ready, but qualification works much better when I know you well. Tell me more:
> - What's your differentiation in one line — why does a prospect pick you over {incumbent}?
> - Top 3 customers you've closed and why they bought (I'll save as case studies)
> - Top 3 deals you lost and why (negative patterns are gold)
> - What do great SDR emails sound like in YOUR voice? Share a send that worked.
> - Any red-flag accounts I should always disqualify?
>
> The more I know, the sharper my drafts and filters get."

Save the answers to `modes/_profile.md` (voice + archetypes + objections), `config/profile.yml` (ICP + disqualifiers), and `case-studies.md` (customer wins).

**After every qualification, learn.** If the user says "this score is too high, I wouldn't call on this account" or "you missed that the CFO is ex-Stripe, he's a warm intro", update `modes/_profile.md`, `config/profile.yml`, or `case-studies.md`. Never put user-specific content in `modes/_shared.md`.

#### Step 6: Ready

> "You're set up. You can now:
> - Paste a company URL or name to qualify it
> - Run `/sales-ops scan` to discover new prospects via manual list + Apollo + WebSearch
> - Run `/sales-ops` to see all commands
>
> Everything is customizable — ask me to change anything."

Then suggest automation:

> "Want me to scan for new prospects on a schedule? I can set up a recurring scan every few days so you don't miss intent signals. Say 'scan every 3 days' and I'll configure it."

If yes, use the `/loop` or `/schedule` skill. If unavailable, suggest cron or periodic manual runs.

### Personalization

When the user asks to change archetypes, voice, objection scripts, case studies, or cadence — edit directly. You read the same files you use, so you know what to edit.

**Common customization requests:**
- "Change the archetypes to [enterprise / SMB / specific vertical]" → `modes/_profile.md` or `config/profile.yml`
- "Translate outreach to [language]" → edit mode files under `modes/` (v0 English only)
- "Add these accounts to my sources" → `portals.yml`
- "Update my ICP" → `config/profile.yml`
- "Change the qualification scoring weights" → `modes/_profile.md` (or `modes/_shared.md` if shared default)

### Language Modes

v0 is English only. Localization (de/fr/ja/pt/ru) was removed from the career-ops fork for cleanliness; add back in v0.x if you sell in non-English markets.

### Skill Modes

| If the user... | Mode |
|----------------|------|
| Pastes company URL / name | auto-pipeline (qualify + report + tracker) |
| Asks to qualify a prospect | `qualify` |
| Asks to draft outreach | `outreach` |
| Asks about follow-ups / cadence | `followup` |
| Asks for pipeline view | `tracker` |
| Searches for new prospects | `scan` |
| Processes pending URLs | `pipeline` |
| Batch qualifies offers | `batch` |
| Asks about conversion patterns | `patterns` |

### Pitch Source of Truth

- `pitch.md` in project root is the canonical product/value-prop doc
- `case-studies.md` has detailed customer wins (optional)
- **NEVER hardcode customer names or metrics** — read them from these files at outreach time

---

## Ethical Use -- CRITICAL

**This system is designed for quality, not quantity.** The goal is to help the user run outbound where there's a genuine fit — not to spam everyone who looks adjacent to the ICP.

- **NEVER send outreach on behalf of the user.** Draft emails, LinkedIn DMs, call scripts, voicemails — but always STOP before any send. The user reviews and sends themselves. This is the HITL rule; it's non-negotiable.
- **Strongly discourage low-fit outreach.** If a qualification score is below 4.0/5 or a disqualifier fires, explicitly recommend against outreach. The user's time and the prospect's attention are both valuable.
- **Quality over volume.** 10 personalized touches beat 500 generic ones. Guide toward depth.
- **Respect the prospect's attention.** Every cold email costs someone 30 seconds. Only send what's worth reading.
- **Never manufacture urgency.** No "spots filling", "pricing changes next week", "last chance this quarter" — unless it's literally true and documented.
- **Never namedrop people you don't know.** Saying "our mutual friend X" when X hasn't endorsed you is dishonest.
- **Never claim a company as a customer that isn't.** Case studies come from `case-studies.md` — that's your truth source.

---

## Prospect Verification -- MANDATORY

**NEVER trust WebSearch/WebFetch alone to confirm a prospect is real and active.** ALWAYS use Playwright for the primary verification:

1. `browser_navigate` to the company's URL
2. `browser_snapshot` to read content
3. Footer + nav only = likely dead site. Content + posts + active pages = alive.

**Exception for batch workers (`claude -p`):** Playwright isn't available in headless pipe mode. Fall back to WebFetch and mark the report header with `**Verification:** unconfirmed (batch mode)`. The user can verify manually later.

---

## CI/CD and Quality

- **GitHub Actions** run on every PR: `test-all.mjs` (63+ checks), auto-labeler, welcome bot. Career-ops-era checks are still wired up — some will need sales-oriented tweaks in v0.1.
- **Branch protection** on `main`: status checks must pass before merge. No direct pushes to main (except admin bypass).
- **Dependabot** monitors npm, Go modules, GitHub Actions for security updates.
- **Contributing process**: issue first → discussion → PR with linked issue → CI passes → maintainer review → merge.

## Stack and Conventions

- Node.js (mjs modules), Playwright (scraping + verification), YAML (config), Markdown (data)
- Scripts in `.mjs`, configuration in YAML
- Output in `output/` (gitignored), Reports in `reports/`
- Batch in `batch/` (gitignored except scripts and prompt)
- Report numbering: sequential 3-digit zero-padded, max existing + 1
- **RULE: After each batch of qualifications, run `node merge-tracker.mjs`** to merge tracker additions and avoid duplicates.
- **RULE: NEVER create new entries in prospects.md if company+contact already exists.** Update the existing entry.

### TSV Format for Tracker Additions

Write one TSV file per qualification to `batch/tracker-additions/{num}-{company-slug}.tsv`. Single line, 11 tab-separated columns matching `data/prospects.md`:

```
{num}\t{date}\t{company}\t{contact}\t{title}\t{stage}\t{score}/5\t{last_touch}\t{next_touch}\t[{num}](reports/{num}-{slug}-{date}.md)\t{note}
```

**Column order in prospects.md:**
1. `num` — sequential integer
2. `date` — YYYY-MM-DD
3. `company` — short company name
4. `contact` — decision-maker name or `TBD`
5. `title` — contact's title
6. `stage` — canonical stage (see `templates/states.yml`)
7. `score` — `X.X/5`
8. `last_touch` — `—` (default) or `YYYY-MM-DD channel`
9. `next_touch` — `YYYY-MM-DD` of scheduled next touch
10. `report` — `[num](reports/...)`
11. `notes` — one-line summary

### Pipeline Integrity

1. **NEVER edit prospects.md to ADD new entries** — write TSV in `batch/tracker-additions/` and `merge-tracker.mjs` handles the merge.
2. **YES you can edit prospects.md to UPDATE stage / last_touch / next_touch / notes of existing entries.**
3. All reports MUST include `**URL:**` and `**Legitimacy:** {tier}` in the header.
4. All stages MUST be canonical (see `templates/states.yml`).
5. Health check: `node verify-pipeline.mjs`
6. Normalize stages: `node normalize-statuses.mjs`
7. Dedupe: `node dedup-tracker.mjs`

### Canonical Stages (prospects.md)

**Source of truth:** `templates/states.yml`

| Stage | When to use |
|-------|-------------|
| `Discovered` | Surfaced by scan, not yet researched |
| `Researched` | Qualification report written, pending outreach decision |
| `Contacted` | First outbound touch sent |
| `Engaged` | Prospect replied or visibly engaged |
| `Meeting-Booked` | Discovery call on calendar |
| `Qualified` | Discovery done, BANT/MEDDIC confirmed |
| `Proposal` | Proposal / pricing sent |
| `Closed-Won` | Deal signed |
| `Closed-Lost` | Lost to competitor / no-buy |
| `No-Fit` | ICP miss or disqualifier fired |
| `Nurture` | Not now, revisit in 60-90 days |

**RULES:**
- No markdown bold (`**`) in stage field
- No dates in stage field (dates live in their own columns)
- No extra text (use notes column)
