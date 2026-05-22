# topology-sprint-plan

Write a sprint plan before executing a sprint. Ceremony: makes the sprint's categories, execution mode, integration strategy, and expected HITL gates explicit in a reviewable document. Output is consumed by `topology-sprint` and `topology-autopilot`.

## Usage

```
/topology-sprint-plan <project-name> --group <N>
/topology-sprint-plan <project-name> --categories <comma-separated-slugs>
/topology-sprint-plan <project-name> --group <N> --autonomy <strict|normal>
/topology-sprint-plan <project-name> --group <N> --parallel
/topology-sprint-plan <project-name> --group <N> --cross-project
/topology-sprint-plan <project-name> --from-autopilot <autopilot-id>
```

### Arguments

- `<project-name>` — slug of the project under `{PROJECTS_ACTIVE_DIR}/`
- `--group <N>` — target a specific Parallel Group from TOPOLOGY-CLAUDE
- `--categories <slugs>` — override group-based selection with explicit category list
- `--autonomy <strict|normal>` — default `strict`. `strict` pauses on every proposed DECISION-LOG entry. `normal` auto-adds DL entries with agent rationale, user reviews later. Contract and seam amendments ALWAYS pause regardless.
- `--parallel` — intent to use worktree parallelization (requires TOPOLOGY-CLAUDE marks the group parallel-safe)
- `--cross-project` — if sprint blocks, pivot to another project's ready work
- `--from-autopilot <id>` — called from an autopilot run; inherits autopilot's broader context

One of `--group` or `--categories` is required.

---

