# Lead Enrichment — API Setup

sales-ops uses 5 contact-enrichment sources to resolve decision-maker LinkedIn URLs and emails during [qualify](../modes/qualify.md) (Block D). All 5 have free tiers. All 5 are optional — without any keys, qualify falls back to WebSearch + email-pattern inference.

## Security rules (non-negotiable)

1. **API keys live in `.env.local`, never in `.envrc`.** `.envrc` is tracked in git; `.env.local` is gitignored. Putting a key in `.envrc` one commit away from a leak.
2. **Never paste a key into chat, Slack, tickets, screenshots, or screen shares.** If a key ever leaves your machine, rotate it immediately at the source's dashboard.
3. **Use `.env.local.example` as your template.** Copy to `.env.local`, fill in keys. If you use direnv, `.envrc` auto-loads `.env.local`. Without direnv, `source .env.local` works too.
4. **Never paste keys in [portals.yml](../portals.yml)** — it references the env var name, not the key itself.

## The 5 sources

### 1. Apollo.io — best single source

- **What:** full contact records (name, title, email, phone, LinkedIn URL)
- **Free tier:** rolling credits, renewed monthly
- **Signup:** https://www.apollo.io/sign-up
- **Dashboard:** https://app.apollo.io/ → Settings → API
- **Env var:** `APOLLO_API_KEY`

```bash
export APOLLO_API_KEY="your-key-here"
```

Apollo is the backbone. If you only set up one source, make it this.

### 2. Hunter.io — email gap-filler

- **What:** email lookup + domain search + verification
- **Free tier:** 25 searches + 50 verifications / month
- **Signup:** https://hunter.io/users/sign_up
- **Dashboard:** https://hunter.io/api-keys
- **Env var:** `HUNTER_API_KEY`

```bash
export HUNTER_API_KEY="your-key-here"
```

Use Hunter for the emails Apollo doesn't have. The domain-search endpoint is especially useful for finding email patterns at a company.

### 3. Snov.io — alternative email finder

- **What:** email finder + verifier + drip campaigns (we only use the first two)
- **Free tier:** 50 credits / month
- **Signup:** https://app.snov.io/register
- **Dashboard:** https://app.snov.io/account#api_settings
- **Env vars:** `SNOV_CLIENT_ID` + `SNOV_CLIENT_SECRET` (uses OAuth2)

```bash
export SNOV_CLIENT_ID="your-client-id"
export SNOV_CLIENT_SECRET="your-client-secret"
```

Snov uses OAuth2. sales-ops fetches an access token on first call and caches it.

### 4. Prospeo.io — backup email finder

- **What:** email finder + verifier
- **Free tier:** ~75 credits / month (verify current quota on signup)
- **Signup:** https://prospeo.io/register
- **Dashboard:** https://app.prospeo.io/account/api
- **Env var:** `PROSPEO_API_KEY`

```bash
export PROSPEO_API_KEY="your-key-here"
```

Use as a backup when Hunter and Snov are tapped out for the month.

### 5. Skrapp.io — bulk email search

- **What:** email finder + company search
- **Free tier:** 50 email searches / month
- **Signup:** https://www.skrapp.io/signup
- **Dashboard:** https://www.skrapp.io/en/dashboard/api
- **Env var:** `SKRAPP_API_KEY`

```bash
export SKRAPP_API_KEY="your-key-here"
```

## Setup walkthrough

1. **Copy the env template:**
   ```bash
   cp .env.local.example .env.local
   ```
2. **Sign up for each source** at the URLs above. Do them in priority order (Apollo → Hunter → the rest).
3. **Edit [.env.local](../.env.local)** with your keys. `.env.local` is gitignored; `.envrc` is not — keep secrets out of `.envrc`.
4. **Load the env** — direnv auto-loads `.env.local` via `.envrc`. Without direnv, `source .env.local` in your shell.
5. **Flip `enabled: true`** for each source in [portals.yml](../portals.yml) under `lead_db`.
6. **Test:** run qualify on a known prospect and check Block D's source labels.

## How sales-ops uses each source

During [qualify](../modes/qualify.md) Block D, the LLM:

1. Runs a WebSearch for the contact's direct LinkedIn URL
2. Checks `portals.yml#lead_db` for enabled sources
3. For each enabled source (in the order listed in portals.yml), checks the env var. If missing, skips silently.
4. Calls the source's API via Bash `curl` with the user's key
5. Parses responses, merges by LinkedIn URL + email domain, labels each fact with its source
6. Falls back to email-pattern inference if no API returned an email

## Total monthly budget on free tiers

| Source | Free quota | Typical use |
|--------|-----------|-------------|
| Apollo | ~60 credits | Full enrichment (3-4 contacts each) |
| Hunter | 25 + 50 | Email finding + verification |
| Snov | 50 | Email finding (backup) |
| Prospeo | 75 | Email finding (backup) |
| Skrapp | 50 | Email finding (backup) |

**~260 lookups/month combined.** Enough to deeply qualify 50-80 prospects or enrich 200+ with partial data.

## When to upgrade

Signs you've outgrown the free tier:
- Apollo is consistently denying credit on day 20 of the month
- You're sending more than 25 personalized emails / month (Hunter verification limit)
- Your sales cycle accelerated and you're qualifying daily

Upgrade the one you're hitting first. Don't pay for all five.

## What if I don't want to sign up for any?

qualify still works for LinkedIn URLs via WebSearch, but **email will be `TBD`** — sales-ops never guesses email patterns. Pattern inference (`firstname@domain`) bounces too often and damages sender reputation.

Without any enabled source, Block D gives you:
- Direct LinkedIn URL via WebSearch
- Email: `TBD` — you find it manually (company team page, published talks, LinkedIn ContactInfo, paid-tier lookup)

The zero-cost path is usable for LinkedIn-first outreach, but not for cold email at scale. If you want email-based outreach, sign up for at least Apollo (biggest coverage per call) or Hunter (best pure email finder).
