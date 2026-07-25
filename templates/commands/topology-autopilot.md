# topology-autopilot

Chain sprints across multiple groups (and optionally projects). Writes an overarching integration plan upfront. Pivots cross-project via inference when `--cross-project` is enabled. Stops at HITL gates or at `--through-group` ceiling. Does NOT autonomously run E2E or promote.

> **Architectural note:** Each group is run as one `topology-sprint` invocation; the main loop adjudicates HITL gates between groups, fires integration checkpoints across group boundaries, and pivots cross-project when blocked. This is Workflow pattern 5 — **workflow-per-group + main-loop HITL adjudication**: the group loop belongs in the main agent loop; deterministic per-group execution is delegated to `topology-sprint`; the main loop owns every pivot, every amendment, and the E2E/promote stop. A single script spanning all groups cannot pause for a contract amendment, a `strict`-mode DL approval, or a cross-project pivot decision — those are human boundaries. See `{COMMANDS_DIR}/topology-PRINCIPLES.md` § Workflow patterns.

## Usage

```
/topology-autopilot <project-name>
/topology-autopilot <project-name> --through-group <N>
/topology-autopilot <project-name> --cross-project
/topology-autopilot <project-name> --through-group <N> --parallel
/topology-autopilot <project-name> --resume <runId>
/topology-autopilot --cross-project                       # auto-detects active projects
```

### Arguments

