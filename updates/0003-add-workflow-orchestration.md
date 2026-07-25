---
id: 0003-add-workflow-orchestration
title: Add Workflow-era orchestration substrate to all topology commands
type: semantic
targets: all
min_system_version: "1.2.0"
---

## What changes

Every topology command now carries a **deterministic Workflow-orchestration substrate** — a
second execution path alongside the original prose-mode path that, when the Workflow tool is
available, replaces informal prose loops with typed, schema-driven, resumable orchestration.
Two new commands are also added: `topology-eval` and `topology-self-audit`.

### The orchestration substrate (folded into all commands)

The substrate adds five interlocking patterns without breaking any existing prose-mode behavior:

**1. Deterministic Workflow scripts replace prose loops.**
Steps that previously read "for each category…" or "iterate until dry" now have an explicit
Workflow script block (JavaScript, runnable via the Workflow tool). The script calls `pipeline()`,
`parallel()`, and `agent()` primitives; it is the authoritative execution path when the tool is
available. Prose-mode fallback is preserved alongside it, clearly labeled.

**2. Structured HITL object returned to the main loop.**
A Workflow script never pauses mid-run. When a decision requires human input it returns a typed
object — `{ status: "needs-hitl", reason: <hitl_reason>, runId: "<id>", details: {...} }` — and
exits cleanly. The main-loop command (topology-decide, topology-next, topology-autopilot) reads
the reason, adjudicates, and resumes via `--resume <runId>`.

**3. Shared schema library.**
Typed schemas are embedded inline in each Workflow script (no imports — Workflow scripts are
self-contained). The canonical schemas are:

- `FINDING { id, kind, title, severity, evidence, verdict, proof }` — a single diagnostic finding
- `VERDICT { pass | fail | deferred }` with `proof: { type, command, exitCode, output }` — fact-first result
- `HITL { reason, runId, proposedContent, proposedDecisions }` — structured pause record
- `PHASE_RESULT { categorySlug, phaseId, status, hitl?, findings[] }` — phase executor output
- `CATEGORY_RESULT { slug, status, hitl?, phases[], verificationStatus }` — sprint/autopilot output
- `SEAM_CHECK { type, status, producerResult, consumerResult, crossCheck, regression, severity }` — integration seam
- `DISCOVERY_ITEM { id, source, kind, name, foundVia, confidence, notes }` — discovery enumeration
- `COMPLETENESS { totalFound, byModality, uncertainItems, convergenceRound }` — sweep state
- `GAP { id, kind, title, currentState, requiredState, severity, effort, blockedBy }` — gap analysis entry

**4. Workflow resume via `runId`.**
Every Workflow script emits its `runId` to `CHECKPOINT.md` (human-readable record) and the plan
doc. A paused run is resumed with `--resume <runId>` — completed stages return from cache
instantly; only the unblocked stage re-runs. The call is `resumeFromRunId(runId)`.

**5. Budget-scaled thoroughness and eval-gating.**
Scripts that run variable-count agents (skeptics, finders, sweep rounds) read `budget.total` and
`budget.remaining()` to scale depth to available resource. Changes to skill commands are gated
on `topology-eval` (pass@k / pass^k bar with deterministic graders) before merging.

### Per-command changes (summary)