{{#if MULTI_AGENT}}
## {DELEGATE_AGENT_NAME} Pair Mode (optional)

If `{DELEGATE_FLAG}` appears anywhere in `$ARGUMENTS`, enter **{DELEGATE_AGENT_NAME} Pair Mode** before executing any step below. Full rules live in `{DELEGATE_PROTOCOL_FILE}`.

Procedure:

1. Read `{DELEGATE_PROTOCOL_FILE}`.
2. Post a Handoff Plan table mapping every step in the Instructions section below to either `Claude` or `{DELEGATE_AGENT_NAME}`, with a one-line rationale each. **Informational** — the `{DELEGATE_FLAG}` flag is already the user's ACK.
3. Proceed immediately per the Handoff Plan; record attribution in the sprint directory's RUNBOOK-DELEGATE.md per the protocol. If you need to deviate from the Default split in a way the user might not expect, flag it as a notice and proceed unless the user objects in the same turn.

Where {DELEGATE_AGENT_NAME} pays off most for this command: **Step 1 (source document reading — TOPOLOGY-CLAUDE, CONTRACT-SHEET, etc. are large text bodies {DELEGATE_AGENT_NAME} can digest and summarize)** and **Step 6 (HITL gate enumeration — mechanical scan of discovery docs' open questions lists)**. Plan synthesis (Step 7) stays on Claude — prose + judgment.

This command is relatively light — the real {DELEGATE_AGENT_NAME} payoff arrives inside the underlying `topology-*` commands that `topology-sprint` invokes. If you ran this command with `{DELEGATE_FLAG}`, consider also passing `{DELEGATE_FLAG}` to the subsequent `topology-sprint` invocation so delegation propagation continues.

Strip `{DELEGATE_FLAG}` from `$ARGUMENTS` before substituting into the positional args below.

---

{{/if}}
## Instructions

### Step 1: Load project state

Read in order:
1. `{PROJECTS_ACTIVE_DIR}/<project-name>/TOPOLOGY-CLAUDE.md` — find Parallel Groups section
2. `{PROJECTS_ACTIVE_DIR}/<project-name>/CONTRACT-SHEET.md` — identify which contracts the target categories govern
3. `{PROJECTS_ACTIVE_DIR}/<project-name>/SYSTEM-TOPOLOGY.md` — identify seams the target categories participate in
4. `{PROJECTS_ACTIVE_DIR}/<project-name>/DECISION-LOG.md` — note existing decisions to avoid re-proposing
5. `{PROJECTS_ACTIVE_DIR}/<project-name>/VERIFICATION-TABLE.md` — current cell state

If the project has Reference Documents (shapes companions, playbooks, archived parent projects cited in TOPOLOGY-CLAUDE), read those too.

### Step 2: Resolve target categories

- If `--group <N>` provided: read TOPOLOGY-CLAUDE's "Parallel Groups" section; extract category list from Group N
- If `--categories <slugs>` provided: use as-is; validate each slug has a directory in `categories/`
- If `--parallel` requested: verify the resolved list matches a parallel-safe group per TOPOLOGY-CLAUDE's "Isolation required: Yes" line. If not, error: ask user to confirm serial execution instead.

### Step 3: Check prerequisites

- Git working tree is clean (no uncommitted changes)
- Every prerequisite category for the target list shows Verified ✓ in VERIFICATION-TABLE (e.g., if target is Group 2, Group 1 must all be verified)
- No active paused sprint exists for this project (run `/topology-resume` first if one does)
- External dependencies declared in TOPOLOGY-CLAUDE (e.g., a prerequisite project must be complete before a dependent project's Group 2) are satisfied, OR `--cross-project` is enabled to allow pivots

If any prereq fails, do NOT write the plan — report the failure and exit.

### Step 4: Generate sprint ID

`sprint-<YYYYMMDD-HHMM>-<project>-<group-or-categories>`

Example: `sprint-<YYYYMMDD-HHMM>-{EXAMPLE_PROJECT_SLUG}-group1`

### Step 5: Infer integration strategy

For `topology-integrate` firing, choose based on category count and group boundaries:

- **Single category** → no integration checkpoint needed (the category's own verify is sufficient)
- **Multiple categories in one group** → integration fires after all categories in the group verify
- **Multiple groups (autopilot-only)** → integration fires after each group, plus a final cross-group integration
- **Cross-project (autopilot-only)** → integration fires per project's group completion, plus final cross-project integration at end of autopilot

### Step 6: Enumerate expected HITL gates

Walk each target category and predict HITL gates likely to fire based on:

- **Proposed DECISION-LOG entries** — strict mode pauses on every one. Scan the category's participation in contracts + seams; any ambiguity in the discovery doc's open questions list → likely DL proposal. Enumerate.
- **Contract amendments** — always pauses. If the category's current-state is likely to reveal a need to amend a contract (e.g., discovery flagged it as impl-time verification), mark this.
- **External dependencies** — if the category depends on an external service (e.g., a managed gateway, a cloud provider, the database) and its health is unknown, mark.
- **Implementation failures** — topology-implement has a 2-retry budget before HITL; mark if the category has historically been hard to implement (check git log for reverts in its file scope).

### Step 7: Write the sprint plan

Create `{PROJECTS_ACTIVE_DIR}/<project-name>/sprints/<sprint-id>/SPRINT-PLAN.md`:

```markdown
# Sprint Plan

**Sprint ID:** <sprint-id>
**Project:** <project-name>
**Created:** <ISO datetime>
**Author:** topology-sprint-plan
**Status:** Planned (not yet executed)

## Scope

**Target categories:** <list>
**Execution mode:** serial | parallel
**Autonomy level:** strict | normal
**Cross-project pivots:** enabled | disabled

## Target category detail

### <category-1-slug>

**Contracts governed:** C<N>, C<N>, ...
**Seams participated in:** S<N> (producer), S<N> (consumer), ...
**Parallel Group:** <N>
**Estimated phase count (from discovery):** <N>
**Known open questions:** <list from discovery doc>
**External dependencies:** <list or "none">

[repeat for each category]

## Integration strategy

**Integration checkpoints during this sprint:** <count>
**Trigger conditions:**
- After all target categories in Group <N> reach Verified ✓
- [additional triggers if autopilot-chained]

**Integration scope:**
- Seams exercised during this sprint: <list>
- Cross-seam consistency checks: <list>
- Partial-integration acceptance: <criteria for accepting "partial — consumer-side pending" status>

## Expected HITL gates

### Predicted DECISION-LOG proposals (strict mode → all pause)

- [category.slug] <proposal title> — [rationale]
- ...

If `normal` mode: each proposal auto-adds with agent rationale; human reviews later in batch.

### Predicted contract / seam amendments (ALWAYS pause)

- [category.slug] <contract or seam ref> — [trigger that would force amendment]
- ...

### External-dependency risks

- [category.slug] <dependency> — [what breaks if unavailable]
- ...

### Implementation-failure risks

- [category.slug] <file area> — [why this might retry and escalate]
- ...

## Success criteria

- Every target category has CURRENT-STATE, GAP, PHASE-PLAN, FUTURE-STATE, VERIFICATION-REPORT docs
- VERIFICATION-TABLE shows Verified ✓ for every target category
- Integration checkpoint(s) pass or document partial-completeness explicitly
- Zero open HITL gates at sprint end
- Git working tree clean; all commits pushed (if `PUSH_POLICY: per-category`)

## Resumption notes

If this sprint pauses for HITL:
- Checkpoint is written to `<sprint-dir>/CHECKPOINT.md`
- Recorded state includes: current phase, current category, last green commit SHA, pending decisions
- Resume with `/topology-resume <project-name>` once HITL decisions are resolved via `/topology-decide`

## Cross-project context

[Only present if --cross-project enabled or called from autopilot]

**Other active projects:** <list>
**Pivot criteria:** when this sprint is blocked by any of [external dep, HITL decision, verification failure], pivot to another project's ready work if any exists
**Pivot-back criteria:** return to this sprint once blocker is resolved

## Approval

This plan is a proposal. The sprint does not execute automatically.
To run: `/topology-sprint <project-name> --plan <sprint-id>`

If any section of this plan needs revision, edit this document and
re-run `/topology-sprint-plan` to regenerate.
```

### Step 8: Report

```
## topology-sprint-plan Complete

**Sprint ID:** <sprint-id>
**Plan:** `<sprint-dir>/SPRINT-PLAN.md`

### Summary
- Target categories: <count>
- Execution mode: <serial|parallel>
- Autonomy: <strict|normal>
- Predicted HITL gates: <count>
- Integration checkpoints: <count>

### Recommended next command
  /topology-sprint <project-name> --plan <sprint-id>

Or if you want to edit the plan first, open:
  <sprint-dir>/SPRINT-PLAN.md
```

---

## Important Notes

- **This command does NOT execute the sprint.** It produces a reviewable plan. Use `/topology-sprint` to execute.
- **Plans are sticky.** Once written, a plan is not overwritten by a subsequent plan-run with the same sprint ID. To regenerate, delete the sprint directory first, or use a new sprint ID (different timestamp).
- **Auto-called by autopilot.** When `/topology-autopilot` runs, it auto-invokes this command per group; you don't need to run it manually unless planning a specific sprint.
- **Ceremony, not ritual.** The plan is meant to be read and redirected before execution. If the predictions feel off, edit them before invoking `topology-sprint`.

---

## Placeholders in This File

| Placeholder | Replace With |
|-------------|-------------|
| `<project-name>` | Project slug, e.g., `{EXAMPLE_PROJECT_SLUG}` |
| `<sprint-id>` | Generated: `sprint-<YYYYMMDD-HHMM>-<project>-<scope>` |
| `<sprint-dir>` | `{PROJECTS_ACTIVE_DIR}/<project-name>/sprints/<sprint-id>/` |
