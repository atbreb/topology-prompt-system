# topology-resume

Resume a paused sprint or autopilot run after HITL decisions are resolved. Reads the last checkpoint, recovers the workflow `runId` it recorded (if present), verifies remediation is complete, and continues from the exact phase/category where execution stopped — by **resuming the underlying workflow via `resumeFromRunId`** when one is in flight, or falling back to doc-state-driven resume when there is no active runId.

> **Workflow-era note:** When the sprint/autopilot orchestration runs as a deterministic Workflow script, the checkpoint records a workflow `runId`. Resume's primary job becomes **re-invoking the underlying command with `--resume <runId>`** so the workflow re-enters via `resumeFromRunId` — completed `agent()` calls return cached and only the unblocked work re-runs (see topology-PRINCIPLES "Resume discipline"). The CHECKPOINT.md read/parse, remediation verification, and HITL-resolution flow are carried over in both prose-mode and Workflow-mode runs. Resume is **main-loop** — it adjudicates nothing on its own; it restores state and hands control back. It never crosses the E2E or promote boundary.

## Usage

```
/topology-resume <project-name>
/topology-resume <project-name> --sprint <sprint-id>
/topology-resume <project-name> --autopilot <autopilot-id>
/topology-resume <project-name> --run <runId>            # resume a specific workflow runId directly
/topology-resume                                          # auto-detects most recent paused run
```

### Arguments

