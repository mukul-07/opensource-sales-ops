# Sales-Ops

**Your AI sales assistant that does the boring parts of outbound, so you can focus on actual conversations.**

Two ways to use it:

- **You already have a target?** Paste the company name or website — Sales-Ops researches them, figures out if they're a good fit, finds the right person to contact, and drafts personalized outreach.
- **You need leads?** Tell it your ICP (who you sell to) and run a scan — it discovers new prospects from hiring signals, funding news, web searches, and optional lead databases (Apollo / Hunter / Clay).

Either way, it drafts the outreach. You review and send. It never sends anything on its own.

---

## What it actually does

Think of it as an SDR (Sales Development Rep) that sits next to you:

1. **Finds prospects** — scans public signals (who's hiring, who just raised money, who fits your ICP) and builds a list of companies worth reaching out to.
2. **Qualifies each one** — writes a one-page report: are they a real fit? who's the decision-maker? what's the hook? any red flags?
3. **Drafts outreach** — 3 email variants, a LinkedIn DM, a call opener, a voicemail script. All personalized. All in your voice.
4. **Tracks follow-ups** — reminds you who's overdue, drafts the next touch with a fresh angle, and writes the breakup message if they go cold.
5. **Learns what works** — after a few weeks, tells you which industries / titles / channels actually convert, so you double down on what's working.

### What it does NOT do

- Does **not** send emails or messages for you. You review and send.
- Does **not** do mass blasts. Quality over volume is the whole point.
- Does **not** fake case studies, name-drop strangers, or manufacture urgency.

---

## Who this is for

- Founders doing their own outbound
- SDRs / AEs who want better prep in less time
- Sales ops folks standardizing how their team qualifies accounts
- Anyone tired of writing the same "Hi {firstName}" email 40 times a week

You don't need to be technical to *use* it day to day — once it's set up, you talk to it in plain English ("qualify stripe.com", "draft outreach for the Acme lead", "who's overdue this week?").

You **do** need someone technical for the **one-time setup** (installing Node.js, running a few commands). That takes about 15 minutes. See [USAGE.md](USAGE.md).

---

## A day in the life

```
You:       scan
Sales-Ops: Found 12 new companies matching your ICP. 4 are hiring for roles
           that signal they need what you sell. Want me to qualify them?

You:       yes, top 4
Sales-Ops: [writes 4 reports, adds to tracker]
           Ramp scored 4.2/5 — strongest fit. Want outreach drafts?

You:       qualify ramp.com         # or paste any company you already know
Sales-Ops: [same flow — report + decision-maker + angle]

You:       draft outreach
Sales-Ops: 3 email variants, LinkedIn DM, call opener — all personalized.

You:       [edit, send from your inbox]

You:       who's overdue?
Sales-Ops: 4 prospects haven't heard from you in 5+ days. Want drafts?
```

---

## Quick setup (technical, one-time)

```bash
git clone https://github.com/mukul-07/opensource-sales-ops.git
cd opensource-sales-ops
npm install
npx playwright install chromium   # required
node doctor.mjs                   # shows what's missing

# Set up your 4 personalization files (the assistant will walk you through this):
cp config/profile.example.yml config/profile.yml
cp templates/portals.example.yml portals.yml
cp modes/_profile.template.md modes/_profile.md
# Create pitch.md and case-studies.md from scratch (or let the agent do it)

# (Optional) API keys for lead enrichment — see docs/LEAD_ENRICHMENT.md
cp .env.local.example .env.local

# Start the assistant:
claude

# In the chat:
/sales-ops                    # menu of things you can do
/sales-ops stripe.com         # qualify a company
/sales-ops scan               # find new prospects
```

Full walkthrough (including what each file is for) is in [USAGE.md](USAGE.md).

---

## Principles

- **Human in the loop, always.** Sales-Ops drafts. You send.
- **Quality over volume.** One personalized touch beats 100 spray-and-pray emails.
- **Yours to customize.** Buyer profiles, tone of voice, scoring rules, cadence — all editable. Just ask the assistant in English and it'll update the config.
- **Your data stays local.** Reports, trackers, customer notes live in your folder. Nothing is uploaded anywhere you don't control.

---

## Status

**v0.1.0 — early release.** Core flow works, expect rough edges. Forked from [santifer/career-ops](https://github.com/santifer/career-ops) (originally an AI job-search tool) and repurposed for outbound sales.

Not yet in v0:
- CRM integration (tracker is a markdown file for now)
- Non-English languages
- Automatic upstream updates

---

## Under the hood (for the curious / technical)

- Node.js scripts, Playwright for web scraping, YAML for config, Markdown for data
- Runs on top of [Claude Code](https://claude.com/claude-code) or [OpenCode](https://opencode.ai) as the AI agent
- No server, no database — everything is files on your machine

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full design.

---

## Ethical ground rules

- Don't fake case studies or metrics.
- Don't name-drop people you don't actually know.
- Don't manufacture false urgency ("spots filling!" when they aren't).
- Don't run mass sends. Respect the 30 seconds of attention every cold email costs someone.

## License

MIT — see [LICENSE](LICENSE).