- `<project-name>` — project to autopilot; omit if `--cross-project` and you want auto-detection across all active projects
- `--through-group <N>` — stop after Group N (default: run until all groups verified)
- `--cross-project` — enable pivots to other projects when this one blocks; auto-detect project list from `{PROJECTS_ACTIVE_DIR}/`
- `--parallel` — pass `--parallel` to each underlying `topology-sprint` invocation (worktree-per-category dispatch inside each sprint)
- `--autonomy <strict|normal>` — default `strict`; passed to sprints
- `--resume <runId>` — resume a paused autopilot at the group that blocked, using the recorded sprint runId for that group
{{#if MULTI_AGENT}}
- `{DELEGATE_FLAG}` — propagate {DELEGATE_AGENT_NAME} pair mode to every underlying `topology-sprint` invocation
{{/if}}

---

{{#if MULTI_AGENT}}
## {DELEGATE_AGENT_NAME} Pair Mode (optional)

If `{DELEGATE_FLAG}` appears anywhere in `$ARGUMENTS`, enter **{DELEGATE_AGENT_NAME} Pair Mode** for this autopilot run. Full rules live in `{DELEGATE_PROTOCOL_FILE}`.

**Key behavior for autopilots:** `topology-autopilot` is the highest-level orchestrator. When `{DELEGATE_FLAG}` is set, the flag cascades down through every `topology-sprint` invocation, which in turn cascades to every per-phase command. The `{DELEGATE_FLAG}` flag on the autopilot command is itself the pre-approval for the entire run — no ACK wait.

Procedure:

1. Read `{DELEGATE_PROTOCOL_FILE}`.
2. Post an **Autopilot-Level Handoff Plan** that enumerates:
   - Each sprint this autopilot will run (one per group)
   - The expected {DELEGATE_AGENT_NAME} vs. Claude split at the sprint level (e.g., "Sprint 1 — Group 1: ~65% {DELEGATE_AGENT_NAME} / 35% Claude across phases; Sprint 2 — Group 2: ~40% {DELEGATE_AGENT_NAME} / 60% Claude")
   - Aggregate token/time savings estimate

   **Informational** — the `{DELEGATE_FLAG}` flag is already the user's ACK.
3. Proceed immediately per the Autopilot-Level Handoff Plan.
4. Execute the autopilot, passing `{DELEGATE_FLAG}` to each `topology-sprint` invocation.
5. Each sprint runs with {DELEGATE_AGENT_NAME} propagation per its own protocol section (no sub-ACK).
6. Record overall attribution in `<autopilot-dir>/RUNBOOK-DELEGATE.md` summarizing all {DELEGATE_AGENT_NAME} usage across all sprints in the run.

**Cross-project autopilots with delegation:** When `--cross-project` and `{DELEGATE_FLAG}` are both set, the pivot sprints also inherit {DELEGATE_AGENT_NAME} mode. The autopilot's attribution RUNBOOK is the single source of truth for all {DELEGATE_AGENT_NAME} usage across the multi-project run.

**No-ACK cascade:** `{DELEGATE_FLAG}` on the autopilot command is the pre-approval for the entire multi-sprint, multi-phase run. Autopilot-level, sprint-level, and per-command Handoff Plans are posted for visibility and audit, not as veto points. The user's escape hatches — "abort delegation mode" / "do this step yourself" / "send this to {DELEGATE_AGENT_NAME}" — still work mid-run per the pair protocol § Escape hatches.

Strip `{DELEGATE_FLAG}` from `$ARGUMENTS` before substituting into the positional args below (then re-add it when invoking sprints).

---

{{/if}}
## Why autopilot stays a main-loop orchestrator (not one big workflow)

A single workflow spanning all groups cannot pause for a contract amendment, a `strict`-mode DL approval, or a cross-project pivot decision — those are human boundaries, and a workflow's agents run to completion. So topology-autopilot keeps the **group loop in the main agent loop** and delegates only the deterministic per-group execution to `topology-sprint` (optionally as a Workflow script when the Workflow tool is available). Between groups, the main loop has the full picture and makes the human-facing calls. This is the deliberate division from PRINCIPLES: *deterministic work in the script, judgment in the loop.*

---

## Instructions

### Step 1: Scope resolution

- If `<project-name>` given and `--cross-project` NOT given: single-project autopilot. Group list = Groups 1..`through-group` (or all) from that project's TOPOLOGY-CLAUDE.
- If `--cross-project` given and `<project-name>` given: that project is primary, other projects in `{PROJECTS_ACTIVE_DIR}/` are pivot targets.
- If `--cross-project` given without `<project-name>`: multi-project autopilot; primary is the first project with un-verified categories, others are pivot targets and future-primary.

Validate: every resolved project has a completed `topology-init` (TOPOLOGY-CLAUDE.md + CONTRACT-SHEET.md exist).

### Step 2: Write the autopilot plan

Create `{PROJECTS_ACTIVE_DIR}/<primary-project>/autopilot/AUTOPILOT-<id>.md`. The ID is `autopilot-<YYYYMMDD-HHMM>-<primary>-<scope>`.

```markdown
# Autopilot Plan

autopilot_id: <id>
primary_project: <project-name>
cross_project: <true | false>
pivot_targets: <list or null>
autonomy: <strict | normal>
parallel: <true | false>
through_group: <N or "all">
created: <ISO>

## Execution schedule

### Sprint 1 — <primary-project> Group 1
- Categories: <list>
- Mode: <serial | parallel>
- Expected duration: <estimate>
- Integration checkpoint: after all categories verified
- Prereq: <prereq list>
- Cross-project pivot target if blocked: <other-project-name> (Group <N> of <other>)

### Sprint 2 — <primary-project> Group 2
...

### (optional) Sprint N — <other-project> Group M
Only present in cross-project mode; fires if primary blocks

## Integration strategy (inferred)

**Within-sprint integration** — fires after each group's categories verify.

**Cross-sprint integration** — fires after:
- Transitioning between Groups (seams between Group N and Group N+1 exercised)
- Before leaving a project during a cross-project pivot
- At final completion of autopilot

**Cross-project integration** — fires when:
- A shared external dependency (e.g., one external service that two projects both consume) becomes active
- When a dependent project's prerequisite contract is met (e.g., a prerequisite project verified → the dependent project's blocked sprints unblock)

## Expected HITL gates (aggregated)

<enumerate from each sprint's expected gates, in sequence order>

## Stop conditions

- Through-group ceiling reached
- All categories Verified ✓ in all projects in scope (reached natural completion)
- HITL gate with no cross-project pivot available
- E2E or promote-gate reached (autopilot does NOT advance past these — always HITL)

## Success criteria

- Every category targeted has Verified ✓ in VERIFICATION-TABLE
- Every group has an integration checkpoint (CP1, CP2, ...)
- Cross-project (if enabled) has a final cross-project integration doc
- Every group's branch landed via PR through `/topology-merge` (never merged into local main); local main == origin/main
- Git working tree clean across all touched project worktrees

## Workflow runIds (fill in as each sprint runs)

| Group | Sprint plan id | Sprint runId | Status |
|-------|---------------|--------------|--------|
| 1     | <plan-id>     | <runId>      | pending |
| 2     | <plan-id>     | <runId>      | pending |

## Resumption

If paused by HITL: one checkpoint file at `<autopilot-dir>/CHECKPOINT.md` recording the sprint runId for the blocked group.
Resume with `/topology-autopilot <primary-project> --resume <runId>` after HITL decisions resolved.
```

### Step 3: Preflight (aggregated across all projects in scope)

- **Divergence guard (run first)** — `git fetch origin`, then `git rev-list --count origin/main..main`. If > 0, STOP the entire autopilot: local main has drifted from origin/main and must be reconciled before any sprint runs. See `{COMMANDS_DIR}/topology-PRINCIPLES.md` § Git & PR coordination.
- All primary project preflight checks (same as topology-sprint Step 2)
- For each pivot-target project: TOPOLOGY-CLAUDE exists, CONTRACT-SHEET exists, no active sprint
- For cross-project: verify no file-level overlap between projects' Parallel Groups (should be none by design, but verify)
- Git working tree clean in all relevant worktrees

> **All sprint worktrees are created off fresh `origin/main` (fetch first), never local main, and every group lands via PR through `/topology-merge` — autopilot never `git merge`s into local main.** See PRINCIPLES § Git & PR coordination.

### Step 4: Execute the group loop

The group loop lives in the main agent loop. Each group is one `topology-sprint` invocation (optionally a deterministic Workflow script when the Workflow tool is available). Structured `CATEGORY_RESULT[]` returned from each sprint drive the adjudication logic below.

```
for group_index in 1..through_group:
    sprint_plan_id = call /topology-sprint-plan <primary-project> --group <group_index>
    result = call /topology-sprint <primary-project> --plan <sprint_plan_id>
             # result = { runId, categoryResults: CATEGORY_RESULT[] }
    record runId in AUTOPILOT-<id>.md Workflow-runIds table

    if every category in result is 'verified':
        # cross-group integration if this group shares seams with the prior group
        if group_index > 1 and cross_group_seams_exist(group_index-1, group_index):
            call /topology-integrate <primary-project>
        update AUTOPILOT-<id>.md
        continue

    if any category is 'needs-hitl':
        # ADJUDICATE in the main loop — never inside the sprint workflow
        adjudicate(result.needs_hitl)   # see Step 5
        if resolved:
            # resume the SAME sprint workflow; cached stages return instantly
            result = call /topology-sprint <primary-project> --resume <result.runId>
            re-evaluate this group_index (do not advance until verified)
        elif --cross-project and pivot_target_has_ready_work():
            log pivot in AUTOPILOT-<id>.md
            pivot_result = autopilot_fragment(pivot_target)   # see Step 6
            if pivot_result.status == complete AND primary_dep_unblocked():
                result = call /topology-sprint <primary-project> --resume <result.runId>
                re-evaluate group_index
            else:
                exit with status paused-hitl
        else:
            exit with status paused-hitl   # write CHECKPOINT.md with the sprint runId

    if any category is 'aborted':
        exit with status aborted
```

**Prose-mode path (when Workflow tool is unavailable):** Run the same logic sequentially: call `/topology-sprint-plan`, then `/topology-sprint`, interpret the written VERIFICATION-TABLE and CHECKPOINT updates as the structured result equivalent, and adjudicate manually using the same Step 5 table.

### Step 5: HITL adjudication (main loop — never inside a sprint)

For each `needs-hitl` category, branch on `hitl.reason`:

| `hitl.reason` | Adjudication |
|---|---|
| `dl-entry-proposed-strict-mode` | Surface the proposed DL; in `strict` get explicit user approval via `/topology-decide`, in `normal` auto-add with rationale and continue. |
| `contract-amendment-proposed` | **Always** surface to user; on approval, update CONTRACT-SHEET/SYSTEM-TOPOLOGY via a DL, then resume. |
| `seam-amendment-proposed` | Same as contract-amendment; seam changes are always user-confirmed. |
| `material-drift` | Re-run the affected category's upstream analysis (the sprint's `--resume` re-enters its Analyze stage); do not patch inline. |
| `implementation-retry-exhausted` | Surface the failure detail; user fixes or redirects, then resume. |
| `precommit-hook-unknown-failure` | Surface for user diagnosis; do not bypass hooks. Resume after fix. |
| `verification-architectural-failure` | Surface; the issue is likely an unresolved DL or contract gap — resolve via `/topology-decide`, then resume. |
| `external-dep-unreachable` | Canonical cross-project pivot trigger when `--cross-project` is set (Step 6); else pause. |
| `security-sensitive-change` | Surface for explicit review before the branch lands; do not auto-approve. |
| `scaffolding-incomplete` | Re-run `/topology-phase-plan` for the category (its prep-scaffolding gate is mandatory), then resume. |

Record every adjudication decision in `AUTOPILOT-<id>.md`.

### Step 6: Cross-project pivot logic

When primary sprint pauses and `--cross-project`:

**Pivot-target selection:**
1. Read each pivot-target project's TOPOLOGY-CLAUDE and VERIFICATION-TABLE
2. Find projects where the next group's categories have all dependencies satisfied (no prerequisites in other un-verified categories or blocked projects)
3. Prefer target where the blocking dependency for primary would likely resolve soon (e.g., human must approve a DL entry → pivot target should be shorter so you can come back)
4. Reject pivot targets that would themselves depend on the primary's blocker

**Pivot execution:**
1. Write checkpoint for primary at `<primary-autopilot-dir>/CHECKPOINT.md` with `status: paused-cross-project-pivot` + the sprint `runId`
2. Run a fresh autopilot fragment: `/topology-autopilot <pivot-target>` with scope constrained to ready categories
3. When pivot fragment completes or blocks itself, return control to primary
4. If primary's blocker was external and now resolved (checked via heuristic), auto-resume primary using the recorded sprint `runId`

**Pivot-back:**
After pivot fragment reaches its own natural boundary (one group verified, one project complete, or its own HITL gate):
1. Check if primary's blocker is resolved (e.g., DL entry approved via `topology-decide`)
2. If yes: resume primary sprint via its `runId` using `--resume`
3. If no: exit with combined status `paused-hitl (primary) + pivot-target status`

### Step 7: Stop gates

Autopilot stops (not pauses) at these boundaries:

**Natural completion:** all categories in scope Verified ✓ + all integration checkpoints pass. Report and exit; recommend E2E if appropriate.

**Through-group ceiling:** reached `--through-group N`. Report and exit with status `reached-ceiling`.

**E2E readiness boundary:** if the project's recommended next step is `topology-e2e` (extracting runtime tests and moving to `{PROJECTS_E2E_DIR}/`), autopilot stops and reports. `topology-e2e` is human-initiated.

**Promotion boundary:** if the project's recommended next step is `topology-promote` (synthesize to tier docs, archive), autopilot stops. Always human-initiated.

**Unrecoverable HITL:** HITL gate with no cross-project pivot available.

### Step 8: Autopilot completion report

Write `<autopilot-dir>/AUTOPILOT-COMPLETE.md` with aggregated state:

```markdown
# Autopilot Complete

autopilot_id: <id>
status: complete | reached-ceiling | paused-hitl | aborted
started_at: <ISO>
ended_at: <ISO>
duration: <HH:MM>

## Sprints executed

### Sprint 1 — <project> Group 1: <status>
- Categories verified: <list>
- Commits: <range>
- Duration: <HH:MM>

### Sprint N — ...

## Workflow runIds (for resume)

| Group | runId | Status |
|-------|-------|--------|
| 1     | <id>  | verified |
| 2     | <id>  | paused-hitl |

## Cross-project pivots (if any)
- <ISO> — primary <project> paused for <reason>; pivoted to <other-project>
- <ISO> — pivot complete; returned to primary
- ...

## DECISION-LOG entries added (aggregated)
- <project> DL-<NNN>: <title>
- ...

## VERIFICATION-TABLE deltas (aggregated)
- <project> <category>: <before> → <after>
- ...

## Integration checkpoints
- <project> CP1: <clean | partial>
- <project> CP2: <...>
- Cross-project CP (if cross_project enabled): <...>

## Recommended next commands
- <based on final state; may suggest topology-e2e, topology-promote, or next autopilot run>
```

Emit to user. Autopilot done.

---

## Important Notes

- **The group loop is main-loop; the per-group execution is a sprint (optionally a workflow).** This is the load-bearing design choice. Do not fold the whole autopilot into one workflow — it would lose the ability to adjudicate amendments and pivots.
- **HITL is adjudicated between groups, never inside a sprint workflow.** A sprint returns `needs-hitl` as data (or writes CHECKPOINT.md in prose mode); the autopilot main loop decides, then resumes the same sprint via its `runId` (cached stages return instantly in Workflow mode).
- **Autopilot auto-calls sprint-plan.** You don't run `/topology-sprint-plan` before an autopilot — it happens implicitly per group. You CAN run it first if you want to review a specific group's predicted gates before committing to autopilot.
- **Cross-project is opt-in.** The default is single-project. Turn on only when you want the agent to pivot on its own inference — this is highest risk of scope creep if misjudged.
- **E2E and promote are the hard line.** Autopilot stops unconditionally at these boundaries. This must never be relaxed.
- **Autopilot chains with itself.** If autopilot pauses for HITL, you resolve the gate, then `/topology-autopilot <project> --resume <runId>` brings you back into the autopilot. It's not a new autopilot run — the recorded sprint runId means already-completed stages return from cache (Workflow mode) or from the written verification state (prose mode).
- **Worktrees off fresh `origin/main`, land via PR.** Every group's parallel categories isolate in worktrees; landing is exclusively `/topology-merge` → PR. The divergence guard runs before the whole autopilot and local main never accumulates feature commits.

---

## Placeholders in This File

| Placeholder | Replace With |
|-------------|-------------|
| `<primary-project>` | First/primary project |
| `<id>` | `autopilot-<YYYYMMDD-HHMM>-<primary>-<scope>` |
| `<autopilot-dir>` | `{PROJECTS_ACTIVE_DIR}/<primary>/autopilot/` |
| `<other-project>` | Cross-project pivot target |

$ARGUMENTS