- `<project-name>` — project of the paused run; omit to auto-detect
- `--sprint <sprint-id>` — resume a specific sprint (if multiple are paused)
- `--autopilot <autopilot-id>` — resume a specific autopilot (takes precedence over its constituent sprints)
- `--run <runId>` — resume directly from a known workflow `runId` (skips checkpoint auto-detect; still runs remediation verification against the checkpoint that recorded it)
{{#if MULTI_AGENT}}
- `{DELEGATE_FLAG}` — re-enable {DELEGATE_AGENT_NAME} pair mode for the resumed run (if original run used {DELEGATE_AGENT_NAME})
{{/if}}

---

{{#if MULTI_AGENT}}
## {DELEGATE_AGENT_NAME} Pair Mode (optional)

`topology-resume` is a coordination command — its core work is checkpoint parsing, remediation verification, runId recovery, and handoff to the underlying sprint/autopilot orchestrator. {DELEGATE_AGENT_NAME} delegation of resume's own steps is low-value.

However, **{DELEGATE_AGENT_NAME} propagation to the resumed run is explicit.** The resume command follows the same flag-as-ACK rule as every other delegation-aware command:

1. Read the checkpoint's metadata — it records whether the original run used {DELEGATE_AGENT_NAME} mode (informational; helps the RUNBOOK note whether the resume matches or diverges from the original run).
2. If `{DELEGATE_FLAG}` is passed on resume: propagate {DELEGATE_AGENT_NAME} mode to the underlying sprint/autopilot invocation. The flag itself is the user's pre-approval; no ACK wait.
3. If `{DELEGATE_FLAG}` is **not** passed on resume: resume solo (ignore whatever the original run did with {DELEGATE_AGENT_NAME}; user explicitly chose solo by omitting the flag). Note the divergence in the RUNBOOK if the original run was a {DELEGATE_AGENT_NAME} run.

No Handoff Plan is posted for this command's own execution — it's all Claude-side coordination. The Handoff Plan responsibility is deferred to the resumed orchestrator, which posts its own for visibility.

Strip `{DELEGATE_FLAG}` from `$ARGUMENTS` before substituting into the positional args below (re-add when invoking the resumed orchestrator).

---

{{/if}}
## Resume is main-loop coordination

`topology-resume` is a pure coordination command. Its work is checkpoint parsing, remediation verification, runId recovery, and handoff to the underlying sprint/autopilot orchestrator. It authors no Workflow script of its own — the *resumed* command owns the workflow (it re-enters it via `resumeFromRunId`). Resume itself never spawns parallel agents and never adjudicates a HITL gate; adjudication already happened in the main loop (via `/topology-decide` or a contract amendment) **before** resume is called. Resume's contract is: *only resume once every blocker the checkpoint recorded is verified resolved.*

A read-heavy state reconstruction (parsing VERIFICATION-TABLE + category docs in fallback mode) may fan out with read-only agents if the project is large, but this carries no new orchestration obligation.

---

## The two resume modes

Resume distinguishes two cases, decided by whether the checkpoint recorded a live workflow `runId`:

- **(a) Workflow resume (the common case).** The run paused mid-workflow because an agent returned `needs-hitl` and the workflow exited cleanly with its `runId` recorded in CHECKPOINT.md. The gate has since been resolved in the main loop. Resume re-invokes the underlying command with `--resume <runId>` so the workflow re-enters via `resumeFromRunId`: every completed stage returns cached, and only the blocked stage (and everything downstream of it) re-runs. This is the canonical path when orchestration runs as a deterministic Workflow script.
- **(b) Doc-state resume (fallback — no active runId).** The project is paused but no workflow is in flight — e.g. the checkpoint predates workflow orchestration, the runId is missing/expired, or the pause happened at a doc boundary between workflows (a completed sprint awaiting the next group). Resume falls back to the original prose-mode behavior: read VERIFICATION-TABLE + category docs to determine the next command, and invoke it fresh (no `--resume`).

Mode (a) is preferred whenever a usable runId exists — it avoids re-doing verified categories.

---

## Instructions

### Step 1: Locate the checkpoint

Priority order (first match wins):

1. If `--run <runId>` specified: scan `{PROJECTS_ACTIVE_DIR}/*/{sprints,autopilot}/*/CHECKPOINT.md` for a matching `workflow_runId`. If none found, accept the runId on faith but warn that remediation cannot be verified against a checkpoint.
2. If `--autopilot <id>` specified: read `<project>/autopilot/<id>/CHECKPOINT.md`
3. If `--sprint <id>` specified: read `<project>/sprints/<id>/CHECKPOINT.md`
4. If `<project-name>` only: find the most recent `CHECKPOINT.md` with status `paused-hitl` (or `paused-cross-project-pivot`) under `{PROJECTS_ACTIVE_DIR}/<project>/`
5. If no args: scan all `{PROJECTS_ACTIVE_DIR}/*/` for checkpoints with status `paused-hitl` / `paused-cross-project-pivot`, pick the most recent

If no paused checkpoint found: report "No paused run found" and exit.
If multiple found (without filter): list them and ask the user to specify.

### Step 2: Parse the checkpoint

Read and parse the checkpoint. When orchestration ran as a Workflow script, CHECKPOINT.md carries the sprint/autopilot HITL fields **plus** the workflow runId:

- `sprint_id` / `autopilot_id`
- `status` — `paused-hitl` | `paused-cross-project-pivot`
- `paused_at`
- `current_category` (and `current_phase` if a phase was mid-flight)
- `workflow_runId` — **the machine-resumable handle** (may be absent → fallback mode)
- `hitl_reason` (one of the `HITL.reason` enum from topology-PRINCIPLES)
- `hitl_details` with `proposed_decisions` and `remediation_options`
- `last_green_phase` / verified categories list

Record whether a usable `workflow_runId` is present — this selects resume mode (a) vs (b) in Step 5.

### Step 3: Verify remediation

Read the checkpoint's `hitl_reason` and `proposed_decisions`. Verify each blocker is resolved. This is the gate that protects against resuming into an unresolved HITL:

**For `dl-entry-proposed-strict-mode`:**
- Every proposed DL entry should now exist in DECISION-LOG.md (via `/topology-decide`)
- Check each proposal ID against DECISION-LOG; if any proposal is still pending, report and exit

**For `contract-amendment-proposed` / `seam-amendment-proposed`:**
- CONTRACT-SHEET or SYSTEM-TOPOLOGY should reflect the amendment
- A DECISION-LOG entry should document the amendment
- Verify both; if either missing, report and exit

**For `material-drift`:**
- The drift the analyze stage detected must be reconciled: either a DL entry records the new shape and updates CONTRACT-SHEET, or the upstream doc (CURRENT-STATE/GAP) was re-derived
- If neither, report and exit (resume will re-enter the Analyze stage, but only after the drift is acknowledged)

**For `external-dep-unreachable`:**
- Probe the dependency (e.g., a health check or reachability test for the external service the checkpoint named)
- If still unreachable, report and exit with a remediation suggestion
- If reachable, proceed

**For `implementation-retry-exhausted`:**
- A DL entry should explain the path forward (e.g., "DL-NNN: accepted that this class of failure requires X")
- OR git state should show the user made a manual fix
- If neither, report and ask the user what changed

**For `verification-architectural-failure`:**
- Either a DL entry documenting the architectural resolution, OR a foundation doc amendment, OR a scope change
- Verify one of these is present before resuming

**For `precommit-hook-unknown-failure`:**
- Git history should show commits that resolved the hook issue
- Or a DL entry documenting why the hook's rule doesn't apply
- Verify; if ambiguous, ask

**For `security-sensitive-change`:**
- DL entry approving the specific change with explicit user sign-off
- Verify; if missing, exit (this class requires an explicit record)

**For `scaffolding-incomplete`:**
- The phase plan's scaffolding output must now be complete — every `phase-N/` dir, session-prompt, and runbook present on disk
- If still incomplete, report and exit (resume will re-enter the Plan stage, but only once scaffolding is whole)

**For `commit-boundary-ambiguous`:**
- The user or a DL entry must have settled the boundary; git state should reflect the intended commits
- Verify; if ambiguous, ask

**For `cross-project-scope-violation`:**
- Scope resolution: either the sprint was re-scoped (new plan), or the violating file was reverted, or a DL entry documents why this project now owns that file
- Verify before resume

If ANY blocker is unresolved: report the specific blocker with the remediation command, exit.

### Step 4: Pre-resume sanity checks

- **Divergence guard:** `git fetch origin && git rev-list --count origin/main..main` is 0, else STOP (local `main` drifted; reconcile before resuming).
- Git working tree clean (the user may have made manual changes during the pause; any uncommitted drift must be committed or stashed — resume does not auto-stage or commit user-made changes).
- No other active sprint/autopilot in this project (to prevent concurrent execution).
- VERIFICATION-TABLE state matches the checkpoint's `last_green_phase` expectations (no silent regression).

If any check fails, report and do NOT resume.

### Step 5: Resume

Branch on resume mode (decided in Step 2 by presence of a usable `workflow_runId`):

#### Mode (a) — Workflow resume via runId (preferred)

Re-invoke the underlying command with `--resume <runId>`. The command re-authors the **same** workflow script and calls the Workflow tool with `resumeFromRunId: <runId>`; completed `agent()` calls return cached, and only the unblocked stage (and everything downstream) re-runs (topology-PRINCIPLES "Resume discipline").

**If paused during a standalone sprint:**
- Invoke `/topology-sprint <project> --resume <workflow_runId>`
- The sprint workflow re-enters; verified categories return cached, the blocked category re-runs from its blocked stage. Pass through the original `--parallel` / `--autonomy` flags recorded in the checkpoint.

**If paused during an autopilot:**
- Invoke `/topology-autopilot <project>` — the autopilot main loop re-enters its group loop at the blocked group and resumes that group's sprint workflow by its recorded `runId` (from the AUTOPILOT-`<id>`.md Workflow-runIds table). Cached stages return instantly. The autopilot owns re-evaluating the group before advancing.

**If paused during a cross-project pivot (`paused-cross-project-pivot`):**
- Two checkpoints exist: the primary's (with its sprint `runId`) and the pivot-target's.
- Check the status of both; resume whichever is now unblocked via its `runId`.
- If both are unblocked, resume primary first (preserves sequence) using the primary's recorded `runId`.

#### Mode (b) — Doc-state resume (fallback, no usable runId)

No live workflow handle — re-derive the next command from doc state (the original prose-mode resume behavior):

- Read VERIFICATION-TABLE + the category docs (CURRENT-STATE / GAP / PHASE-PLAN / FUTURE-STATE / VERIFICATION-REPORT) to determine the next command:
  - Categories with `⏳` cells but no VERIFICATION-REPORT → next is `/topology-verify <project> <category>`.
  - Categories with FUTURE-STATE but no `⏳` cells → next is `/topology-implement <project> <category>`.
  - A fully-verified group awaiting the next → next is `/topology-sprint <project> --group <N+1>` (or `/topology-autopilot <project>`).
- Invoke that command fresh (it will start a new workflow with a new `runId` if orchestration supports it). Note in the resume log that this was a doc-state fallback, not a runId resume.

### Step 6: Log the resume

Append to the sprint or autopilot's progress log:

```markdown
## Resume <ISO datetime>
- Resumed by: topology-resume
- Mode: workflow-runId | doc-state-fallback
- Workflow runId: <runId or n/a>
- Trigger: HITL resolution of <hitl_reason>
- DL entries added since pause: <list>
- State at resume: <category> phase <phase>
- Status: executing
```

### Step 7: Hand control back

Hand off to the underlying orchestrator (sprint or autopilot). That orchestrator takes over per its own protocol — including writing its own CHECKPOINT.md if it hits a fresh HITL gate. Resume's job ends here; it does not monitor the resumed run and it never crosses the E2E or promote boundary.

---

## Important Notes

- **Resume over re-run.** Whenever a usable `workflow_runId` exists, resume via it (mode a). Re-running from scratch re-does verified categories — exactly the cost the workflow journal exists to avoid. Fall back to doc-state resume (mode b) only when no live runId is available.
- **Resume adjudicates nothing.** Every HITL decision (DL approval, contract amendment, pivot) happens in the main loop *before* resume is called. Resume only *verifies the resolution is recorded*, then hands control back. It must never approve a DL, amend a contract, or decide a pivot itself.
- **Resume is idempotent.** Running it twice while the run is already executing has no effect. Running it on a completed run reports "no paused run." A runId resume of an already-complete workflow returns all-cached and advances nothing.
- **Remediation must be complete.** Resume verifies every blocker the checkpoint recorded; it does NOT silently proceed with a partially resolved HITL gate. A still-pending proposal is a hard exit.
- **Git state matters.** If the user made manual changes during the pause (e.g., fixed a failing test outside the agent's scope), they must be committed BEFORE resume. Resume does not auto-stage or commit user-made changes, and the divergence guard runs first.
- **The workflow journal is the machine-resumable record; CHECKPOINT.md is for humans.** The checkpoint is still written (for human readability and cross-session recovery) and is the source of the runId, but the workflow's own journal is what `resumeFromRunId` actually replays. If the journal is gone (expired/cleared), resume degrades gracefully to mode (b).
- **Cross-project pivots in autopilot share state.** If an autopilot paused primary for HITL and ran a pivot sprint, both sprints have their own SPRINT-PROGRESS.md + checkpoint, but share the same AUTOPILOT-`<id>`.md (including its Workflow-runIds table) for coordination. Resume reads that table to recover each group's runId.
- **No E2E/promote crossing.** Resume restores state and re-enters sprint/autopilot execution only. It never initiates `/topology-e2e` or `/topology-promote` — those are always human-initiated boundaries.

---

## Placeholders in This File

| Placeholder | Replace With |
|-------------|-------------|
| `<project-name>` | Project slug |
| `<project>` | Project slug |
| `<sprint-id>` | Sprint identifier |
| `<autopilot-id>` | Autopilot identifier |
| `<id>` | Autopilot identifier |
| `<runId>` | Workflow run identifier recorded in CHECKPOINT.md |
| `<workflow_runId>` | Workflow run identifier recorded in CHECKPOINT.md |
| `<N>` | Group number |
| `<category>` | Category slug |

$ARGUMENTS
