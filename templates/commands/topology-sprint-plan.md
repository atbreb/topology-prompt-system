# topology-sprint-plan

Write a sprint plan before executing a sprint. Ceremony: makes the sprint's categories, execution mode, integration strategy, and expected HITL gates explicit in a reviewable document. Output is consumed by `topology-sprint` and `topology-autopilot`.

> **See `{COMMANDS_DIR}/topology-PRINCIPLES.md`** for the doctrine and schemas. This command is mostly ceremony — it does **not** orchestrate. The substantive Workflow-era addition is the **structured scope block** (Step 7): the plan emits its scope as a machine-readable JSON object so `/topology-sprint` can feed it straight into its pipeline `args` (`categories: [{slug, branch}]`) without re-parsing prose. Branch names per category are pre-computed here so the sprint workflow's worktree-isolation has them ready. A Workflow fan-out is optional and usually unnecessary for planning — see Step 6.

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
- `--autonomy <strict|normal>` — default `strict`. `strict` returns every proposed DECISION-LOG entry as HITL. `normal` auto-adds DL entries with agent rationale, user reviews later. Contract and seam amendments ALWAYS return HITL regardless.
- `--parallel` — intent to use worktree parallelization (requires TOPOLOGY-CLAUDE marks the group parallel-safe)
- `--cross-project` — if sprint blocks, pivot to another project's ready work
- `--from-autopilot <id>` — called from an autopilot run; inherits autopilot's broader context

One of `--group` or `--categories` is required.

