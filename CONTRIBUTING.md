# Contributing to opensource-sales-ops

Thanks for your interest in contributing! opensource-sales-ops is built with Claude Code — you can use it for development too.

## Before Submitting a PR

**Please open an issue first to discuss the change you'd like to make.** This helps align on direction before you invest time coding.

PRs without a corresponding issue may be closed if they don't align with the project's architecture or goals.

### What makes a good PR

- Fixes a bug listed in Issues
- Addresses a feature request that was discussed and approved
- Includes a clear description of what changed and why
- Follows the existing code style and project philosophy (simple, minimal, quality over quantity)

## Quick Start

1. Open an issue to discuss your idea
2. Fork the repo
3. Create a branch (`git checkout -b feature/my-feature`)
4. Make your changes
5. Test with a fresh clone (see [docs/SETUP.md](docs/SETUP.md))
6. Run `node test-all.mjs` — all checks must pass
7. Commit and push
8. Open a Pull Request referencing the issue

## What to Contribute

**Good first contributions:**

- Improve documentation (README, USAGE, SETUP, docs/)
- Add example entries to `templates/portals.example.yml`
- Sharpen prompt language in `modes/*.md` (system-layer only — never user-layer)
- Report bugs via [Issues](https://github.com/mukul-07/opensource-sales-ops/issues)

**Bigger contributions:**

- New scoring dimensions or ICP-fit logic
- New skill modes (in `modes/`)
- Script improvements (`.mjs` utilities)
- CRM integrations (HubSpot, Salesforce, Attio, etc.)
- Lead-enrichment provider integrations (see [docs/LEAD_ENRICHMENT.md](docs/LEAD_ENRICHMENT.md))

## Guidelines

- **Respect the Data Contract.** Never edit user-layer files from system-layer code. See [DATA_CONTRACT.md](DATA_CONTRACT.md) and [CLAUDE.md](CLAUDE.md).
- Scripts should handle missing files gracefully (check `existsSync` before `readFileSync`).
- Don't commit personal data: real prospect names, emails, company case studies, API keys.
- Keep modes language-agnostic where possible.

## What we do NOT accept

- **PRs that enable auto-sending outreach** without human review. opensource-sales-ops is a decision-support tool, not a spam bot. HITL is non-negotiable.
- **PRs that scrape platforms prohibiting automated access** (LinkedIn, etc.). We actively reject these to respect third-party ToS.
- **PRs that add external API dependencies** without prior discussion in an issue.
- **PRs containing personal data** (real prospect names, emails, case studies). Use example/fictional data instead.
- **PRs that manufacture urgency, fake case studies, or enable mass-send patterns.** See [README.md — Ethical notes](README.md#ethical-notes).

## Development

```bash
npm install
npm run doctor          # Setup validation
node verify-pipeline.mjs # Tracker health check
node test-all.mjs       # Full test suite (required before PR)
```

## Need Help?

- [Open a Discussion](https://github.com/mukul-07/opensource-sales-ops/discussions) — for questions and ideas
- [Open an issue](https://github.com/mukul-07/opensource-sales-ops/issues) — for bugs and feature requests
- [Read the architecture docs](docs/ARCHITECTURE.md)
