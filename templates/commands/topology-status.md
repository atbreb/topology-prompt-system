# topology-status

Read-only dashboard. Renders the current state of the entire topology project — verification table, category progress, seam health, open regressions, and next recommended actions. No files are created or modified.

## Usage

```
/topology-status <project-name>
```

### Arguments

- `<project-name>` — the project directory name under `{PROJECTS_ACTIVE_DIR}/`

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

### Step 5: Identify Next Actions

Based on current state, recommend the next actions in priority order:

1. **Regressions** — if any seam is in Regression state, this is the top priority
2. **Ready for verify** — categories with all phases complete but not yet verified
3. **Ready for next phase** — categories in implementation with phases remaining
4. **Ready to start** — categories in the recommended execution order whose dependencies are clear
5. **Integration checkpoint due** — if 2-3 categories have verified since the last checkpoint

### Step 6: Render Dashboard

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

  ✓  S1 — Model Resolution → Execution          Both verified
  ✓  S2 — Proto Boundary → Billing              Both verified
  ⏳  S3 — Proto Boundary → Artifact Runtime     Producer verified, consumer in progress
  ○  S4 — Billing → Session State               Producer verified, consumer not started
  ○  S5 — Artifact Runtime → Execution          Not active
  ○  S6 — HITL → Session State                  Not active
  ○  S7 — Context Budget → Execution            Not active
  ○  S8 — Frontend Status → UI Components       Not active

───────────────────────────────────────────────────────────
CONTRACT STATUS
───────────────────────────────────────────────────────────

  ✓  C1 — Unified Session Primitive             Verified
  ✓  C2 — Single Model Resolution Cascade       Verified
  ⏳  C3 — Single Billing Event Emission         In progress
  ○  C4 — Typed Artifact Contract               Not started
  ○  C5 — Context Budget Enforcement            Not started
  ○  C6 — Checkpoint-Resume HITL               Not started
  ⏳  C7 — Typed gRPC Event Boundary            In progress
  ○  C8 — Frontend Status Authority             Not started

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

- **Read-only** — this command never creates, modifies, or deletes any file. If it appears to need to update something, that update belongs in another command.
- **Graceful degradation** — if some documents don't exist yet (early in the project), skip them and reflect their absence in the status output. Do not fail.
- **Recommended actions are ordered by impact** — regressions always come first. A regression in a verified category is more urgent than advancing an unstarted category.
- **Use frequently** — this command is cheap (read-only) and provides the clearest picture of where the project stands. Run it at the start of any session to re-orient.

$ARGUMENTS
