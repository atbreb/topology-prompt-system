# topology-status

Read-only dashboard. Renders the current state of the entire topology project — verification table, category progress, seam health, open regressions, **in-flight resumable Workflow runs**, and next recommended actions. No files are created or modified.

> **See `{COMMANDS_DIR}/topology-PRINCIPLES.md`** for the design discipline, the foundation-document mutation discipline (which this command only *reads*, never mutates), and the resume discipline — when Workflow-era orchestration is in use, every `topology-*` orchestration workflow returns a `runId`, and a HITL exit leaves that run resumable via `resumeFromRunId`. This dashboard's In-Flight Workflows section surfaces those runIds so the user knows what can be picked back up.

## Usage

```
/topology-status <project-name>
/topology-status <project-name> --parallel    # fan out one read-only Explore agent per category for a faster scan
```

### Arguments

- `<project-name>` — the project directory name under `{PROJECTS_ACTIVE_DIR}/`

### Flags

- `--parallel` — optional. Fan out read-only `Explore` agents (one per category) to summarize each category's stage in parallel, then render the same dashboard from their compact returns. Pure speed optimization; the dashboard output is identical to the sequential read. Omit it and status works as a simple sequential read.

---

## Prerequisites

- [ ] `TOPOLOGY-CLAUDE.md` exists

If the project doesn't exist, stop and report: "Project `<project-name>` not found. Run `/topology-init <project-name>` to create it."

---

## Instructions

### Step 1: Load All Available Documents

Check for the project in both `{PROJECTS_ACTIVE_DIR}/` and `{PROJECTS_E2E_DIR}/` directories. If found in `{PROJECTS_E2E_DIR}/`, the project is in E2E testing stage.

Read every document that exists (skip gracefully if not yet created):
1. `TOPOLOGY-CLAUDE.md`
2. `CONTRACT-SHEET.md`
3. `SYSTEM-TOPOLOGY.md`
4. `VERIFICATION-TABLE.md`
5. `DECISION-LOG.md`
6. `E2E-TESTING.md` (if present — project is in or past E2E stage)
7. All `categories/<slug>/` — check which stage each category has reached
8. All `integration-checkpoints/` — read the most recent one
9. For any category with a VERIFICATION-REPORT.md, note the outcome
10. Any `CHECKPOINT.md` files (autopilot/sprint state) — read them for in-flight Workflow runIds (see Step 5)

> **Optional parallel scan (`--parallel`):** instead of reading each `categories/<slug>/` directory inline, dispatch one read-only `Explore` agent per category with the prompt "Report the current stage of topology category `<slug>` in project `<project>`: which of {Not Started, Current State Documented, Gap Analysis Complete, Phase Plan Complete, Future State Documented, Implementation In Progress, Implementation Complete, Verification Pass, Verification Failed} it has reached, the phase count if in implementation (e.g. 2/4), and the VERIFICATION-REPORT outcome if present. Return a compact one-line status slice." Render the returned slices in the Category Status section. This is read-only and changes nothing about the output — it only parallelizes the scan. Keep it light: one agent per category, no fan-out beyond that.

### Step 2: Build Category Status Map

For each category, determine its current stage by checking which documents exist and their contents:

| Stage | Condition |
|-------|-----------|
| Not Started | No files in category directory |
| Current State Documented | CURRENT-STATE.md exists |
| Gap Analysis Complete | GAP-ANALYSIS.md exists |
| Phase Plan Complete | implementation/ directory exists |
| Future State Documented | FUTURE-STATE.md exists |
| Implementation In Progress | At least one phase runbook shows In Progress or Complete |
| Implementation Complete | All phase runbooks show Complete |
| Verification Pass | VERIFICATION-REPORT.md exists with outcome Full Pass |
| Verification Failed | VERIFICATION-REPORT.md exists with outcome Fail or Partial Pass |

### Step 3: Build Seam Health Map

For each seam in `SYSTEM-TOPOLOGY.md`, determine current health:

