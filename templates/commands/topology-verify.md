# topology-verify

Post-implementation verification for one category. Checks every assertion in the Future State document against the actual codebase. Verifies all seam contracts this category participates in — both sides. Updates the Verification Table with confirmed results. A category is not complete until every cell in its row is green.

> **See `.claude/commands/topology-PRINCIPLES.md` for the design discipline behind this skill.** In particular: producer/consumer bilateral discipline (failure mode #3 — producer breaks consumer); the "Consumer Expectations" check in Step 4; the evidence-deferral DL pattern (named exception, not a discipline-skip).

## Usage

```
/topology-verify <project-name> <category-slug>
```

### Arguments

- `<project-name>` — the project directory name under `{PROJECTS_ACTIVE_DIR}/`
- `<category-slug>` — the category to verify

---

## Prerequisites

- [ ] All implementation phases are Complete (check runbook statuses)
- [ ] `categories/<category-slug>/FUTURE-STATE.md` exists
- [ ] `categories/<category-slug>/CURRENT-STATE.md` exists (baseline for regression check)
- [ ] `CONTRACT-SHEET.md` exists
- [ ] `SYSTEM-TOPOLOGY.md` exists

If implementation phases are not all Complete, stop and report:

> Not all implementation phases are complete. Run `/topology-implement <project-name> <category-slug>` to advance.

---

## Instructions

### Step 1: Load All Documents

Read:
1. `FUTURE-STATE.md` — the pre-written specification. This is the primary checklist.
2. `CURRENT-STATE.md` — the pre-implementation baseline. Used for regression detection.
3. `CONTRACT-SHEET.md` — all relevant contract invariants with verification criteria
4. `SYSTEM-TOPOLOGY.md` — all seam contracts this category participates in
5. All phase runbooks in `implementation/phase-N/PHASE-N-RUNBOOK.md` — what was actually built

### Step 2: Verify Internal Contract Compliance

For each contract relevant to this category:

1. Read the contract's verification criteria from `CONTRACT-SHEET.md`
2. Read the future state's compliance assertions for this contract
3. Check the actual codebase against both

For each verification criterion, make a binary determination: **Pass** or **Fail**. Evidence required for both — do not mark Pass without confirming the code path exists, do not mark Fail without confirming the violation.

If a criterion cannot be verified programmatically, document it as requiring manual verification with precise instructions.

### Step 3: Verify Seam Compliance — Producer Side

For each seam where this category is the producer:

1. Read the full seam contract from `SYSTEM-TOPOLOGY.md`
2. Read the future state's producer-side assertions
3. Check the actual codebase

For each producer guarantee, verify:
- Does the code always produce the committed type/structure?
- Are all committed fields always populated?
- Is the failure behavior correct (specific ERROR event vs. silent drop)?
- Does the code handle the edge cases implied by "always"?

Mark each guarantee: **Honored** or **Violated**. Evidence required.

### Step 4: Verify Seam Compliance — Consumer Side

For each seam where this category is the consumer:

1. Read the seam's producer guarantees
2. Read the seam's **Consumer Expectations** field (captured at discovery via `topology-discovery` § C "consumer breakage" question; recorded in `SYSTEM-TOPOLOGY.md` per the bilateral discipline in `topology-PRINCIPLES.md` failure mode #3)
3. Read the future state's consumer-side assertions
4. Check the actual codebase

For each consumer dependency, verify:
- Does the code only depend on what the producer guarantees?
- Is the code resilient when guaranteed values are absent? (Defensive coding for guaranteed fields is fine; relying on non-guaranteed fields is not.)
- **Does the consumer's actual breakage surface match the documented Consumer Expectations?** If the consumer breaks in a way the seam contract didn't predict, that's a finding — either the contract is wrong (Decision Log entry → update seam) or the consumer code is over-reliant.

Mark each dependency: **Safe** or **Over-reliant**. Evidence required.

If the seam was authored before the Consumer Expectations field was standard (legacy seam), proceed with the producer-guarantee check alone but flag the seam in the verification report under "Items Requiring Manual Verification" — recommend a Decision Log entry to backfill the Consumer Expectations field.

### Step 4b: Verify App Documentation Impact Coverage

Check whether `categories/<category-slug>/APP-DOC-IMPACT.md` exists.

**If it exists:** Scan the implementation phase runbooks and the FUTURE-STATE.md for user-facing changes (new features, new UI routes, changed data flows, new integrations, changed permissions, changed limits). Compare against the APP-DOC-IMPACT.md entries. If any user-facing changes are not captured, flag them:

```
### App Documentation Coverage Gap

The following user-facing changes were implemented but have no entry in APP-DOC-IMPACT.md:

- <description of uncaptured change>

Add entries before running topology-promote.
```

**If it doesn't exist AND user-facing changes were made:** Flag as a gap:

```
### App Documentation Impact Missing

This category includes user-facing changes but no APP-DOC-IMPACT.md was created.
Create one with: the features added, any new concepts, and changelog entries.
```

**If it doesn't exist AND no user-facing changes were made:** No gap — this is a pure internal/refactoring category. Note in the verification report:

```
**App documentation impact:** None (internal/refactoring category)
```

This is a **soft check** — it does not block verification. Missing impact entries are flagged but do not cause a Fail. The gap will be caught again at topology-promote.

### Step 5: Regression Check

Compare the current codebase against `CURRENT-STATE.md` for behaviors that were working before the rebuild:

- Features that were in Pass compliance before — are they still in Pass compliance?
- Behaviors that were working correctly — do they still work?
- Other categories' seam expectations that were being met — are they still being met?

Any regression is a Fail, even if it's in a behavior not directly targeted by this category's rebuild.

### Step 6: Determine Verification Outcome

**Full Pass** — Every contract criterion is Pass, every seam guarantee is Honored, every consumer dependency is Safe, no regressions found.

**Partial Pass** — Some items pass, some fail. Document precisely which items pass and which fail.

**Fail** — Critical items failing. Category is not complete.

### Step 7: Create VERIFICATION-REPORT.md

```markdown
# <Category Title> — Verification Report

**Project:** <project-name>
**Category:** <category-slug>
**Verified:** <date>
**Outcome:** Full Pass | Partial Pass | Fail

---

## Summary

**Contract compliance:** <N>/<N> criteria passing
**Seam compliance (producer):** <N>/<N> guarantees honored
**Seam compliance (consumer):** <N>/<N> dependencies safe
**Regressions found:** <N>

**Overall: VERIFIED | PARTIAL | FAILED**

---

## Contract Compliance Results

### Contract <N> — <Title>

**Result:** Pass | Fail

| Criterion | Result | Evidence |
|-----------|--------|----------|
| <criterion text> | Pass/Fail | `file:line` — <what was found> |

---

## Seam Compliance Results

### Seam <N> — Producer Side

**Result:** Fully Honored | Partially Honored | Violated

| Guarantee | Result | Evidence |
|-----------|--------|----------|
| <guarantee text> | Honored/Violated | `file:line` — <what was found> |

**Failure behavior verified:**
- [ ] Serialization failure produces typed ERROR event (not silent drop): Pass | Fail | N/A

### Seam <N> — Consumer Side

**Result:** Safe | Over-reliant

| Dependency | Result | Evidence |
|------------|--------|----------|
| <dependency> | Safe/Over-reliant | `file:line` — <what was found> |

---

## Regression Check Results

**Baseline behaviors verified:** <N>/<N>

| Behavior | Result | Notes |
|----------|--------|-------|
| <behavior from CURRENT-STATE.md> | No regression / Regressed | <details> |

---

## Failing Items

<Only if outcome is Partial Pass or Fail>

| Item | Type | Contract/Seam | Description | Recommended Fix |
|------|------|--------------|-------------|----------------|
| <ID> | Contract/Seam/Regression | <ref> | <what's wrong> | <how to fix> |

---

## Items Requiring Manual Verification

<Any items that could not be checked programmatically>

| Item | Type | Manual Check Instructions |
|------|------|--------------------------|
| <item> | <type> | <precise instructions for human reviewer> |

---

## Deferred Items

<Anything discovered during verification that was not part of this category's scope>
```

### Step 8: Update VERIFICATION-TABLE.md

Update every cell in this category's row:

- **Full Pass:** All applicable cells → `✓`
- **Partial Pass:** Passing cells → `✓`, failing cells → `✗ (see report)`
- **Fail:** All cells → `✗ (see report)`

For seam cells: only mark `✓` if BOTH the producer guarantee AND consumer dependency checks passed for that seam. If only one side was verified (neighboring category not yet implemented), mark `⏳ (one side verified)`.

### Step 9: Update Contract Sheet Verification Summary

For each contract that achieved Full Pass compliance in this category, update the Verification Summary table in `CONTRACT-SHEET.md`:

```
| C<N> — <title> | <categories> | Verified (in <category>) |
```

Note: A contract is fully verified only when ALL categories that govern it have passed. Update to "Verified" only when all governing categories have passing verification reports.

### Step 10: Update TOPOLOGY-CLAUDE.md

```
| N | <Category Name> | `categories/<slug>/` | Verified ✓ | (or) Failed — see report |
```

### Step 11: Commit Verified Category (Full Pass Only) — MANDATORY

**This step is not optional.** If the outcome is **Full Pass**, you MUST create a git commit before reporting completion. The completion report requires a commit hash — you cannot produce the report without it.

**Commit scope:** Stage only files that belong to this category's implementation:
- Modified source files (backend handlers, DB layer, frontend components, server actions)
- Topology documents for this category (`categories/<slug>/` directory)
- Updated foundation documents (`VERIFICATION-TABLE.md`, `TOPOLOGY-CLAUDE.md`, `CONTRACT-SHEET.md`)

**Commit message format:**
```
refactor(<scope>): <description of what the category achieved>

Topology: <project-name>/<category-slug> — Verified ✓
Contracts satisfied: C<N>, C<N>
Seams advanced: S<N>, S<N>
```

Example:
```
refactor({EXAMPLE_CATEGORY_SLUG}): <description of what the category achieved>

Topology: {EXAMPLE_PROJECT_SLUG}/{EXAMPLE_CATEGORY_SLUG} — Verified ✓
Contracts satisfied: C1, C2
Seams advanced: S3 (consumer), S7 (producer)
```

**Record the commit hash** — it is required in the completion report (Step 13).

This step is skipped for Partial Pass or Fail outcomes — unverified code should not be committed as a topology milestone.

### Step 12: Auto-Merge Verified Worktree (Full Pass Only)

If the outcome is **Full Pass** and the category was implemented in a worktree branch:

1. Check if a worktree branch exists: `git branch --list "{BRANCH_PREFIX}<project-name>/<category-slug>"`
2. If it exists and has commits ahead of the main branch, run `/topology-merge <project-name> <category-slug>` to merge it back
3. If the merge succeeds, report it in the completion output
4. If the merge has conflicts, report the conflicts but do NOT block verification — the category is still VERIFIED, the merge just needs manual conflict resolution

This step is skipped for Partial Pass or Fail outcomes (unverified code should not be merged).

### Step 13: Report Completion

**SELF-CHECK before reporting:** If outcome is Full Pass, confirm that Step 11 produced a commit. If no commit was made, STOP and go back to Step 11. Do not report completion without a commit hash for Full Pass outcomes.

```
## topology-verify Complete

**Category:** <title>
**Outcome:** VERIFIED | PARTIAL PASS | FAILED
**Commit:** <hash> (Full Pass only — REQUIRED, not optional)

### Results Summary
- Contracts: <N> Pass / <N> Fail / <N> Manual
- Seam producer: <N> Honored / <N> Violated
- Seam consumer: <N> Safe / <N> Over-reliant
- Regressions: <N>

### Verification Table Updated
<Show the updated row for this category>

<If Full Pass:>
### Category Complete ✓
<category> is fully verified. All contract and seam checks pass.

Run: /topology-integrate <project-name>
(if 2-3 categories have now verified since the last integration checkpoint)

<If Partial Pass or Fail:>
### Remediation Required
<N> items require fixes before this category can be marked complete.

Options:
1. Fix the failing items and re-run: /topology-verify <project-name> <category-slug>
2. If a fix requires amending a contract or seam: add a Decision Log entry first,
   then update CONTRACT-SHEET.md or SYSTEM-TOPOLOGY.md, then fix and re-run.

### Failing Items
<List from VERIFICATION-REPORT.md failing items table>
```

---

## Important Notes

- **topology-verify owns all seam validation** — this is the only command that marks seam cells in the Verification Table. `topology-implement` and `project-next-phase` track implementation progress, not verification.
- **Evidence is required for Pass, not just Fail** — saying something passes without pointing to the code is not verification.
- **One-sided seam verification** — if a seam's consumer category hasn't been implemented yet, you can verify the producer side only. Mark the cell `⏳ (producer verified)`. The cell only goes to `✓` when `topology-integrate` or the consumer category's `topology-verify` confirms the consumer side.
- **Contract amendments require Decision Log first** — if a failing item reveals that a contract or seam was incorrectly specified, the fix path is: Decision Log entry → update foundation document → fix code → re-run topology-verify. Do not silently relax a constraint to make a check pass.
- **Failed categories block integration checkpoints** — `topology-integrate` will flag any seam where one endpoint is Verified and the other is Failed. Fix failures before running integration.
- **Evidence-deferral via DL pattern** — when a verification criterion requires out-of-session tooling (a CLI not installed here, live production traffic, a real database instance with specific extensions, a multi-minute observation window, etc.), defer the evidence capture via an explicit DL with **completion criteria**. Do not block the category's Verified ✓ on evidence housekeeping. The pattern is well-established: e.g. a cache-hit-rate metric deferred to a downstream integration verify; a process-kill/resume + persistence check deferred because it requires a real running process against live infrastructure; a zero-retention guarantee deferred because it requires a vendor CLI not installed here. DL body template: (1) what criterion is deferred and why it's out-of-session; (2) where the functional property is or isn't independently knowable; (3) exact completion criteria for lifting the deferral (install command, run command, expected output, evidence file path); (4) affects + no-blockers list confirming that downstream categories aren't gated on this housekeeping. When flipping a cell to ✓ under an evidence deferral, the VERIFICATION-REPORT must cross-reference the DL and the TOPOLOGY-CLAUDE status must note "Verified ✓ (with DL-XXX — <criterion> deferred)".

$ARGUMENTS
