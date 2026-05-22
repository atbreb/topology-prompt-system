# topology-integrate

Cross-category integration checkpoint. Walks every seam connecting any two implemented categories and verifies that both sides currently honor the seam contract. Catches regressions introduced when a later category's implementation broke a seam that an earlier category had already verified. Produces a timestamped checkpoint report.

## ⚠️ Subagent Dispatch Boundaries — READ THIS FIRST

**If you are running this command as a dispatched subagent** (via `topology-autopilot`, `topology-dispatch`, or any other parent that spawned you for the integration pass), your **only deliverable** is the checkpoint report file under `integration-checkpoints/`. You must NOT perform any of the following, even if the project state appears to invite it:

- ❌ Delete the `{PROJECTS_ACTIVE_DIR}/<project>/` directory or any of its subdirectories
- ❌ Move files into `{PROJECTS_ARCHIVE_DIR}/` or `{PROJECTS_E2E_DIR}/`
- ❌ Edit cross-doc indices: `PROJECTS-INDEX.md`, `E2E-GAUNTLET.md`, `GLOBAL-TOPOLOGY.md`, `GLOBAL-CONTRACTS.md`, `GLOBAL-DECISIONS.md`
- ❌ "Promote" or "tidy up" the project layout
- ❌ Run `git mv`, `git rm`, `mv`, `rm`, or any other directory-scale mutation

**Specifically:** if you observe an `{PROJECTS_ACTIVE_DIR}/<project>/` directory AND an `{PROJECTS_E2E_DIR}/<project>/` mirror coexisting, **FLAG the divergence in your checkpoint report** under a "Layout Anomalies" section — do not resolve it. This coexistence is a legitimate mid-lifecycle state (topology-e2e has extracted test artifacts while the project is still receiving doc updates) and resolving it without explicit human authorization caused a regression once before (resolving it blindly required `git checkout HEAD -- <paths>` to unwind).

**Parent agents** that dispatch this command to a subagent MUST embed these boundaries in the subagent brief verbatim, and MUST spot-check `git status` after the subagent returns — look for `D` (deleted) entries or new untracked directories before committing.

When running this command interactively (not dispatched), the boundaries still apply — promotions go through `/topology-promote`, archival goes through `/topology-merge`, never through this command.

---

## Usage

```
/topology-integrate <project-name>
```

### Arguments

- `<project-name>` — the project directory name under `{PROJECTS_ACTIVE_DIR}/`

---

## When to Run

Run `topology-integrate` after every 2-3 categories complete `topology-verify`. Do not wait until all categories are done — by then, regressions can be deep and expensive to trace.

The command will report if fewer than 2 categories have verified since the last checkpoint and suggest waiting, but it will still run if forced.

---

## Prerequisites

- [ ] `TOPOLOGY-CLAUDE.md` exists
- [ ] `SYSTEM-TOPOLOGY.md` exists
- [ ] `VERIFICATION-TABLE.md` exists
- [ ] At least 2 categories have at least some verified cells in the Verification Table

---

## Instructions

### Step 1: Load Current State

Read:
1. `TOPOLOGY-CLAUDE.md` — full category list and current statuses
2. `VERIFICATION-TABLE.md` — current verification state for all categories
3. `SYSTEM-TOPOLOGY.md` — all seam definitions
4. `DECISION-LOG.md` — any recent amendments that may have changed seam definitions

Identify:
- **Verified categories:** Categories with at least one `✓` cell in the Verification Table
- **In-progress categories:** Categories with at least one `⏳` cell
- **Not-started categories:** Categories with all blank cells
- **Active seams:** Seams where at least one endpoint is Verified or In-Progress

### Step 2: Identify Seams to Check

For each seam in `SYSTEM-TOPOLOGY.md`, determine if it is active:

An **active seam** is one where:
- The producer category has at least started implementation (In-Progress or Verified), AND
- The consumer category has at least started implementation (In-Progress or Verified)

List all active seams. These are the seams to check in this integration checkpoint.

