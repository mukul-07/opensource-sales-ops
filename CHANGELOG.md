# Changelog

## [0.1.0] - 2026-04-20

Initial public release as [opensource-sales-ops](https://github.com/mukul-07/opensource-sales-ops).



Initial fork from [santifer/career-ops](https://github.com/santifer/career-ops) v1.5.0. Repurposing the job-search pipeline into a sales lead-generation / SDR outbound pipeline.

### Day 0 cleanup (this changeset)

- Disabled `update-system.mjs` upstream pull (upstream points at career-ops; re-enable by repointing URLs to your own fork)
- Removed localization: `modes/de/`, `modes/fr/`, `modes/ja/`, `modes/pt/`, `modes/ru/` and localized READMEs
- Removed out-of-scope modes: `interview-prep`, `training`, `project`, `ofertas`, `pdf`, `deep`
- Removed `examples/` (career-specific samples; will re-add sales samples)
- Removed `interview-prep/` (can later be repurposed as `discovery-prep/`)
- Reset `VERSION` to `0.1.0`
