# Mode: outreach — Draft Multi-Channel Outreach (HITL)

Draft personalized cold outreach for a qualified prospect. **Never sends.** Output is reviewed and sent by the user.

## Inputs

The user invokes this with either:
- A tracker number: `/sales-ops outreach 042`
- A company name / URL: `/sales-ops outreach Acme`

Either way, resolve to a qualification report in `reports/`. If no report exists for the prospect, stop and ask the user to run `/sales-ops qualify` first — outreach without qualification violates the HITL principle (you'd be drafting from nothing).

## Workflow

```
1. RESOLVE   -> Find the prospect's qualification report
2. VERIFY    -> Legitimacy=High Confidence? Score >= 4.0? Otherwise warn
3. LOAD      -> Read report + pitch.md + _profile.md + case-studies.md
4. DETECT    -> Which touch # is this? Any prior history in data/prospects.md?
5. DRAFT     -> Generate 3 variants per channel: email, LinkedIn DM, call script
6. PRESENT   -> Format for copy-paste, call out what user should review
7. LOG       -> On user confirm, update tracker stage + last_touch (no auto-send)
```

## Step 1 — Resolve and verify

1. Read `reports/{###}-*.md` for the target prospect.
2. Extract: archetype (Step 0), Block E (outreach angle), Block F (objection prep), Block F+ (co-sell, if present), legitimacy (Block G).
3. **Gates:**
   - Legitimacy = Suspicious -> STOP. Show the signals, ask user to confirm before drafting.
   - Score < 4.0 -> warn the user with the specific reason. Proceed only if user overrides.
   - **Block F+ present (co-sell opportunity) -> STOP.** Ask the user which path they want before drafting: (1) direct customer pitch, (2) co-sell/referral partnership, (3) integration/OEM. The framing for each is different; do not assume. Once user chooses, proceed with that framing.
   - Prospect already at stage Engaged / Meeting-Booked / later -> switch to follow-up tone, not cold outreach.

## Step 2 — Context load

Read in order:
1. `pitch.md` — what the user sells, value prop, pricing model
2. `config/profile.yml` — seller identity, `personas`, `deal` economics
3. `modes/_profile.md` — archetype -> case study mapping, outreach voice, objection playbook, cadence
4. `case-studies.md` (if exists) — customer wins with metrics
5. The qualification report's Block D (decision-maker map) and Block E (outreach angle)

## Step 3 — Detect touch number

Look up this prospect in `data/prospects.md`:
- No prior entry or stage=Researched, last_touch=`-` -> this is **Touch 1** (cold email)
- last_touch present, stage=Contacted -> this is **Touch 2+** (follow-up — tell user to run `/sales-ops cadence` instead, which is built for this)
- Prospect is Engaged (replied) -> this is a **response draft** (different structure, more specific)

Touch number changes the tone:
- Touch 1: cold. Lean on Block E's trigger + hypothesis.
- Touch 2: shorter, different angle, references Touch 1 implicitly ("circling back" is banned — find a different way, e.g. a new data point or a specific question).
- Response draft: the prospect said something — reference it specifically, advance the conversation, propose one next step.

## Step 4 — Draft (3 variants per channel)

**READ THIS CHECKLIST BEFORE DRAFTING ANY VARIANT. These rules override anything else in this prompt:**

- Every email AND every LinkedIn DM starts with `Hi {FirstName},` on line 1. The ONLY exception is voicemail.
- Zero em-dashes (`—`). Zero en-dashes (`–`). Use periods, commas, colons, or plain hyphens (`-`).
- Email sign-off: `Best, {seller.full_name}`. Never `— {Name}` or `-- {Name}`.
- LinkedIn DM: no sign-off at all.
- Every LinkedIn DM block has a named recipient in the header: `## LinkedIn DM — to {Full Name} ({Title})`. Never a bare `## LinkedIn DM`.
- Banned phrases (exact and compressed variants): "quick question", "quick q", "quick q:", "quick one", "circling back", "touching base", "following up", "hope this finds you well", "hope you're well", "reaching out because", "reaching out to".
- After drafting each variant, scan it for em-dashes and banned phrases before emitting. If either appears, rewrite.

Generate **3 variants for each channel**, each with a different angle. Cold touch structure lives in `_shared.md#structure-of-a-cold-email`; apply it 3 ways:

### Email — 3 variants

**HARD RULES. Verify each one before emitting ANY email variant:**

1. **GREETING IS LINE 1.** Every variant starts with `Hi {FirstName},` on its own line.
2. **NO em-dashes (—) or en-dashes (–) anywhere.** Not in the body. Not in the transition. Not in the signature. Replace every dash with: period + new sentence, comma, colon, or plain hyphen (`-`).
3. **SIGN-OFF USES PLAIN TEXT.** `Best, {seller.full_name}` on its own line. NOT `— {seller.full_name}`, NOT `-- {seller.full_name}`. Pull the name from `config/profile.yml#seller.full_name`.
4. **NO BANNED PHRASES** anywhere in body or subject. See the list in `_shared.md#avoid-these-phrases`.
5. **Subject: 3-5 words, lowercase, specific.** No colons unless they're genuinely useful.
6. **Body: <=120 words**, 4 lines per `_shared.md` structure.
7. **Before outputting, re-read each variant** and confirm: starts with `Hi {FirstName},` · zero `—` or `–` characters · signature is `Best, {Name}` not `— {Name}` · no banned phrases · under 120 words. If any check fails, rewrite that variant.

Example scaffolding (content comes from Block E + case-studies.md):

```
Variant A — trigger-led
Subject: series c + risk hiring
Body:
Hi {FirstName},

Saw {trigger}. At your stage, {pain hypothesis}. {Customer} cut chargebacks 40% going from homegrown to us in 3 weeks.

Worth 15 min to compare notes on how they structured it?

Best,
{seller.full_name}
```

Emit Variants B (customer-led) and C (question-led) with the same greeting + sign-off pattern.

### LinkedIn DM — 3 variants PER RECIPIENT

**HARD RULES. Verify each one before emitting ANY DM variant:**

1. **GREETING IS LINE 1. MANDATORY.** Every variant starts with `Hi {FirstName},` — literal greeting, literal comma, literal space. NO variant may open with "Saw...", "Congrats...", "Quick q:", "Most AI companies...", "A 25-person...", or any other body-first opener. If you are about to emit a variant whose first word is not "Hi", STOP and rewrite.
2. **NO em-dashes (—) anywhere.** Not in the greeting. Not in the body. Not in the transition. Replace every em-dash with one of: period + new sentence, comma, colon, or plain hyphen (`-`). If you are about to emit a variant that contains `—`, STOP and rewrite.
3. **NAMED RECIPIENT HEADER.** Every DM block MUST be labeled with the intended contact: `## LinkedIn DM — to {Full Name} ({Title})`. No block may appear under a generic `## LinkedIn DM` header.
4. **NO BANNED PHRASES.** Scan your draft for: "quick q", "quick question", "quick one", "circling back", "touching base", "following up", "hope this finds you", "hope you're well", "reaching out". If any appear, rewrite before emitting.
5. **CHAR LIMIT INCLUDES THE GREETING.** `Hi {FirstName},` counts against the 300-char budget. If you're over, trim the relevance line first; the greeting stays.
6. **NO SIGNATURE LINE.** LinkedIn shows the sender's name automatically. Do not end with `- Jane` or `Best, Jane` or anything resembling a signature.

**Workflow per contact:**

1. Identify the contact from Block D of the qualification report. Default to the Economic Buyer. If Block D also lists a Technical Champion with a distinct angle, draft a second set for them.
2. For each contact, emit EXACTLY this structure (include the LinkedIn URL and email from Block D of the qualification report; mark email confidence):

```
## LinkedIn DM — to {Contact Full Name} ({Title})

**Profile:** {direct linkedin.com/in/... URL from Block D}
**Email:** {email} [{confidence: verified-apollo | verified-hunter | verified-snov | verified-prospeo | verified-skrapp | verified-web | TBD}]

If the email is TBD, note it in the Review section and tell the user to resolve it manually before sending — do NOT guess a pattern.

### Variant A — trigger-led ({char count}/300)
Hi {FirstName}, {trigger + hypothesis}. {relevance with one metric}. {soft ask}?

### Variant B — customer-led ({char count}/300)
Hi {FirstName}, {customer anchor from case-studies.md}. {how it connects to their situation}. {soft ask}?

### Variant C — question-led ({char count}/300)
Hi {FirstName}, {curious question about their world}? {one-sentence context}. {soft ask}.
```

3. Before outputting, re-read each variant and confirm: starts with `Hi {FirstName},` · zero `—` characters · under 300 chars · no banned phrases. If any check fails, rewrite that variant.

**Example (for a prospect "Acme" with Jane Doe as EB):**

```
## LinkedIn DM — to Jane Doe (CEO)

### Variant A — trigger-led (248/300)
Hi Jane, congrats on the Fortune 500 design partners. Their procurement will ask for {artifact} next to your SOC 2 report in 2026. We produce those in 15 min, not 8 weeks. Worth a look?
```

No em-dashes. Starts with `Hi Jane,`. Named recipient in the header.

### Call script — 1 variant (not 3)

Short opener (<=20 sec), 2-3 discovery questions pulled from `_profile.md#your-qualifying-questions`, and a soft close. Call scripts don't need 3 variants — the conversation branches on the first response.

### Voicemail — 1 variant

<=15 sec. Different structure than the opener; voicemails need a hook that survives 3 seconds of inattention.

## Step 5 — Present

Output format:

```
## Outreach drafts — {Company} ({Contact}, {Title})

Based on: Report #{NNN} | Score {X.X}/5 | Archetype: {archetype}
Touch #{N} | Channel priority per _profile.md: email -> LinkedIn -> call

---

### Email
Variant A — trigger-led
  Subject: ...
  ---
  {body}

Variant B — customer-led
  Subject: ...
  ---
  {body}

Variant C — question-led
  Subject: ...
  ---
  {body}

### LinkedIn DM — to {Contact Name} ({Title})
Variant A: {text starting with "Hi {FirstName},"} ({char count}/300)
Variant B: {text starting with "Hi {FirstName},"} ({char count}/300)
Variant C: {text starting with "Hi {FirstName},"} ({char count}/300)

(If there is a second distinct contact per Block D, repeat this block for that contact with their own 3 variants. Do NOT output a DM without a named recipient.)

### Call opener
{script}

### Voicemail
{script}

---

Review notes:
- [Specific things to check before sending — facts to verify, links to sanity-check, name spellings]
- [Personalization the user might add — inside knowledge the system doesn't have]
- [Variants ranked by estimated fit for this archetype]

Recommended variant: {A|B|C} because {reason}.
```

## Step 6 — Log (only after user confirms they sent)

After the user confirms they sent an outreach (e.g. "sent variant A to {contact} at {time}"):

1. Update `data/prospects.md` for this prospect:
   - `stage` -> `Contacted`
   - `last_touch` -> today's date + channel + variant (e.g. `2026-04-18 email-A`)
   - `next_touch` -> calculate from `_profile.md#your-cadence-timing` (default: today+3 for Touch 2 LinkedIn)
   - `notes` -> append the variant used, short context
2. Save the sent variant to `output/sent/{NNN}-{company-slug}-touch{N}-{date}.md` for future reference.
3. Do NOT auto-send. Do NOT mark as Contacted until user confirms.

## Guardrails

- **Never send on the user's behalf.** Even if the user has MCP Gmail / LinkedIn tools available, this mode drafts only.
- **Never invent a customer.** If `case-studies.md` doesn't have a relevant customer for this archetype, leave the Relevance field blank and tell the user to fill in manually, OR use a generic-but-honest framing ("most of our customers in this stage...") — never fabricate a name.
- **Never invent the prospect's pain.** If Block E's pain hypothesis isn't supported by evidence, say so in the review notes and soften the language.
- **Never use "urgency" tactics.** No "spots filling up", "pricing changes next month", "last chance this quarter".
- **Respect disqualifiers.** If the prospect was flagged No-Fit by qualify, refuse to draft and explain why.
