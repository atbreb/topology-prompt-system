# topology-resume

Resume a paused sprint or autopilot run after HITL decisions are resolved. Reads the last checkpoint, confirms remediation is complete, and continues from the exact phase/category where execution stopped.

## Usage

```
/topology-resume <project-name>
/topology-resume <project-name> --sprint <sprint-id>
/topology-resume <project-name> --autopilot <autopilot-id>
/topology-resume                                           # auto-detects most recent paused run
```

### Arguments

- `<project-name>` — project of the paused run; omit to auto-detect
- `--sprint <sprint-id>` — resume a specific sprint (if multiple are paused)
- `--autopilot <autopilot-id>` — resume a specific autopilot (takes precedence over its constituent sprints)
{{#if MULTI_AGENT}}
- `{DELEGATE_FLAG}` — re-enable {DELEGATE_AGENT_NAME} pair mode for the resumed run (if original run used {DELEGATE_AGENT_NAME})
{{/if}}

---

{{#if MULTI_AGENT}}
## {DELEGATE_AGENT_NAME} Pair Mode (optional)

`topology-resume` is a coordination command — its core work is checkpoint parsing, remediation verification, and handoff to the underlying sprint/autopilot orchestrator. {DELEGATE_AGENT_NAME} delegation of resume's own steps is low-value.

However, **{DELEGATE_AGENT_NAME} propagation to the resumed run is explicit.** The resume command follows the same flag-as-ACK rule as every other delegation-aware command:

1. Read the checkpoint's metadata — it records whether the original run used {DELEGATE_AGENT_NAME} mode (informational; helps the RUNBOOK note whether the resume matches or diverges from the original run).
2. If `{DELEGATE_FLAG}` is passed on resume: propagate {DELEGATE_AGENT_NAME} mode to the underlying sprint/autopilot invocation. The flag itself is the user's pre-approval; no ACK wait.
3. If `{DELEGATE_FLAG}` is **not** passed on resume: resume solo (ignore whatever the original run did with {DELEGATE_AGENT_NAME}; user explicitly chose solo by omitting the flag). Note the divergence in the RUNBOOK if the original run was a {DELEGATE_AGENT_NAME} run.

No Handoff Plan is posted for this command's own execution — it's all Claude-side coordination. The Handoff Plan responsibility is deferred to the resumed orchestrator, which posts its own for visibility.

Strip `{DELEGATE_FLAG}` from `$ARGUMENTS` before substituting into the positional args below (re-add when invoking the resumed orchestrator).

---

{{/if}}
## Instructions

### Step 1: Locate the checkpoint

Priority order (first match wins):

1. If `--autopilot <id>` specified: read `<project>/autopilot/<id>/CHECKPOINT.md`
2. If `--sprint <id>` specified: read `<project>/sprints/<id>/CHECKPOINT.md`
3. If `<project-name>` only: find the most recent `CHECKPOINT.md` with status `paused-hitl` under `{PROJECTS_ACTIVE_DIR}/<project>/`
4. If no args: scan all `{PROJECTS_ACTIVE_DIR}/*/` for checkpoints with status `paused-hitl`, pick the most recent

If no paused checkpoint found: report "No paused run found" and exit.
If multiple found (without filter): list them and ask user to specify.

### Step 2: Verify remediation

Read the checkpoint's `hitl_reason` and `proposed_decisions`. Verify each blocker is resolved:

**For `dl-entry-proposed-strict-mode`:**
- Every proposed DL entry should now exist in DECISION-LOG.md (via `/topology-decide`)
- Check each proposal ID against DECISION-LOG; if any proposal is still pending, report and exit

**For `contract-amendment-proposed` / `seam-amendment-proposed`:**
- CONTRACT-SHEET or SYSTEM-TOPOLOGY should reflect the amendment
- A DECISION-LOG entry should document the amendment
- Verify both; if either missing, report and exit

**For `external-dep-unreachable`:**
- Probe the dependency (e.g., a health check or reachability test for the external service the checkpoint named)
- If still unreachable, report and exit with remediation suggestion
- If reachable, proceed

**For `implementation-retry-exhausted`:**
- A DL entry should explain the path forward (e.g., "DL-NNN: accepted that this class of failure requires X")
- OR git state should show the user made a manual fix
- If neither, report and ask user what changed

**For `verification-architectural-failure`:**
- Either a DL entry documenting the architectural resolution, OR a foundation doc amendment, OR a scope change
- Verify one of these is present before resuming

**For `precommit-hook-unknown-failure`:**
- Git history should show commits that resolved the hook issue
- Or a DL entry documenting why the hook's rule doesn't apply
- Verify; if ambiguous, ask

**For `security-sensitive-change`:**
- DL entry approving the specific change with explicit user sign-off
- Verify; if missing, exit (this class requires explicit record)

**For `cross-project-scope-violation`:**
- Scope resolution: either the sprint was re-scoped (new plan), or the violating file was reverted, or a DL entry documents why this project now owns that file
- Verify before resume

If ANY blocker is unresolved: report the specific blocker with the remediation command, exit.

### Step 3: Pre-resume sanity checks

- Git working tree clean (user may have made manual changes; any uncommitted drift must be committed or stashed)
- No other active sprint/autopilot in this project (to prevent concurrent execution)
- VERIFICATION-TABLE state matches the checkpoint's `last_green_phase` expectations (no silent regression)

If any check fails, report and do NOT resume.

### Step 4: Resume

Based on checkpoint's status, re-invoke the appropriate orchestrator:

**If paused during a standalone sprint:**
- Invoke `/topology-sprint` internally with the exact same inputs (project, plan id)
- The sprint orchestrator reads its SPRINT-PROGRESS.md to know which categories are done
- Resumes from the `current_category` at the `current_phase`

**If paused during an autopilot:**
- Invoke `/topology-autopilot` internally with the same inputs
- The autopilot reads its AUTOPILOT-<id>.md + constituent sprint progress
- Resumes from `current_sprint` (a specific group) at `current_category` / `current_phase`

**If paused during a cross-project pivot:**
- Two checkpoints exist: primary's and pivot-target's
- Check status of both; resume whichever is now unblocked
- If both unblocked, resume primary first (preserves sequence)

### Step 5: Log the resume

Append to the sprint or autopilot's progress log:

```markdown
## Resume <ISO datetime>
- Resumed by: topology-resume
- Trigger: HITL resolution of <hitl_reason>
- DL entries added since pause: <list>
- State at resume: <category> phase <phase>
- Status: executing
```

### Step 6: Continue execution

Hand off to the underlying orchestrator (sprint or autopilot). That orchestrator takes over per its own protocol.

---

## Important Notes

- **Resume is idempotent.** Running it twice when the run is already executing has no effect. Running it on a completed run reports "no paused run."
- **Remediation must be complete.** The resume command verifies every blocker; it does NOT silently proceed with a partially resolved HITL gate.
- **Git state matters.** If the user made manual changes during the pause (e.g., fixed a failing test outside the agent's scope), they must be committed BEFORE resume. Resume does not auto-stage or commit user-made changes.
- **Cross-project pivots in autopilot share state.** If an autopilot paused primary for HITL and ran a pivot sprint, both sprints have their own SPRINT-PROGRESS.md but share the same AUTOPILOT-<id>.md for coordination.

---

## Placeholders in This File

| Placeholder | Replace With |
|-------------|-------------|
| `<project-name>` | Project slug |
| `<sprint-id>` | Sprint identifier |
| `<autopilot-id>` | Autopilot identifier |
