# User Profile Context -- sales-ops

<!-- ============================================================
     THIS FILE IS YOURS. It will NEVER be auto-updated.

     Customize everything here: your buyer archetypes, voice,
     case studies to lead with, objection scripts, cadence timing.

     The system reads _shared.md (updatable) first, then this
     file (your overrides). Your customizations always win.
     ============================================================ -->

## Your Buyer Archetypes

<!-- Replace _shared.md's generic archetypes with your specific ones.
     Example for a fraud-ML vendor:
       - Fast-Growth Fintech (Series B-D, just raised, hiring risk)
       - Post-Incident Buyer (had a public breach / chargeback spike)
       - Vendor Displacement (locked in to Sift/Signifyd, contract up)
     Whatever slices of your ICP have distinct messaging. -->

| Archetype | How to detect | Lead with | Case study |
|-----------|---------------|-----------|------------|
| **Fast-Growth Fintech** | Raised Series B-D in last 6mo, hiring 2+ risk roles | ROI on eng time saved | {customer-win-1} |
| **Post-Incident Buyer** | Public breach / chargeback spike / new CRO in last 12mo | Speed to first save | {customer-win-2} |
| **Vendor Displacement** | Complaint posts about incumbent; renewal window public | Migration playbook | {customer-win-3} |
| **Greenfield Builder** | <50 employees, no risk team, founder still owns fraud | Build vs buy math | {customer-win-4} |

## Your Outreach Voice

<!-- Your seller voice. qualify + outreach modes use this to keep
     drafts on-brand. -->

**Tone:** direct, specific, technical-ish. Curious, not pitchy.

**Signature moves:**
- Open with the trigger (never "I hope this finds you well")
- One named metric per email (from case-studies.md)
- Never propose a time on first touch; ask if it's worth a conversation

**What NOT to sound like:**
- SDR template ("Quick question...")
- AE pitch deck prose ("industry-leading platform")
- Consultant ("we partner with...")

## Your Go-to Case Studies

<!-- Map case studies from case-studies.md to archetypes. -->

| If archetype is... | Lead case | Backup case |
|---------------------|-----------|-------------|
| Fast-Growth Fintech | {customer-1}: "cut chargebacks 40% in 60 days" | {customer-2} |
| Post-Incident Buyer | {customer-3}: "caught $2M/mo fraud in week 2" | {customer-1} |
| Vendor Displacement | {customer-4}: "migrated from {incumbent} in 3 weeks" | {customer-2} |
| Greenfield Builder | {customer-5}: "first fraud system, 0 → production in 4 weeks" | {customer-3} |

## Your Objection Playbook

<!-- Common objections you hear and your real-world responses.
     outreach mode pulls from this when drafting follow-ups. -->

| Objection | Response |
|-----------|----------|
| "We already have {incumbent}" | "Understood — most of our customers came from {incumbent}. The migration takes 3 weeks. What drove you to evaluate at the time?" |
| "We built it in-house" | "Makes sense at your scale. At {customer-size} the maintenance becomes 2-3 FTE. Happy to share how {similar-customer} decided to switch." |
| "No budget this quarter" | "Fair. Most of our deals start with a 30-day paid pilot against your live data — scoped to one use case, signed off by your head of {function}. Worth exploring?" |
| "Send me a deck" | "I'd rather learn what matters to you first — otherwise the deck is generic. 15 min on your priorities this quarter, then I tailor." |

## Your Cadence Timing

<!-- Override the default cadence in _shared.md if you have a rhythm
     that works better in your segment. -->

**Default (SDR cold cadence):**

| Touch # | Day | Channel | What |
|---------|-----|---------|------|
| 1 | Day 0 | Email | Trigger + hypothesis + ask |
| 2 | Day 3 | LinkedIn DM | Short, referencing email |
| 3 | Day 7 | Email | Different angle, new case study |
| 4 | Day 12 | LinkedIn InMail or phone | Reference previous 2 touches |
| 5 | Day 18 | Email | Breakup — "closing the loop" |

Stop after Touch 5 unless prospect engages. After breakup, move to `Nurture` for 90 days.

## Your Qualifying Questions

<!-- The discovery questions you ask on a first call, in priority order.
     qualify mode suggests which to open with based on archetype. -->

1. "Walk me through how fraud is handled today end-to-end — who owns it, what tools, where's the friction?"
2. "What's the number you're measured on, and where is it today vs target?"
3. "When you looked at this space before, what did you consider and why didn't it stick?"
4. "If we picked this up in 60 days, what would have to be true for you to say it was worth the bet?"
5. "Who else needs to be in the room?"

## Your Disqualifiers (Supplemental)

<!-- Beyond profile.yml#disqualifiers, document subtle things that have
     historically killed your deals. qualify mode warns on these. -->

- Prospect company's founder publicly anti-vendor ("we build everything in-house")
- Head of Risk has <6 months tenure AND no fraud background
- Company is pre-Series-B AND has <$1M ARR (can't afford us)
- Primary language of account is a geo you don't service
