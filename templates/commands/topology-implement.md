# topology-implement

Advance implementation for one category by delegating to `project-next-phase`. This command is a thin, topology-aware wrapper — it does not implement code itself. It ensures the correct implementation directory is targeted, validates that future state documentation exists before implementation begins, and updates the Verification Table as phases complete.

> **See `.claude/commands/topology-PRINCIPLES.md` for the design discipline behind this skill.** In particular: Step 2.7 (context loadout) is the canonical implementer pre-flight checklist that mitigates failure modes #4 (phase-context loss) and #5 (decision relitigation). The order of loading is load-bearing — loading more is over-eager, loading less is under-prepared.

## Usage

```
/topology-implement <project-name> <category-slug> [--one-run]
```

### Arguments

- `<project-name>` — the project directory name under `{PROJECTS_ACTIVE_DIR}/`
- `<category-slug>` — the category to advance

### Flags

- `--one-run` — execute all remaining phases sequentially in a single session. Without this flag, the plan is scoped to the next phase only. With this flag, the plan covers every remaining phase in the category and Claude works through them one after another without stopping.

---

## Prerequisites

All four are **hard requirements**. None of them are optional and none can be substituted with a hand-written equivalent.

- [ ] `categories/<category-slug>/FUTURE-STATE.md` exists
- [ ] `categories/<category-slug>/implementation/CLAUDE.md` exists (must be the prep-scaffolding output, not a slim hand-written mirror)
- [ ] `categories/<category-slug>/implementation/<Category>-Implementation-Plan.md` exists
- [ ] `categories/<category-slug>/implementation/phase-1/PHASE-1-SESSION-PROMPT.md` and `PHASE-1-RUNBOOK.md` exist (one pair per phase declared in PHASE-PLAN.md)

If `FUTURE-STATE.md` is missing, stop and report:

> Future state documentation is required before implementation begins. This ensures
> there is a pre-written specification to verify against.
> Run: `/topology-future-state <project-name> <category-slug>`

If `<Category>-Implementation-Plan.md` is missing OR any `phase-N/` directory is missing for a phase declared in `categories/<category-slug>/PHASE-PLAN.md`, stop and report:

> ❌ Implementation cannot start: scaffolding is incomplete for `<slug>`.
> Missing: `<list of missing files/dirs>`.
> This usually means `topology-phase-plan` Step 4 (project-prep-scaffolding) was skipped — the slim-mirror anti-pattern. Do **not** patch by hand.
> Fix: re-run `/topology-phase-plan <project-name> <slug>` and ensure its Step 4 verification passes.

This is not optional. Implementation without per-phase session prompts and runbooks removes the topology audit trail and breaks `project-next-phase` resume semantics. Implementation without a future state document removes the ability to verify correctness post-implementation.

---

