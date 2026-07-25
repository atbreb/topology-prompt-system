# Autonomous Topology Commands

**Status:** Deployed to `{COMMANDS_DIR}/` (project-local, alongside existing `topology-*` commands)

## Deployed locations

| Artifact | Final path |
|---|---|
| `topology-sprint-plan` | `{COMMANDS_DIR}/topology-sprint-plan.md` |
| `topology-sprint` | `{COMMANDS_DIR}/topology-sprint.md` |
| `topology-autopilot` | `{COMMANDS_DIR}/topology-autopilot.md` |
| `topology-resume` | `{COMMANDS_DIR}/topology-resume.md` |
| `topology-decide` | `{COMMANDS_DIR}/topology-decide.md` |
| Autonomy protocol spec | `TOPOLOGY-AUTONOMY-PROTOCOL.md` |

## The command set

| Command | Scope | Role |
|---|---|---|
| `topology-sprint-plan` | 1 group | Ceremony. Writes the sprint plan (categories, execution mode, integration strategy, expected HITL gates) BEFORE execution. Output reviewable before sprint starts. |
| `topology-sprint` | 1 group | Executes the plan. Runs `current-state → gap → phase-plan → future-state → implement → verify` per category, with the group's integration checkpoint at the end. |
| `topology-autopilot` | N groups / N projects | Chains sprints across groups and (optionally) projects. Writes an overarching integration strategy. Pivots cross-project on inference when `--cross-project` is enabled. |
| `topology-resume` | 1 paused run | Picks up a sprint or autopilot from its last checkpoint after HITL decisions are recorded. |
| `topology-decide` | 1 decision | Human records a HITL decision (approve/reject/defer). Unblocks paused runs. Writes to DECISION-LOG on approve. |
| `topology-eval` | 1 skill/command | Eval-gates a topology command or skill change: runs it k times against a fixed fixture, grades deterministically (pass@k / pass^k), and writes a result log. Blocks a skill merge if the bar is not met. |
| `topology-self-audit` | the harness itself | Runs the project harness self-audit script and surfaces a maturity scorecard across seven dimensions (lockdown-coverage, write-time-guards, eval-coverage, memory-health, decision-ledger, cost-knobs, doc-tier-presence). Script is source of truth; no LLM re-grading. |

## Core design principles

1. **Strict autonomy by default.** Every proposed DECISION-LOG entry pauses for HITL unless explicitly overridden. Contract and seam amendments ALWAYS pause regardless of autonomy level.
1a. **Workflow-orchestration substrate.** Every command carries a deterministic Workflow-script path alongside the prose-mode path. Workflow scripts use typed structured output (PHASE_RESULT, CATEGORY_RESULT, HITL, FINDING, VERDICT, SEAM_CHECK, DISCOVERY_ITEM schemas). Paused runs resume from a cached runId — only unblocked stages re-run. Prose-mode is fully preserved for environments without the Workflow tool.
2. **Auto-commit on verify green.** During a category's execution: implementation commits per phase plan unit; docs commit (CURRENT-STATE + GAP + PHASE-PLAN + FUTURE-STATE + VERIFICATION-REPORT) bundled into one `chore(topology): <category> verified` commit at the end.
3. **Integration strategy is inferred and written upfront.** Multi-category commands (`topology-sprint`, `topology-autopilot`) produce an integration plan as part of their sprint plan doc. Triggers are declared, not ad-hoc.
4. **Drift detection is automatic.** If `topology-current-state` detects significant drift from prior analysis, it auto-runs `gap → phase-plan → future-state` afresh before implementation — no HITL needed for drift-triggered re-analysis.
5. **Cross-project pivoting is optional.** When `--cross-project` is on, autopilot infers when to switch focus between projects (e.g., current project blocked on external dep → pivot to other project's ready categories). Off by default.
6. **E2E and promote are never autonomous.** Both are explicit human-initiated commands. Autopilot stops at "all categories verified + integration complete" and waits.
7. **Orchestrators call existing commands.** No new per-phase logic. The new commands are pure orchestration over the existing `topology-current-state`, `topology-gap`, etc.
{{#if MULTI_AGENT}}
8. **{DELEGATE_AGENT_NAME} pair mode propagates.** `{DELEGATE_FLAG}` on `topology-autopilot` cascades to `topology-sprint` which cascades to per-phase commands. A single autopilot-level ACK covers the whole run.
{{/if}}

## How new commands interact with existing commands

```
topology-autopilot <project> [--through-group N] [--cross-project]
  └─ topology-sprint-plan <project> --group <N> [one per group]
  └─ topology-sprint <project> --group <N>
       └─ for each category in group (parallel if group permits):
            └─ topology-current-state [existing — enhanced per autonomy protocol]
            └─ topology-gap          [existing]
            └─ topology-phase-plan   [existing]
            └─ topology-future-state [existing]
            └─ topology-implement    [existing — retry budget = 2]
            └─ topology-verify       [existing — gates advance to next category]
       └─ topology-integrate         [existing — end of group]
  └─ checkpoint between groups
  └─ on HITL: topology-resume (after topology-decide unblocks)
```

## Required updates to existing topology commands

See `TOPOLOGY-AUTONOMY-PROTOCOL.md` for the protocol tweaks existing commands need. The tweaks are small (a machine-readable footer + drift detection hook + retry policy) and backward-compatible. Orchestrators gracefully degrade for commands that haven't adopted the protocol yet.

## Invocation examples

```bash
# Plan a sprint for {EXAMPLE_PROJECT_SLUG}'s Group 1
/topology-sprint-plan {EXAMPLE_PROJECT_SLUG} --group 1

# Execute the plan
/topology-sprint {EXAMPLE_PROJECT_SLUG} --plan sprint-20260421-0930-{EXAMPLE_PROJECT_SLUG}-group1

# All-in-one: plan + execute
/topology-sprint {EXAMPLE_PROJECT_SLUG} --group 1

{{#if MULTI_AGENT}}
# Execute with {DELEGATE_AGENT_NAME} pair mode propagating
/topology-sprint {EXAMPLE_PROJECT_SLUG} --group 1 {DELEGATE_FLAG}

{{/if}}
# Autopilot: run all groups to completion
/topology-autopilot {EXAMPLE_PROJECT_SLUG}

# Autopilot with cross-project pivoting
/topology-autopilot {EXAMPLE_PROJECT_SLUG} --cross-project

# Resume after HITL pause
/topology-decide {EXAMPLE_PROJECT_SLUG} {EXAMPLE_DL_ID} --approve --rationale "Confirmed per discovery doc"
/topology-resume {EXAMPLE_PROJECT_SLUG}
```

## Not in this set (future consideration)

- **`topology-bisect`** — for locating which phase introduced a regression after a sprint
- **`topology-replay`** — re-run a completed sprint against a different branch for A/B comparison
- **`topology-benchmark`** — measure autonomy quality (HITL pause rate, re-work rate, verification pass rate on first attempt)
- **`topology-fleet`** — run autopilot across all active projects at once (dangerous, defer)
