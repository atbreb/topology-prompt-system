# topology-sprint

Execute a planned sprint autonomously. Runs every target category through the full topology command sequence (`current-state → gap → phase-plan → future-state → implement → verify`), then runs the group's integration checkpoint. Stops only at HITL gates enumerated in the sprint plan.

**Orchestration mode:** By default each category is executed serially, or in parallel via worktree subagents (prose-mode). When the Workflow tool is available, use the **deterministic Workflow script** in Step 3 instead — it runs categories as a pipeline (`pipeline()`) so no barrier exists between phases; one category can be in Build while another is still in Analyze, reducing wall-clock time to the slowest single A→F chain. Both modes honor the same HITL protocol and produce the same output shape.

## Usage

```
/topology-sprint <project-name> --plan <sprint-id>
/topology-sprint <project-name> --group <N>                  # auto-runs topology-sprint-plan first
/topology-sprint <project-name> --categories <slugs>         # auto-runs topology-sprint-plan first
/topology-sprint <project-name> --plan <sprint-id> --parallel
/topology-sprint <project-name> --plan <sprint-id> --cross-project
/topology-sprint <project-name> --resume <runId>             # resume after HITL resolution (Workflow mode)
```

### Arguments

- `<project-name>` — slug of the project
- `--plan <sprint-id>` — reference an existing sprint plan (preferred — ensures plan was reviewable before execution)
- `--group <N>` / `--categories <slugs>` — if no plan exists, auto-generates one via `topology-sprint-plan` before executing
- `--parallel` — spawn worktree subagents per category if the plan allows
- `--cross-project` — enable pivots to other projects when blocked
- `--autonomy <strict|normal>` — default `strict`. `strict` returns every proposed DECISION-LOG entry as HITL; `normal` lets the implement stage auto-add entries with rationale (contract/seam amendments ALWAYS return HITL regardless)
- `--resume <runId>` — resume the sprint Workflow after a HITL gate was resolved (Workflow mode only)
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
- **Divergence guard** — `git fetch origin`, then `git rev-list --count origin/main..main`. If > 0, **STOP**: local `main` has drifted from `origin/main` and must be reconciled (land any local-only work on PR branches, then reset to `origin/main`) before the sprint runs. See `{COMMANDS_DIR}/topology-PRINCIPLES.md § Git & PR coordination`.
- Any external dependencies declared in a target category's External dependencies list are reachable (probe each one — e.g., a managed API gateway, the database, a message broker)
- No other active sprint for this project — if one exists, abort with pointer to `/topology-resume`
- If `--parallel`: verify all target branches don't already exist; if they do, abort with instructions to clean up or use `--force-parallel`

Record each preflight check's result in SPRINT-PROGRESS.md. A single failed preflight check aborts the sprint.

### Step 3: Execute per-category

**Choose the orchestration path based on what is available:**

---

#### Path A — Workflow script (deterministic pipeline, preferred when Workflow tool is available)

Author the script below and invoke via the Workflow tool. Each stage invokes the corresponding per-category `topology-*` command. In `--parallel` mode, the implement-bearing stage runs with `isolation: 'worktree'` so each category gets its own worktree branch off fresh `origin/main`.

The key design: categories share **no inter-stage barrier** — category A can be in Build while B is still in Analyze. Wall-clock time equals the slowest single A→F chain. A category that returns `needs-hitl` short-circuits its own remaining stages without blocking siblings.

