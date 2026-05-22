# topology Dispatch Protocol

**Status:** Spec for `topology-dispatch` (Wave 1 — manual invocation) and the workspace contract every dispatched specialist agent must honor.
**Purpose:** Standardize fine-grained, multi-agent parallel work *within a single category phase*. Sister to `TOPOLOGY-AUTONOMY-PROTOCOL.md` (which governs orchestration *across* phases / categories / sprints).

---

{{#if USE_SUBAGENTS}}
## What this protocol governs

When a single phase of a single category has work that splits cleanly across roles (e.g., {BACKEND_STACK} backend + {FRONTEND_STACK} frontend, or two independent backend workstreams), `topology-dispatch` fans the work out to specialist subagents who share a workspace directory. This protocol defines:

1. **The workspace shape** — directories and files every dispatch creates
2. **The BRIEF.md schema** — what the orchestrator writes for the team to read
3. **The WORKSPACE.md append protocol** — how agents report findings without stepping on each other
4. **LOCKS/ semantics** — cooperative locks for the rare overlapping file
5. **HANDOFFS/ format** — when one agent's output feeds another (uncommon in pure parallel mode)
6. **STATUS.md fields** — orchestrator-maintained progress index
7. **Scope discipline** — what each agent is allowed to touch
8. **Synthesis + handback** — how the orchestrator reads back and decides next action

This protocol does NOT replace `topology-sprint --parallel` (worktree-per-category, coarse-grained). It nests *inside* one category's one phase.

---

## 1. Workspace shape

Every dispatch creates one directory under the active sprint:

```
{PROJECTS_ACTIVE_DIR}/<project>/sprints/<sprint-id>/dispatches/<category-slug>-phase<N>/
├── BRIEF.md          # main-thread-authored task spec, READ-ONLY for agents
├── WORKSPACE.md      # shared scratchpad — agents APPEND under their own section
├── STATUS.md         # main-thread-maintained: who's running, what's done
├── LOCKS/            # touchfiles: presence = "I'm editing this path"
└── HANDOFFS/         # cross-agent handoff notes (only when needed)
```

**Naming:** `<category-slug>-phase<N>` matches the phase number from the category's PHASE-PLAN.md. If a phase is re-dispatched (e.g., after HITL), append a suffix: `-phase<N>-r2`.

**Lifetime:** the dispatch directory is committed alongside the rest of the category's docs at the end of the sprint (per `topology-sprint` Step 4 verify-green commit). It becomes part of the durable record. Do not delete it.

**Resumability:** if the orchestrator is interrupted, re-running `topology-dispatch` against the same `<sprint-id> <category> <phase>` reads the existing STATUS.md and resumes — never overwrites BRIEF.md.

---

## 2. BRIEF.md schema

The orchestrator writes BRIEF.md once, at dispatch creation. It is the single source of truth for what each agent must do. Agents read it, never write to it.

```markdown
---
dispatch_id: <category-slug>-phase<N>
project: <project-name>
category: <category-slug>
phase: <N>
phase_title: <from PHASE-PLAN.md>
sprint_id: <sprint-id>
created_at: <ISO datetime>
created_by: main-orchestrator
autonomy: strict | open
---

# Dispatch Brief — <category> Phase <N>

## Phase objective
<One-paragraph summary lifted from PHASE-PLAN.md. The goal of THIS phase, not the category.>

## Anchor docs (read these first)
- FUTURE-STATE: `categories/<slug>/FUTURE-STATE.md` (relevant sections: <list>)
- PHASE-PLAN: `categories/<slug>/PHASE-PLAN.md` (Phase <N> entry)
- TOPOLOGY-CLAUDE: `TOPOLOGY-CLAUDE.md` (category context)
- Any DECISION-LOG entries the phase depends on: <list with IDs>

## Disjointness pre-check
**File sets confirmed disjoint by orchestrator before dispatch.** A grep / git diff-stat preview of intended changes shows no overlap between agent scopes. If your work would touch a file outside your declared scope, STOP and write to HANDOFFS/ — do not edit it.

## Agents

### Agent 1 — <role> (e.g., a backend specialist)
**Scope** (paths you may read AND write):
- `{APPS_DIR}/<backend-module>/services/<service>/`
- `{APPS_DIR}/<backend-module>/workers/<worker>/`
- `<api-contract-dir>/<domain>/<subdomain>/v1/`

**Read-only context** (paths you may read but not write):
- `{APPS_DIR}/<frontend-module>/...` (the frontend will reference your {API_STYLE} handlers — useful for understanding consumer expectations)

**Subtask:**
<Concrete description of what this agent delivers in this phase. Reference FUTURE-STATE sections by anchor. Reference PHASE-PLAN tasks by ID. Be specific about exit criteria.>

**Exit criteria:**
- [ ] <observable outcome 1>
- [ ] <observable outcome 2>
- [ ] Tests added / updated and passing
- [ ] Section appended to WORKSPACE.md under `## Agent 1 — <role>`

---

### Agent 2 — <role> (e.g., a frontend specialist)
<same shape>

---

## Cross-agent contracts
List any interface either agent must honor for the other:
- Backend exposes `GetX(ctx, req) → Resp` per `<api-contract-dir>/<...>:<line>` — frontend must call with `<field>` populated
- Frontend renders `<component>` from `<shared-ui-package>/...` — backend response shape must match the type's required fields

**If a contract is ambiguous in this brief, write to HANDOFFS/ instead of guessing.**

## Out of scope
Be explicit about what is NOT this dispatch. Anything outside the per-agent scope lists. Anything in later phases of this category. Anything in other categories.

## Reporting
- Append findings to WORKSPACE.md under your `## Agent N — <role>` section as you go
- On completion, write a final `### Summary` subsection with: files changed, tests run, any handbacks
- Return a concise summary (≤200 words) when your subagent task ends — the orchestrator reads this synchronously

## Forbidden
- Touching files outside your declared scope (use HANDOFFS/ instead)
- Editing BRIEF.md
- Committing to main (orchestrator commits the bundle)
- Bypassing pre-commit hooks (no `--no-verify`)
- Skipping locks for overlapping paths (see LOCKS/)
```

**Schema rules:**
- Every section above is required except `Cross-agent contracts` (omit if no shared interface)
- Scope paths are LITERAL — no globs that match unintended siblings. Prefer enumeration to wildcards
- Exit criteria must be observable from outside the agent (a file written, a test passing) — not "I think it's good"

---

## 3. WORKSPACE.md append protocol

WORKSPACE.md is the shared scratchpad. Agents append; they do not overwrite each other. The orchestrator pre-creates section headers so each agent has a known target.

**Initial state** (orchestrator writes at dispatch creation):

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

**Append rules:**
- Each agent edits ONLY its own `## Agent N` section and may append to `## Cross-agent notes` (additive only)
- Use timestamped sub-entries: `### <ISO datetime> — <short title>`
- Final entry is always `### Summary` with: files changed (paths), tests run + result, any handbacks raised, recommended commit boundary (one commit or N commits, with messages)
- **Never delete prior entries.** If an earlier finding turned out to be wrong, append a `### <datetime> — Correction` entry explaining the revision

**Why append-only:** multiple agents writing concurrently to the same file race. The discipline of "only your section, only append" makes it safe with no real locking.

---

## 4. LOCKS/ semantics

LOCKS/ exists for the rare case where two agents legitimately need to touch the same file (e.g., both updating a shared config). It is cooperative — the protocol relies on agents respecting it, not the filesystem enforcing it.

**Protocol:**

1. Before editing any path that another agent's scope might touch, check `LOCKS/` for a file matching the URL-encoded path
2. If absent, create it: `LOCKS/<urlencoded-path>.lock` with one line: `held_by: <agent-role>\nacquired_at: <ISO>`
3. Edit the file
4. Delete the lock when done

**If a lock exists when you need it:**
- Wait up to 60 seconds, re-check
- If still held, write to HANDOFFS/ describing what you needed and why, then skip that edit
- The orchestrator resolves the conflict at synthesis time

**Realistic expectation:** in well-designed dispatches, LOCKS/ stays empty. If you find yourself reaching for locks, the disjointness pre-check in BRIEF.md was wrong — flag it.

---

## 5. HANDOFFS/ format

HANDOFFS/ is for moments when one agent's work uncovers something the other agent (or the orchestrator) needs to know synchronously. Each handoff is its own file.

**Filename:** `<from-role>-to-<to-role-or-orchestrator>-<short-slug>.md`

Examples:
- `backend-to-frontend-response-shape-changed.md`
- `frontend-to-orchestrator-component-missing-from-sdk.md`
- `backend-to-orchestrator-scope-violation-needed.md`

**Body:**

```markdown
---
from: <role>
to: <role | orchestrator>
created_at: <ISO>
blocking: true | false
---

## What I found
<concise description>

## What I need
<specific ask — a decision, an edit, an unblock>

## What I did instead (if blocking=false)
<workaround applied — orchestrator reviews at synthesis>
```

**Orchestrator behavior:**
- Polls HANDOFFS/ during the wait phase
- Any `blocking: true` handoff pauses the dispatch and triggers HITL or re-dispatch
- Non-blocking handoffs are surfaced in the synthesis report

---

## 6. STATUS.md fields

STATUS.md is orchestrator-maintained. Agents READ it for context but never write to it. Updated at: dispatch creation, every agent state change, synthesis.

```markdown
---
dispatch_id: <id>
state: scaffolded | dispatched | partial-complete | complete | hitl-paused | failed
started_at: <ISO>
last_updated: <ISO>
---

# Dispatch Status

## Agents

| Role | Background ID | State | Started | Completed | Files Changed |
|------|---------------|-------|---------|-----------|---------------|
| <role> | bg-abc123 | running | <ISO datetime> | — | — |
| <role> | bg-def456 | complete | <ISO datetime> | <ISO datetime> | 7 |

## Handoffs received
- (none) | <count> non-blocking, <count> blocking

## Locks active
- (none) | <list>

## Notes
<orchestrator's running log of decisions made during the dispatch>
```

**State machine:**
- `scaffolded` — workspace created, BRIEF written, no agents spawned yet
- `dispatched` — all agents spawned and running
- `partial-complete` — at least one agent finished, others still running
- `complete` — all agents reported back, ready for synthesis
- `hitl-paused` — blocking handoff received, orchestrator escalated
- `failed` — at least one agent failed unrecoverably

---

## 7. Scope discipline (what every dispatched agent must honor)

This is the contract every specialist archetype enforces in its "Workspace Mode" section:

1. **Read BRIEF.md first.** If anything is unclear, write to HANDOFFS/ before doing work.
2. **Touch only files in your declared `Scope` paths.** Even if you see a quick fix outside your scope, write to HANDOFFS/ and move on.
3. **Append to WORKSPACE.md as you go.** Don't batch all findings to the end — incremental updates let the orchestrator catch problems early.
4. **Respect LOCKS/.** Cheap, almost never needed, but the discipline matters.
5. **Never edit BRIEF.md.** It is the orchestrator's contract with you. If the brief is wrong, write to HANDOFFS/.
6. **Never commit to main.** The orchestrator commits the bundle after synthesis. You may commit to a worktree branch if the orchestrator created one for the dispatch.
7. **Never bypass pre-commit hooks.** If a hook fails, fix the underlying issue or hand back.
8. **Return a concise summary (≤200 words) when your subagent task ends.** The orchestrator reads this synchronously to decide synthesis. The full detail goes in WORKSPACE.md.

---

## 8. Synthesis + handback

When STATUS.md transitions to `complete`, the orchestrator:

1. **Reads each agent's `## Agent N — <role>` final `### Summary`** from WORKSPACE.md
2. **Aggregates files changed** across agents — confirms no out-of-scope writes happened (`git status` should match the union of agent scope declarations)
3. **Reviews HANDOFFS/** — surfaces any non-blocking handoffs in the orchestrator's report
4. **Runs verify gates** appropriate to the phase (the same gates the single-agent path would run: lint, type check, relevant tests)
5. **Decides commit boundary** per the agents' recommendations:
   - One bundled commit if work is interlocked
   - Multiple commits if scopes are truly independent and the phase plan permits
6. **Updates the category's PHASE-PLAN.md** marking this phase as complete (same way `project-next-phase` would)
7. **Writes a synthesis section** to STATUS.md `## Notes` summarizing what landed
8. **Returns control to the caller** (`topology-implement` in Wave 2; main thread in Wave 1)

**On any failure during synthesis** (out-of-scope writes detected, verify gates failed, blocking handoff): pause the dispatch, write a CHECKPOINT.md in the dispatch directory mirroring the sprint checkpoint format from `topology-sprint.md` Step 5, escalate to HITL.

---

## 9. Wave 1 vs Wave 2

This protocol is shipped in Wave 1 with **manual invocation only**:

- Main thread (or user) decides a phase is parallelizable
- Main thread runs `/topology-dispatch <project> <category> --phase <N>`
- Main thread reviews the synthesis and commits

**Wave 2 (deferred until we've used Wave 1 several times):**
- `topology-phase-plan` learns to emit a `parallel_dispatch:` frontmatter block declaring agent scopes
- `topology-implement` Step 3b checks for that block; if present, calls `/topology-dispatch` instead of `/project-next-phase`
- Phase plan + synthesis become fully autonomous within the topology autonomy protocol

The protocol specified above does not change between waves — only the trigger does.

---

## Open questions (to revisit after first real dispatch)

- Should LOCKS/ be a real flock instead of touchfile? (Probably not — discipline > infrastructure here)
- Do we need a per-dispatch RUNBOOK.md separate from WORKSPACE.md? (Currently no — WORKSPACE.md serves both)
{{#if MULTI_AGENT}}
- How does this interact with `{DELEGATE_FLAG}` pair mode? (Each dispatched specialist can do its own {DELEGATE_AGENT_NAME} split per `{DELEGATE_PROTOCOL_FILE}`. The dispatch BRIEF should pass `{DELEGATE_FLAG}` through if the parent invocation set it.)
{{/if}}
- Worktree per dispatch vs shared worktree? (Wave 1: shared — agents work the same tree. Revisit if scope violations become common.)
{{/if}}