{{#if MULTI_AGENT}}
## {DELEGATE_AGENT_NAME} Pair Mode (optional)

If `{DELEGATE_FLAG}` appears anywhere in `$ARGUMENTS`, enter **{DELEGATE_AGENT_NAME} Pair Mode** before executing any step below. Full rules live in `{DELEGATE_PROTOCOL_FILE}`.

Procedure:

1. Read `{DELEGATE_PROTOCOL_FILE}`.
2. Post a Handoff Plan table mapping every step (and every task within each phase) in the Instructions section below to either `Claude` or `{DELEGATE_AGENT_NAME}`, with a one-line rationale each. **Informational** — the `{DELEGATE_FLAG}` flag is already the user's ACK.
3. Proceed immediately per the Handoff Plan; record attribution in the category RUNBOOK per the protocol. If you need to deviate from the Default split in a way the user might not expect, flag it as a notice and proceed unless the user objects in the same turn.

Where {DELEGATE_AGENT_NAME} pays off most for this command: **most of it**. Once a phase plan is locked, executing well-specified tasks — bulk edits, pattern applications, template-driven code generation, test runs, lint fixes — is {DELEGATE_AGENT_NAME}'s sweet spot. Claude keeps: final verification against the FUTURE-STATE.md checklist, judgment calls when a task spec turns out to be ambiguous, commit messages, and any mid-implementation architectural decisions that weren't captured in the phase plan.

Important: {DELEGATE_AGENT_NAME} handbacks are expected here. Any task whose spec is vague should hand back immediately — do not let {DELEGATE_AGENT_NAME} improvise architectural decisions. Log every handback in the RUNBOOK.

Strip `{DELEGATE_FLAG}` from `$ARGUMENTS` before substituting into the positional args below.

---

{{/if}}
## Instructions

### Step 1: Validate Prerequisites

Check all four prerequisites above. **Do not trust filesystem state from memory or prior turns** — actually list the implementation directory and confirm:

```bash
ls -la {PROJECTS_ACTIVE_DIR}/<project-name>/categories/<category-slug>/implementation/
```

Confirm:
1. `<Category>-Implementation-Plan.md` is present (a slim `CLAUDE.md` alone is **not** a substitute).
2. One `phase-N/` directory per phase declared in `categories/<category-slug>/PHASE-PLAN.md`.
3. Each `phase-N/` contains both `PHASE-N-SESSION-PROMPT.md` and `PHASE-N-RUNBOOK.md`.

If any prerequisite is missing, stop with the appropriate message above. Do not proceed to Step 1.4 or beyond.

### Step 1.4: Drift Detection Preflight

Topology docs derive their value from being accurate at the moment implementation begins. Silently adapting a plan during implementation — even with a clean Decision Log entry — loses the audit trail that makes `topology-verify` meaningful. Before continuing, spot-check for **material drift** between this category's docs and the actual codebase.

**What to check (read-only, ~2 minutes):**

1. **New migrations** — list the project's database migrations directory against the migration numbers cited in `CURRENT-STATE.md` and `GAP-ANALYSIS.md`. If new migrations exist that touch this category's tables, that's material.
2. **New DL entries** — `git log --oneline -- {PROJECTS_ACTIVE_DIR}/<project>/DECISION-LOG.md` since `categories/<slug>/PHASE-PLAN.md` was written. New DLs that name this category's contracts or seams are material.
3. **Sibling category CURRENT-STATE changes** — for every adjacent category at a seam this category touches, check whether its `CURRENT-STATE.md` has been updated since this category's `GAP-ANALYSIS.md` was written. Canonical patterns established by siblings can invalidate this category's planned approach.
4. **File signature drift on target writer files** — read each file listed in this category's PHASE-PLAN.md "Files to modify" and confirm the function/struct/handler signatures are still what the plan assumes.

**Decision:**

- **No drift, or drift is immaterial** (e.g., new migration numbers without schema-shape implications, unrelated refactors in other files) → continue to Step 1.5. Optionally amend the plan inline via a Decision Log entry.

- **Material drift detected** (changes the schema shape, touches an already-decided invariant, or invalidates a task's approach) → **stop and re-run the upstream commands in sequence**:
  ```
  /topology-current-state <project-name> <category-slug>
  /topology-gap <project-name> <category-slug>
  /topology-phase-plan <project-name> <category-slug>
  /topology-future-state <project-name> <category-slug>
  ```
  Then re-invoke `/topology-implement`. Do **not** patch the plan inline during implementation — the cost of re-running the upstream commands is low; the cost of implementing against a stale baseline is high. Precedent: the {EXAMPLE_CATEGORY_SLUG} category in {EXAMPLE_PROJECT_SLUG} (re-run after sibling drift was detected mid-implementation).

**Emit the drift verdict** in chat before proceeding:

```
### Step 1.4 Drift Check
- Migrations since GAP-ANALYSIS: <N> new (relevant: <N>)
- DL entries since PHASE-PLAN: <N> new (relevant: <N>)
- Sibling CURRENT-STATE changes: <list, or "none">
- Target file signature drift: <list, or "none">

Verdict: NO DRIFT | IMMATERIAL DRIFT (proceeding) | MATERIAL DRIFT (halting — re-run required)
```

### Step 1.5: Worktree Isolation Check

Determine whether this category should run in an isolated git worktree.

#### When to use a worktree

A worktree is necessary when **all** of the following are true:
1. `TOPOLOGY-CLAUDE.md` has a `## Parallel Groups` section
2. This category belongs to a parallel group (listed under a group heading)
3. At least one **sibling category** in the same parallel group has an active worktree branch (`{BRANCH_PREFIX}<project-name>/<sibling-slug>` exists via `git branch --list`)

A worktree is also used when:
- The user explicitly requests it (e.g., "use a worktree")

#### When NOT to use a worktree

- The category is the **only** active category in its parallel group (no siblings have branches)
- The category is **not** in any parallel group
- The session is already inside a worktree

#### Creating the worktree

If worktree isolation is needed:

1. Check that we're not already in a worktree
2. Use the `EnterWorktree` tool with name: `{BRANCH_PREFIX}<project-name>/<category-slug>`
3. Report to the user:

```
### Worktree Isolation Active

**Branch:** {BRANCH_PREFIX}<project-name>/<category-slug>
**Reason:** Sibling categories <list> have active worktree branches in parallel group "<group-name>"

All implementation work will happen in this isolated worktree.
When complete, run `/topology-merge <project-name> <category-slug>` from the main branch to merge.
```

4. Continue to Step 2 — the rest of the command runs identically inside the worktree.

If worktree isolation is NOT needed, skip this step and continue normally.

### Step 2: Load Topology Context

Parse the arguments for the `--one-run` flag. If present, set `ONE_RUN = true`.

Read:
1. `TOPOLOGY-CLAUDE.md` — current category status
2. `VERIFICATION-TABLE.md` — current verification state for this category
3. `categories/<category-slug>/implementation/CLAUDE.md` — project conventions and phases table

Identify the current phase state:
- Which phases are Complete?
- Which phase is next (or In Progress)?
- How many phases remain?
- Are all phases Complete? (If so, go to Step 5)

### Step 2.5: Multi-role dispatch inference

**This step is mandatory before every phase, including each phase iteration under `--one-run`.** It is the load-bearing inference that routes single-role phases to `project-next-phase` and multi-role phases to `topology-dispatch`.

Read the next phase's **Role profile** from `categories/<category-slug>/PHASE-PLAN.md` (or `<Category>-Implementation-Plan.md`). The profile is declared per `topology-phase-plan` Rule 6.

**Decision tree:**

1. **Phase plan declares `single-role`:**
   - Emit: `Phase <N> inference: single-role (<role>); routing to project-next-phase via topology-implement.`
   - Continue to Step 3.

2. **Phase plan declares `multi-role`:**
   - Emit: `Phase <N> inference: multi-role (<roles>); routing to topology-dispatch.`
   - Invoke:
     ```
     /topology-dispatch <project-name> <category-slug> --phase <N>
     ```
   - `topology-dispatch` runs its own disjointness pre-check, agent spawning, and synthesis. After it completes, return to Step 4 of this command (Post-Phase Update). Do NOT also run Step 3/3b — `topology-dispatch` replaces them for multi-role phases.

3. **Phase plan does NOT declare a Role profile** (legacy plan from before Rule 6 existed):
   - Apply the path → role inference table from `topology-dispatch` Step 3 against the phase's file scope.
   - If two or more **distinct primary roles** (excluding the security reviewer, which is reviewer-only) surface with disjoint scopes: treat as `multi-role`, route per branch (2).
   - Otherwise: treat as `single-role`, route per branch (1).
   - Emit the inference verdict and the rule applied (e.g., "legacy phase plan; inferred single-role from file scope").

**Output requirement:** every phase boundary emits the inference verdict before any further work. This is observable signal that the inference happened — not an afterthought to be skipped silently.

### Step 2.7: Context loadout — implementer pre-flight (single-role only)

**This step runs only on the single-role branch of Step 2.5.** Multi-role phases route to `topology-dispatch`, which has its own briefing protocol; the loadout below is for the implementer agent that `project-next-phase` will hand the work to.

Before entering plan mode (Step 3), confirm — explicitly, by listing what was loaded — that the implementer agent has loaded the following in this order:

```
1. {PROJECTS_ACTIVE_DIR}/<project>/TOPOLOGY-CLAUDE.md
   (umbrella: which categories exist, current state, parallel groups)

2. {PROJECTS_ACTIVE_DIR}/<project>/categories/<slug>/CLAUDE.md
   (responsibility + decisions in scope + cross-category touchpoints)
   — created at topology-init Step 8.5 for projects initialized after the
     PRINCIPLES doc landed; for older projects this file may not exist —
     in that case fall back to TOPOLOGY-CLAUDE.md + the phase plan, and
     note the absence in the loadout report

3. {PROJECTS_ACTIVE_DIR}/<project>/DECISION-LOG.md
   — entries cited in this phase's "Decisions in scope" column ONLY
     (skip the rest of the register; the phase plan narrowed it)
   — if the phase plan predates Rule 7 (no Decisions column), fall back
     to the category CLAUDE.md's filtered list, or — last resort — to
     scanning the full register for matches against this phase's
     contracts and seams

4. Adjacent categories' CLAUDE.md
   — only those at seams this phase touches per the phase plan's
     "Seams Advanced" column

5. {PROJECTS_ACTIVE_DIR}/<project>/VERIFICATION-TABLE.md
   — this category's row + the seam columns this phase advances

6. {PROJECTS_ACTIVE_DIR}/<project>/categories/<slug>/implementation/
   phase-N/PHASE-N-SESSION-PROMPT.md
   {PROJECTS_ACTIVE_DIR}/<project>/categories/<slug>/implementation/
   phase-N/PHASE-N-RUNBOOK.md
```

**Output the loadout report** in chat before proceeding to Step 3. Format:

```
### Step 2.7 Context Loadout

Phase <N> of <category> — pre-flight loaded:
- [✓] TOPOLOGY-CLAUDE.md
- [✓] categories/<slug>/CLAUDE.md
- [✓] DECISION-LOG.md (filtered: DL-<N>, DL-<N>)
- [✓] adjacent categories: <slug-A>/CLAUDE.md, <slug-B>/CLAUDE.md
- [✓] VERIFICATION-TABLE.md (row: <slug>; seam cols: S<N>, S<N>)
- [✓] phase-N/PHASE-N-SESSION-PROMPT.md
- [✓] phase-N/PHASE-N-RUNBOOK.md

Loadout complete. Proceeding to plan mode.
```

If any expected artifact is missing AND the phase predates the relevant rule (e.g., legacy phase plan without Decisions column, or pre-Step-8.5 project without category CLAUDE.md), record the fallback in the loadout report:

```
- [⚠️] categories/<slug>/CLAUDE.md — file does not exist (project predates topology-init Step 8.5);
       fell back to TOPOLOGY-CLAUDE.md categories table + PHASE-PLAN.md
```

**Why this matters:** the loadout report is the observable signal that the implementer started from the right baseline. Without it, every phase risks the failure modes that `topology-PRINCIPLES.md` enumerates — context overload, scattered cross-cutting concerns, phase-context loss, decision relitigation. The report takes ~30 seconds to produce; skipping it is the failure mode it exists to prevent.

### Step 3: Enter Plan Mode

**Always enter plan mode before implementation begins.** The plan scope depends on whether `--one-run` is set:

#### Without `--one-run` (default — single phase)

Enter plan mode. The plan should cover:
1. The next phase's objective and task list
2. Key files to read/modify
3. Exit criteria for this phase
4. Topology watch list items (if applicable)
5. Expected Verification Table updates after completion

Present the plan and wait for acceptance before delegating to `project-next-phase`.

#### With `--one-run` (full category run)

Enter plan mode. The plan should cover **all remaining phases** in sequence:
1. Overview of the full category scope — how many phases remain, what the category delivers end-to-end
2. For each remaining phase (in order):
   - Phase objective and key deliverables
   - Key files to read/modify
   - Exit criteria
   - Dependencies on prior phases
3. Topology watch list items across all phases (if applicable)
4. Expected Verification Table state after all phases complete

Present the plan and wait for acceptance. Once accepted, work through all phases sequentially — delegating to `project-next-phase` for each one, running Step 4 after each, and continuing to the next phase without stopping.

### Step 3b: Delegate to project-next-phase

Run:
```
/project-next-phase {PROJECTS_ACTIVE_DIR}/<project-name>/categories/<category-slug>/implementation/
```

`project-next-phase` handles:
- Validating prior phase completion
- Fixing stale file references in session prompts
- Presenting the next phase plan for acceptance
- Updating the implementation CLAUDE.md phases table

Allow `project-next-phase` to run fully. Do not interrupt its flow.

### Step 4: Post-Phase Update

After `project-next-phase` completes a phase, update the Verification Table to reflect implementation progress:

- If a phase is now **In Progress**: mark affected cells as `⏳` in `VERIFICATION-TABLE.md`
- If a phase is now **Complete**: check the phase's exit criteria against what was delivered. If topology exit criteria were met, update affected cells to `⏳ (impl complete, verify pending)` — not `✓`. Cells only go to `✓` after `topology-verify` runs.

Update `TOPOLOGY-CLAUDE.md` categories table:

```
| N | <Category Name> | `categories/<slug>/` | Phase <N> Complete — <M> remaining |
```

### Step 4b: Record App Documentation Impact

After each completed phase, assess whether any user-facing changes were made. If the phase added, changed, or removed any features, concepts, data flows, integrations, permissions, or limits visible to end users, record the impact in `categories/<category-slug>/APP-DOC-IMPACT.md`.

**Create the file** if it doesn't exist. **Append** if it does. Use this format:

```markdown
# App Documentation Impact — <category-title>

<!-- Accumulated during implementation. Consumed by topology-promote. -->

## <app-name>

### FEATURES
- <one-line description of feature added/changed/removed>

### CONCEPTS
- <new-term>: <plain-language definition>

### DATA-PATTERNS
- <one-line description of new or changed data flow>

### INTEGRATIONS
- <new or changed external system connection>

### PERMISSIONS
- <new or changed access pattern>

### LIMITS
- <new or changed constraint>

### CHANGELOG
- <user-facing release note entry>
```

**Rules:**
- Only include sections that apply — skip empty sections
- Write in **user-facing language** (no API schema, transport-protocol, message-bus, or other internal architecture references)
- Each entry should be one line — the detail goes in the actual app doc during promote
- If a phase has no user-facing impact (pure refactoring, internal wiring), note: `_No user-facing changes in this phase._`
- The `CHANGELOG` entry is the most important — draft it while context is fresh

#### `--one-run` continuation

If `ONE_RUN = true` and there are remaining phases after this one, loop back to Step 3b for the next phase. Continue until all phases are complete, then proceed to Step 5.

### Step 5: All Phases Complete — Transition to Verify

If all implementation phases are complete:

Report:
```
## topology-implement: All phases complete

**Category:** <title>
**Phases completed:** <N>

All implementation phases for <category> are complete.

### Do NOT mark as verified yet
Implementation complete ≠ verified. topology-verify must run to:
- Check every Future State assertion against the actual codebase
- Verify all seam contracts are honored
- Update the Verification Table with confirmed results

### Next Step
Run: /topology-verify <project-name> <category-slug>
```

Do not mark anything as `✓` in the Verification Table. The `⏳` state stays until `topology-verify` runs.

### Worktree Next Steps

If implementation ran inside a worktree (Step 1.5 created one):

Report:
```
### Worktree Implementation Complete

All phases for <category> are complete inside worktree branch `{BRANCH_PREFIX}<project-name>/<category-slug>`.

**Next steps (in order):**
1. Exit this worktree: The worktree branch will be kept with all commits
2. From the main branch, run: `/topology-merge <project-name> <category-slug>`
3. After merge, run: `/topology-verify <project-name> <category-slug>`
```

Do NOT exit the worktree automatically — let the user or the calling agent decide when to exit.

---

## Important Notes

- **Always enter plan mode first** — this command must enter plan mode before any implementation begins. Without `--one-run`, the plan covers the next phase. With `--one-run`, the plan covers all remaining phases. The user must accept the plan before work starts.
- **`--one-run` means uninterrupted sequential execution** — once the plan is accepted, Claude works through every remaining phase without pausing between them. Each phase still goes through `project-next-phase` and gets its own post-phase update (Step 4), but there is no stop-and-ask between phases.
- **topology-implement does not write code** — it orchestrates `project-next-phase` and maintains topology tracking state. All implementation happens inside the phase sessions.
- **Future state document is a hard gate** — do not implement workarounds if `FUTURE-STATE.md` is missing. The document's pre-implementation date is part of its value.
- **Implementation complete ≠ verified** — this distinction is critical. The Verification Table must never show `✓` for cells that have only been implemented but not verified by `topology-verify`.
- **Seam exit criteria in session prompts** — `topology-phase-plan` added topology-aware exit criteria to each session prompt. Encourage the implementing agent to check these explicitly at phase completion and record results in the runbook.
- **Parallel multi-language delegation is governed by Step 2.5 + `/topology-dispatch`.** When a phase plan declares `multi-role` (per `topology-phase-plan` Rule 6) or the legacy-fallback inference identifies disjoint multi-role file scopes, Step 2.5 routes the phase to `/topology-dispatch` rather than `project-next-phase`. Do NOT inline-spawn parallel agents from this command's main flow — that bypasses dispatch's disjointness pre-check, BRIEF/WORKSPACE/STATUS protocol, and durable workspace artifacts. Early multi-role work predated the `/topology-dispatch` ceremony and spawned agents inline — new multi-role work goes through dispatch, not inline.
- **Live patch → durable code discipline** — when diagnosing a runtime gap, a temporary live patch (curl `PUT` to a live service, manual `UPDATE` to a config row, etc.) is often the fastest path to "this is the shape that works." **The live patch is fragile** — the next sync / redeploy / config push will wipe it. Before declaring the finding verified, land the fix in the code-side path that produces the patch durably, in the same commit as the evidence. Example: a provider config map first verified via a direct `PUT` against a live external service, then committed durable via the code path that emits that config — so the next config Save reproduces the patch deterministically instead of wiping it and regressing routing. Rule: **no "evidence captured via live patch" without a same-commit code fix that reproduces the patch deterministically from repo state**.

$ARGUMENTS
