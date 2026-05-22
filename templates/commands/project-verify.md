# Project Verify

Post-implementation verification for a scaffolded project. Checks the project's stated exit criteria against the actual codebase, verifies that topology watch list items were not violated, and produces a verification report. This is a lighter-weight analog of `topology-verify` — it does not require a future state document, a verification table, or category-level seam contracts. It works from the project's own implementation plan exit criteria and any topology watch list items accumulated during implementation.

Running this command is optional but recommended before `/project-promote`. If skipped, `project-promote` will note that no verification was performed.

## Usage

```
/project-verify <project-path>
```

The argument is the path to the project directory (e.g., `{PROJECTS_ACTIVE_DIR}/{EXAMPLE_PROJECT_SLUG}/implementation`).

## Prerequisites

- [ ] All phases must have `## Status: Complete` in their runbooks
- [ ] `CLAUDE.md` exists with an Implementation Phases table
- [ ] An implementation plan markdown file exists

If not all phases are complete, stop:

> Not all implementation phases are complete. Run `/project-next-phase <project-path>` to advance.

## Instructions

### Step 1: Load All Project Documents

Read:
1. `CLAUDE.md` — project structure, conventions, key directories, topology context (if present)
2. The implementation plan — overall goals, phase-by-phase exit criteria
3. All phase runbooks (`phase-N/PHASE-N-RUNBOOK.md`) — what was actually built, files created/modified, design decisions, deferred items, topology watch list results

Determine whether this is a topology-aware project by checking for the **Topology Context** section in `CLAUDE.md`.

### Step 2: Load topology context (if topology-aware)

If the project is topology-aware:

1. Read `{DOCS_ROOT}/GLOBAL-CONTRACTS.md` — extract all contracts listed in the CLAUDE.md Topology Context section
2. Read `{DOCS_ROOT}/GLOBAL-TOPOLOGY.md` — extract all seams listed in the CLAUDE.md Topology Context section
3. Read `{DOCS_ROOT}/GLOBAL-DECISIONS.md` — extract relevant decisions
4. Collect all `[TOPOLOGY]` entries from all phase runbooks' Design Decisions Logs
5. Collect all Topology Watch List Results tables from all phase runbooks

Build a topology verification checklist from this material.

### Step 3: Verify exit criteria per phase

For each phase, read the **Exit Criteria** section from the runbook and the corresponding section from the implementation plan. For each exit criterion:

1. Check the actual codebase — does the stated outcome hold?
2. Make a binary determination: **Pass** or **Fail**
3. Record evidence for both — file paths, function signatures, observable behavior

If the exit criteria are vague or non-binary (e.g., "feature works"), interpret them as specifically as possible based on the implementation plan's phase description and task list. Document what you checked.

### Step 4: Verify files created and modified

For each phase runbook:

1. Check the **Files Created** table — do all listed files exist at the stated paths?
2. Check the **Files Modified** table — do the listed files exist and contain changes consistent with the described modifications?
3. Cross-reference across phases — if Phase 1 created a file and Phase 3 lists it as modified, does it still exist and reflect both phases' work?

Flag any discrepancies: files missing, files at wrong paths, files with no evidence of the described changes.

### Step 5: Cross-phase regression check

Look for regressions across phases:

1. For each file created in an early phase, verify it still exists and has not been inadvertently deleted or emptied by a later phase
2. Check for conflicting modifications — if two phases modified the same file, verify the final state reflects both sets of changes
3. Review all **Deferred Items** across runbooks — categorize each as:
   - Addressed in a later phase (note which phase)
   - Genuinely deferred (out of scope, belongs in future work)
   - Dropped (was deferred but never picked up and not explicitly excluded)

### Step 6: Verify topology compliance (if topology-aware)

This is the core topology check. It is more thorough than the advisory checks in `project-next-phase` but less rigorous than `topology-verify` (which checks both sides of every seam with formal producer/consumer analysis).