This command does **not** execute a sprint and crosses no E2E/promote boundary, so there is no mid-run HITL to surface. If you do use the optional Step-6 fan-out, invoking this skill is itself the Workflow opt-in (per the Workflow tool's rule: "the user invoked a skill or slash command whose instructions tell you to call Workflow").

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

### Step 4: Generate sprint ID and pre-compute branches

Sprint ID: `sprint-<YYYYMMDD-HHMM>-<project>-<group-or-categories>`

{{! example }}
Example: `sprint-<YYYYMMDD-HHMM>-{EXAMPLE_PROJECT_SLUG}-group1`

For each target category, pre-compute the branch name the sprint workflow's worktree-isolation will use — off fresh `origin/main`, per the Git & PR coordination rules:

```
{BRANCH_PREFIX}<project-name>/<category-slug>
```

These branch names become the `branch` field of each entry in the structured scope block (Step 7) and are consumed verbatim by `/topology-sprint`'s `categories: [{slug, branch}]` args — the workflow does not recompute them. (Branches are not created here; this command only plans. The sprint workflow creates the worktree off fresh `origin/main` at Build time.)

### Step 5: Infer integration strategy

For `topology-integrate` firing, choose based on category count and group boundaries:

- **Single category** → no integration checkpoint needed (the category's own verify is sufficient)
- **Multiple categories in one group** → integration fires after all categories in the group verify
- **Multiple groups (autopilot-only)** → integration fires after each group, plus a final cross-group integration
- **Cross-project (autopilot-only)** → integration fires per project's group completion, plus final cross-project integration at end of autopilot

### Step 6: Enumerate expected HITL gates

Walk each target category and predict HITL gates likely to fire based on:

- **Proposed DECISION-LOG entries** — strict mode returns every one as HITL. Scan the category's participation in contracts + seams; any ambiguity in the discovery doc's open questions list → likely DL proposal. Enumerate.
- **Contract / seam amendments** — always returns HITL. If the category's current-state is likely to reveal a need to amend a contract or seam (e.g., discovery flagged it as impl-time verification), mark this.
- **External dependencies** — if the category depends on an external service (e.g., a managed gateway, a cloud provider, the database) and its health is unknown, mark.
- **Implementation failures** — topology-implement has a 2-retry budget (narrow fix → broad investigation → STOP) before returning `implementation-retry-exhausted`; mark if the category has historically been hard to implement (check git log for reverts in its file scope).

Map each predicted gate to the `HITL.reason` enum from topology-PRINCIPLES so the scope block stays machine-consumable: `dl-entry-proposed-strict-mode`, `contract-amendment-proposed`, `seam-amendment-proposed`, `external-dep-unreachable`, `implementation-retry-exhausted`, `security-sensitive-change`, `verification-architectural-failure`, `material-drift`, etc.

**Optional fan-out (light — usually skip):** if there are many target categories and gate enumeration is non-trivial, you MAY fan out one short-lived analysis agent per category to predict that category's gates in parallel, then merge. This is the *only* place a Workflow adds value in this command, and it is purely a speed convenience over a single-author scan — there is no pipeline, no worktree, no orchestration obligation here. The primary Workflow-era change in this command is the **structured scope block (Step 7)**, not orchestration. Default to writing the plan single-author.

### Step 7: Write the sprint plan

Create `{PROJECTS_ACTIVE_DIR}/<project-name>/sprints/<sprint-id>/SPRINT-PLAN.md`:

````markdown
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

## Structured scope (consumed by /topology-sprint)

> `/topology-sprint` reads this block directly into its pipeline `args` (Step 1 loads the plan; Step 3 passes `categories` into the workflow). The `slug` + `branch` of each entry map one-to-one onto the workflow's `categories: [{slug, branch}]` argument — no prose re-parsing. The `predictedHitlGates` feed the main loop's HITL triage so it knows what to expect.

```json
{
  "sprintId": "<sprint-id>",
  "project": "<project-name>",
  "executionMode": "serial | parallel",
  "autonomy": "strict | normal",
  "crossProject": false,
  "categories": [
    {
      "slug": "<category-slug>",
      "branch": "{BRANCH_PREFIX}<project-name>/<category-slug>",
      "contracts": ["C<N>", "C<N>"],
      "seams": ["S<N> (producer)", "S<N> (consumer)"],
      "parallelGroup": "<N>",
      "estPhases": "<N>",
      "openQuestions": ["<from discovery doc>"],
      "externalDeps": ["<dependency>"]
    }
  ],
  "predictedHitlGates": [
    { "category": "<slug>", "reason": "dl-entry-proposed-strict-mode", "detail": "<proposal title — rationale>" }
  ],
  "integrationCheckpoints": "<count>"
}
```

## Target category detail

### <category-1-slug>

**Branch (off fresh origin/main):** `{BRANCH_PREFIX}<project-name>/<category-1-slug>`
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

### Predicted DECISION-LOG proposals (strict mode → all return needs-hitl)

- [category.slug] <proposal title> — [rationale] — reason: `dl-entry-proposed-strict-mode`
- ...

If `normal` mode: each proposal auto-adds with agent rationale; human reviews later in batch.

### Predicted contract / seam amendments (ALWAYS return needs-hitl)

- [category.slug] <contract or seam ref> — [trigger that would force amendment] — reason: `contract-amendment-proposed` | `seam-amendment-proposed`
- ...

### External-dependency risks

- [category.slug] <dependency> — [what breaks if unavailable] — reason: `external-dep-unreachable`
- ...

### Implementation-failure risks

- [category.slug] <file area> — [why this might retry and escalate] — reason: `implementation-retry-exhausted`
- ...

## Success criteria

- Every target category has CURRENT-STATE, GAP, PHASE-PLAN, FUTURE-STATE, VERIFICATION-REPORT docs
- VERIFICATION-TABLE shows Verified ✓ for every target category
- Integration checkpoint(s) pass or document partial-completeness explicitly
- Zero open HITL gates at sprint end
- Git working tree clean; all commits pushed (if `PUSH_POLICY: per-category`)

## Resumption notes

If this sprint pauses for HITL:
- The sprint workflow returns the gate as a `needs-hitl` `CATEGORY_RESULT` (data, not a mid-run prompt); the main loop writes the checkpoint to `<sprint-dir>/CHECKPOINT.md` including the workflow `runId`
- Recorded state includes: current category, last green commit SHA, pending decisions, and the `runId` for machine-resume
- Resume with `/topology-sprint <project-name> --resume <runId>` once HITL decisions are resolved via `/topology-decide` — cached stages return instantly, only the unblocked category re-runs

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
````

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

- **This command does NOT execute the sprint.** It produces a reviewable plan + a structured scope block. Use `/topology-sprint` to execute.
- **The structured scope block is the load-bearing Workflow-era addition.** Its `categories: [{slug, branch}]` shape is exactly what `/topology-sprint` passes into its pipeline `args` — keep it in sync with the prose `Target category detail` section; if they disagree, the structured block wins (the workflow reads it, not the prose).
- **Branches are pre-computed, not created.** `{BRANCH_PREFIX}<project>/<category>` off fresh `origin/main` is written into the plan so worktree-isolation has it ready; the sprint workflow creates the worktree at Build time.
- **Plans are sticky.** Once written, a plan is not overwritten by a subsequent plan-run with the same sprint ID. To regenerate, delete the sprint directory first, or use a new sprint ID (different timestamp).
- **Auto-called by autopilot.** When `/topology-autopilot` runs, it auto-invokes this command per group; you don't need to run it manually unless planning a specific sprint.
- **Ceremony, not ritual.** The plan is meant to be read and redirected before execution. If the predictions feel off, edit them before invoking `/topology-sprint`. The optional Step-6 fan-out is a speed convenience only — do not turn a planning doc into an orchestration run.

---

## Placeholders in This File

| Placeholder | Replace With |
|-------------|-------------|
| `<project-name>` | Project slug, e.g., `{EXAMPLE_PROJECT_SLUG}` |
| `<category-slug>` | A category slug under `categories/`, e.g., `{EXAMPLE_CATEGORY_SLUG}` |
| `<sprint-id>` | Generated: `sprint-<YYYYMMDD-HHMM>-<project>-<scope>` |
| `<sprint-dir>` | `{PROJECTS_ACTIVE_DIR}/<project-name>/sprints/<sprint-id>/` |
| `<runId>` | The `runId` returned by the `/topology-sprint` workflow (for resume) |

$ARGUMENTS
