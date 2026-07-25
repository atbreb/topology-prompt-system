# topology-phase-plan

Produce a phased implementation plan for one category, then scaffold it using `project-prep-scaffolding`. Phase ordering is driven by the gap analysis dependency graph — boundary gaps that unblock other categories are sequenced first. Every phase's session prompt includes topology-aware exit criteria referencing the specific seam contracts and invariants it must satisfy. In the Workflow era the phase table and per-phase role profiles are emitted as **structured phase-descriptors** so `topology-implement` / `topology-dispatch` consume them reliably instead of re-parsing prose.

> **See `{COMMANDS_DIR}/topology-PRINCIPLES.md` for the design discipline behind this skill.** In particular: the Decisions column on the phase table (added per Rule 7 below) directly mitigates failure mode #5 (decision relitigation) — the implementer at phase boundary sees which DLs they cannot reopen at this phase, narrowed from the project-wide register. The Role profile (Rule 6) is the load-bearing input that drives the single-role → `topology-implement`/`project-next-phase` vs multi-role → `topology-dispatch` routing.

## Usage

```
/topology-phase-plan <project-name> <category-slug>
```

### Arguments

- `<project-name>` — the project directory name under `{PROJECTS_ACTIVE_DIR}/`
- `<category-slug>` — the category to plan

---

## Prerequisites

- [ ] `TOPOLOGY-CLAUDE.md` exists
- [ ] `CONTRACT-SHEET.md` exists
- [ ] `SYSTEM-TOPOLOGY.md` exists
- [ ] `categories/<category-slug>/CURRENT-STATE.md` exists
- [ ] `categories/<category-slug>/GAP-ANALYSIS.md` exists

If either analysis document is missing, stop and report the missing prerequisite with the command to generate it.