#### 6a: Contract compliance check

For each contract in the project's topology watch list:

1. Read the contract's invariant and verification criteria from `GLOBAL-CONTRACTS.md`
2. Identify all files this project created or modified that fall under this contract's governance
3. For each such file, check whether the code satisfies the invariant

Make a determination per contract:
- **Compliant** — all modified code paths satisfy the invariant. Evidence required.
- **Potential violation** — one or more code paths appear to violate the invariant. Document the specific path and what looks wrong.
- **Not applicable** — the project's changes do not touch code governed by this contract (watch list was overly broad)
- **Cannot determine** — insufficient visibility to check. Document what would need to be checked manually.

#### 6b: Seam integrity check

For each seam in the project's topology watch list:

1. Read the seam's producer guarantees and consumer dependencies from `GLOBAL-TOPOLOGY.md`
2. Identify all files this project created or modified that participate in this seam (either producer or consumer side)
3. For each such file:
   - If on the producer side: does the code still produce what the seam guarantees?
   - If on the consumer side: does the code only depend on guaranteed values?

Make a determination per seam:
- **No regression** — seam guarantees appear intact. Evidence required.
- **Potential regression** — a guarantee appears broken or a new unsafe dependency was introduced. Document specifically.
- **Not applicable** — the project's changes do not touch this seam's code paths
- **Cannot determine** — insufficient visibility

#### 6c: Review topology design decisions

For each `[TOPOLOGY]` entry in the phase runbooks' Design Decisions Logs:

1. Read the decision and its rationale
2. Determine if it represents:
   - A deliberate deviation from a contract or seam guarantee (document why)
   - A discovery of a new contract violation that predates this project (flag for promotion)
   - A new seam or contract that should be proposed (flag for promotion)
   - An observation with no action needed

#### 6d: Check for undiscovered topology impacts

Beyond the watch list items, do a broader sweep:

1. Read the full list of `Active` contracts from `GLOBAL-CONTRACTS.md`
2. For each contract NOT in the watch list, check if any of the project's created/modified files fall under its governance
3. If so, do a quick compliance check

This catches cases where the watch list was incomplete — the scaffolding couldn't predict every file the project would touch.

Repeat for `Active` seams from `GLOBAL-TOPOLOGY.md`.

### Step 7: Produce VERIFICATION-REPORT.md

Create `VERIFICATION-REPORT.md` in the project directory:

```markdown
# <Project Name> — Verification Report

**Project:** <project-path>
**Verified:** <date>
**Outcome:** Pass | Partial Pass | Fail
**Topology-aware:** Yes / No

---

## Summary

**Phase exit criteria:** <N>/<N> passing
**Files verified:** <N> created, <N> modified — <N> confirmed, <N> discrepancies
**Regressions found:** <N>
<If topology-aware:>
**Contract compliance:** <N> compliant, <N> potential violations, <N> not applicable, <N> cannot determine
**Seam integrity:** <N> no regression, <N> potential regressions, <N> not applicable, <N> cannot determine
**Topology design decisions:** <N> logged across <N> phases

**Overall: PASS | PARTIAL PASS | FAIL**

---

## Phase Exit Criteria Results

### Phase N — <Title>

| Criterion | Result | Evidence |
|-----------|--------|----------|
| <criterion text> | Pass/Fail | `file:line` — <what was found> |

---

## File Verification Results

### Files Created
| File | Phase | Exists | Notes |
|------|-------|--------|-------|

### Files Modified
| File | Phase | Verified | Notes |
|------|-------|----------|-------|

### Cross-Phase Regressions
| Issue | Phases Involved | Description |
|-------|----------------|-------------|
<or "None found">

---

## Deferred Items

| Item | Phase | Status | Notes |
|------|-------|--------|-------|
| <item> | Phase N | Addressed in Phase M / Genuinely deferred / Dropped | |

---

<If topology-aware:>

## Topology Compliance Results

### Contract Compliance

| Contract | Invariant | Files Checked | Result | Evidence |
|----------|-----------|--------------|--------|----------|
| GC-NNN | <invariant> | <file list> | Compliant / Potential violation / N/A | <details> |

### Seam Integrity

| Seam | Guarantee | Files Checked | Result | Evidence |
|------|-----------|--------------|--------|----------|
| GS-NNN | <guarantee> | <file list> | No regression / Potential regression / N/A | <details> |

### Topology Design Decisions

| Phase | Decision | Type | Promotion Candidate |
|-------|----------|------|-------------------|
| Phase N | <decision text> | Deliberate deviation / Pre-existing issue / New discovery / Observation | Yes / No |

### Undiscovered Topology Impacts

<List any contracts or seams not in the original watch list that were found to be affected by this project.>

| Item | Type | Files Affected | Result |
|------|------|---------------|--------|
<or "None — watch list was complete">

<End if>

---

## Failing Items

<Only if outcome is Partial Pass or Fail>

| Item | Type | Phase | Description | Recommended Fix |
|------|------|-------|-------------|----------------|
| <ID> | Exit criteria / File / Regression / Contract / Seam | Phase N | <what's wrong> | <how to fix> |

---

## Items Requiring Manual Verification

| Item | Type | Manual Check Instructions |
|------|------|--------------------------|
```