```js
export const meta = {
  name: 'topology-sprint',
  description: 'Pipeline each category through current-state→gap→phase-plan→future-state→implement→verify',
  phases: [
    { title: 'Analyze', detail: 'current-state + gap per category' },
    { title: 'Plan',    detail: 'phase-plan + future-state per category' },
    { title: 'Build',   detail: 'implement per category (worktree-isolated in parallel mode)' },
    { title: 'Verify',  detail: 'adversarial verify per category' },
  ],
}

// Schema — copy verbatim; agents receive schema: CATEGORY_RESULT and return structured data.
const CATEGORY_RESULT = { type:'object', required:['category','status'], properties:{
  category:{type:'string'}, status:{enum:['verified','partial','needs-hitl','aborted']},
  phasesCompleted:{type:'integer'}, commits:{type:'array',items:{type:'string'}},
  cells:{type:'array',items:{type:'object'}}, branch:{type:'string'},
  hitl:{type:'object',properties:{reason:{type:'string'},details:{type:'string'}}},
  summary:{type:'string'} }}

const { project, categories, parallel: isParallel, autonomy } = args
// categories: [{slug, branch}]  — branch is the worktree branch name from TOPOLOGY-CLAUDE's Parallel Groups table
const iso = isParallel ? 'worktree' : undefined

const results = await pipeline(
  categories,

  // Stage 1 — Analyze (current-state, then gap). Read-only; never needs a worktree.
  (c) => agent(
    `Run the analysis sequence for category "${c.slug}" in project ${project}:\n` +
    `(1) /topology-current-state ${project} ${c.slug}  then  (2) /topology-gap ${project} ${c.slug}.\n` +
    `Produce CURRENT-STATE.md and GAP-ANALYSIS.md on disk.\n` +
    `If you detect MATERIAL drift (schema shape changed, a decided invariant moved), STOP and return ` +
    `status 'needs-hitl' with hitl.reason='material-drift'.\n` +
    `If current-state surfaces contract/seam ambiguity requiring amendment, return 'needs-hitl' ` +
    `reason='contract-amendment-proposed'.\n` +
    `Return a CATEGORY_RESULT with status 'verified' (analysis complete) or 'needs-hitl'.`,
    { label: `analyze:${c.slug}`, phase: 'Analyze', schema: CATEGORY_RESULT }
  ),

  // Stage 2 — Plan (phase-plan + future-state). Scaffolding gate is mandatory.
  (prev, c) => (prev && prev.status === 'needs-hitl') ? prev : agent(
    `For category "${c.slug}" in ${project}, run:\n` +
    `(1) /topology-phase-plan ${project} ${c.slug} — its project-prep-scaffolding step is MANDATORY; ` +
    `verify every phase-N/ dir + session-prompt + runbook exists on disk before returning. If ` +
    `scaffolding is incomplete, return status 'needs-hitl' reason='scaffolding-incomplete'.\n` +
    `(2) /topology-future-state ${project} ${c.slug} — emit the assertion checklist FUTURE-STATE.md.\n` +
    `If future-state would contradict a CONTRACT-SHEET invariant, return 'needs-hitl' ` +
    `reason='contract-amendment-proposed'.\n` +
    `Return CATEGORY_RESULT.`,
    { label: `plan:${c.slug}`, phase: 'Plan', schema: CATEGORY_RESULT }
  ),

  // Stage 3 — Build (implement; worktree-isolated in parallel mode). 2-retry budget inside the agent.
  (prev, c) => (prev && prev.status === 'needs-hitl') ? prev : agent(
    `Implement category "${c.slug}" in ${project} via /topology-implement ${project} ${c.slug} --one-run` +
    (iso ? ` inside your isolated worktree branch ${c.branch} (already created off fresh origin/main).` : `.`) + `\n` +
    `Before implementation: run the drift-check preflight (new migrations, new DECISION-LOG entries, ` +
    `sibling-category CURRENT-STATE changes, file signature drift). If material drift found, return ` +
    `'needs-hitl' reason='material-drift'.\n` +
    `Single-role phases go through project-next-phase; multi-role phases route to /topology-dispatch.\n` +
    `Retry policy: narrow fix on failure, then broad investigation, then STOP — return 'needs-hitl' ` +
    `reason='implementation-retry-exhausted'. Never --no-verify. ` +
    `Touching auth/secrets/billing → return 'needs-hitl' reason='security-sensitive-change'.\n` +
    `Commit per the phase plan's boundaries to ` + (iso ? `your worktree branch` : `the current branch`) + `.\n` +
    `Mark affected cells ⏳ (impl complete, verify pending) — NEVER ✓.\n` +
    `Return CATEGORY_RESULT with phasesCompleted, commits, branch.`,
    { label: `build:${c.slug}`, phase: 'Build', schema: CATEGORY_RESULT,
      agentType: 'backend-coder', isolation: iso }
  ),

  // Stage 4 — Verify (adversarial panel). Read-only; runs against the built branch/worktree.
  (prev, c) => (prev && prev.status === 'needs-hitl') ? prev : agent(
    `Verify category "${c.slug}" in ${project} via /topology-verify ${project} ${c.slug}.\n` +
    `This runs the find→adversarial-refute panel (finder per assertion, then skeptic panel per Pass).\n` +
    `A failure requiring architectural rethinking → return 'needs-hitl' ` +
    `reason='verification-architectural-failure'.\n` +
    `Return CATEGORY_RESULT: status 'verified' (Full Pass), 'partial', or 'needs-hitl'; ` +
    `include final cells[] and commit SHA.`,
    { label: `verify:${c.slug}`, phase: 'Verify', schema: CATEGORY_RESULT }
  )
)