| Health | Condition |
|--------|-----------|
| Not Active | Neither endpoint category has started implementation |
| Producer Implemented | Producer category implementation complete, consumer not |
| Consumer Implemented | Consumer category implementation complete, producer not |
| Both Implemented | Both categories implementation complete, not yet verified |
| Producer Verified | Producer side passed topology-verify |
| Consumer Verified | Consumer side passed topology-verify |
| Both Verified | Both sides passed, confirmed by topology-integrate |
| Regression | Was verified, now failing |
| Partial | One side verified, other failed |

### Step 4: Calculate Progress Metrics

- **Categories complete:** Count of Verification Pass / Total categories
- **Seams verified:** Count of Both Verified / Total seams
- **Contracts verified:** Count of contracts with Full Pass / Total contracts
- **Open regressions:** Count of Regression seams
- **Categories blocked:** Categories whose dependencies haven't cleared yet

### Step 5: Detect In-Flight Resumable Workflow Runs

When Workflow-era orchestration is in use, topology-sprint, topology-autopilot, and topology-dispatch each run as `Workflow` scripts that return a `runId` and exit cleanly on any human-in-the-loop (HITL) gate (see PRINCIPLES — "the HITL boundary lives in the main loop"). When that happens, the responsible command records the `runId` (and the gate that stopped it) in a `CHECKPOINT.md` for cross-session recovery.

Scan for these CHECKPOINT files (e.g. `autopilot/CHECKPOINT.md`, `sprints/<id>/CHECKPOINT.md`, or any `CHECKPOINT.md` under the project). For each, extract:
- The Workflow `runId`
- Which command authored it (sprint / autopilot / dispatch)
- The HITL `reason` that paused it (e.g. `contract-amendment-proposed`, `implementation-retry-exhausted`)
- The category/group it stopped on, and the date

These are the runs `/topology-resume` can pick back up. A run with no recorded resolution is **resumable**; a run whose gate has been adjudicated but not yet re-invoked is **ready to resume**. Surface both in the dashboard. If no CHECKPOINT files exist, the section shows "None — no in-flight workflows."

If the project is not using Workflow-era orchestration, this step is a no-op and the section shows "None — no in-flight workflows."

### Step 6: Identify Next Actions

Based on current state, recommend the next actions in priority order:

1. **In-flight workflow resume** — if any workflow run is paused at a resolved HITL gate, resuming it is the top priority (the deterministic work is already cached; only the unblocked branch re-runs)
2. **Regressions** — if any seam is in Regression state, this is the top priority among code work
3. **Ready for verify** — categories with all phases complete but not yet verified
4. **Ready for next phase** — categories in implementation with phases remaining
5. **Ready to start** — categories in the recommended execution order whose dependencies are clear
6. **Integration checkpoint due** — if 2-3 categories have verified since the last checkpoint

### Step 7: Render Dashboard

Output a structured dashboard:

