# Customization

sales-ops is designed to be made yours. The defaults work for a generic SDR outbound motion; the specifics of your product, ICP, voice, and cadence live in user-layer files you edit directly.

## Rule zero

**All customization goes in the user layer.** System files (`modes/_shared.md`, scripts, CLAUDE.md) are auto-updatable if you re-enable upstream. User layer is yours forever.

| Change | Edit this file |
|--------|---------------|
| What you sell | `pitch.md` |
| Customer proof | `case-studies.md` |
| Who you sell to (ICP, personas, deal econ, disqualifiers) | `config/profile.yml` |
| Buyer archetypes, voice, objection playbook, cadence timing | `modes/_profile.md` |
| Target accounts + lead sources + WebSearch queries | `portals.yml` |
| API keys | `.env.local` |

Never edit `modes/_shared.md` for user-specific content. The LLM reads `_shared.md` first, then `_profile.md` — your overrides win.

## Common customizations

### "I sell to enterprise, not SMB"

Edit `config/profile.yml`:

```yaml
icp:
  company_size:
    employees_min: 500
    employees_max: 10000
    funding_stages: ["series-c", "series-d-plus", "public"]
deal:
  typical_acv_usd:
    floor: 50000
    target: 250000
    ceiling: 1000000
  sales_cycle_days:
    median: 90
    fast: 45
    enterprise: 180
```

Add enterprise-specific archetypes to `modes/_profile.md` (e.g., "RFP-Ready", "Vendor Consolidation Target", "Post-M&A Rationalizer") with matching case studies and objection handling.

### "My voice is casual, not formal"

Edit `modes/_profile.md` → `Your Outreach Voice` section:

```markdown
**Tone:** casual, direct, slightly self-deprecating. First-name basis. Contractions OK.

**Signature moves:**
- Open with something specific I noticed (funding, hiring, podcast)
- Never send a deck first-touch. Start with a question.

**What NOT to sound like:**
- Corporate / Hallmark SDR
- Sales bro ("Let's hop on a quick call")
- Template-feel ("Following up on my previous email")
```

The banned-phrase list and em-dash rule in `_shared.md` still apply — they're universally good.

### "My sales cycle is 6 months, not 2 weeks"

Edit `modes/_profile.md` → `Your Cadence Timing`:

```markdown
| Touch | Day | Channel |
|-------|-----|---------|
| 1 | Day 0 | Email, executive brief |
| 2 | Day 7 | LinkedIn connect + custom note |
| 3 | Day 21 | Email, case study + question |
| 4 | Day 45 | Phone + LinkedIn InMail |
| 5 | Day 60 | Email breakup |
```

Also bump `config/profile.yml#deal.sales_cycle_days.median` to match.

### "My buyer archetypes don't match the template"

Edit `modes/_profile.md` → `Your Buyer Archetypes`. Keep the table format:

```markdown
| Archetype | How to detect | Lead with | Case study |
|-----------|---------------|-----------|------------|
| **Your archetype name** | specific signals | opening angle | which customer |
```

The LLM picks the best-fitting archetype during qualify Step 0 and adapts Block E (outreach angle) accordingly.

### "I want different scoring weights"

The 5 scoring blocks (ICP Fit, Buying Signal, Access, Deal Size Fit, Competitive Position) are defined in `modes/_shared.md`. You can't change the blocks themselves without editing system files, but you can:

- Add a note in `modes/_profile.md` telling the LLM to weight Buying Signal 2x higher (for example) for your motion
- Tighten `disqualifiers` in `config/profile.yml` — disqualifiers override any score
- Adjust the `patterns.md` score-floor recommendation for your motion

### "Add a new lead-enrichment source"

[LEAD_ENRICHMENT.md](LEAD_ENRICHMENT.md) documents the 5 wired sources. To add a 6th:

1. Add an entry under `lead_db:` in `portals.yml` with `enabled: false`, `api_key_env`, endpoints, response fields
2. Copy the new env var into `.env.local.example`
3. Add a section to `docs/LEAD_ENRICHMENT.md` with signup URL + free tier
4. Update `modes/qualify.md` Block D resolution chain to mention the new source

No script changes required — the LLM calls each source via Bash curl per the config.

### "Change outreach output format"

Edit `modes/outreach.md` Step 4. The HARD RULES at the top are non-negotiable (greeting, no em-dashes, named recipient) — those prevent regressions. Below that you can adjust number of variants, subject line length, signature format, etc.

## Anti-patterns to avoid

- **Don't edit `modes/_shared.md` to change your archetypes.** Put them in `_profile.md`. Otherwise your next upstream pull wipes them.
- **Don't hardcode customer names in mode files.** They come from `case-studies.md` at outreach time.
- **Don't paste API keys into any tracked file.** Only `.env.local` (gitignored).
- **Don't add banned phrases back to generate slop faster.** The ban list exists for a reason; bypass it and your open/reply rates crash.
- **Don't disable the HITL rule.** The system drafts, you send. If you want auto-send, this isn't the right tool.

## How far can customization go?

Far. The architectural split means scripts and mode files are generic infrastructure; user-layer files carry all motion-specific content. You could run sales-ops for:

- Enterprise $1M+ deals with 6-month cycles
- Transactional $2K/mo SaaS with 7-day cycles
- Partnership outreach (co-sell, not direct-sell) — Block F+ in qualify handles it
- Executive recruiting ("selling" candidates to hiring companies) — which is essentially career-ops territory, the tool we forked from

As long as your motion fits "qualify accounts, reach decision-makers, draft multi-channel touches, track cadence, learn from outcomes" — sales-ops customizes to it.
