# Compass

Strategic operating layer for {PROJECT_NAME}. Compass answers questions that code, architecture docs, and topology projects don't:

- **Why** are we building this?
- **Where** are we going?
- **What does "done" look like?**
- **How do we get there together?**

---

## Documents

| Document | Purpose | Update Cadence |
|----------|---------|----------------|
| [NORTH-STAR.md](NORTH-STAR.md) | Vision, philosophy, founding principles | Rarely — only when fundamentals shift |
| [MILESTONES.md](MILESTONES.md) | Target dates and "done" definitions | When milestones are added, hit, or revised |
| [PRIORITY-MAP.md](PRIORITY-MAP.md) | Sequenced work across all apps with dependencies | Weekly or when priorities shift |
| [RISK-REGISTER.md](RISK-REGISTER.md) | Known risks, likelihood, impact, mitigations | Ongoing — add risks as discovered |
| [TEAM-PLAYBOOK.md](TEAM-PLAYBOOK.md) | Onboarding philosophy, roles, how we work | When team composition or process changes |
| [STATE-OF-THE-UNION.md](STATE-OF-THE-UNION.md) | Point-in-time snapshot of where everything stands | Weekly ({CADENCE_UPDATE_DAY}) or at key inflection points |
| [CADENCE.md](CADENCE.md) | Weekly operating rhythm — when to plan, check, update, review | When the rhythm evolves |

## Commands

| Command | When | Purpose |
|---------|------|---------|
| `/compass-weekly-brief` | {CADENCE_BRIEF_DAY} | Set the week's plan — must-do vs like-to-do |
| `/compass-check` | {CADENCE_CHECK_DAYS} | Daily focus + mid-week gut check |
| `/compass-update` | {CADENCE_UPDATE_DAY} | Refresh STATE-OF-THE-UNION with current reality |
| `/compass-risk` | {CADENCE_RISK_DAY} | Review and update the risk register |
| `/compass-onboard <role>` | When adding a team member | Personalized onboarding guide for their role |

---

## Relationship to Other Documentation

```
CLAUDE.md files        → How to develop (conventions, commands, gotchas)
{{#if TIER_ENABLED}}{TIER_1_DIR}/ … {TIER_3_DIR}/  → What the system is (platform context, patterns)
{{/if}}{DOCS_ROOT}/apps/          → What each app does (user-facing specs)
{PROJECTS_DIR}/           → How we build changes (topology execution)
{COMPASS_DIR}/            → Why we're building, where we're going, how we get there together
```

Compass is the layer a new team member reads *first* — before touching code, before reading architecture docs. It answers "what are we doing here and why does it matter?"

---

## Maintenance

- **STATE-OF-THE-UNION.md** is the most frequently updated document. Refresh it at natural inflection points — after a major milestone, a shift in priorities, or when onboarding someone new.
- **PRIORITY-MAP.md** is the working document. It drives daily and weekly decisions about what to work on next.
- **RISK-REGISTER.md** is append-and-update. Risks are never deleted — they're marked mitigated or accepted.
- **NORTH-STAR.md** and **TEAM-PLAYBOOK.md** change slowly. They represent durable principles.