```
═══════════════════════════════════════════════════════════
  TOPOLOGY STATUS: <project-name>
  <date>
═══════════════════════════════════════════════════════════

OVERALL PROGRESS
  Categories:  [████████░░░░░░░░░░░░] <N>/<total> complete
  Seams:       [████░░░░░░░░░░░░░░░░] <N>/<total> both verified
  Contracts:   [██████░░░░░░░░░░░░░░] <N>/<total> verified

OPEN ISSUES
  🔴 Regressions:        <N>
  🟡 Partial verifies:   <N>
  🔵 Pending verify:     <N>

───────────────────────────────────────────────────────────
IN-FLIGHT WORKFLOWS (resumable)
───────────────────────────────────────────────────────────

  ⏸  <command> run <runId>
       Paused at: <hitl-reason> on <category-or-group> (<date>)
       Status:    AWAITING ADJUDICATION | READY TO RESUME
       Resume:    /topology-resume <project-name> --run <runId>

  <or, if none:>
  ○  None — no in-flight workflows.

───────────────────────────────────────────────────────────
CATEGORY STATUS
───────────────────────────────────────────────────────────

  ✓  <category-1>          Verified
  ✓  <category-2>          Verified
  ⏳  <category-3>          Implementation — Phase 2/4
  ○  <category-4>          Future State Documented (ready for /topology-implement)
  ○  <category-5>          Gap Analysis Complete
  ○  <category-6>          Not Started
  ○  <category-7>          Not Started

───────────────────────────────────────────────────────────
SEAM HEALTH
───────────────────────────────────────────────────────────

  ✓  S1 — <seam-title-a> → <seam-title-b>       Both verified
  ✓  S2 — <seam-title-c> → <seam-title-d>       Both verified
  ⏳  S3 — <seam-title-e> → <seam-title-f>       Producer verified, consumer in progress
  ○  S4 — <seam-title-g> → <seam-title-h>       Producer verified, consumer not started
  ○  S5 — <seam-title-i> → <seam-title-j>       Not active

───────────────────────────────────────────────────────────
CONTRACT STATUS
───────────────────────────────────────────────────────────

  ✓  C1 — <contract-title-a>                    Verified
  ✓  C2 — <contract-title-b>                    Verified
  ⏳  C3 — <contract-title-c>                    In progress
  ○  C4 — <contract-title-d>                    Not started
  ○  C5 — <contract-title-e>                    Not started

───────────────────────────────────────────────────────────
LAST INTEGRATION CHECKPOINT
───────────────────────────────────────────────────────────

  Date:    <YYYY-MM-DD> (or "None yet")
  Result:  CLEAN | REGRESSIONS FOUND | PARTIAL
  Report:  integration-checkpoints/<date>-checkpoint-<N>.md

  <If regressions:>
  ⚠️  OPEN REGRESSIONS:
    - S<N> — <seam title>: <brief description>

───────────────────────────────────────────────────────────
RECENT DECISIONS
───────────────────────────────────────────────────────────

  <Last 3 Decision Log entries, one line each>
  DL-<N> (<date>): <decision title>

───────────────────────────────────────────────────────────
RECOMMENDED NEXT ACTIONS
───────────────────────────────────────────────────────────

  <Priority-ordered list of what to do next>

  <If a workflow is paused at a resolved gate:>
  ⏸ 0. Resume in-flight workflow (<command>, gate <hitl-reason> resolved)
        /topology-resume <project-name> --run <runId>

  <If regressions:>
  🔴 1. Fix regression in <category> (S<N> seam)
        /topology-verify <project-name> <category-slug>

  <If categories ready for verify:>
  🟡 2. Run verification for <category> (all phases complete)
        /topology-verify <project-name> <category-slug>

  <If integration checkpoint due:>
  🔵 3. Run integration checkpoint (<N> categories have verified since last checkpoint)
        /topology-integrate <project-name>

  <If categories ready to start:>
  ○  4. Start <category> (next in recommended execution order, dependencies clear)
        /topology-current-state <project-name> <category-slug>

  <If all complete and integration clean, no E2E yet:>
  ○  5. Move to E2E testing (optional, recommended if manual checks exist):
        /topology-e2e <project-name>

  <If E2E testing complete or skipped:>
  ○  6. Promote and archive:
        /topology-promote <project-name>

  <If project is in {PROJECTS_E2E_DIR}/ directory:>
  🧪  Project is in E2E TESTING stage.
      Checklist: E2E-TESTING.md
      P0 tests passing: <N>/<total>
      When ready: /topology-promote <project-name>

═══════════════════════════════════════════════════════════
```

---

## Important Notes

- **Read-only** — this command never creates, modifies, or deletes any file. If it appears to need to update something, that update belongs in another command. The optional `--parallel` `Explore` agents are search-only and write nothing.
- **Graceful degradation** — if some documents don't exist yet (early in the project), skip them and reflect their absence in the status output. Do not fail. A project with no CHECKPOINT files simply shows "None" under In-Flight Workflows.
- **Recommended actions are ordered by impact** — a resumable workflow at a resolved gate comes first (its deterministic work is already cached, so resuming is the cheapest forward motion), then regressions. A regression in a verified category is more urgent than advancing an unstarted category.
- **In-flight runIds are sourced, never invented** — only surface a `runId` that actually appears in a CHECKPOINT file. If a CHECKPOINT references a run but its gate adjudication is ambiguous, show it as AWAITING ADJUDICATION rather than guessing it is ready.
- **Use frequently** — this command is cheap (read-only) and provides the clearest picture of where the project stands. Run it at the start of any session to re-orient, especially to see which Workflow runs are mid-flight and resumable.

$ARGUMENTS