### Step 8: Determine outcome

**Pass** — All exit criteria pass, all files verified, no regressions, no topology violations.

**Partial Pass** — Most items pass but some fail. Typically: exit criteria pass but topology has potential violations, or a few files have discrepancies.

**Fail** — Critical exit criteria failing, significant regressions, or confirmed topology violations.

### Step 9: Report completion

```
## project-verify Complete

**Project:** <project-path>
**Outcome:** PASS | PARTIAL PASS | FAIL

### Results Summary
- Phase exit criteria: <N>/<N> pass
- Files: <N> verified, <N> discrepancies
- Regressions: <N>
<If topology-aware:>
- Contract compliance: <N>/<N> compliant
- Seam integrity: <N>/<N> no regression
- Topology decisions: <N> logged, <N> promotion candidates

<If Pass:>
### Project Verified ✓
All checks pass. Ready for promotion.

Run: /project-promote <project-path>

<If Partial Pass:>
### Remediation Recommended
<N> items should be reviewed before promotion.

Options:
1. Fix the failing items and re-run: /project-verify <project-path>
2. Proceed to promotion with known issues — /project-promote will include them
   in the promotion report for human review

<If Fail:>
### Remediation Required
<N> critical items require fixes.

Fix the failing items and re-run: /project-verify <project-path>
```

---

## Important Notes

- **This is not topology-verify.** `topology-verify` is a formal verification against a pre-written future state specification, with per-guarantee producer/consumer analysis across seam boundaries. `project-verify` is a pragmatic check: did the project do what it said it would, and did it break anything it was watching? The distinction matters for promotion — `project-verify` findings land as `Proposed` in the global layer, never `Active`.
- **Evidence is required for Pass, not just Fail.** Saying something passes without pointing to the code is not verification.
- **Watch list completeness is checked, not assumed.** Step 6d sweeps for topology impacts beyond the original watch list. This is important because the implementation may have touched files that weren't anticipated during scaffolding.
- **Potential violations are findings, not failures.** A "Potential violation" in the report is valuable — it surfaces a concern for the human reviewer during promotion. It does not necessarily mean the project did something wrong; the contract may need amendment, or the violation may be pre-existing.
- **Contract amendments are not this command's job.** If a contract appears violated, `project-verify` documents it. The decision about whether to fix the code or amend the contract happens during `/project-promote` review.
- **Standalone projects skip topology sections.** If the project has no Topology Context section in CLAUDE.md, Steps 2, 6, and the topology sections of the report are skipped entirely. The command still checks exit criteria, files, and regressions.

$ARGUMENTS