return results.filter(Boolean)
```

Pass `args: { project, categories, parallel: !!parallelFlag, autonomy }`. Capture the `runId` — it is the machine-resumable record for this sprint.

**After the workflow returns, go to Step 4 (triage and adjudicate).**

> **Workflow design notes:**
> - The `(prev) => prev.status === 'needs-hitl' ? prev : …` guard propagates a blocked category through remaining stages without throwing — siblings keep moving.
> - Avoid `Date.now()`, `Math.random()`, and `new Date()` in script logic — they break deterministic resume. Stamp timestamps after the workflow returns.
> - Without a user-set token budget, `budget.total` is null and `budget.remaining()` is Infinity — if you add budget-scaled loops, guard on `!budget.total || budget.remaining() > threshold`.

---

#### Path B — Prose mode (serial or parallel subagents, no Workflow tool)

For **serial** execution, iterate categories in the order listed in the plan.

For **parallel** execution (when `--parallel` and plan permits):

1. `git fetch origin` first, then for each category create the worktree **off fresh `origin/main`** (never local `main`): `git worktree add -b <branch> <worktree-path> origin/main` using the branch name in TOPOLOGY-CLAUDE's Parallel Groups table. Branching off `origin/main` avoids inheriting other sessions' unpushed commits — see `{COMMANDS_DIR}/topology-PRINCIPLES.md § Git & PR coordination`.
2. Launch one subagent per worktree via the Agent tool with a self-contained per-category instruction (see "Subagent instructions" below)
3. Each subagent reports back when its category reaches Verified ✓ OR hits a HITL gate
4. Main agent waits for all subagents to complete
5. **Land each worktree's branch via PR, not by merging into local `main`** — run `/topology-merge <project-name>` (which pushes each branch and opens a PR in dependency order). Do NOT `git merge` worktree branches into local `main`. See PRINCIPLES § Git & PR coordination.

**After parallel subagents complete, go to Step 4 (triage and adjudicate).**

---

### Step 4: Triage HITL and adjudicate (main loop)

When the workflow or parallel subagents return, partition results by status:

- **`verified`** — for parallel/Workflow mode, land each category's worktree branch via `/topology-merge <project> <category>` (PR, never local-main merge). Auto-commit the docs bundle per category (see Phase F below for the exact commit). Push if `PUSH_POLICY: per-category`.
- **`needs-hitl`** — write `<sprint-dir>/CHECKPOINT.md` (see Step 5 for the full format). In Workflow mode, include the workflow `runId`. Adjudicate per `--autonomy`: in `strict` mode surface every proposed DECISION-LOG entry to the user via `/topology-decide`; contract/seam amendments always surface regardless of autonomy setting. Once resolved, re-invoke:
  - **Workflow mode:** `/topology-sprint <project> --resume <runId>` — cached stages return instantly, only the unblocked category re-runs from its blocked stage.
  - **Prose mode:** `/topology-resume <sprint-id>` — picks up from last green phase per doc state.
- **`partial` / `aborted`** — report; do not land; recommend remediation.

In serial prose mode, triage happens inline: any HITL gate during a phase triggers the Step 5 escalation protocol immediately.

### Step 5: Per-category phase sequence (prose mode / subagent loop)

For each category in serial prose-mode or inside a parallel subagent, execute phases A through F in order:

#### Phase A — Current-state analysis

Invoke: `/topology-current-state <project-name> <category-slug>`

**Drift detection (automatic per topology-autonomy-protocol):** if current-state detects significant drift from prior state (category was previously analyzed, code has moved), re-run automatic. The autonomy protocol defines "significant drift" — invoke the protocol's drift-check subroutine.

**Expected output:** `categories/<slug>/CURRENT-STATE.md` populated.
**HITL gate:** if current-state surfaces contract/seam ambiguity that would require amendment, escalate (see Step 6).
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

**HITL gate:** if phase plan requires touching files outside this project's scope, escalate. Also escalate if `topology-phase-plan` Step 4 (project-prep-scaffolding) failed to produce all per-phase directories — the slim-mirror substitute is an anti-pattern and the sprint must not advance to Phase D with incomplete scaffolding.

**Proceed if:** plan written, scope clean, every per-phase directory verified on disk.

#### Phase D — Future-state design

Invoke: `/topology-future-state <project-name> <category-slug>`
**Expected output:** `categories/<slug>/FUTURE-STATE.md`
**HITL gate:** if future-state contradicts a CONTRACT-SHEET invariant, escalate.
**Proceed if:** future-state design consistent with all governing contracts.

#### Phase E — Implementation (with 2-retry budget)

**Pre-implementation drift check (~2 minutes, read-only):** before any code is written, spot-check for material changes since the phase plan was authored: new migrations touching this category's tables, new DECISION-LOG entries citing this category's contracts or seams, sibling category CURRENT-STATE changes that could invalidate the approach, file signature drift on target writer files. Emit a drift verdict in chat. If drift is material, halt and re-run the upstream analysis chain (Phase A → D) before proceeding. Always emit the verdict as observable output even when clear.

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

### Step 6: HITL escalation protocol

When any gate triggers HITL (prose mode) or after collecting `needs-hitl` results (Workflow mode):

1. Stop current category's execution immediately (prose mode: do NOT advance to next phase)
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
workflow_run_id: <runId or null>   # Workflow mode: the runId for --resume
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
    #   material-drift
    #   scaffolding-incomplete

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
      command: "<external action required, then /topology-resume or /topology-sprint --resume <runId>>"
      consequence: "<what happens next>"

cross_project_pivot_available: <true | false>
cross_project_pivot_target: <project-name or null>
cross_project_pivot_rationale: "<why pivoting there is sensible>"
```

