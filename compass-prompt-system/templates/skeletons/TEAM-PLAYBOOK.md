<!-- Seeded skeleton. The compass bootstrap generates the filled version from your team-model and roles answers. -->

# Team Playbook

How we work on {PROJECT_NAME}. Read this before reading code.

---

## The Core Belief

<The conviction that defines the team. Why this group, working this way, is the right shape for this project.>

{{#if MULTI_AGENT}}
## How AI Fits Into Our Work

- **AI accelerates, humans direct.** {DELEGATE_AGENT_NAME} and other agents write code, research, and execute plans. The human decides what to build, reviews the output, and owns the result.
- **No black boxes.** Every AI-generated change is reviewable. Every decision has a trail.
- **Tools, not magic.** AI compresses the time it takes to make informed decisions — it doesn't remove the need to understand the system.
{{/if}}

## Current Team

<Team model: {TEAM_MODEL}.>

| Member | Role | Availability |
|--------|------|--------------|
{{#each ROLES}}
| <name> | {ROLES} | <availability> |
{{/each}}

## Roles Needed

<Roles to bring on, with why and how urgently. Omit if fully staffed.>

| Role | Skills | Why | Priority |
|------|--------|-----|----------|
| <role> | <skills> | <why this role moves the project> | High / Medium / Low |

## Onboarding a New Team Member

### Day 1: Context

1. Read `NORTH-STAR.md` — understand *why* we're building this
2. Read `MILESTONES.md` — understand what "done" looks like{{#if PRIMARY_MILESTONE}} and when{{/if}}
3. Read `PRIORITY-MAP.md` — understand what we're working on *right now*
4. Read `STATE-OF-THE-UNION.md` — understand where everything stands today

### Day 2: System

1. Read the root `CLAUDE.md` — conventions, commands, architecture overview
2. Read the relevant module's docs for their area
3. Read `{DOCS_ROOT}/README.md` — understand the documentation system

### Day 3: Build

1. Get the local stack running
2. Pick a task from the current phase in `PRIORITY-MAP.md`
3. Ship something small on day one of real work

### Ongoing

- Compass docs are living documents. If you learn something that changes the plan, update the docs.
- Topology projects track implementation work. Read the topology command docs if you're doing a rebuild or multi-category change.

## Working Agreements

1. **<Agreement — e.g. commit convention>.** <One line.>
2. **<Agreement — e.g. max file size>.** <One line.>
3. **<Agreement>.** <One line.>
4. **<Agreement>.** <One line.>
