# topology-autopilot

Chain sprints across multiple groups (and optionally projects). Writes an overarching integration plan upfront. Pivots cross-project via inference when `--cross-project` is enabled. Stops at HITL gates or at `--through-group` ceiling. Does NOT autonomously run E2E or promote.

## Usage

```
/topology-autopilot <project-name>
/topology-autopilot <project-name> --through-group <N>
/topology-autopilot <project-name> --cross-project
/topology-autopilot <project-name> --through-group <N> --parallel
/topology-autopilot --cross-project                       # auto-detects active projects
```

### Arguments

- `<project-name>` — project to autopilot; omit if `--cross-project` and you want auto-detection across all active projects
- `--through-group <N>` — stop after Group N (default: run until all groups verified)
- `--cross-project` — enable pivots to other projects when this one blocks; auto-detect project list from `{PROJECTS_ACTIVE_DIR}/`
- `--parallel` — pass `--parallel` to each underlying `topology-sprint` invocation
- `--autonomy <strict|normal>` — default `strict`; passed to sprints
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
- All commits pushed per PUSH_POLICY
- Git working tree clean across all touched project worktrees

## Resumption

If paused by HITL: one checkpoint file at `<autopilot-dir>/CHECKPOINT.md`.
Resume with `/topology-resume <primary-project>` after HITL decisions resolved.
```

### Step 3: Preflight (aggregated across all projects in scope)

- All primary project preflight checks (same as topology-sprint Step 2)
- For each pivot-target project: TOPOLOGY-CLAUDE exists, CONTRACT-SHEET exists, no active sprint
- For cross-project: verify no file-level overlap between projects' Parallel Groups (should be none by design, but verify)
- Git working tree clean in all relevant worktrees

### Step 4: Execute sprint loop

Main loop:

```
for group_index in 1..through_group:
    sprint_plan_id = call /topology-sprint-plan <primary-project> --group <group_index>
    result = call /topology-sprint <primary-project> --plan <sprint_plan_id>

    if result.status == complete:
        continue
    if result.status == paused-hitl:
        if --cross-project and pivot_target_has_ready_work():
            log pivot in AUTOPILOT-<id>.md
            pivot_result = autopilot_fragment(pivot_target)
            if pivot_result.status == complete AND primary_dep_unblocked():
                continue main loop at current group_index
            else:
                exit with status paused-hitl
        else:
            exit with status paused-hitl
    if result.status == aborted:
        exit with status aborted
```

Between groups, invoke cross-group integration (if groups share seams):

```
if group_index > 1 and cross_group_seams_exist(group_index-1, group_index):
    invoke /topology-integrate <primary-project>
    update AUTOPILOT-<id>.md
```

### Step 5: Cross-project pivot logic

When primary sprint pauses and `--cross-project`:

**Pivot-target selection:**
1. Read each pivot-target project's TOPOLOGY-CLAUDE and VERIFICATION-TABLE
2. Find projects where the next group's categories have all dependencies satisfied (no prerequisites in other un-verified categories or blocked projects)
3. Prefer target where the blocking dependency for primary would likely resolve soon (e.g., human must approve a DL entry → pivot target should be shorter so you can come back)
4. Reject pivot targets that would themselves depend on the primary's blocker

**Pivot execution:**
1. Write checkpoint for primary at `<primary-autopilot-dir>/CHECKPOINT.md` with status `paused-cross-project-pivot`
2. Run a fresh autopilot fragment: `/topology-autopilot <pivot-target>` with scope constrained to ready categories
3. When pivot fragment completes or blocks itself, return control to primary
4. If primary's blocker was external and now resolved (checked via heuristic), auto-resume primary without HITL

**Pivot-back:**
After pivot fragment reaches its own natural boundary (one group verified, one project complete, or its own HITL gate):
1. Check if primary's blocker is resolved (e.g., DL entry approved via `topology-decide`)
2. If yes: auto-resume primary with `/topology-resume`
3. If no: exit with combined status `paused-hitl (primary) + pivot-target status`

### Step 6: Stop gates

Autopilot stops (not pauses) at these boundaries:

**Natural completion:** all categories in scope Verified ✓ + all integration checkpoints pass. Report and exit; recommend E2E if appropriate.

**Through-group ceiling:** reached `--through-group N`. Report and exit with status `reached-ceiling`.

**E2E readiness boundary:** if the project's recommended next step is `topology-e2e` (extracting runtime tests and moving to e2e/), autopilot stops and reports. `topology-e2e` is human-initiated.

**Promotion boundary:** if the project's recommended next step is `topology-promote` (synthesize to tier docs, archive), autopilot stops. Always human-initiated.

**Unrecoverable HITL:** HITL gate with no cross-project pivot available.

### Step 7: Autopilot completion report

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

- **Autopilot auto-calls sprint-plan.** You don't run `/topology-sprint-plan` before an autopilot — it happens implicitly per group. You CAN run it first if you want to review a specific group's predicted gates before committing to autopilot.
- **Cross-project is opt-in.** The default is single-project. Turn on only when you want the agent to pivot on its own inference — this is highest risk of scope creep if misjudged.
- **E2E and promote are always HITL.** Autopilot stops at these boundaries unconditionally. This is the hard line that autopilot cannot cross.
- **Autopilot can chain with itself.** If autopilot pauses for HITL, you resolve the gate, then `/topology-resume` brings you back into the autopilot. It's not a new autopilot run.
- **Autopilot scope is the project level.** It chains sprints and (optionally) pivots across projects; it never operates below the project boundary.

---

## Placeholders in This File

| Placeholder | Replace With |
|-------------|-------------|
| `<primary-project>` | First/primary project |
| `<id>` | `autopilot-<YYYYMMDD-HHMM>-<primary>-<scope>` |
| `<autopilot-dir>` | `{PROJECTS_ACTIVE_DIR}/<primary>/autopilot/<id>/` |
| `<other-project>` | Cross-project pivot target |
