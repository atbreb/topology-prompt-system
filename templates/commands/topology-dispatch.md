# topology-dispatch

Fan a single phase of a single category out to multiple specialist subagents working in parallel against a shared workspace. Use when a phase's tasks split cleanly across roles (e.g., a backend role and a frontend role) and the file sets are disjoint. Sister command to `topology-implement` — `topology-implement` runs single-agent phases via `project-next-phase`; `topology-dispatch` runs multi-agent phases via the dispatch protocol.

{{#unless USE_SUBAGENTS}}
> **Note:** This project is configured without specialist subagents (`use_subagents: false`). Every phase is single-role by definition, so dispatch never applies — run `/topology-implement <project> <category>` for all phases instead.
{{/unless}}

**Wave 1: manual invocation only.** Main thread (or user) decides which phase is parallelizable and invokes this command explicitly. Wave 2 will add auto-trigger from `topology-implement` when `topology-phase-plan` declares parallelism.

## Usage

```
/topology-dispatch <project-name> <category-slug>
/topology-dispatch <project-name> <category-slug> --phase <N>
/topology-dispatch <project-name> <category-slug> --phase <N> --agents {{#each SUBAGENT_TYPES as t}}{t},{{/each}}
/topology-dispatch <project-name> <category-slug> --phase <N> --dry-run
/topology-dispatch <project-name> <category-slug> --phase <N> --resume
```

### Arguments

- `<project-name>` — slug under `{PROJECTS_ACTIVE_DIR}/`
- `<category-slug>` — category under that project's `categories/`

### Flags

- `--phase <N>` — explicit phase number. Default: the next In-Progress / pending phase from PHASE-PLAN.md
- `--agents <comma-list>` — explicit agent roster. Default: inferred from the phase plan's task scope (file paths → roles)
- `--dry-run` — write BRIEF.md and STATUS.md, print the dispatch plan, do NOT spawn subagents. Use for review before commit.
- `--resume` — re-enter an existing dispatch directory, read STATUS.md, re-spawn any agents whose state is `dispatched` but whose background process died, or proceed to synthesis if all complete

---

## Prerequisites

- [ ] Sprint exists: `{PROJECTS_ACTIVE_DIR}/<project>/sprints/<sprint-id>/SPRINT-PLAN.md` (latest active sprint)
- [ ] Category in flight: `categories/<category-slug>/PHASE-PLAN.md` exists
- [ ] FUTURE-STATE exists: `categories/<category-slug>/FUTURE-STATE.md`
- [ ] Implementation scaffolded: `categories/<category-slug>/implementation/CLAUDE.md`
- [ ] Git working tree clean (uncommitted changes block parallel dispatch — agents would fight over the diff)

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

Read that phase's full entry from `categories/<category-slug>/PHASE-PLAN.md` — the task list, exit criteria, and file scope.

### Step 3: Determine the agent roster

If `--agents <list>` was passed, use it. Validate every name resolves to a project agent under `.claude/agents/` (must be one of the project's subagent types: {{#each SUBAGENT_TYPES as t}}`{t}` {{/each}}).

Otherwise, infer from the phase plan's file scope by mapping each path region to one of the project's subagent types. Use the same path → role inference rules as `topology-phase-plan` Rule 6:

| Path region | Role |
|---|---|
| Backend service code, schema/API definitions, DB migrations | backend role |
| Frontend app code, shared UI packages | frontend role |
| Infra/gateway config, Dockerfiles, CI workflows, deploy config | systems role |
| Pure design-spec / token / accessibility | design role |
| Auth, secrets, billing, SQL injection–adjacent | security reviewer — invite as a non-blocking reviewer (its findings land in HANDOFFS/, not a hard gate) |

Any path region with no matching specialist role falls back to the project's general-purpose subagent type.

If only one role surfaces, abort with:
> Phase scope is single-role (<role>). Use `/topology-implement <project> <category>` instead — dispatch is for multi-role phases.

If three or more surface, list them and ask the user to confirm or trim before scaffolding (high parallelism amplifies the cost of a bad disjointness check).

### Step 4: Disjointness pre-check

Before scaffolding the workspace, run a quick preview that confirms each agent's intended file scope does not overlap any other agent's scope.

For each pair of agents (i, j):
- Compute the union of their declared scope paths
- Run `git ls-files <path>` for each path
- Confirm no file appears in both result sets

If overlaps are found:
- If trivial (e.g., a single shared config file), document it in the BRIEF as requiring LOCKS/ coordination
- If significant (e.g., both touch the same service directory), abort with:
  > Scope overlap detected: <files>. Either re-run with `--agents` overriding the roster, or rethink the phase plan to make scopes disjoint, or use `/topology-implement` for a single-agent phase.

Do NOT proceed to scaffolding until disjointness is confirmed.

### Step 5: Scaffold the workspace

Create:
```
{PROJECTS_ACTIVE_DIR}/<project>/sprints/<sprint-id>/dispatches/<category-slug>-phase<N>/
├── BRIEF.md
├── WORKSPACE.md
├── STATUS.md
├── LOCKS/        (empty)
└── HANDOFFS/     (empty)
```

If the directory already exists and `--resume` is NOT set, abort:
> Dispatch already exists at <path>. Re-run with `--resume` to continue, or delete the directory if you intend to start fresh (note: this loses the prior brief and findings).

### Step 6: Write BRIEF.md

Populate per the schema in `.claude/TOPOLOGY-DISPATCH-PROTOCOL.md` § 2.

Required content:
- Frontmatter: dispatch_id, project, category, phase, phase_title, sprint_id, created_at, created_by, autonomy
- **Phase objective** lifted (paraphrased, one paragraph) from PHASE-PLAN.md
- **Anchor docs** with relative paths from the project root + relevant section anchors from FUTURE-STATE
- **Disjointness pre-check** statement confirming the Step 4 check passed
- **Agents** section, one subsection per agent in the roster, each containing:
  - Scope (literal paths, no wildcards that match unintended siblings)
  - Read-only context (paths to read but not write)
  - Subtask (concrete deliverable, references PHASE-PLAN task IDs and FUTURE-STATE sections)
  - Exit criteria (observable outcomes — files written, tests passing)
- **Cross-agent contracts** (only if shared interfaces exist)
- **Out of scope** (be explicit — anything outside per-agent scope, anything in later phases, anything in other categories)
- **Reporting** (standard text — append to WORKSPACE.md, return ≤200-word summary)
- **Forbidden** (standard text — no out-of-scope writes, no BRIEF edits, no main commits, no `--no-verify`)

### Step 7: Write initial WORKSPACE.md and STATUS.md

WORKSPACE.md — pre-create one section per agent so writes target a known anchor:

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

STATUS.md — initial state per protocol § 6, with `state: scaffolded`.

### Step 8: Dry-run gate

If `--dry-run` is set:
- Print the absolute path to BRIEF.md and STATUS.md
- Print a one-screen summary of the dispatch plan (agents, scopes, exit criteria)
- Stop. Do NOT spawn subagents.
- Tell the user how to proceed:
  > Review the brief at `<path>/BRIEF.md`. To execute: re-run without `--dry-run`. To revise: edit BRIEF.md and re-run with `--resume`.

### Step 9: Spawn subagents in background

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
1. Append a "### Summary" subsection to your WORKSPACE.md section listing files changed, tests run + result, any handbacks raised, and recommended commit boundary
2. Return a concise summary (≤200 words) of what you delivered. The orchestrator reads this synchronously.

If you hit a blocking issue, write a HANDOFFS/<from>-to-orchestrator-<slug>.md with `blocking: true` and return a brief explanation immediately — do not retry indefinitely.
```

Capture each background agent's ID. Update STATUS.md:
- Set `state: dispatched`
- Add a row per agent to the Agents table with the background ID and `state: running`

Report to the user:
```
## topology-dispatch — Spawned

**Project:** <project>  **Category:** <slug>  **Phase:** <N>
**Workspace:** <absolute path>

Agents running in background:
- backend-coder  (bg-<id>)  — <one-line subtask>
- frontend-coder (bg-<id>)  — <one-line subtask>

Watching for completion. Will synthesize when all agents return.
```

### Step 10: Wait, monitor, synthesize

This step runs in the orchestrator's main loop after spawning. The orchestrator does NOT poll — it relies on the background-agent completion notifications surfaced by the harness.

When EACH agent reports back (their subagent task ends):
1. Update STATUS.md: that agent's row → `state: complete`, fill `Completed` and `Files Changed` (count from their summary)
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
8. Update `categories/<category-slug>/implementation/CLAUDE.md` phases table marking this phase Complete (same way `project-next-phase` would)
9. Update `VERIFICATION-TABLE.md` cells affected by this phase to `⏳ (impl complete, verify pending)` — never `✓` (only `topology-verify` promotes to `✓`)
10. Append to `categories/<category-slug>/APP-DOC-IMPACT.md` if any user-facing changes landed (per `topology-implement.md` Step 4b)

### Step 11: Report completion

```
## topology-dispatch Complete

**Project:** <project>  **Category:** <slug>  **Phase:** <N>
**Workspace:** <path>
**Duration:** <HH:MM>

### Agents
- backend-coder: complete (<files> files changed)
- frontend-coder: complete (<files> files changed)

### Verify gates
- Lint: pass
- Type check: pass
- Targeted tests: <N> passed, <N> failed

### Commits
- <SHA> <message>
- <SHA> <message>

### Handoffs
- <count> non-blocking handoffs surfaced (see WORKSPACE.md "Cross-agent notes")
- 0 blocking handoffs

### Verification Table
- Cells updated: <list>  → ⏳ (impl complete, verify pending)

### Next step
Run: /topology-verify <project-name> <category-slug>
  (or: /topology-implement <project-name> <category-slug> for the next phase)
```

### Step 12: HITL escalation (if any blocking handoff or scope violation)

When the dispatch pauses (HITL):
1. Set STATUS.md `state: hitl-paused`
2. Write `<dispatch-dir>/CHECKPOINT.md` mirroring the format from `topology-sprint.md` Step 5, with:
   - `dispatch_id`, `project`, `category`, `phase`
   - `paused_at`, `current_state` (which agents finished, which are blocked)
   - `hitl_reason` enum: `dispatch-scope-violation` | `blocking-handoff` | `verify-gate-failure` | `commit-boundary-ambiguous`
   - `hitl_details` with the specific handoff body or scope-violation file list
   - `remediation_options` with concrete commands the user can run
3. Surface the checkpoint to the user with the exact remediation commands

To resume after HITL:
```
/topology-dispatch <project> <category> --phase <N> --resume
```

The resume path re-reads STATUS.md, processes any newly-resolved handoffs, and either re-spawns failed agents or proceeds to synthesis.

---

## Important Notes

- **Disjointness is the load-bearing assumption.** If two agents touch the same file, the protocol does not save you — Step 4 must catch this. If overlaps surface during execution, that is a HITL event, not a "work it out" event.
- **The orchestrator is the only committer.** Agents may stage changes locally but never commit to main. This keeps commit boundary decisions in one place where the full diff is visible.
- **Workspace lives in the sprint dir.** Dispatch artifacts get committed alongside category docs at sprint verify-green time. They are part of the durable record of how the work was done.
- **One dispatch per (category, phase) at a time.** Re-running with `--resume` is safe; running a fresh dispatch over an existing one requires manual deletion (and loses prior findings).
- **No worktree per agent in Wave 1.** All agents share the same working tree. The protocol relies on declared scopes + disjointness pre-check + post-hoc `git status` verification. If we see scope drift in practice, Wave 2 may add per-agent worktrees.
- **Single-role phases must use `topology-implement`.** This command aborts in Step 3 if the inferred roster has only one role. Dispatch is for multi-role parallel work; single-agent phases should stay simple.
- **`--dry-run` is cheap and recommended for first uses.** Review BRIEF.md before letting agents loose. The brief is the contract — if it's wrong, agents will faithfully do the wrong thing in parallel.
- **Wave 2 will add the auto-trigger.** When `topology-phase-plan` learns to declare `parallel_dispatch:` in its output, `topology-implement` Step 3b will auto-call this command. Until then, it's manual.

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
