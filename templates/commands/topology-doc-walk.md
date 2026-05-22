# topology-doc-walk

Run the four-step planning walk (`topology-current-state` → `topology-gap` → `topology-phase-plan` → `topology-future-state`) for one category or for every category in a parallel group. Honors the methodology rule that all categories in a group complete `topology-current-state` before any of them run `topology-gap` — boundary gaps require both sides to be visible.

This is the planning-phase analog to `topology-sprint`. After this command completes for a group, every category in the group is in state **"Future State Documented — ready for /topology-implement."**

## Usage

```
/topology-doc-walk <project-name> <category-slug>
/topology-doc-walk <project-name> --group <N>
/topology-doc-walk <project-name> --categories <slug1,slug2,slug3>
/topology-doc-walk <project-name> --all
```

### Arguments

- `<project-name>` — project directory name under `{PROJECTS_ACTIVE_DIR}/`
- `<category-slug>` — single category to walk (positional, no flag needed)
- `--group <N>` — walk every category in parallel Group N as defined in `TOPOLOGY-CLAUDE.md` "Parallel Groups" section
- `--categories <slugs>` — comma-separated list of category slugs (overrides `--group`)
- `--all` — walk every category in the project that is not already at "Future State Documented" status
- `--force-redo` — re-run a step even if its output document already exists. Without this flag, the walk is status-aware and skips completed steps.
{{#if MULTI_AGENT}}
- `{DELEGATE_FLAG}` — propagate {DELEGATE_AGENT_NAME} Pair Mode to every underlying topology-* command in the walk
{{/if}}

Exactly one of `<category-slug>` (positional), `--group <N>`, `--categories <list>`, or `--all` must be provided.

---

{{#if MULTI_AGENT}}
## {DELEGATE_AGENT_NAME} Pair Mode (optional)

If `{DELEGATE_FLAG}` appears anywhere in `$ARGUMENTS`, enter **{DELEGATE_AGENT_NAME} Pair Mode** before executing any step below. Full rules live in `{DELEGATE_PROTOCOL_FILE}`.

**Key behavior for doc-walks:** `topology-doc-walk` is an orchestrator. When `{DELEGATE_FLAG}` is set, the flag cascades down through every underlying topology-* invocation (`topology-current-state {DELEGATE_FLAG}`, `topology-gap {DELEGATE_FLAG}`, etc.). The `{DELEGATE_FLAG}` flag on the doc-walk command is itself the pre-approval for the entire walk — no per-sub-command ACK wait.

Procedure:

1. Read `{DELEGATE_PROTOCOL_FILE}`.
2. Post a **Walk-Level Handoff Plan** table that lists each underlying command in the walk's execution schedule and the expected {DELEGATE_AGENT_NAME} split at the per-command level. **Informational** — the `{DELEGATE_FLAG}` flag is already the user's ACK.
3. Proceed immediately per the plan. Each sub-command runs with its own {DELEGATE_AGENT_NAME} section's split (no sub-ACK needed).
4. Record overall attribution in the project's `walks/<walk-id>/RUNBOOK-DELEGATE.md` summarizing {DELEGATE_AGENT_NAME} usage across all four steps × all categories.

**Where {DELEGATE_AGENT_NAME} pays off in this walk** (informational, drawn from the underlying commands' delegation sections):
- **`topology-current-state` Step 2 (source-file enumeration) + Steps 4-5 (grep sweeps)** — high payoff
- **`topology-gap`** — narrow cross-reference lookups; synthesis stays on the orchestrator
- **`topology-phase-plan` Step 2 (files-touched-per-phase enumeration)** — mechanical, delegation-friendly
- **`topology-future-state`** — minimal payoff; almost entirely judgment

Strip `{DELEGATE_FLAG}` from `$ARGUMENTS` before substituting into the positional args below (then re-add it when invoking sub-commands).

---
{{/if}}

## Prerequisites

- [ ] `{PROJECTS_ACTIVE_DIR}/<project-name>/TOPOLOGY-CLAUDE.md` exists
- [ ] `{PROJECTS_ACTIVE_DIR}/<project-name>/CONTRACT-SHEET.md` exists
- [ ] `{PROJECTS_ACTIVE_DIR}/<project-name>/SYSTEM-TOPOLOGY.md` exists
- [ ] All target categories appear in `TOPOLOGY-CLAUDE.md` "Categories" table

If any are missing, stop and report:
> Run `/topology-init <project-name>` first (or correct the category list).

If `--group <N>` is provided, the project's `TOPOLOGY-CLAUDE.md` MUST have a "Parallel Groups" section with a Group N. If absent, stop and report which groups are defined.

---

## Instructions

### Step 1: Resolve the category list

Build the ordered list of categories this walk targets:

- **Single category mode** (positional `<category-slug>`): list = `[<category-slug>]`
- **`--group <N>`:** read the "Parallel Groups" section in `TOPOLOGY-CLAUDE.md`. Extract every category in Group N. Preserve the order they appear in.
- **`--categories <slugs>`:** parse the comma-separated list. Validate each slug exists in `TOPOLOGY-CLAUDE.md` Categories table.
- **`--all`:** read the Categories table in `TOPOLOGY-CLAUDE.md`. Include every category whose current Status is NOT one of: `Future State Documented`, `Phase 1 Implementation Complete`, or any later status.

For each category in the list, classify its current walk state by checking which output documents exist:

| Document Exists | Walk State |
|-----------------|-----------|
| (none) | `not-walked` |
| `categories/<slug>/CURRENT-STATE.md` | `current-state-done` |
| `categories/<slug>/GAP-ANALYSIS.md` | `gap-done` |
| `categories/<slug>/implementation/<Cat>-Implementation-Plan.md` | `phase-plan-done` |
| `categories/<slug>/FUTURE-STATE.md` | `future-state-done` |

Without `--force-redo`, the walk skips steps whose outputs already exist. With `--force-redo`, every step re-runs even if outputs exist (the underlying commands handle overwrite).

### Step 2: Print the walk plan

Print a status-aware execution plan to the user, like:

```
## Walk Plan

**Project:** <project-name>
**Mode:** <single | group N | categories | all>
**Categories:** <N>

| Category | Status | Steps to Run |
|----------|--------|--------------|
| <slug-1> | not-walked | current-state, gap, phase-plan, future-state |
| <slug-2> | gap-done   | phase-plan, future-state |
| <slug-3> | future-state-done | (skip — use --force-redo to re-run) |

**Methodology rule honored:** topology-current-state runs for ALL categories before
topology-gap runs for ANY of them. Boundary gaps require both sides to be visible.

**Estimated time:** ~<N> minutes (≈10-15 min/category, less for partial walks)

Proceeding...
```

Do not pause for confirmation — the user explicitly invoked the walk. The plan is informational.

### Step 3: Execute Step 1 of every category — topology-current-state

For each category in the list whose status is `not-walked`:

1. Invoke `/topology-current-state <project-name> <category-slug>`.
2. Capture the completion report.
3. Note any "Requires Manual Review" items for the consolidated report.

Continue past errors only if the user explicitly invoked `--continue-on-error` (not implemented in v1; halt on error). On error: stop the walk, report which category failed and the error, leave prior categories' outputs in place.

After all categories complete this step, print a single-line status:
> Step 1/4 (current-state) complete for <N>/<N> categories.

### Step 4: Execute Step 2 of every category — topology-gap

For each category in the list whose status is `current-state-done` (or that just transitioned from `not-walked` in Step 3):

1. Invoke `/topology-gap <project-name> <category-slug>`.
2. Capture the completion report.
3. Aggregate "Decisions Required Before topology-phase-plan" entries — these become flagged DL items in the final report.
4. Aggregate "Critical gaps" and "Unblocking Priority" — these inform the cross-category dependency view.

After all categories complete this step, print:
> Step 2/4 (gap) complete for <N>/<N> categories.
> Decisions surfaced: <N> (will be reported at end; do not pause).

**Methodology note:** This step now sees boundary gaps from BOTH sides for every category in the batch (per Stage 2 best practice). One-sided gaps that existed when individual categories were walked separately are now resolvable.

### Step 5: Execute Step 3 of every category — topology-phase-plan

For each category in the list whose status is `gap-done` (or that just transitioned in Step 4):

1. Invoke `/topology-phase-plan <project-name> <category-slug>`.
   - `topology-phase-plan` Step 4 invokes `/project-prep-scaffolding` internally to scaffold per-phase directories with session prompts and runbooks. The walk does not invoke prep-scaffolding directly.
2. Capture the completion report.
3. **Verify scaffolding outputs on disk before declaring this category's phase-plan step complete.** Do not trust the agent's completion report — list the implementation directory and confirm the artifacts exist:

   ```bash
   ls -la {PROJECTS_ACTIVE_DIR}/<project-name>/categories/<category-slug>/implementation/
   ```

   Required artifacts per category:

   - [ ] `<Category>-Implementation-Plan.md`
   - [ ] `phase-1/PHASE-1-SESSION-PROMPT.md`
   - [ ] `phase-1/PHASE-1-RUNBOOK.md`
   - [ ] `phase-N/PHASE-N-SESSION-PROMPT.md` and `PHASE-N-RUNBOOK.md` for every additional phase

   If any artifact is missing — including the case where only a slim `implementation/CLAUDE.md` mirror was written — **halt the entire walk**. Do not proceed to Step 6 (future-state) for any category. Do not silently accept the slim-mirror anti-pattern. Report:

   > ❌ Walk HALTED at Step 5 for `<slug>`: phase-plan completed without scaffolding (`<missing files>`). The slim-mirror substitute is a known anti-pattern. Fix: re-invoke `/topology-phase-plan <project-name> <slug>` and ensure its Step 4 verification passes before resuming the walk with `/topology-doc-walk <project-name> ...`.

4. Aggregate phase counts and total estimated effort across the batch (only after every category's verification passes).

After all categories complete this step **and pass on-disk verification**, print:
> Step 3/4 (phase-plan) complete for <N>/<N> categories.
> Total phases scaffolded: <N>.
> Scaffolding outputs verified on disk: ✓

### Step 6: Execute Step 4 of every category — topology-future-state

For each category in the list whose status is `phase-plan-done` (or that just transitioned in Step 5):

1. Invoke `/topology-future-state <project-name> <category-slug>`.
2. Capture the completion report.
3. Aggregate verification checklist sizes for the cross-category view.

After all categories complete this step, print:
> Step 4/4 (future-state) complete for <N>/<N> categories.

### Step 7: Update TOPOLOGY-CLAUDE.md statuses

For each category whose walk completed in this run, update the Categories table row in `TOPOLOGY-CLAUDE.md` to:

```
| N | <Category Name> | `categories/<slug>/` | Future State Documented — ready for /topology-implement |
```

If the category was already past this status before the walk (e.g., implementation in progress), do not regress its status.

### Step 8: Emit consolidated walk report

Print the single completion report:

```markdown
## topology-doc-walk Complete

**Project:** <project-name>
**Mode:** <single | --group N | --categories | --all>
**Categories walked:** <N>
**Categories skipped (already past target state):** <N>

### Per-Category Walk Result

| Category | Internal Gaps | Phases | Verification Checks | Open Decisions |
|----------|---------------|--------|---------------------|----------------|
| <slug-1> | <N gaps> (Cx Hy Mz) | <N> phases | <N> | <DL-IDs or "—"> |

### Aggregate Decisions Surfaced

> These are the DL entries flagged by topology-gap for user review. The walk did NOT
> pause on them — phase plans were drafted with documented defaults. User should
> resolve before running /topology-implement.

| Decision | Affected Category | Default In Plan | Recommendation |
|----------|-------------------|-----------------|----------------|
| DL-<NNN> | <slug> | <option> | <recommendation> |

### Critical Path

<Per the gap analyses, which categories must complete first to unblock others.
Pulled from each category's GAP-ANALYSIS.md "Cascade — Categories Blocked by These Gaps" section.>

### Cross-Category Cascade Summary

> If multiple categories were walked in this run and any of their gaps cascade
> into seams owned by other walked categories, surface that here.

| Producer Category | Consumer Category | Cascade Description |
|-------------------|-------------------|---------------------|

### Files Created

```
categories/<slug-1>/
├── CURRENT-STATE.md
├── GAP-ANALYSIS.md
├── FUTURE-STATE.md
└── implementation/
    ├── CLAUDE.md
    ├── <Cat>-Implementation-Plan.md
    └── phase-N/
        ├── PHASE-N-SESSION-PROMPT.md  (with TOPOLOGY CONTEXT block)
        └── PHASE-N-RUNBOOK.md
...
```

### Next Steps

1. Resolve the <N> open decisions in `DECISION-LOG.md` (see Aggregate Decisions table above)
2. Begin implementation:
   - Single category: `/topology-implement <project-name> <category-slug>`
   - Group: `/topology-sprint-plan <project-name> --group <N>` then `/topology-sprint <project-name> --group <N>`
   - Multiple groups: `/topology-autopilot <project-name>`
```

---

## Important Notes

- **Sequential by design.** The four planning steps cannot run in parallel within a single category — each consumes the prior step's output. For multi-category mode (`--group`, `--categories`, `--all`), the steps proceed in batches: all categories complete Step 1, then all complete Step 2, etc. This honors the methodology's "boundary gaps need both sides visible" rule.
- **Status-aware by default.** Without `--force-redo`, the walk skips steps whose output documents already exist. This means the walk is **resumable** — if an earlier walk was interrupted, re-running will pick up at the first incomplete step. Pass `--force-redo` to override.
- **Does not pause on decisions.** When `topology-gap` flags new DL entries needed (e.g., backfill strategy, type-migration option), the walk continues with documented defaults. All flagged decisions are aggregated into the final report. The user resolves DL entries between the walk's completion and `/topology-implement`. This avoids the friction of pausing 4× per category × N categories.
- **Halts on errors.** If any sub-command fails, the walk stops and reports the failure. Prior outputs are left in place so the walk can resume after the error is fixed.
- **Does NOT run topology-implement, topology-verify, topology-integrate, topology-e2e, or topology-promote.** This command is strictly the planning walk. After completion, use `topology-implement` (single category), `topology-sprint`/`topology-sprint-plan` (group of categories), or `topology-autopilot` (chained groups) to advance.
- **Foundation documents are not modified.** `CONTRACT-SHEET.md` and `SYSTEM-TOPOLOGY.md` are append-only-via-DL after `topology-init`. The walk's outputs (CURRENT-STATE.md, GAP-ANALYSIS.md, etc.) are per-category; they do not amend the foundation.
- **Single completion report, not four.** Each underlying command emits its own completion report when run individually. When invoked via `topology-doc-walk`, the sub-reports are captured and synthesized into a single walk report at the end. This reduces context noise and surfaces cross-category patterns (cascade, aggregate decisions) that single-category reports miss.
- **Time estimate.** Single category ≈ 10-15 minutes. Group of 3 categories ≈ 25-40 minutes (boundary-gap visibility benefits batching). `--all` on a 12-category project ≈ 60-90 minutes.
{{#if MULTI_AGENT}}
- **Delegation speedup.** Use `{DELEGATE_FLAG}` to reduce roughly 25-40% on the more-mechanical sub-commands (current-state, phase-plan).
{{/if}}
- **Methodology-rule enforcement.** This command is the easiest place to enforce the "all current-state before any gap" rule because it owns the orchestration. Single-category invocations cannot violate the rule because the boundary-gap visibility issue only matters across categories.

---

## Examples

### Walk a single category through all four steps

```
/topology-doc-walk {EXAMPLE_PROJECT_SLUG} {EXAMPLE_CATEGORY_SLUG}
```

### Walk every category in parallel Group 2

```
/topology-doc-walk {EXAMPLE_PROJECT_SLUG} --group 2
```

This reads the "Parallel Groups" section of `TOPOLOGY-CLAUDE.md` and walks every
category listed in Group 2. Honors the methodology rule that all current-state
runs complete before any gap analysis runs.

### Walk a custom set of categories

```
/topology-doc-walk {EXAMPLE_PROJECT_SLUG} --categories {EXAMPLE_CATEGORY_SLUG},<category-slug-b>,<category-slug-c>
```

### Walk every not-yet-walked category in the project

```
/topology-doc-walk {EXAMPLE_PROJECT_SLUG} --all
```

Useful immediately after `/topology-init` to bring the entire project to
"Future State Documented" in one invocation.

### Resume after interruption

```
/topology-doc-walk {EXAMPLE_PROJECT_SLUG} --group 2
```

Run again. Status-aware skip means each category resumes at its first incomplete
step. No `--resume` flag needed — that's the default behavior.

### Force re-run

```
/topology-doc-walk {EXAMPLE_PROJECT_SLUG} {EXAMPLE_CATEGORY_SLUG} --force-redo
```

Re-runs all four steps even if outputs exist. Overwrites prior CURRENT-STATE.md,
GAP-ANALYSIS.md, FUTURE-STATE.md, and the implementation directory contents.
**Use with caution** — this destroys per-category history that DL entries may
reference. Prefer making targeted edits or appending DL entries instead.

{{#if MULTI_AGENT}}
### Walk with {DELEGATE_AGENT_NAME} propagation

```
/topology-doc-walk {EXAMPLE_PROJECT_SLUG} --group 2 {DELEGATE_FLAG}
```

Propagates `{DELEGATE_FLAG}` to every underlying topology-* invocation. Walk-level handoff
plan posted at start; per-command handoff plans cascade from there.
{{/if}}
