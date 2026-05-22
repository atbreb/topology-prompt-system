# topology-sprint

Execute a planned sprint autonomously. Runs every target category through the full topology command sequence (`current-state → gap → phase-plan → future-state → implement → verify`), then runs the group's integration checkpoint. Stops only at HITL gates enumerated in the sprint plan.

## Usage

```
/topology-sprint <project-name> --plan <sprint-id>
/topology-sprint <project-name> --group <N>                  # auto-runs topology-sprint-plan first
/topology-sprint <project-name> --categories <slugs>         # auto-runs topology-sprint-plan first
/topology-sprint <project-name> --plan <sprint-id> --parallel
/topology-sprint <project-name> --plan <sprint-id> --cross-project
```

### Arguments

- `<project-name>` — slug of the project
- `--plan <sprint-id>` — reference an existing sprint plan (preferred — ensures plan was reviewable before execution)
- `--group <N>` / `--categories <slugs>` — if no plan exists, auto-generates one via `topology-sprint-plan` before executing
- `--parallel` — spawn worktree subagents per category if the plan allows
- `--cross-project` — enable pivots to other projects when blocked
{{#if MULTI_AGENT}}
- `{DELEGATE_FLAG}` — propagate {DELEGATE_AGENT_NAME} pair mode to every underlying `topology-*` command invocation
{{/if}}

---

{{#if MULTI_AGENT}}
## {DELEGATE_AGENT_NAME} Pair Mode (optional)

If `{DELEGATE_FLAG}` appears anywhere in `$ARGUMENTS`, enter **{DELEGATE_AGENT_NAME} Pair Mode** for this sprint. Full rules live in `{DELEGATE_PROTOCOL_FILE}`.

**Key behavior for sprints:** `topology-sprint` is an orchestrator — the real delegation happens inside each per-phase command it invokes (`topology-current-state`, `topology-gap`, `topology-phase-plan`, `topology-future-state`, `topology-implement`, `topology-verify`, `topology-integrate`). When `{DELEGATE_FLAG}` is set on this sprint, Claude propagates the flag to every sub-invocation, so each phase command posts its own Handoff Plan per its local delegation section.

Procedure:

1. Read `{DELEGATE_PROTOCOL_FILE}`.
2. Post a **Sprint-Level Handoff Plan** that lists each category × phase combination and notes which ones will use {DELEGATE_AGENT_NAME} per their underlying command's pair-mode section. Example: "Category `{EXAMPLE_CATEGORY_SLUG}` — Phase A (current-state): {DELEGATE_AGENT_NAME} pair mode, Phase B (gap): {DELEGATE_AGENT_NAME} pair mode, Phase E (implement): Claude-only (judgment-dense)." **Informational** — the `{DELEGATE_FLAG}` flag is already the user's ACK.
3. Proceed immediately per the Handoff Plan.
4. Execute the sprint, passing `{DELEGATE_FLAG}` to each underlying topology command. Each command posts its own Handoff Plan for visibility (no sub-ACK wait — `{DELEGATE_FLAG}` cascades as pre-approval).
5. Record overall attribution in `<sprint-dir>/RUNBOOK-DELEGATE.md` summarizing all {DELEGATE_AGENT_NAME} usage across the sprint.

**Parallel mode + delegation:** When `--parallel` is also set, each worktree subagent invokes its per-phase commands with `{DELEGATE_FLAG}`. Subagents report back aggregated {DELEGATE_AGENT_NAME} attribution along with category completion.

**No-ACK cascade:** `{DELEGATE_FLAG}` on the sprint command is the pre-approval for the whole sprint. The Sprint-Level Handoff Plan is posted for visibility. Each underlying command posts its own plan, also for visibility. No wait at any level. The user can still say "abort delegation mode" mid-run to stop delegation from that point forward (per the pair protocol § Escape hatches).

Strip `{DELEGATE_FLAG}` from `$ARGUMENTS` before substituting into the positional args below (then re-add it when invoking sub-commands).

---

{{/if}}
## Instructions

### Step 1: Load and validate the sprint plan

- Read `<sprint-dir>/SPRINT-PLAN.md`
- If no plan exists and `--group` / `--categories` given: call `/topology-sprint-plan` first, then continue
- Validate: plan status is `Planned`, not `Executing` or `Complete` (to prevent double-runs)
- Write `<sprint-dir>/SPRINT-PROGRESS.md` with initial state (Executing, started_at, empty category log)

### Step 2: Preflight

Run these gates before starting any category:

- Git working tree clean — if not, abort with instruction to commit or stash
- Any external dependencies declared in a target category's External dependencies list are reachable (probe each one — e.g., a managed gateway, a cloud provider, the database, a message broker)
- No other active sprint for this project — if one exists, abort with pointer to `/topology-resume`
- If `--parallel`: verify all target branches don't already exist; if they do, abort with instructions to clean up or use `--force-parallel`

Record each preflight check's result in SPRINT-PROGRESS.md. A single failed preflight check aborts the sprint.

### Step 3: Execute per-category (serial or parallel)

For **serial** execution, iterate categories in the order listed in the plan.

For **parallel** execution (when `--parallel` and plan permits):

1. For each category, run `git worktree add <worktree-path> -b <branch>` using the branch name in TOPOLOGY-CLAUDE's Parallel Groups table
2. Launch one subagent per worktree via the Agent tool with a self-contained per-category instruction (see "Subagent instructions" below)
3. Each subagent reports back when its category reaches Verified ✓ OR hits a HITL gate
4. Main agent waits for all subagents to complete
5. Merge each worktree's branch into main deterministically (alphabetical by category slug, or the order in the Parallel Groups table)

### Step 4: Per-category phase sequence

For each category (serial; also the subagent's loop in parallel mode):

#### Phase A — Current-state analysis

Invoke: `/topology-current-state <project-name> <category-slug>`

**Drift detection (automatic per topology-autonomy-protocol):** if current-state detects significant drift from prior state (category was previously analyzed, code has moved), re-run automatic. The autonomy protocol defines "significant drift" — invoke the protocol's drift-check subroutine.

**Expected output:** `categories/<slug>/CURRENT-STATE.md` populated.
**HITL gate:** if current-state surfaces contract/seam ambiguity that would require amendment, escalate (see Step 5).
**Proceed if:** document written + no contract/seam amendment flagged.

#### Phase B — Gap analysis

Invoke: `/topology-gap <project-name> <category-slug>`
**Expected output:** `categories/<slug>/GAP.md`
**HITL gate:** if gap reveals a seam that can't be honored as written, escalate.
**Proceed if:** gap identified, no seam amendment flagged.

#### Phase C — Phase plan

Invoke: `/topology-phase-plan <project-name> <category-slug>`

**Expected outputs (verify on disk before proceeding to Phase D — do not trust the agent's report):**
- `categories/<slug>/PHASE-PLAN.md`
- `categories/<slug>/implementation/CLAUDE.md` (prep-scaffolding template, not a slim hand-written mirror)
- `categories/<slug>/implementation/<Category>-Implementation-Plan.md`
- `categories/<slug>/implementation/phase-1/PHASE-1-SESSION-PROMPT.md` and `PHASE-1-RUNBOOK.md`
- `categories/<slug>/implementation/phase-N/PHASE-N-SESSION-PROMPT.md` and `PHASE-N-RUNBOOK.md` for every additional phase

**HITL gate:** if phase plan requires touching files outside this project's scope, escalate. Also escalate if `topology-phase-plan` Step 4 (project-prep-scaffolding) failed to produce all per-phase directories — the slim-mirror substitute is an anti-pattern (see vendor-ui-support drift, 2026-05-06) and the sprint must not advance to Phase D with incomplete scaffolding.

**Proceed if:** plan written, scope clean, every per-phase directory verified on disk.

#### Phase D — Future-state design

Invoke: `/topology-future-state <project-name> <category-slug>`
**Expected output:** `categories/<slug>/FUTURE-STATE.md`
**HITL gate:** if future-state contradicts a CONTRACT-SHEET invariant, escalate.
**Proceed if:** future-state design consistent with all governing contracts.

#### Phase E — Implementation (with 2-retry budget)

Invoke: `/topology-implement <project-name> <category-slug>`

**Retry policy:** if implementation fails (test failure, lint failure, type check failure with clear root cause):
- Attempt 1: narrow fix based on the specific failure
- Attempt 2: broader investigation and fix (may include reading related code, checking recent commits for drift)
- After 2 failed attempts: escalate to HITL with the failure detail

**Never bypass:** pre-commit hooks (no `--no-verify`), signing checks, CI gates.

**Expected output:** code changes land, committed per the phase plan's commit boundaries. Multiple commits are expected (`{COMMIT_CONVENTION}` style scope).

**HITL gate:** pre-commit hook failure with unknown cause, security-sensitive file touched (auth, secrets, billing), external dep unreachable mid-test.

#### Phase F — Verification

Invoke: `/topology-verify <project-name> <category-slug>`

**Expected output:** `categories/<slug>/VERIFICATION-REPORT.md` + VERIFICATION-TABLE row updated to Verified ✓.

**HITL gate:** verification failure requires architectural rethinking (not a narrow bug). Verify must pass cleanly before moving on.

**On green verify:** auto-commit the docs bundle:

```bash
git add categories/<slug>/CURRENT-STATE.md \
        categories/<slug>/GAP.md \
        categories/<slug>/PHASE-PLAN.md \
        categories/<slug>/FUTURE-STATE.md \
        categories/<slug>/VERIFICATION-REPORT.md \
        VERIFICATION-TABLE.md
git commit -m "chore(topology): <category-slug> verified

Full phase sequence complete. Implementation commits preceded this.
VERIFICATION-TABLE updated.

Sprint: <sprint-id>

Co-Authored-By: Claude <noreply@anthropic.com>"
```

Update `SPRINT-PROGRESS.md` with category completion.

If `PUSH_POLICY: per-category` (default): push to origin after this commit.

### Step 5: HITL escalation protocol

When any gate triggers HITL:

1. Stop current category's execution immediately (do NOT advance to next phase)
2. Write checkpoint to `<sprint-dir>/CHECKPOINT.md`:

```markdown
# Sprint Checkpoint

sprint_id: <sprint-id>
project: <project-name>
paused_at: <ISO datetime>
current_category: <slug>
current_phase: <phase-name>
last_green_phase: <phase-name>
last_commit_sha: <git SHA>
status: paused-hitl

hitl_reason: <enum>
    # options:
    #   contract-amendment-proposed
    #   seam-amendment-proposed
    #   dl-entry-proposed-strict-mode
    #   implementation-retry-exhausted
    #   external-dep-unreachable
    #   precommit-hook-unknown-failure
    #   security-sensitive-change
    #   verification-architectural-failure
    #   cross-project-scope-violation

hitl_details:
  description: "<specific details>"
  proposed_decisions:
    - id: DL-proposal-<id>
      title: "<proposal title>"
      rationale: "<agent's reasoning>"
      affects: [<contracts>, <seams>, <categories>]
      proposed_body: "<draft DECISION-LOG entry>"
  blocking_dependencies: [<list>]
  remediation_options:
    - option: "<option 1>"
      command: "/topology-decide <project> <proposal-id> --approve"
      consequence: "<what happens next>"
    - option: "<option 2>"
      command: "/topology-decide <project> <proposal-id> --reject"
      consequence: "<what happens next>"
    - option: "<option 3>"
      command: "<external action required, then /topology-resume>"
      consequence: "<what happens next>"

cross_project_pivot_available: <true | false>
cross_project_pivot_target: <project-name or null>
cross_project_pivot_rationale: "<why pivoting there is sensible>"
```

3. Update SPRINT-PROGRESS.md status to `paused-hitl`.
4. If `--cross-project` enabled AND a pivot target exists: do NOT pause the session; instead, write the checkpoint AND invoke a sprint for the pivot target. Return to this sprint when `/topology-resume` is called with the original sprint ID.
5. Report HITL pause to the user with exact remediation commands (from `remediation_options` above).
6. Exit (or, in cross-project mode, pivot).

### Step 6: Integration checkpoint (end of sprint)

After all target categories reach Verified ✓:

Invoke: `/topology-integrate <project-name>`

**Expected output:** `integration-checkpoints/CP<N>-<sprint-id>.md`

**Acceptance criteria** (from sprint plan's Integration Strategy section):
- All seams exercised during the sprint pass integration checks
- Partial-completeness noted explicitly (e.g., "S5 consumer-side pending; producer verified")
- Cross-seam consistency checks documented

**HITL gate:** if integration reveals seam violations that weren't caught by per-category verify, escalate with the architectural issue. Integration checkpoints are a safety net — a failure here usually means discovery missed a seam detail.

On green integration:

```bash
git add integration-checkpoints/CP<N>-<sprint-id>.md
git commit -m "chore(topology): <project-name> integration checkpoint <N>

Sprint: <sprint-id>
Categories verified: <list>

Co-Authored-By: Claude <noreply@anthropic.com>"
```

Push if policy requires.

### Step 7: Sprint completion report

Write `<sprint-dir>/SPRINT-COMPLETE.md`:

```markdown
# Sprint Complete

sprint_id: <sprint-id>
project: <project-name>
started_at: <ISO>
completed_at: <ISO>
duration: <HH:MM>
status: complete | partial | aborted

## Categories verified
- <slug>: <one-line what was implemented> (<commit SHA range>)
  ...

## DECISION-LOG entries added during sprint
- DL-<NNN>: <title>
  ...

## HITL gates encountered
- <count> — all resolved via /topology-decide

## Integration checkpoint
<CP-id>: <clean | partial — see report>

## VERIFICATION-TABLE delta
<category-slug>: <old cell state> → <new cell state>
...

## Recommended next command
/topology-sprint <project-name> --group <N+1>
  # or
/topology-autopilot <project-name> --through-group <end>
  # or (if project is complete)
/topology-status <project-name>
  # manual e2e and promote pending
```

Emit the report to the user. Sprint is done.

---

## Subagent Instructions (for parallel mode)

When spawning a subagent for parallel execution of one category:

```
You are executing the topology-sprint protocol for a single category
inside a git worktree.

## Context
- Project: <project-name>
- Category: <category-slug>
- Worktree: <path>
- Branch: <branch-name>
- Sprint ID: <sprint-id>
- Autonomy: strict
- Parent sprint orchestrator: [main agent process]

## Your loop
Run phases A through F for the category per the topology-sprint spec.

## On any HITL gate
Write the checkpoint to <sprint-dir>/CHECKPOINT-<category>.md, report
back to the parent, stop. Do not escalate to the user directly — the
parent aggregates HITL across all parallel subagents.

## On category complete
Report back to the parent with the final commit SHA and VERIFICATION
-TABLE update.

## Constraints
- Never merge your worktree branch to main (the parent does this)
- Never modify files outside categories/<category-slug>/ plus the
  files your phase plan explicitly scopes
- Never commit to main (only to your worktree branch)
```

---

## Important Notes

- **Sprints are idempotent on successful phases.** Re-running a sprint that completed 3 of 5 phases for a category picks up from phase 4 based on the category's doc state. Do NOT re-run phases that already produced green output.
- **Checkpoint is single-source.** One `CHECKPOINT.md` per sprint directory. Do not create alternate checkpoint files.
- **Integration is mandatory.** Even if only one category is in the sprint, run integration — it verifies cross-seam consistency against sibling categories in other groups.
- **Auto-commit is only on verify green.** Failed phases do NOT commit. The implementation phase commits per the phase plan's boundaries, but the docs bundle is held until verify passes.
- **Cross-project pivot never touches the original sprint's files.** When pivoting, the original sprint is paused-hitl; the pivot target runs in its own sprint session.

---

## Placeholders in This File

| Placeholder | Replace With |
|-------------|-------------|
| `<project-name>` | Project slug |
| `<sprint-id>` | Sprint identifier from the plan |
| `<sprint-dir>` | `{PROJECTS_ACTIVE_DIR}/<project>/sprints/<sprint-id>/` |
| `<category-slug>` | Category identifier |
| `<worktree-path>` | Worktree location for parallel execution |
| `<branch-name>` | Git branch name from TOPOLOGY-CLAUDE's Parallel Groups table |