Inactive seams (where one or both categories haven't started) are skipped — note them as "not yet active."

### Step 3: Load Verification Reports for Active Categories

For each category involved in an active seam, read:
- `categories/<slug>/VERIFICATION-REPORT.md` (if topology-verify has run)
- `categories/<slug>/implementation/phase-N/PHASE-N-RUNBOOK.md` for the latest completed phase (if topology-verify hasn't run yet but implementation is in progress)

### Step 4: Check Each Active Seam

For each active seam, perform a live check of both sides against the seam contract:

**Producer side check:**
- Locate the actual code path that produces the committed type/structure
- Verify every guarantee is still honored in the current code
- Check that the failure behavior is still correct

**Consumer side check:**
- Locate the actual code path that consumes from this seam
- Verify the code only depends on guaranteed values
- Check that the code is resilient for absent guaranteed values

**Cross-check:**
- Does the producer's actual output match what the consumer actually expects?
- Is there any behavioral gap between what the producer emits and what the consumer receives?

Mark each seam: **Both sides verified** | **Producer only** | **Consumer only** | **Regression detected** | **Partial**

### Step 5: Detect Regressions

A regression is: a seam that was previously in a Honored state (per prior verification reports) that is now Violated.

Check the current state of every seam that was Honored in any prior verification report. Compare against the current codebase. If it was Honored before but is Violated now, that is a regression — flag it as Critical.

### Step 6: Create Checkpoint Report

Create: `{PROJECTS_ACTIVE_DIR}/<project-name>/integration-checkpoints/<YYYY-MM-DD>-checkpoint-<N>.md`

Increment N from the prior checkpoint or start at 1.

```markdown
# Integration Checkpoint <N>

**Project:** <project-name>
**Date:** <YYYY-MM-DD>
**Categories verified at checkpoint:** <list>
**Active seams checked:** <N>
**Regressions found:** <N>
**Overall result:** CLEAN | REGRESSIONS FOUND | PARTIAL

---

## Categories Status at Checkpoint

| Category | Status | Verified Cells | Notes |
|----------|--------|---------------|-------|
| <cat> | Verified/In-Progress/Not Started | <N>/<total> | |

---

## Seam Check Results

### Seam <N> — <Producer> → <Consumer>

**Status:** Both verified | Producer only | Consumer only | Regression | Not yet active

**Producer side:**
- Checked: <what was checked>
- Result: Honored | Violated
- Evidence: `file:line`

**Consumer side:**
- Checked: <what was checked>
- Result: Safe | Over-reliant | Not yet implemented
- Evidence: `file:line`

**Cross-check:**
- Producer output matches consumer expectation: Yes | No | Partial
- Notes: <any behavioral gaps>

---

## Regressions Found

<Only if regressions were found>

### Regression <N>: <Title>

**Seam:** S<N> — <title>
**Category that regressed:** <category>
**Prior state:** <what was verified before>
**Current state:** <what the code does now>
**Introduced in:** Phase <N> of <category> (approximate)
**Severity:** Critical | High | Medium
**Recommended fix:** <specific guidance>

---

## Seams Not Yet Active

| Seam | Reason | Expected to activate after |
|------|--------|--------------------------|
| S<N> — <title> | <category> not started | <category> begins implementation |

---

## Checkpoint Summary

<If CLEAN:>
All <N> active seams verified. No regressions. System is coherent at this checkpoint.

<If REGRESSIONS FOUND:>
<N> regressions require remediation before proceeding.
Affected categories: <list>
Recommended action: Fix regressions, re-run topology-verify for affected categories,
then re-run topology-integrate before proceeding to next category.

<If PARTIAL:>
<N> seams are partially verified (one side only). This is expected when neighboring
categories are at different implementation stages. Re-run topology-integrate after
<category> completes implementation.

---

## Next Integration Checkpoint

Recommended: after <next 2-3 categories> complete topology-verify.
Specifically: after <category names> verify.
```

### Step 7: Update VERIFICATION-TABLE.md

For seams where the integration checkpoint confirmed both sides:
- Update cells from `⏳ (one side verified)` to `✓` if both sides are now confirmed

For seams where regressions were found:
- Update affected cells from `✓` to `✗ (regression — see checkpoint <N>)`

### Step 8: Report Completion

```
## topology-integrate Complete

**Checkpoint:** <N>
**Date:** <YYYY-MM-DD>
**Report:** integration-checkpoints/<YYYY-MM-DD>-checkpoint-<N>.md

### Results
- Active seams checked: <N>
- Both sides verified: <N>
- Producer only: <N>
- Consumer only: <N>
- Regressions: <N>
- Not yet active: <N>

### Overall: CLEAN | ACTION REQUIRED

<If ACTION REQUIRED:>
Regressions found in: <categories>
Fix regressions before proceeding to next category implementation.
Run topology-verify on affected categories after fixing.

<If CLEAN:>
System is coherent. Safe to proceed to next category.
Next recommended integration checkpoint: after <categories> verify.

<If CLEAN and all categories verified:>
All categories verified and all seams clean. Project is ready for next stage.

Options:
  1. Run E2E testing (recommended if manual verification items exist):
     /topology-e2e <project-name>

  2. Skip E2E and promote directly (topology-promote will warn):
     /topology-promote <project-name>
```

---

## Important Notes

- **Run proactively, not reactively** — the value of integration checkpoints is catching regressions while they're small. Waiting until all categories are implemented makes regressions expensive to trace.
- **Regressions block progress** — a regression in a verified category must be fixed before proceeding to the next category's implementation. Do not accumulate regressions.
- **One-sided seam verification is not a failure** — if the consumer category isn't implemented yet, `Producer only` is the correct and expected state. It only becomes a concern if the producer changes after the consumer implements against it.
- **Decision Log amendments invalidate prior verification** — if a seam contract was amended in the Decision Log since the last verification, that seam must be re-verified by both categories. The integration checkpoint checks the Decision Log date against the verification report dates and flags any mismatches.

$ARGUMENTS