| Command | What was added |
|---------|---------------|
| `topology-PRINCIPLES` | Full Workflow-era doctrine section (all 5 patterns + shared schema library verbatim) |
| `topology-autopilot` | `--resume <runId>` flag; typed `hitl.reason` adjudication table (10 codes); `CATEGORY_RESULT[]` from sprints; workflow runIds in AUTOPILOT-COMPLETE |
| `topology-current-state` | Step 3A Workflow fan-out via `AREA_SLICE` schema; synthesis rules (worst-status-wins, parallel-impl detection) |
| `topology-decide` | HITL loop diagram (sprint→decide→resume); `hitl_reason` adjudication table; `runId`-based resume |
| `topology-diagnose` | `--health` flag with `--parallel` Workflow fan-out; `FINDING` schema inline; resumable-workflow detection |
| `topology-discovery` | `--sweep` flag for multi-modal sweep; `DISCOVERY_ITEM` + `COMPLETENESS` schemas; `budgetOk()` guard; Enumeration Sweep Appendix in output |
| `topology-dispatch` | Wave 2 execution path (Workflow + worktree-isolated parallel fan-out); `PHASE_RESULT` schema; divergence guard in prerequisites |
| `topology-doc-walk` | Optional read-only coherence sweep with `DOC_FINDING` schema; `topology-future-state` structured assertion list note |
| `topology-e2e` | Workflow extraction fan-out (per-category); `E2E_TESTCASE` schema; `--resume` flag; split Step 2 (extract) from Step 3 (assemble) |
| `topology-future-state` | Verification Assertions table (machine-consumable, proof column); fact-first discipline; parity cross-check in Step 4 |
| `topology-gap` | Workflow fan-out path with `GAP` + `GAP_SLICE` schemas; `--resume <runId>`; `belongsToNeighbor` routing note |
| `topology-global-init` | Step 1.5 optional per-project extraction fan-out (agentType: Explore); `PROJECT_EXTRACT` schema |
| `topology-implement` | `PHASE_RESULT` schema (Step 4); material-drift HITL surfacing; independent reviewer pass (Step 4c) before verify |
| `topology-init` | Step 8.5 Option B (Workflow parallel fan-out); `CATEGORY_CLAUDE` schema; worktree branch column in Parallel Groups table |
| `topology-integrate` | `SEAM_CHECK` schema; per-seam parallel fan-out (Mode A) alongside serial prose (Mode B); timestamp-in-main-loop discipline |
| `topology-merge` | PR-over-git-merge landing workflow; divergence guard; rebase-before-push; no-Workflow-script annotation |
| `topology-next` | Workflow `runId` as Step 1 source; `resumable-workflows` as a rank item; `topology-sprint` / `topology-autopilot` in sub-command tier table; Scenario G (resumable workflow) |
| `topology-patch` | Scoped re-verify via `topology-verify` before table update; PRINCIPLES cross-reference preamble |
| `topology-phase-plan` | `PHASE_DESCRIPTOR` schema (machine-readable mirror of phase table); Workflow parallel() fan-out for session prompt enhancement; `HARD HALT` vs `HITL` distinction |
| `topology-promote` | Parallel draft Workflow (DOC_EDIT schema); `resumeFromRunId` for HITL revisions; low-confidence draft scrutiny gate; APP-DOC-IMPACT read in Step 1 |
| `topology-resume` | Mode (a) = runId resume; Mode (b) = doc-state fallback; three new HITL reason handlers; divergence guard |
| `topology-sprint-plan` | Structured JSON scope block (`categories:[{slug,branch}]`); branch pre-computation; `hitl.reason` enum annotation per gate |
| `topology-sprint` | Dual-path Step 3 (Path A = Workflow pipeline; Path B = prose); `CATEGORY_RESULT` schema inline; `--resume <runId>`; `--autonomy` flag |
| `topology-status` | `--parallel` fan-out flag; Step 5 in-flight resumable workflow detection; IN-FLIGHT WORKFLOWS dashboard section |
| `topology-trace` | Optional multi-hop Workflow fan-out (Pattern 3 find side); `HOP_EVIDENCE` schema; two-hop fast-path documented |
| `topology-verify` | Fact-first verification (exit code = verdict); adversarial refutation panel (N-skeptic); `--resume <runId>` + `--skeptics N`; proof column in assertion work-list; Coverage-Gap Backlog in report |

### New commands

**`topology-eval`** — harness for eval-gating skill changes before merging. Runs a skill/command
`k` times against a fixed fixture, grades deterministically, computes pass@k / pass^k, and writes
a result log under `{DOCS_ROOT}/evals/`. Prevents skill regressions from reaching users. A model
grader may advise, but deterministic graders hold the gate.

**`topology-self-audit`** — runs the project harness self-audit script and surfaces a maturity
scorecard across seven dimensions: lockdown-coverage, write-time-guards, eval-coverage,
memory-health, decision-ledger, cost-knobs, and doc-tier-presence. Reports verbatim top-action
items with no LLM re-grading (script is source of truth). Optionally wires into the weekly
Compass cadence when `COMPASS_ENABLED`.

---

## How to apply

Apply to each target's **compiled** command. Read the target's current content, then apply the
relevant changes from the per-command summary above. Honor all `{{#if}}` gates (e.g., skip
delegation prose in a solo profile, skip tier-doc content when `{TIER_ENABLED}` is false).

For targets marked "dual-path" (topology-sprint, topology-sprint-plan, topology-current-state,
topology-gap, topology-integrate, topology-trace, topology-doc-walk, topology-e2e,
topology-dispatch): the Workflow path is **additive** — introduce it as a labeled alternative
alongside the existing prose path. Do not remove the prose path.

For targets where the Workflow script is gated on `{{#if USE_SUBAGENTS}}`: only introduce the
script block when `USE_SUBAGENTS` is true in the profile. Prose-mode prose is always present
regardless.

For the two new commands: compile `templates/commands/topology-eval.md` and
`templates/commands/topology-self-audit.md` into `{COMMANDS_DIR}/` exactly as the compiler
would, applying all profile tokens. No profile mini-interview is needed — neither command
introduces new profile keys.

---

## Idempotency note

For existing commands: check whether the target already contains a `PHASE_RESULT` schema block,
a `CATEGORY_RESULT` schema block, or a `--resume <runId>` flag definition. If any of these
markers is present, the substrate has already been woven in for that command — skip it.

For the two new commands: skip if `{COMMANDS_DIR}/topology-eval.md` and
`{COMMANDS_DIR}/topology-self-audit.md` already exist and contain the word `pass@k`.