{{#if USE_SUBAGENTS}}
> **Workflow opt-in.** Step 5 below embeds a light `Workflow` `parallel()` fan-out (one agent per phase session prompt). Invoking this command **is** the opt-in — per the Workflow tool's own rule, a topology skill whose instructions tell you to call `Workflow` authorizes that call. You do not need to ask separately. Steps 1–4 stay in the main loop (they are judgment + a mandatory shared-skill gate, not fan-out); only Step 5 is a workflow. There is **no HITL-mid-run** and no E2E/promote boundary in this command. The one hard gate — the Step 4 prep-scaffolding verification — is a **HARD HALT**, not a HITL return.

{{/if}}
---

{{#if MULTI_AGENT}}
## {DELEGATE_AGENT_NAME} Pair Mode (optional)

If `{DELEGATE_FLAG}` appears anywhere in `$ARGUMENTS`, enter **{DELEGATE_AGENT_NAME} Pair Mode** before executing any step below. Full rules live in `{DELEGATE_PROTOCOL_FILE}`.

Procedure:

1. Read `{DELEGATE_PROTOCOL_FILE}`.
2. Post a Handoff Plan table mapping every step in the Instructions section below to either `Claude` or `{DELEGATE_AGENT_NAME}`, with a one-line rationale each. **Informational** — the `{DELEGATE_FLAG}` flag is already the user's ACK.
3. Proceed immediately per the Handoff Plan; record attribution in the category RUNBOOK per the protocol. If you need to deviate from the Default split in a way the user might not expect, flag it as a notice and proceed unless the user objects in the same turn.

Where {DELEGATE_AGENT_NAME} pays off most for this command: **enumerating files-touched-per-phase** and populating the "Files to Read" sections (mechanical glob/grep from the gap analysis). Phase sequencing, dependency design, acceptance criteria, and the phase writeup stay on Claude — those are judgment calls that depend on the gap analysis narrative.

Strip `{DELEGATE_FLAG}` from `$ARGUMENTS` before substituting into the positional args below.

---

{{/if}}
## Instructions

### Step 1: Load All Context{{#if USE_SUBAGENTS}} (main loop){{/if}}

Read:
1. `GAP-ANALYSIS.md` for this category — all gaps, dependency graph, recommended sequencing
2. `CURRENT-STATE.md` for this category — source files, code paths
3. `CONTRACT-SHEET.md` — invariants relevant to this category
4. `SYSTEM-TOPOLOGY.md` — all seams involving this category
5. `TOPOLOGY-CLAUDE.md` — project conventions, category list, recommended execution order

### Step 2: Derive Phase Structure{{#if USE_SUBAGENTS}} (main loop){{/if}}

Using the gap analysis dependency graph as the primary input:

**Rule 1 — Critical unblocking gaps go in Phase 1.** Any gap whose closure unblocks another category's verification must be in Phase 1. These are the highest-priority work.

**Rule 2 — Group by seam.** Gaps belonging to the same seam should be in the same phase wherever possible. This allows seam verification to happen as a unit.

**Rule 3 — Internal gaps follow boundary gaps.** If a boundary gap and an internal gap are independent, the boundary gap goes first. Unblocking neighbors takes priority over internal cleanup.

**Rule 4 — Phase size is bounded.** No phase should exceed 20 hours of estimated effort. Split large phases.

**Rule 5 — Topology-aware exit criteria per phase.** Every phase must list which contract invariants and seam guarantees it fully satisfies upon completion. These become the topology-verify checklist.

**Rule 6 — Role profile per phase.** Every phase must declare its role profile (`single-role` or `multi-role`) and the specialist roles that own its file scope. This is the load-bearing input for the dispatch inference in `topology-implement` Step 2.5. Apply the path → role inference rules (also in `topology-dispatch` Step 3), mapping each path region to one of the project's subagent types ({{#each SUBAGENT_TYPES as t}}`{t}`{{/each}}):

| Path region | Role |
|---|---|
| Backend service code, schema/API definitions, DB migrations | backend role |
| Frontend app code, shared UI packages | frontend role |
| Infra/gateway config, Dockerfiles, CI workflows, deploy config | systems role |
| Pure design-spec / token / accessibility | design role |
| Auth, secrets, billing, SQL injection–adjacent | security reviewer (non-blocking reviewer; does not change the role profile from single-role to multi-role on its own) |

A phase is `multi-role` when **two or more distinct primary roles** (excluding the security reviewer) own non-overlapping subsets of the phase's file scope. Otherwise it is `single-role`. Disjointness is mandatory for declaring multi-role — overlapping file scopes mean the phase is single-role with mixed concerns, not a dispatch candidate.{{#if USE_SUBAGENTS}} (Note: under `topology-dispatch` with worktree isolation, an overlap that *does* surface is survivable as a merge-order decision rather than an abort — but you still classify by disjoint primary ownership here.){{/if}}

**Rule 7 — Decisions in scope per phase.** Every phase declares the DL-IDs that constrain it specifically. Filter from `DECISION-LOG.md`: include any DL whose `Affects:` line names a contract or seam this phase advances, plus any DL the category-level CLAUDE.md flagged as in-scope for this category. The implementer at phase boundary loads only the DLs cited here; reopening any of them requires the explicit `**Reopened YYYY-MM-DD:**` annotation per `topology-PRINCIPLES.md`. This is the smallest fix for failure mode #5 (decision relitigation).

Produce a phase table:

| Phase | Name | Role Profile | Gaps Addressed | Contracts Satisfied | Seams Advanced | Decisions in scope | Est. Hours |
|-------|------|--------------|---------------|--------------------|--------------------|--------------------|-----------|
| 1 | <title> | single-role (backend role) | IG-x-1, BG-y-1 | C<N> | S<N> (producer side) | DL-<N>, DL-<N> | ~Nh |
| 2 | <title> | multi-role (backend role + frontend role) | IG-x-2 | C<N> | S<N> | DL-<N> | ~Nh |

If a phase has no DLs in scope (rare — typically only pure-cleanup phases that touch no contracts and no seams), record `—` in the column. Phases that say `all DLs` are mis-scoped — split them or narrow them.

{{#if USE_SUBAGENTS}}
#### Structured phase-descriptors (Workflow value-add)

Alongside the human-readable table, emit the same phase plan as a compact inline **phase-descriptor** array so `topology-implement` and `topology-dispatch` consume firm structured data instead of re-parsing the prose table. Embed this block in the Implementation Plan (see Step 3) directly under the phase table, fenced as ```` ```json ````. The schema:

```js
// One phase, as consumed by topology-implement (routing) and topology-dispatch (roster).
const PHASE_DESCRIPTOR = {
  type: 'object',
  required: ['phase', 'name', 'roleProfile', 'roles'],
  properties: {
    phase:            { type: 'integer' },
    name:             { type: 'string' },
    roleProfile:      { enum: ['single-role', 'multi-role'] },
    roles:            { type: 'array', items: { type: 'string' } },  // project's subagent types
    fileScopePerRole: { type: 'object' },              // { "<role>": ["path/..."] }
    gapsAddressed:    { type: 'array', items: { type: 'string' } },  // ["IG-x-1","BG-y-1"]
    contracts:        { type: 'array', items: { type: 'string' } },  // ["C3"]
    seams:            { type: 'array', items: { type: 'string' } },  // ["S5 (producer)"]
    dlsInScope:       { type: 'array', items: { type: 'string' } },  // ["DL-12"] ([] iff column is "—")
    estHours:         { type: 'number' },
  },
};
```

This descriptor array is the machine-readable mirror of the table — it must agree cell-for-cell. `topology-implement` reads `roleProfile` to route (single-role → `project-next-phase`; multi-role → `topology-dispatch`); `topology-dispatch` reads `roles` + `fileScopePerRole` to seed its worktree-branch roster without re-inferring from prose.

{{/if}}
### Step 3: Create Implementation Plan{{#if USE_SUBAGENTS}} (main loop){{/if}}

Create `{PROJECTS_ACTIVE_DIR}/<project-name>/categories/<category-slug>/implementation/<Category>-Implementation-Plan.md`

```markdown
# <Category Title> — Implementation Plan

**Project:** <project-name>
**Category:** <category-slug>
**Created:** <date>
**Source documents:** CURRENT-STATE.md, GAP-ANALYSIS.md, CONTRACT-SHEET.md, SYSTEM-TOPOLOGY.md

---

## Objective

<2-3 sentences: what this category looks like when all phases are complete.
Reference specific contracts and seams by number.>

## Contracts This Plan Satisfies

| Contract | Title | Satisfied In Phase |
|----------|-------|--------------------|
| C<N> | <title> | Phase <N> |

## Seams This Plan Advances

| Seam | Role | Advances In Phase |
|------|------|------------------|
| S<N> | Producer | Phase <N> |

## Implementation Phases

| Phase | Name | Decisions in scope | Est. Hours | Dependencies | Status |
|-------|------|--------------------|-----------|--------------|--------|
| 1 | <title> | DL-<N>, DL-<N> | ~Nh | None | Not Started |
| 2 | <title> | DL-<N> | ~Nh | Phase 1 | Not Started |

**Critical Path:** Phase 1 must complete before any other category that depends on
<seam names> can proceed to topology-verify.
```

{{#if USE_SUBAGENTS}}
```markdown
### Phase Descriptors (structured — consumed by topology-implement / topology-dispatch)

> Machine-readable mirror of the table above. Must agree cell-for-cell. `topology-implement`
> routes on `roleProfile`; `topology-dispatch` seeds its roster from `roles` + `fileScopePerRole`.

\`\`\`json
[
  {
    "phase": 1, "name": "<title>", "roleProfile": "single-role",
    "roles": ["<backend-role>"],
    "fileScopePerRole": { "<backend-role>": ["<service>/path/...", "<schema>/path/..."] },
    "gapsAddressed": ["IG-x-1", "BG-y-1"], "contracts": ["C<N>"], "seams": ["S<N> (producer)"],
    "dlsInScope": ["DL-<N>"], "estHours": 8
  }
]
\`\`\`
```

{{/if}}
```markdown
---

## Phase 1 — <Title>

### Role Profile
**Profile:** single-role | multi-role
**Roles:** <one or more of the project's subagent types>
**File scope per role** (for multi-role only):
- <backend role>: `<service>/path/...`
- <frontend role>: `<app>/path/...`

**Reviewers (non-blocking, does not change profile):** <security reviewer> (if auth/billing/SQL injection adjacent)

> Consumed by `topology-implement` Step 2.5 to route this phase to either `project-next-phase` (single-role) or `topology-dispatch` (multi-role).{{#if USE_SUBAGENTS}} The structured `PHASE_DESCRIPTOR` for this phase carries the same data machine-readably.{{/if}}

### Objective
<What this phase delivers. Which gaps it closes. Which contracts/seams it satisfies.>

### Decisions in scope
> Reopening any of these requires `**Reopened YYYY-MM-DD:**` annotation in `DECISION-LOG.md`. See `topology-PRINCIPLES.md` § failure mode 5.

- DL-<N>: <one-line: which contract / seam / responsibility this DL anchors for this phase>
- DL-<N>: <one-line>

### Gaps Addressed
- IG-<slug>-N: <description>
- BG-<seam>-N: <description>

### Tasks

#### Task 1.1 — <Title> (~Nh)
<Detailed description from gap analysis>

**Files to modify:**
- `path/to/file` — <what changes>

**Files to create:**
- `path/to/new/file` — <purpose>

#### Task 1.2 — <Title> (~Nh)
<Description>

### Exit Criteria

> These are the topology-verify checklist for Phase 1.
> Phase 1 is complete when ALL of the following are true:

**Contract compliance:**
- [ ] C<N>: <specific binary check from contract verification criteria>

**Seam compliance:**
- [ ] S<N> producer guarantee: <specific guarantee statement from SYSTEM-TOPOLOGY.md>
- [ ] S<N> producer guarantee: <specific guarantee statement>

**Code verification:**
- [ ] <specific observable behavior or test>
- [ ] <specific file exists or function signature>

---

## Phase 2 — <Title>

<Same structure as Phase 1>

---

## Conventions

- **Project code-style conventions** apply (file-size limits, naming, test patterns — see `CLAUDE.md`).
- **{PRIMARY_LANGUAGE} patterns:** follow the project's established idioms for tests, error handling, and field naming.
- **Reuse before authoring:** check existing shared packages before creating new components or types.
- **Topology discipline:** When modifying a seam boundary, update both producer and consumer in the same phase. Never leave a seam in a half-migrated state.

## Files to Read (for all phases)

| File | Why |
|------|-----|
| `CURRENT-STATE.md` | Source file locations and current behavior |
| `GAP-ANALYSIS.md` | Detailed gap descriptions and dependency graph |
| `CONTRACT-SHEET.md` | Invariants to satisfy |
| `SYSTEM-TOPOLOGY.md` | Seam guarantees to honor |
```

### Step 4: Scaffold Using project-prep-scaffolding — MANDATORY{{#if USE_SUBAGENTS}} (main loop, single shared-skill invocation){{/if}}

> **This step is non-skippable.** It is the only step that creates per-phase directories, session prompts, and runbooks. Step 5 (topology context enhancement) and the prerequisite checks in `topology-implement` Step 1 both depend on its outputs. If you skip it, downstream commands will fail or run with stale scaffolding.
>
{{#if USE_SUBAGENTS}}
> **This is a single shared-skill invocation, NOT a fan-out.** `/project-prep-scaffolding` is the existing shared skill (not a topology variant — keep that exact name; it is shared infra, not a topology command). Do not wrap it in a `Workflow`, do not parallelize it. Its mandatory-gate semantics are unchanged. The only fan-out in this command is Step 5.
>
{{/if}}
> **Do not author a slim `implementation/CLAUDE.md` mirror in place of running this step.** The mirror pattern is a known anti-pattern that has caused projects to ship without per-phase runbooks.
>
> **Prospective-only — no retroactive back-fill.** The strict scaffolding gate applies to categories that start *after* the gate was tightened. If a category has already shipped one or more phases under an older, looser regime (slim CLAUDE.md mirror, no `<Category>-Implementation-Plan.md`, no per-phase session prompts/runbooks), do **not** propose back-filling the missing scaffolding. The work is already done — the audit trail lives in the commit history and tracking commits, no agent will ever consume the back-filled artifacts. For grandfathered categories with remaining phases, override the gate per-category, document the override in the dispatch report, and proceed. Do not propose running `/project-prep-scaffolding` or re-running `/topology-phase-plan` on categories that have already shipped phases under the looser regime — only the override path is correct.

You **MUST** invoke `/project-prep-scaffolding` on the implementation directory exactly once per category:

```
/project-prep-scaffolding {PROJECTS_ACTIVE_DIR}/<project-name>/categories/<category-slug>/implementation/
```

This creates `<Category>-Implementation-Plan.md` plus all `phase-N/` directories with session prompts and runbooks.
{{#if MULTI_AGENT}}

**{DELEGATE_AGENT_NAME} note:** Slash commands cannot be invoked by {DELEGATE_AGENT_NAME}. If running `{DELEGATE_FLAG}`, this step is **always Claude**, never {DELEGATE_AGENT_NAME}. Hand back to Claude before this step if {DELEGATE_AGENT_NAME} was driving Step 3.
{{/if}}

#### Step 4 Verification — fail-loud{{#if USE_SUBAGENTS}} (HARD HALT){{/if}}

Immediately after the prep-scaffolding invocation returns, you **MUST** verify its outputs by listing the implementation directory and confirming each expected artifact exists:

```bash
ls -la {PROJECTS_ACTIVE_DIR}/<project-name>/categories/<category-slug>/implementation/
```

Required artifacts (every one of these must be present before proceeding to Step 5):

- [ ] `<Category>-Implementation-Plan.md` (the file Step 3 planned)
- [ ] `phase-1/PHASE-1-SESSION-PROMPT.md`
- [ ] `phase-1/PHASE-1-RUNBOOK.md`
- [ ] `phase-N/PHASE-N-SESSION-PROMPT.md` for every additional phase in the table from Step 2
- [ ] `phase-N/PHASE-N-RUNBOOK.md` for every additional phase

If any artifact is missing — including the case where prep-scaffolding only created some phase dirs and not others — **halt immediately**.{{#if USE_SUBAGENTS}} This is a HARD HALT, not a HITL return: there is no workflow running yet, so there is nothing to package as data.{{/if}} Do not author a slim CLAUDE.md mirror as a substitute. Do not proceed to Step 5. Do not emit the Step 7 completion report. Print:

> ❌ Step 4 verification FAILED: prep-scaffolding did not produce all expected artifacts. Missing: `<list>`. Re-run `/project-prep-scaffolding <impl-dir>` and verify before continuing. **Steps 5–7 are blocked until this passes.**

### Step 5: Enhance Session Prompts with Topology Context{{#if USE_SUBAGENTS}} (Workflow `parallel()` fan-out){{/if}}

{{#if USE_SUBAGENTS}}
Enhancing each generated `PHASE-N-SESSION-PROMPT.md` with its topology context is **naturally parallel** — one agent per phase prompt, no dependencies between them. Author a `Workflow` script that fans out one agent per phase (this is the Workflow opt-in; Step 4's gate must have passed first). Each agent reads its own `PHASE-N-SESSION-PROMPT.md`, the foundation docs, and the phase's row from the Implementation Plan, then appends the TOPOLOGY CONTEXT block below after the prompt's CONSTRAINTS section. Agents are search-and-edit only (no commits, no code), so they may run with the default workflow agent or `Explore`.

```js
export const meta = {
  name: 'topology-phase-plan-enhance',
  description: 'Enhance each phase session prompt with topology context (one agent per phase)',
  phases: [{ title: 'Enhance', detail: 'fan out one agent per PHASE-N-SESSION-PROMPT.md' }],
}

const { project, category, phaseNums, implDir } = args  // phaseNums: [1,2,3,...]

phase('Enhance')
const results = await parallel(phaseNums.map(n => () =>
  agent(
    `You are enhancing the topology session prompt for phase ${n} of category "${category}" in project "${project}".\n` +
    `Read: ${implDir}/phase-${n}/PHASE-${n}-SESSION-PROMPT.md (the prompt to enhance), ` +
    `the phase ${n} row + its Phase Descriptor from ${implDir}/<Category>-Implementation-Plan.md, ` +
    `and the project CONTRACT-SHEET.md + SYSTEM-TOPOLOGY.md for the contracts/seams that phase advances.\n` +
    `Append a "## TOPOLOGY CONTEXT" block AFTER the prompt's CONSTRAINTS section with EXACTLY these sub-sections, ` +
    `filled from the foundation docs (verbatim guarantee/invariant text — do not paraphrase): ` +
    `Contracts This Phase Satisfies, Seam Guarantees This Phase Must Honor, ` +
    `Seam Guarantees This Phase Must NOT Break, Topology Exit Criteria.\n` +
    `Edit only that one file. Do not commit. Do not touch any other phase's prompt.\n` +
    `Return which file you edited and the count of contracts + seams you wrote into it.`,
    { label: `enhance:p${n}`, phase: 'Enhance' }
  )
))

return results
```

Pass `args: { project, category, phaseNums, implDir }`. When the workflow returns, confirm every phase's prompt reports a non-zero contract+seam count; if any returned zero where the table shows the phase advances a contract or seam, re-edit that one prompt in the main loop (do not re-run the whole fan-out). Single-phase categories may skip the workflow and enhance the one prompt inline — the fan-out earns its overhead only across multiple phases.

The block each agent appends:
{{else}}
After scaffolding, read each generated `PHASE-N-SESSION-PROMPT.md` and add topology-specific sections that the base scaffolding doesn't include:

In each session prompt, add after the CONSTRAINTS section:
{{/if}}

```markdown
## TOPOLOGY CONTEXT

### Contracts This Phase Satisfies
| Contract | Invariant | How this phase satisfies it |
|----------|-----------|---------------------------|
| C<N> | <invariant statement> | <specific code change> |

### Seam Guarantees This Phase Must Honor
| Seam | Guarantee | Verification |
|------|-----------|-------------|
| S<N> — <title> | <guarantee text from SYSTEM-TOPOLOGY.md> | <how to verify> |

### Seam Guarantees This Phase Must NOT Break
| Seam | Guarantee at risk | How to protect it |
|------|-----------------|------------------|
| S<N> — <title> | <guarantee that could regress> | <specific check> |

### Topology Exit Criteria
> In addition to the standard exit criteria, this phase is complete only when:
- [ ] <seam guarantee 1 is verifiably honored>
- [ ] <contract invariant is verifiably satisfied>
- [ ] No seam that was previously Honored is now Violated
```

### Step 6: Update TOPOLOGY-CLAUDE.md{{#if USE_SUBAGENTS}} (main loop){{/if}}

Update the categories table:

```
| N | <Category Name> | `categories/<slug>/` | Phase Plan Complete — N phases |
```

### Step 7: Report Completion

> **Pre-emit gate.** Do not emit this report unless Step 4's verification passed (every required artifact confirmed present on disk). The report's "Scaffolding Output" section is a factual claim about the filesystem; if any listed file is missing, the claim is false and the command has not completed.

```
## topology-phase-plan Complete

**Category:** <title>
**Project:** <project-name>
**Phases:** <N>
**Total estimated effort:** ~Nh
```

{{#if USE_SUBAGENTS}}
```
**Step 5 enhance workflow runId:** <runId | n/a (single-phase, inline)>
```

{{/if}}
```
### Phase Summary
| Phase | Name | Role Profile | Gaps Closed | Contracts | Seams | Hours |
|-------|------|--------------|------------|-----------|-------|-------|
| 1 | <title> | single-role (backend role) | <N> gaps | C<N> | S<N> | ~Nh |

### Critical Path Impact
<Which other categories are unblocked after Phase 1 of this category completes>

### Scaffolding Output (verified present)
- implementation/CLAUDE.md
- implementation/<Category>-Implementation-Plan.md
- implementation/phase-1/PHASE-1-SESSION-PROMPT.md
- implementation/phase-1/PHASE-1-RUNBOOK.md
- implementation/phase-N/PHASE-N-SESSION-PROMPT.md (per phase)
- implementation/phase-N/PHASE-N-RUNBOOK.md (per phase)

### Next Steps
1. Review the implementation plan — verify phase breakdown matches your expectations
2. Review the topology exit criteria in each session prompt — they are the verification checklist
3. Run: /topology-future-state <project-name> <category-slug>
4. Then begin implementation: /topology-implement <project-name> <category-slug>
```

---

## Important Notes

- **Step 4 (project-prep-scaffolding) is non-skippable.** Authoring a slim `implementation/CLAUDE.md` mirror that points back to `../PHASE-PLAN.md` instead of running prep-scaffolding is an **anti-pattern**. Downstream commands (`topology-implement`, `project-next-phase`) require `<Category>-Implementation-Plan.md` and `phase-N/` runbooks. If Step 4 cannot run for some reason (e.g., permission issue, command unavailable), halt the entire `topology-phase-plan` invocation rather than substituting a hand-written mirror. `/project-prep-scaffolding` is shared infra — keep that exact name; never wrap it in a workflow or parallelize it.
{{#if USE_SUBAGENTS}}
- **The phase descriptors are the machine contract.** The structured `PHASE_DESCRIPTOR` array must agree cell-for-cell with the human-readable phase table. `topology-implement` routes on `roleProfile` and `topology-dispatch` seeds its roster from `roles` + `fileScopePerRole` — if the structured data drifts from the prose, downstream routing is wrong. Treat the table and the JSON as one artifact maintained together.
{{/if}}
- **The implementation plan is the source of truth** — once created, `project-next-phase` and `topology-implement` treat it as read-only. Amend through Decision Log entries that update the plan.
- **Topology exit criteria per phase are mandatory** — every session prompt must reference specific contract invariants and seam guarantees. Generic exit criteria ("feature works") are not sufficient.
- **Seam changes require both sides** — if a phase modifies how a seam boundary works, the session prompt must address both the producer and consumer side in the same phase. Half-migrated seams are worse than unmigrated ones.
- **Phase 1 is always the unblocking phase** — resist the temptation to do "easier" cleanup work first. The phases are ordered by dependency impact, not effort.
{{#if USE_SUBAGENTS}}
- **No HITL mid-run.** This command has no contract/seam amendment gate, no strict-mode DL approval, and no E2E/promote boundary. The only hard stop is the Step 4 prep-scaffolding verification, which is a HARD HALT (nothing is running to package as data) — not a HITL return.
{{/if}}

### Placeholders

| Placeholder | Meaning |
|---|---|
| `<project-name>` | Project directory under `{PROJECTS_ACTIVE_DIR}/` |
| `<category-slug>` | The category being planned |
| `<Category>` / `<Category Title>` | Human-readable category name (file prefix + headings) |
| `<N>` | A number (phase index, contract `C<N>`, seam `S<N>`, DL `DL-<N>`) |
{{#if USE_SUBAGENTS}}
| `<runId>` | The `runId` returned by the Step 5 enhance workflow |
{{/if}}
| `<impl-dir>` | `{PROJECTS_ACTIVE_DIR}/<project-name>/categories/<category-slug>/implementation/` |

$ARGUMENTS
