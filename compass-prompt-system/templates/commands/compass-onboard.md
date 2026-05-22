# compass-onboard

Walk a new team member through the {PROJECT_NAME} project with tailored context for their role. Generates a personalized onboarding guide and answers questions interactively.

## Usage

```
/compass-onboard <role>
```

### Arguments

- `<role>` — The new team member's role. One of: {{#each ROLES as r}}`{r}` {{/each}}

---

## Instructions

### Step 1: Load Compass Docs

Read all Compass documents in order:
1. `{COMPASS_DIR}/NORTH-STAR.md`
2. `{COMPASS_DIR}/MILESTONES.md`
3. `{COMPASS_DIR}/PRIORITY-MAP.md`
4. `{COMPASS_DIR}/RISK-REGISTER.md`
5. `{COMPASS_DIR}/TEAM-PLAYBOOK.md`
6. `{COMPASS_DIR}/STATE-OF-THE-UNION.md`
7. `{COMPASS_DIR}/CADENCE.md`

### Step 2: Load Role-Specific Context

Based on the role argument, read additional documents. Start from the root `CLAUDE.md` (conventions, commands, gotchas) for every role, then pull in the context that matters for the specific role:

{{#each ROLES as r}}
**{r}:**
- Root `CLAUDE.md`
- The `CLAUDE.md` files for the apps/modules this role primarily works in (see the roster below)
- The tier docs under `{TIER_1_DIR}/`, `{TIER_2_DIR}/`, `{TIER_3_DIR}/` relevant to `{r}` (if they exist)
{{/each}}

App/module roster (read the `CLAUDE.md` and code for the ones this role owns):
{{#each APPS as app}}
- **{app.name}** (`{app.path}`) — {app.role}
{{/each}}

Use judgment: a backend-leaning role needs the data/infra conventions and {API_STYLE} definitions; a frontend-leaning role needs the design-system and component guidelines; an infra-leaning role needs deployment, health-check, and {DATABASE} rules; a security-leaning role needs auth and secrets architecture. Read only what's relevant — don't drown the new person in every doc.

### Step 3: Generate Onboarding Guide

Output a personalized onboarding guide:

```
═══════════════════════════════════════════════════════════
  {PROJECT_NAME} ONBOARDING — <Role> Developer
  Welcome to the team.
═══════════════════════════════════════════════════════════

THE MISSION (2 minutes)
───────────────────────────────────────────────────────────

  <Condensed version of NORTH-STAR.md — vision, philosophy,
   business model in 3-4 paragraphs>

WHERE WE ARE (3 minutes)
───────────────────────────────────────────────────────────

{{#if PRIMARY_MILESTONE}}
  Target: <{PRIMARY_MILESTONE} date and definition>
  Weeks remaining: <N>
  Current phase: <from PRIORITY-MAP>
{{/if}}
{{#unless PRIMARY_MILESTONE}}
  Current phase: <from PRIORITY-MAP>
  Active work: <what's in flight right now>
{{/unless}}

  <Brief per-app status relevant to this role>

YOUR ROLE (5 minutes)
───────────────────────────────────────────────────────────

  <What this role is responsible for in the {PROJECT_NAME} context>
  <What systems/apps they'll primarily work in>
  <Key conventions and rules specific to their role>
  <Tools and frameworks they need to know>

  Key files to read:
  1. <most important file for this role>
  2. <second most important>
  3. <third>

HOW WE WORK (3 minutes)
───────────────────────────────────────────────────────────

  <Condensed TEAM-PLAYBOOK — working agreements, tooling,
   commit conventions, cadence overview>

  Weekly rhythm:
  - {CADENCE_BRIEF_DAY}: /compass-weekly-brief
  - {CADENCE_CHECK_DAYS}: /compass-check (daily focus + mid-week gut check)
  - {CADENCE_UPDATE_DAY}: /compass-update
  - {CADENCE_RISK_DAY}: /compass-risk

GETTING STARTED (10 minutes)
───────────────────────────────────────────────────────────

  1. Clone the repo and install dependencies (`{PACKAGE_MANAGER}`)
  2. Set up environment (secrets, local config)
  3. Start the dev stack and confirm it runs
  4. <Role-specific first task from PRIORITY-MAP>

QUESTIONS?
───────────────────────────────────────────────────────────

  Ask me anything about the codebase, architecture, or
  project direction. I have full context.

═══════════════════════════════════════════════════════════
```

### Step 4: Interactive Mode

After rendering the guide, remain available for questions. The new team member may ask about:
- Specific systems or code areas
- Why decisions were made
- What to work on first
- Architecture questions
{{#if MULTI_AGENT}}- How to use the {DELEGATE_AGENT_NAME} delegation tools{{/if}}

Answer using the full context of the Compass docs, CLAUDE.md files, and codebase.

---

## Important Notes

- **This is a first impression.** Make it clear, welcoming, and energizing. The goal is for the new person to feel oriented and excited — not overwhelmed.
- **Tailor aggressively.** A backend developer doesn't need to know about frontend styling rules. A frontend developer doesn't need to know about database encryption patterns. Focus on what matters for their role.
- **Point to sources.** Don't try to explain everything — point them to the right documents and files. Let them explore.
- **Emphasize the philosophy.** Every team member should understand the founding principles in NORTH-STAR.md. It's not just product framing — it's how the work gets done.

$ARGUMENTS
