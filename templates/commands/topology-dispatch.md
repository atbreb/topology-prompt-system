# topology-dispatch

Fan a single phase of a single category out to multiple specialist subagents working in parallel. Sister command to `topology-implement` — `topology-implement` runs single-role phases via `project-next-phase`; `topology-dispatch` runs multi-role phases. Two execution modes:

- **Wave 1 (prose mode, shared workspace):** Agent-tool spawns, shared working tree, disjointness is a hard blocker. Simple; requires no Workflow tooling.
- **Wave 2 (Workflow mode, worktree-isolated):** A deterministic Workflow script gives each specialist agent its own git worktree off fresh `origin/main`. Disjointness becomes advisory — overlapping scopes are a merge-order decision, not an abort. This is the mode the original "Wave 1" note anticipated ("Wave 2 may add per-agent worktrees").

Use Wave 2 whenever the Workflow tool is available. Invoke this command explicitly — `topology-implement` Step 2.5 calls it automatically when the phase plan declares multi-role.

{{#unless USE_SUBAGENTS}}
> **Note:** This project is configured without specialist subagents (`use_subagents: false`). Every phase is single-role by definition, so dispatch never applies — run `/topology-implement <project> <category>` for all phases instead.
{{/unless}}

## Usage

```
/topology-dispatch <project-name> <category-slug>
/topology-dispatch <project-name> <category-slug> --phase <N>
/topology-dispatch <project-name> <category-slug> --phase <N> --agents {{#each SUBAGENT_TYPES as t}}{t},{{/each}}
/topology-dispatch <project-name> <category-slug> --phase <N> --dry-run
/topology-dispatch <project-name> <category-slug> --phase <N> --resume [<runId>]
```

### Arguments

- `<project-name>` — slug under `{PROJECTS_ACTIVE_DIR}/`
- `<category-slug>` — category under that project's `categories/`

### Flags

- `--phase <N>` — explicit phase number. Default: the next In-Progress / pending phase from PHASE-PLAN.md
- `--agents <comma-list>` — explicit agent roster. Default: inferred from the phase plan's task scope (file paths → roles)
- `--dry-run` — write BRIEF.md and STATUS.md, print the dispatch plan, do NOT spawn agents or run the Workflow. Use for review before commit.
- `--resume [<runId>]` — re-enter an existing dispatch. In Wave 2 mode: re-invoke the Workflow with `resumeFromRunId` so already-completed agents return cached. In Wave 1 mode: re-read STATUS.md, re-spawn any agents whose process died, or proceed to synthesis if all complete.

---

## Prerequisites

- [ ] Sprint exists: `{PROJECTS_ACTIVE_DIR}/<project>/sprints/<sprint-id>/SPRINT-PLAN.md` (latest active sprint)
- [ ] Category in flight: `categories/<category-slug>/PHASE-PLAN.md` exists
- [ ] FUTURE-STATE exists: `categories/<category-slug>/FUTURE-STATE.md`
- [ ] Implementation scaffolded: `categories/<category-slug>/implementation/CLAUDE.md`
- [ ] Git working tree clean (uncommitted changes block parallel dispatch — agents would fight over the diff)
- [ ] **Divergence guard (Wave 2):** `git fetch origin && git rev-list --count origin/main..main` is 0 before spawning worktrees

If any are missing, abort with the specific remediation command (e.g., `Run /topology-future-state <project> <category> first`).

---

{{#if MULTI_AGENT}}
## {DELEGATE_AGENT_NAME} Pair Mode (optional)

If `{DELEGATE_FLAG}` appears anywhere in `$ARGUMENTS`, the flag cascades to each dispatched specialist subagent. Each agent runs its own {DELEGATE_AGENT_NAME} split per `{DELEGATE_PROTOCOL_FILE}`. The dispatch orchestrator (this command) does not split — it routes.

When `{DELEGATE_FLAG}` is set:
1. Pass `{DELEGATE_FLAG}` in each subagent's brief context (mention in BRIEF.md `Agents` section)
2. Each agent posts its own Handoff Plan when it starts (per its archetype's delegation section)
3. Aggregate {DELEGATE_AGENT_NAME} attribution in STATUS.md `## Notes` at synthesis

Strip `{DELEGATE_FLAG}` from `$ARGUMENTS` before substituting into positional args below.

---

{{/if}}
## Instructions

### Step 1: Locate the active sprint and validate inputs

1. List directories under `{PROJECTS_ACTIVE_DIR}/<project-name>/sprints/` sorted descending by name (sprint IDs include datestamps)
2. Pick the most recent. Read its `SPRINT-PLAN.md` and confirm `status: Executing` (or `status: Planned` if no execution has happened yet)
3. If no active sprint exists, abort:
   > No active sprint for <project>. Run `/topology-sprint-plan <project> --group <N>` first, or specify a sprint with `--sprint <sprint-id>` (not yet supported).
4. Read `categories/<category-slug>/PHASE-PLAN.md`, `categories/<category-slug>/FUTURE-STATE.md`, `categories/<category-slug>/implementation/CLAUDE.md`
5. Validate prerequisites checklist above. Abort on any miss with the matching remediation command.

### Step 2: Determine the phase

If `--phase <N>` was passed, use that number directly.

Otherwise, parse the phases table in `categories/<category-slug>/implementation/CLAUDE.md`:
- Pick the first phase with status `In Progress`
- If none, pick the first phase with status `Pending`
- If all phases are Complete, abort:
  > All phases for <category> are complete. Run `/topology-verify <project> <category>` next.

Read that phase's full entry from `categories/<category-slug>/PHASE-PLAN.md` — the task list, exit criteria, Role profile, and file scope per role.

### Step 3: Determine the agent roster

If `--agents <list>` was passed, use it. Validate every name resolves to a project agent under `.claude/agents/` (must be one of the project's subagent types: {{#each SUBAGENT_TYPES as t}}`{t}` {{/each}}).

Otherwise, use the phase plan's declared Role profile if present; else infer from the phase plan's file scope by mapping each path region to one of the project's subagent types. Use the same path → role inference rules as `topology-phase-plan` Rule 6:

| Path region | Role |
|---|---|
| Backend service code, schema/API definitions, DB migrations | backend role |
| Frontend app code, shared UI packages | frontend role |
| Infra/gateway config, Dockerfiles, CI workflows, deploy config | systems role |
| Pure design-spec / token / accessibility | design role |
| Auth, secrets, billing, SQL injection–adjacent | security reviewer — invite as a non-blocking reviewer (its findings land in HANDOFFS/, not a hard gate) |

Any path region with no matching specialist role falls back to the project's general-purpose subagent type.

Emit the inference verdict in chat before proceeding — it is the observable signal that routing happened.

If only one role surfaces, abort with:
> Phase scope is single-role (<role>). Use `/topology-implement <project> <category>` instead — dispatch is for multi-role phases.

If three or more surface, list them and ask the user to confirm or trim before scaffolding (high parallelism amplifies the cost of a bad split).

### Step 4: Disjointness check

For each pair of agents (i, j):
- Compute the union of their declared scope paths
- Run `git ls-files <path>` for each path
- Confirm whether any file appears in both result sets

**Wave 1 (shared workspace):** Disjointness is a hard blocker.
- If overlaps are trivial (e.g., a single shared config file), document in BRIEF under LOCKS/ coordination and proceed.
- If overlaps are significant (e.g., both touch the same service directory), abort:
  > Scope overlap detected: <files>. Either re-run with `--agents` overriding the roster, rethink the phase plan to make scopes disjoint, or use `/topology-implement` for a single-agent phase.

**Wave 2 (worktree-isolated):** Disjointness is advisory, not a blocker.
- Each agent works in its own worktree off `origin/main`, so overlaps no longer scramble commit attribution.
- Record any overlap in the BRIEF under "Merge-order notes" so the synthesis step knows which branches to land in which order and where to expect conflicts.
- Do NOT abort for overlap in Wave 2.

Do NOT proceed to scaffolding until the check result is recorded.

### Step 5: Scaffold the workspace

Create:
```
{PROJECTS_ACTIVE_DIR}/<project>/sprints/<sprint-id>/dispatches/<category-slug>-phase<N>/
├── BRIEF.md
├── STATUS.md
├── WORKSPACE.md       (Wave 1 only)
├── LOCKS/             (Wave 1, empty)
└── HANDOFFS/          (Wave 1, empty)
```

If the directory already exists and `--resume` is NOT set, abort:
> Dispatch already exists at <path>. Re-run with `--resume` to continue, or delete the directory if you intend to start fresh (note: this loses the prior brief and findings).

### Step 6: Write BRIEF.md

Populate per the schema in `.claude/TOPOLOGY-DISPATCH-PROTOCOL.md` § 2.

Required content:
- Frontmatter: dispatch_id, project, category, phase, phase_title, sprint_id, created_at, created_by, autonomy
- **Phase objective** lifted (paraphrased, one paragraph) from PHASE-PLAN.md
- **Anchor docs** with relative paths from the project root + relevant section anchors from FUTURE-STATE
- **Disjointness check result** from Step 4 (Wave 1: confirmed disjoint / Wave 2: merge-order notes with overlapping files listed)
- **Worktree branches table** (Wave 2 only):

  | Agent | Role | Worktree Branch (off origin/main) | Scope |
  |---|---|---|---|
  | <agent-1> | <role> | `{BRANCH_PREFIX}<project>/<category>-p<N>-<role-abbrev>` | `<path>` |
  | <agent-2> | <role> | `{BRANCH_PREFIX}<project>/<category>-p<N>-<role-abbrev>` | `<path>` |

- **Agents** section, one subsection per agent in the roster, each containing:
  - Scope (literal paths, no wildcards that match unintended siblings)
  - Read-only context (paths to read but not write)
  - Subtask (concrete deliverable, references PHASE-PLAN task IDs and FUTURE-STATE sections)
  - Exit criteria (observable outcomes — files written, tests passing)
- **Cross-agent contracts** (only if shared interfaces exist)
- **Out of scope** (be explicit — anything outside per-agent scope, anything in later phases, anything in other categories)
- **Reporting** (standard text — append to WORKSPACE.md (Wave 1) or commit to worktree branch (Wave 2), return ≤200-word summary)
- **Forbidden** (standard text — no out-of-scope writes, no BRIEF edits, no commits to main, no `--no-verify`)

### Step 7: Write initial WORKSPACE.md and STATUS.md

**Wave 1 only — WORKSPACE.md:** Pre-create one section per agent so writes target a known anchor:

```markdown
# Dispatch Workspace — <category> Phase <N>

Append findings under your assigned section. Do not edit other agents' sections.

## Agent 1 — <role>

_Pending — agent has not started._

## Agent 2 — <role>

_Pending — agent has not started._

## Cross-agent notes

_Use HANDOFFS/ for synchronous handoffs. This section is for shared observations the orchestrator should see._
```

**STATUS.md (both modes):** Initial state per protocol § 6, with `state: scaffolded`.

### Step 8: Dry-run gate

If `--dry-run` is set:
- Print the absolute path to BRIEF.md and STATUS.md
- Print a one-screen summary of the dispatch plan (agents, scopes, exit criteria, Wave mode, worktree branches if Wave 2)
- Stop. Do NOT spawn agents or run the Workflow.
- Tell the user how to proceed:
  > Review the brief at `<path>/BRIEF.md`. To execute: re-run without `--dry-run`. To revise: edit BRIEF.md and re-run with `--resume`.

---

## Execution — Wave 1 (Prose Mode, Shared Workspace)

Use when the Workflow tool is unavailable. Disjointness pre-check from Step 4 is a hard gate.

### Step 9a: Spawn subagents in background

For each agent in the roster, invoke the Agent tool with `run_in_background: true` and `subagent_type: <role>`.

The prompt template for each agent:

```
You are operating in topology-dispatch workspace mode.

WORKSPACE_PATH: <absolute path to dispatch directory>

Read these files in order before doing any work:
1. <WORKSPACE_PATH>/BRIEF.md  — your task spec
2. .claude/TOPOLOGY-DISPATCH-PROTOCOL.md  — workspace contract you must honor

Your assigned section is "## Agent <N> — <role>" in <WORKSPACE_PATH>/WORKSPACE.md.

Your scope (paths you may write) is declared in BRIEF.md under "Agents → Agent <N>".
Anything outside that scope: STOP and write to <WORKSPACE_PATH>/HANDOFFS/.

When complete:
1. Append a "### Summary" subsection to your WORKSPACE.md section listing files changed,
   tests run + result, any handbacks raised, and recommended commit boundary
2. Return a concise summary (≤200 words) of what you delivered.

If you hit a blocking issue, write a HANDOFFS/<from>-to-orchestrator-<slug>.md with
`blocking: true` and return a brief explanation immediately — do not retry indefinitely.
```

Capture each background agent's ID. Update STATUS.md:
- Set `state: dispatched`
- Add a row per agent to the Agents table with the background ID and `state: running`

Report to the user:
```
## topology-dispatch — Spawned (Wave 1)

**Project:** <project>  **Category:** <slug>  **Phase:** <N>
**Workspace:** <absolute path>

Agents running in background:
- <role-1>  (bg-<id>)  — <one-line subtask>
- <role-2>  (bg-<id>)  — <one-line subtask>

Watching for completion. Will synthesize when all agents return.
```

### Step 10a: Wait, monitor, synthesize (Wave 1)

This step runs in the orchestrator's main loop. The orchestrator does NOT poll — it relies on background-agent completion notifications from the harness.

When EACH agent reports back:
1. Update STATUS.md: that agent's row → `state: complete`, fill `Completed` and `Files Changed`
2. Read HANDOFFS/ and triage:
   - Any new `blocking: true` file → pause, surface to user with the handoff body, set `state: hitl-paused`
   - Non-blocking handoffs accumulate for the synthesis report

When ALL agents reach `state: complete`:
1. Set STATUS.md `state: complete`
2. Run `git status --porcelain` and confirm every modified path is in some agent's declared scope. If not, surface the violation and pause for HITL (do NOT auto-commit).
3. Run the verify gates appropriate to the phase scope (lint on touched packages, type check, the targeted tests called out in the phase plan)
4. Read each agent's `### Summary` from WORKSPACE.md
5. Decide commit boundary based on agents' recommendations:
   - **One bundled commit** when work is interlocked (e.g., backend handler + frontend caller for the same feature)
   - **Multiple commits** when scopes are truly independent and the phase plan permits
6. Stage and commit per the chosen boundary. Use the `{COMMIT_CONVENTION}` style with the topology scope:
   ```
   feat(<category>): <phase title> — <short summary>

   Dispatched phase. Agents: <roles>.
   Files: <high-level summary, not a full list>.

   Sprint: <sprint-id>
   Dispatch: <dispatch_id>

   Co-Authored-By: Claude <noreply@anthropic.com>
   ```
7. Write a synthesis section to STATUS.md `## Notes` with: commits created, verify gate results, handoffs reviewed, any items deferred to follow-up
8. Update `categories/<category-slug>/implementation/CLAUDE.md` phases table marking this phase Complete
9. Update `VERIFICATION-TABLE.md` cells affected by this phase to `⏳ (impl complete, verify pending)` — never `✓` (only `topology-verify` promotes to `✓`)
10. Append to `categories/<category-slug>/APP-DOC-IMPACT.md` if any user-facing changes landed

---

## Execution — Wave 2 (Workflow Mode, Worktree-Isolated)

Use when the Workflow tool is available. The deterministic script owns the fan-out; agents inside it do judgment work and return schema-validated structured data. Worktree isolation demotes the disjointness pre-check from a hard blocker to advisory — each agent commits to its own branch off `origin/main`, and the orchestrator lands branches via PR.

### Step 9b: Author and invoke the Workflow

Author the script and call the `Workflow` tool (this invocation is the user opt-in). Each specialist agent runs with `isolation: 'worktree'` and its declared `agentType`.

```js
export const meta = {
  name: 'topology-dispatch',
  description: 'Multi-role topology phase: each specialist agent in its own worktree, then synthesize',
  phases: [{ title: 'Build', detail: 'one specialist agent per role, isolated worktrees' }],
}

// Schema shared with topology-sprint and topology-autopilot — copy verbatim, no imports
const PHASE_RESULT = {
  type: 'object',
  required: ['phase', 'status'],
  properties: {
    phase:        { type: 'integer' },
    status:       { enum: ['complete', 'failed', 'needs-hitl'] },
    filesChanged: { type: 'array', items: { type: 'string' } },
    testsRun:     { type: 'string' },
    testResult:   { enum: ['pass', 'fail', 'n/a'] },
    commitSha:    { type: 'string' },
    docImpact:    { type: 'string' },
    hitl: {
      type: 'object',
      properties: {
        reason:  { type: 'string' },
        details: { type: 'string' },
        remediationOptions: { type: 'array', items: { type: 'string' } },
      },
    },
  },
}

// args supplied by the orchestrator: project, category, phase, briefPath,
// roster: [{ role, agentType, branch, scope, subtask, exitCriteria }]
const { project, category, phase, briefPath, roster } = args

phase('Build')
const results = await parallel(roster.map(r => () =>
  agent(
    `You are the ${r.role} specialist on a topology-dispatch phase, working in an ISOLATED git ` +
    `worktree on branch ${r.branch} (already created off fresh origin/main).\n\n` +
    `Read first:\n` +
    `1. ${briefPath} — your task spec\n` +
    `2. The category FUTURE-STATE.md — the target contract\n\n` +
    `Your scope (write ONLY here): ${r.scope}\n` +
    `Your subtask: ${r.subtask}\n` +
    `Exit criteria: ${r.exitCriteria}\n\n` +
    `Implement, run the targeted tests for your scope, and COMMIT to your worktree branch ` +
    `(${'{COMMIT_CONVENTION}'} style, never --no-verify, never to main).\n\n` +
    `If your task spec is ambiguous or you must touch a security-sensitive path ` +
    `(auth / secrets / billing), STOP — return status 'needs-hitl' with hitl.reason + details. ` +
    `Do not improvise architectural decisions.\n\n` +
    `Return a PHASE_RESULT: filesChanged, testsRun + testResult, your commitSha, ` +
    `and a one-line docImpact (or "none").`,
    {
      label:     `${r.role}:p${phase}`,
      phase:     'Build',
      schema:    PHASE_RESULT,
      agentType: r.agentType,
      isolation: 'worktree',
    }
  )
))

return results.filter(Boolean)
```

Pass `args: { project, category, phase, briefPath, roster }`. Capture the returned `runId`.

> **Resume:** When a HITL is resolved later, re-invoke with `resumeFromRunId: <runId>` and the same script. Already-completed agent calls return cached; only the unblocked path and everything after re-run. Do NOT use `Date.now()` / `Math.random()` / `new Date()` inside Workflow script bodies — they break deterministic resume.

Report to the user:
```
## topology-dispatch — Workflow Running (Wave 2)

**Project:** <project>  **Category:** <slug>  **Phase:** <N>
**Workflow runId:** <runId>

Agents running in isolated worktrees:
- <role-1>  — branch: <branch>  — <one-line subtask>
- <role-2>  — branch: <branch>  — <one-line subtask>

Waiting for Workflow to return results.
```

### Step 10b: Synthesize (Wave 2 — the orchestrator is the only integrator)

When the Workflow returns `results: PHASE_RESULT[]`:

1. **Triage HITL:** any `status: 'needs-hitl'` → do NOT land any branch. Write a `CHECKPOINT.md`:
   - `dispatch_id`, `project`, `category`, `phase`
   - `paused_at`, `current_state` (which agents completed, which returned needs-hitl)
   - `hitl_reason` from the agent's HITL object
   - `hitl_details` and `remediationOptions`
   - `workflow_run_id` for resume
   Set STATUS.md `state: hitl-paused` and surface to the user with exact remediation commands.
   The completed agents' worktree branches are preserved — they survive until resume.

2. **All complete:** land each worktree branch via PR in the merge order declared in the BRIEF's "Merge-order notes". Run `/topology-merge <project> <category>` per branch (or sequence them if Step 4 flagged overlap). Never `git merge` into local `main` directly.

3. After all branches land, run the verify gates from a synced `main` (lint on touched packages, type check, the phase plan's targeted tests).

4. Update `categories/<category-slug>/implementation/CLAUDE.md` phases table → this phase Complete.

5. Update `VERIFICATION-TABLE.md` affected cells → `⏳ (impl complete, verify pending)` — never `✓`.

6. Append each agent's `docImpact` line to `categories/<category-slug>/APP-DOC-IMPACT.md` if non-empty.

7. Write the synthesis to STATUS.md `## Notes` (branches landed, verify gate results, HITL triaged, runId for audit trail).

---

## Step 11: Report Completion

```
## topology-dispatch Complete

**Project:** <project>  **Category:** <slug>  **Phase:** <N>
**Execution mode:** Wave 1 (shared workspace) | Wave 2 (worktree-isolated)
**Workflow runId:** <runId>  (Wave 2 only)

### Agents
- <role-1>: complete — <files> files changed, tests <pass/fail>
  (Wave 2: branch <branch> landed via PR #<n>)
- <role-2>: complete — <files> files changed, tests <pass/fail>
  (Wave 2: branch <branch> landed via PR #<n>)

### Verify gates
- Lint: <result>
- Type check: <result>
- Targeted tests: <N> passed, <N> failed

### Commits / PRs
- <SHA or PR #> <message>

### Handoffs
- <count> non-blocking handoffs (see WORKSPACE.md "Cross-agent notes")
- 0 blocking handoffs

### Verification Table
- Cells updated: <list> → ⏳ (impl complete, verify pending)

### Next step
Run: /topology-verify <project-name> <category-slug>
  (or: /topology-implement <project-name> <category-slug> for the next phase)
```

### Step 12: HITL Escalation

When the dispatch pauses (blocking handoff, scope violation, or `needs-hitl` return):

1. Set STATUS.md `state: hitl-paused`
2. Write `<dispatch-dir>/CHECKPOINT.md`:
   - `dispatch_id`, `project`, `category`, `phase`
   - `paused_at`, `current_state` (which agents finished, which are blocked)
   - `hitl_reason` enum: `dispatch-scope-violation` | `blocking-handoff` | `verify-gate-failure` | `commit-boundary-ambiguous` | `needs-hitl` (agent-returned)
   - `hitl_details` with the specific handoff body, scope-violation file list, or agent HITL object
   - `remediation_options` with concrete commands the user can run
   - `workflow_run_id` (Wave 2 only — for `--resume <runId>`)
3. Surface the checkpoint to the user with exact remediation commands

To resume after HITL:
```
/topology-dispatch <project> <category> --phase <N> --resume [<runId>]
```

The resume path re-reads STATUS.md and CHECKPOINT.md. Wave 2: re-invokes the Workflow with `resumeFromRunId` — completed agents return cached. Wave 1: re-spawns agents whose process died or proceeds to synthesis if all complete.

---

## Important Notes

- **Wave 2 is the preferred mode.** Worktree isolation (Workflow pattern 2) makes overlapping scopes a merge-order decision rather than an abort. This is the fix for the index-race that scrambled commit attribution under shared worktrees — the disjointness pre-check demotes from blocker to advisory.
- **The orchestrator is the only integrator.** In Wave 1, agents stage but never commit. In Wave 2, agents commit to their own worktree branch only — landing to `main` happens via `/topology-merge` → PR, in one place where the full picture is visible.
- **HITL is returned as data, not asked inside the Workflow.** An ambiguous spec or a security-sensitive touch causes the agent to return `needs-hitl`; the main loop adjudicates. Worktree branches survive for `--resume`.
- **Single-role phases must use `topology-implement`.** This command aborts in Step 3 if the inferred roster has only one role. Dispatch is for multi-role parallel work; single-agent phases should stay simple.
- **`--dry-run` is cheap and recommended for first uses.** Review BRIEF.md before letting agents loose. The BRIEF is the contract — if it's wrong, isolated agents will faithfully do the wrong thing in parallel.
- **Workspace artifacts live in the sprint dir.** Dispatch artifacts are committed alongside category docs at sprint verify-green time. They are part of the durable record of how the work was done.
- **One dispatch per (category, phase) at a time.** `--resume` is safe; running a fresh dispatch over an existing one requires manual deletion (loses prior brief and findings).
- **Worktree isolation has overhead** (~200–500ms + disk per agent). Worth it for genuine multi-role phases; never use dispatch for a single-file change.

---

## Placeholders in This File

| Placeholder | Replace With |
|-------------|-------------|
| `<project-name>` | Project slug |
| `<category-slug>` | Category identifier |
| `<sprint-id>` | Sprint identifier from active sprint dir |
| `<N>` | Phase number from PHASE-PLAN.md |
| `<dispatch-dir>` | `{PROJECTS_ACTIVE_DIR}/<project>/sprints/<sprint-id>/dispatches/<category-slug>-phase<N>/` |

$ARGUMENTS