3. Update SPRINT-PROGRESS.md status to `paused-hitl`.
4. If `--cross-project` enabled AND a pivot target exists: do NOT pause the session; instead, write the checkpoint AND invoke a sprint for the pivot target. Return to this sprint when `/topology-resume` is called with the original sprint ID.
5. Report HITL pause to the user with exact remediation commands (from `remediation_options` above).
6. Exit (or, in cross-project mode, pivot).

### Step 7: Integration checkpoint (end of sprint)

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

### Step 8: Sprint completion report

Write `<sprint-dir>/SPRINT-COMPLETE.md`:

```markdown
# Sprint Complete

sprint_id: <sprint-id>
project: <project-name>
started_at: <ISO>
completed_at: <ISO>
duration: <HH:MM>
mode: <serial | parallel-subagents | pipeline-workflow>
workflow_run_id: <runId or null>
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

## Subagent Instructions (for parallel prose mode)

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
- Never merge your worktree branch to main — landing is via PR through
  /topology-merge (the parent runs it); see topology-PRINCIPLES.md
  § Git & PR coordination
- Never modify files outside categories/<category-slug>/ plus the
  files your phase plan explicitly scopes
- Never commit to local main (only to your worktree branch off origin/main)
```

---

## Important Notes

- **Pipeline, not barrier (Workflow mode).** The whole point of the Workflow pipeline is that categories don't wait on each other between phases. Do not reintroduce a barrier between stages — the only barrier is the explicit integration checkpoint at the end (Step 7), which genuinely needs all categories verified.
- **HITL is data, adjudication is main-loop.** In Workflow mode a category that hits a gate returns `needs-hitl` and stops its own chain; it never blocks siblings and never asks the user from inside the workflow. The main loop (Step 4) is the sole place a human decision is made.
- **Resume over re-run.** After resolving a gate in Workflow mode, always `--resume <runId>`. Re-running from scratch re-does already-verified categories. In prose mode use `/topology-resume <sprint-id>`.
- **Parallel mode = worktree-per-category.** Each category's Build stage runs `isolation: 'worktree'` (Workflow) or a dedicated `git worktree` (prose) on its branch off fresh `origin/main`; landing is via `/topology-merge` → PR. Never `git merge` into local `main`.
- **Implement marks `⏳`, verify marks `✓`.** The Build stage must never write `✓`.
- **Sprints are idempotent on successful phases.** Re-running a sprint that completed 3 of 5 phases for a category picks up from phase 4 based on the category's doc state. In Workflow mode `--resume` makes this automatic via the workflow journal.
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
| `<runId>` | Workflow run identifier returned by the Workflow tool invocation |

$ARGUMENTS
