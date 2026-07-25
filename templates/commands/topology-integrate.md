# topology-integrate

Cross-category integration checkpoint. Walks every seam connecting any two implemented categories and verifies that both sides currently honor the seam contract. Catches regressions introduced when a later category's implementation broke a seam that an earlier category had already verified. Produces a timestamped checkpoint report.

**Orchestration modes:** This command supports two modes — a **serial prose walk** (default, suitable for small projects or when no Workflow tooling is configured) and a **parallel Workflow fan-out** (preferred when the Workflow tool is available; one agent per active seam, all concurrent). See Step 2 for the fork.

## ⚠️ Subagent Dispatch Boundaries — READ THIS FIRST

**If you are running this command as a dispatched subagent** (via `topology-autopilot`, `topology-dispatch`, any parent that spawned you for the integration pass, OR as an agent inside a `topology-autopilot` / `topology-sprint` workflow), your **only deliverable** is the checkpoint report file under `integration-checkpoints/`. You must NOT perform any of the following, even if the project state appears to invite it:

- ❌ Delete the `{PROJECTS_ACTIVE_DIR}/<project>/` directory or any of its subdirectories
- ❌ Move files into `{PROJECTS_ARCHIVE_DIR}/` or `{PROJECTS_E2E_DIR}/`
- ❌ Edit cross-doc indices: `PROJECTS-INDEX.md`, `E2E-GAUNTLET.md`, `GLOBAL-TOPOLOGY.md`, `GLOBAL-CONTRACTS.md`, `GLOBAL-DECISIONS.md`
- ❌ "Promote" or "tidy up" the project layout
- ❌ Run `git mv`, `git rm`, `mv`, `rm`, or any other directory-scale mutation

**Specifically:** if you observe an `{PROJECTS_ACTIVE_DIR}/<project>/` directory AND an `{PROJECTS_E2E_DIR}/<project>/` mirror coexisting, **FLAG the divergence in your checkpoint report** under a "Layout Anomalies" section — do not resolve it. This coexistence is a legitimate mid-lifecycle state (topology-e2e has extracted test artifacts while the project is still receiving doc updates) and resolving it without explicit human authorization caused a regression once before (resolving it blindly required `git checkout HEAD -- <paths>` to unwind).

**Parent agents** that dispatch this command to a subagent MUST embed these boundaries in the subagent brief verbatim, and MUST spot-check `git status` after the subagent (or workflow) returns — look for `D` (deleted) entries or new untracked directories before committing. Under parallel fan-out the dispatch boundary is even more important: no agent inside the Workflow can write to the tree — the only writes happen in the main loop (the report file and the VERIFICATION-TABLE.md update).

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

The parallel fan-out mode makes a full-project checkpoint cheap enough to run more often than the serial walk allowed. Use that to your advantage.

The command will report if fewer than 2 categories have verified since the last checkpoint and suggest waiting, but it will still run if forced.

---

## Prerequisites

Run: `/topology-ready <project-name> <category-slug> --action integrate`.
If NO-GO: resolve each unmet check per the remediation, then re-run.

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

An **active seam** is one where:
- The producer category has at least started implementation (In-Progress or Verified), AND
- The consumer category has at least started implementation (In-Progress or Verified)

List all active seams; note inactive ones as "not yet active."

Load the prior checkpoint's `SEAM_CHECK` results (from the latest `integration-checkpoints/` file) so the checks in Step 2 can diff for regressions.

Emit: `Integration checkpoint <N>: <M> active seams to check, <K> prior-Honored seams to regression-check.`

---

### Step 2: Check Each Active Seam

**Choose the orchestration mode appropriate for the project:**

---

#### Mode A — Parallel Workflow fan-out (preferred when Workflow tool is available)

Author the script and invoke the `Workflow` tool. One agent per active seam, all concurrent. The workflow is strictly read-only — all mutation (report file, table update) happens in the main loop after the workflow returns.

```js
export const meta = {
  name: 'topology-integrate',
  description: 'Check every active seam (both sides) in parallel; diff against prior checkpoint for regressions',
  phases: [{ title: 'SeamCheck', detail: 'one agent per active seam — producer + consumer + cross-check' }],
}

// SEAM_CHECK schema — copy verbatim; agents return this structure
const SEAM_CHECK = {
  type: 'object',
  required: ['seam', 'status'],
  properties: {
    seam:           { type: 'string' },
    status:         { enum: ['both-verified', 'producer-only', 'consumer-only', 'regression', 'not-active'] },
    producerResult: { type: 'string' },   // prose summary + file:line citations
    consumerResult: { type: 'string' },   // prose summary + file:line citations
    crossCheck:     { type: 'string' },   // output-vs-expectation gap analysis
    regression:     { type: 'boolean' },  // true if seam was Honored before and is Violated now
    severity:       { enum: ['critical', 'high', 'medium', 'none'] },
  },
}

const { project, seams } = args
// seams: [{ id, title, producer, consumer, contract, priorState }]
// priorState: 'Honored' | 'Violated' | null (from prior checkpoint file)

phase('SeamCheck')
const checks = await parallel(seams.map(s => () =>
  agent(
    `Integration check for seam ${s.id} — ${s.title} (project ${project}).\n` +
    `Producer category: ${s.producer}. Consumer category: ${s.consumer}.\n` +
    `Seam contract (from SYSTEM-TOPOLOGY.md): ${s.contract}\n` +
    `Prior verified state at last checkpoint: ${s.priorState || 'none'}\n\n` +
    `Perform a LIVE check of both sides against the contract:\n` +
    `- Producer: locate the code path that emits the committed type/structure; verify every guarantee is ` +
    `still honored in the current code and failure behavior is correct. Cite file:line.\n` +
    `- Consumer: locate the code path that consumes from this seam; verify the code depends only on ` +
    `guaranteed values and is resilient for absent guaranteed values. Cite file:line.\n` +
    `- Cross-check: does the producer's actual output match what the consumer actually expects? ` +
    `Is there any behavioral gap between what the producer emits and what the consumer receives?\n` +
    `- REGRESSION: if this seam was Honored at the prior checkpoint but is Violated now, ` +
    `set regression=true, severity per impact.\n` +
    `Return a SEAM_CHECK object. Do NOT modify any files — you are read-only.`,
    { label: `seam:${s.id}`, phase: 'SeamCheck', schema: SEAM_CHECK, agentType: 'Explore' }
  )
))

return checks.filter(Boolean)
```

Pass `args: { project, seams }` where each seam entry is built from the active seam list identified in Step 1.

The main loop receives `SEAM_CHECK[]` and proceeds to Step 3 (assemble report) using the structured results.

---

#### Mode B — Serial prose walk (default, no Workflow tool required)

For each active seam, perform a live check of both sides against the seam contract sequentially:

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

---

### Step 3: Detect Regressions

A regression is: a seam that was previously in a Honored state (per prior verification reports or the loaded prior-checkpoint `SEAM_CHECK` results) that is now Violated.

Check the current state of every seam that was Honored in any prior verification report. Compare against the current codebase. If it was Honored before but is Violated now, that is a regression — flag it as Critical.

In Workflow mode (Mode A) this comparison is embedded in each per-seam agent prompt via `priorState`; the main loop simply reads `regression: true` entries from the returned `SEAM_CHECK[]`.

In serial mode (Mode B) perform the comparison explicitly for each seam after its live check.

---

### Step 4: Create Checkpoint Report

Create: `{PROJECTS_ACTIVE_DIR}/<project-name>/integration-checkpoints/<YYYY-MM-DD>-checkpoint-<N>.md`

Increment N from the prior checkpoint or start at 1. In Workflow mode, stamp the timestamp from the main loop — never from inside the workflow script (non-deterministic timestamps break workflow resume).

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
|----------|--------|----------------|-------|
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

## Layout Anomalies

<Only if {PROJECTS_ACTIVE_DIR}/<project>/ and {PROJECTS_E2E_DIR}/<project>/ coexist>
<Document the coexistence; do NOT resolve it>

---

## Seams Not Yet Active

| Seam | Reason | Expected to activate after |
|------|--------|---------------------------|
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

---

### Step 5: Update VERIFICATION-TABLE.md

For seams where the integration checkpoint confirmed both sides:
- Update cells from `⏳ (one side verified)` to `✓` if both sides are now confirmed

For seams where regressions were found:
- Update affected cells from `✓` to `✗ (regression — see checkpoint <N>)`

---

### Step 6: Report Completion

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

- **Run proactively, not reactively** — the value of integration checkpoints is catching regressions while they're small. The parallel fan-out (Mode A) makes a full-project checkpoint cheap enough to run after every 1-2 categories rather than 2-3. Waiting until all categories are implemented makes regressions expensive to trace.
- **Regressions block progress** — a regression in a verified category must be fixed before proceeding to the next category's implementation. Do not accumulate regressions.
- **One-sided seam verification is not a failure** — if the consumer category isn't implemented yet, `Producer only` is the correct and expected state. It only becomes a concern if the producer changes after the consumer implements against it.
- **Decision Log amendments invalidate prior verification** — if a seam contract was amended in the Decision Log since the last verification, that seam must be re-verified by both categories. The integration checkpoint checks the Decision Log date against the verification report dates and flags any mismatches. In Workflow mode, pass the amendment flag into each per-seam agent's `priorState` field.
- **Workflow mode is strictly read-only** — all mutation (report file, VERIFICATION-TABLE.md update) is main-loop only. This is what keeps the dispatch-boundary guarantee intact under parallel fan-out: no agent inside the Workflow can `rm`/`mv`/promote. The `Explore` agentType enforces this at the tool level.
- **Timestamps belong in the main loop** — when using Workflow mode, stamp `<YYYY-MM-DD>` in the main loop after the workflow returns, not inside the workflow script. Timestamps generated inside Workflow scripts are non-deterministic and break `resumeFromRunId` replay.

$ARGUMENTS
