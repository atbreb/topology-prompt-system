# topology-PRINCIPLES

> Single source of truth for the design discipline behind every `topology-*` command. Each `topology-*` skill references this doc near the top. When you invoke any topology skill, you may load this once and treat its rules as in-force.

The five core skills that consume these principles directly are: `topology-discovery`, `topology-init`, `topology-phase-plan`, `topology-implement`, `topology-verify`. Support skills (`topology-status`, `topology-decide`, `topology-patch`, `topology-merge`, etc.) honor the same discipline.

---

## The discipline in one paragraph

Topology projects rebuild systems by producing **contracts** (always-true facts), **seams** (producer→consumer boundaries with explicit guarantees), **decisions** (permanent records of choices), and **categories** (responsibility slices each owned by exactly one accountable area). Implementation runs phase-by-phase, each phase scoped tightly enough that an implementing agent — picking up the work cold — can load the right artifacts in the right order, write code against firm contracts, and verify against pre-written assertions without re-deriving any decision that is already firm.

---

## Categories are responsibility slices, not phase slices

A category answers exactly one question: **what is this slice the sole owner of?** Categories cross-cut phases — a single phase may touch several categories, and a single category may ship across several phases. Two categories that share a responsibility should merge; one category with two responsibilities should split.

Phases run in dependency order; categories run in responsibility order. Don't conflate them. The phase axis answers *when*; the category axis answers *who owns*.

The right number of categories for most rebuilds is 5–10. Fewer than 5 means responsibilities are blurred together; more than 10 means the system has been over-sliced and the agent will spend too much load on cross-category navigation.

---

## The five failure modes (and the smallest fix for each)

These are the patterns that derail implementing agents. Every topology skill is engineered to mitigate at least one of these failure modes; if a skill change weakens any of them, that change is wrong.

### 1. Context overload — agent loads everything, makes generic choices

Every category has a **Decisions in scope** section in its `categories/<slug>/CLAUDE.md` listing only the DL-IDs that constrain THIS category. Project-wide DECISION-LOG.md is the canonical register; per-category CLAUDE.md is the *filtered view* the implementer loads first.

### 2. Cross-cutting concerns scattered — agent edits X, breaks Y

Every category's `categories/<slug>/CLAUDE.md` has a **Cross-category touchpoints** section naming each seam this category participates in + the adjacent category to consult before changing the producer side. The agent doesn't have to read every other category's docs — only the ones at touchpoints they're modifying.

### 3. Producer breaks consumer — silent contract violations

Every seam in `SYSTEM-TOPOLOGY.md` has both a **Producer Guarantees** section and a **Consumer Expectations** section. Before changing a producer, the implementer reads consumer expectations. `topology-verify` Step 4 cross-checks both sides. The CONSUMER side of a seam is as load-bearing as the PRODUCER side — half-bilateral seam definitions are anti-pattern.

### 4. Phase-context loss — agent loads category but doesn't know what's in scope this phase

`topology-implement` Step 2.7 (context loadout) is a structured pre-load checklist. Before plan-mode, the implementer has explicitly loaded: the umbrella TOPOLOGY-CLAUDE, the category CLAUDE.md, the DLs cited in this phase's row, adjacent-category CLAUDEs at touchpoints, the VERIFICATION-TABLE row, the phase session prompt + runbook. The checklist is the leadership signal — it tells the agent exactly which docs to load and in what order.

### 5. Decision relitigation — agent reaches a fork that's already been settled

`DECISION-LOG.md` is loaded into every implementer's context at phase boundary. Reopening a firm decision requires explicit `**Reopened YYYY-MM-DD:**` annotation + status flip + re-ratification. Implementer's pre-flight (Step 2.7): "Have I checked decisions for this seam, this category, this phase?"

---

## The implementer's pre-flight context loadout

This is the canonical checklist `topology-implement` Step 2.7 enforces. Every phase boundary loads this in order; nothing else gets loaded by default until plan-mode requires it.

```
1. {PROJECTS_ACTIVE_DIR}/<project>/TOPOLOGY-CLAUDE.md
   (umbrella: which categories exist, current state, parallel groups)

2. {PROJECTS_ACTIVE_DIR}/<project>/categories/<slug>/CLAUDE.md
   (responsibility + decisions in scope + cross-category touchpoints)

3. {PROJECTS_ACTIVE_DIR}/<project>/DECISION-LOG.md
   — entries cited in this phase's "Decisions" column only
   (skip the rest of the register; the category CLAUDE narrowed it)

4. Adjacent categories' CLAUDE.md
   — only those at seams this phase touches

5. {PROJECTS_ACTIVE_DIR}/<project>/VERIFICATION-TABLE.md
   — this category's row + the seam columns this phase advances

6. {PROJECTS_ACTIVE_DIR}/<project>/categories/<slug>/implementation/
   phase-N/PHASE-N-SESSION-PROMPT.md
   {PROJECTS_ACTIVE_DIR}/<project>/categories/<slug>/implementation/
   phase-N/PHASE-N-RUNBOOK.md

7. Active teaching stance — session override if set, else profile
   `agents.teaching_stance` (`{TEACHING_STANCE}` for this project)
   — selects the teaching surface per TEACHING-STANCE-PROTOCOL.md; additive
   output only, never gates or alters the work
```

Loading more than this on entry is over-eager — wait until plan-mode surfaces the specific files plan-mode needs. Loading less is under-prepared — the agent will guess at constraints that are already settled.

---

## Teaching stance — how much the agent explains while it works

A second axis, orthogonal to autonomy. **Autonomy** governs how much the agent *does* without you;
**teaching stance** governs how much it *explains to you* while doing it. The full behavior spec is
`TEACHING-STANCE-PROTOCOL.md`; the one-paragraph version:

- **`student`** — lessons ON by default at every meaningful juncture; user dials volume down per session.
- **`curious`** — agent flags learnable moments inline (`💡 Learnable:`); user picks what to go deep on.
- **`quiet-pro`** — silent by default; offers a lesson only when it *infers* real friction, and only as a one-line ask.

This project's default stance is **`{TEACHING_STANCE}`**. Two non-negotiables for every stance:
teaching is **additive output, never a gate** (only the methodology's real HITL triggers gate), and it
**never distorts the methodology to simplify a lesson** — `Proposed` vs `Active`, append-only logs, and
bilateral seam contracts stay literally true no matter how the agent narrates them.

---

## Foundation document mutation discipline

- **CONTRACT-SHEET.md and SYSTEM-TOPOLOGY.md** — append-only after `topology-init`. Amendments go through `DECISION-LOG.md` entries that reference the contract or seam being updated.
- **DECISION-LOG.md** — append-only forever. Reopening a decision requires a new entry with `**Reopened YYYY-MM-DD:**` annotation; the original entry stays.
- **VERIFICATION-TABLE.md** — updated by commands (`topology-implement` flips cells to `⏳`, `topology-verify` flips to `✓` or `✗`). Manual edits are anti-pattern.
- **categories/<slug>/CLAUDE.md** — created by `topology-init` Step 3.5, augmented by subsequent commands. Re-running `topology-init` does not overwrite if the file exists.

---

## Git & PR coordination (MANDATORY)

Topology work is **branch-per-feature, landed via GitHub PR off a fresh `origin/main`.** Parallel agent sessions coordinate through the PR queue — never through a shared local `main`. (This rule exists because multiple sessions committing features directly to one local `main` can produce an unmergeable divergence tangle, with features sharing edits to the same files.)

{{#if MULTI_AGENT}}
> **Operational checklist: when another agent/session is active**, run the parallel-work preflight first — it flips the session mode to **Multiple Sessions** and turns the rules below into a paste-and-go preflight (divergence guard, worktree-per-writer, subagent/resource caps, live coordination registry). Topology work is multi-agent by default when using fan-out dispatch, so assume Multiple Sessions unless you have confirmed you are solo.
{{/if}}

1. **Branch off fresh `origin/main`, never local `main`.** Before creating any project/sprint/category worktree: `git fetch origin`, then branch off `origin/main`. Branching off local `main` inherits other sessions' unpushed commits and entangles features.
2. **Never commit feature/topology work to local `main`.** Treat local `main` as a read-only mirror of `origin/main`. The only thing that reaches `main` is a merged PR.
3. **Divergence guard (preflight).** Before starting work, if `git rev-list --count origin/main..main` > 0, STOP and surface it — local `main` has drifted and must be reconciled before new work begins.
4. **One feature/category = one branch/worktree** off `origin/main`, named `{BRANCH_PREFIX}<project>/<group-or-category>`. Parallel categories each get their own worktree (sub-worktree-per-agent rule).
5. **Land via PR, not `git merge` into local `main`.** Push the branch; open a PR with a body generated from the project's CONTRACT-SHEET / DECISION-LOG / verification state. PRs merge via the remote host in a safe order.
6. **Shared-file serialization.** Features touching the same shared files (shared files declared in the coordination registry) must declare them in the live coordination registry at `{DOCS_ROOT}/coordination/IN-FLIGHT.md` and merge sequentially; each later PR rebases on `origin/main`.
7. **Reset between projects.** After PRs land: `git checkout main && git fetch && git reset --hard origin/main`. Local `main` never accumulates local-only commits.

{{#if MULTI_AGENT}}
**Parallel-agent protocol:** when multiple sessions are active, collect each in-flight branch + authoritative commit SHAs + shared-file footprint + side-effects + merge order in the live coordination registry; use a freeze signal during a consolidation. The registry (`{DOCS_ROOT}/coordination/IN-FLIGHT.md`) is the live registry that sequences merges.
{{/if}}

> This **supersedes** the older "commit solo fixes straight to main" / "land on main quickly via merge" guidance for all feature, topology, and multi-agent work. Trivial solo fixes may still go to `main` only if they are pushed + synced immediately.

---

## Facts over prose: a ✓ must be backed by an executable proof

A topology contract is defined as an **always-true fact** — but a fact is only a fact if a machine can check it on its own, without reading prose. An LLM that re-reads a verification-criteria sentence and judges "Pass" is *sampling an interpretation* of that sentence; run it again under a newer model and it can sample differently. That is a **prediction that the contract holds**, not a verdict that it holds. The only verification artifact that survives a model upgrade unchanged is an **executable assertion**: a test, a property, or a structural/lockdown check whose exit code is `0` or non-zero.

Topology verification is therefore **fact-first**:

- **The CONTRACT-SHEET / FUTURE-STATE assertions are the spec.** They are human-read — prose is the right medium for them and they stay prose.
- **Every machine-checkable assertion must *name* the executable proof that backs it** — a `proof` of kind `test` / `property` / `lockdown` pointing at `path::name`. `topology-verify` then **runs that proof and lets the exit code decide the verdict**; the agent reports the exit code, it does not vote on correctness.
- **`manual-evidence`** is the explicit, named exception for assertions that genuinely need out-of-session tooling (live traffic, an uninstalled CLI, a multi-minute observation window). It routes through the evidence-deferral DL pattern — it does not get a fabricated Pass.
- **`none-yet`** means no executable proof exists today. Such an assertion can still be Pass-by-code-reading, but that Pass is **provisional**: it faces the full N-skeptic refutation panel *and* is logged as a **coverage gap** — a fact that should be written. A category whose contracts are all `none-yet` has documented its invariants but not made them enforceable.

The refutation panel does not disappear — its job narrows. For a **prose-only (`none-yet`) Pass** it does the full adversarial refutation. For a **fact-backed (green) Pass** it drops the correctness lens (the exit code settled that) and keeps exactly one job: *does the test actually exercise the claim, or is it vacuous?*

The migration target for a brownfield project is: drive every contract/seam assertion from `none-yet` toward `test`/`property`/`lockdown`, and let the `none-yet` count be the backlog metric trending toward zero.

---

## The reviewer is not the author

After implementation and before `topology-verify` marks a row `✓`, route the diff through an **independent read-only reviewer** (tools `[Read, Grep, Glob]`, with a Pre-Report Gate: every finding must be real, >80% confidence, in the changed code, and de-duplicated). The reviewer *judges* (Approve / Warning / Block) and hands fixes back to the mutating coder — it never edits. A Block must be resolved before verify runs. Where correctness needs execution, the reviewer names the proof and defers to verify's exit code — it does not vote. This is least-privilege plus anti-self-review moved one step earlier than the refutation panel.

{{#if MULTI_AGENT}}
In Workflow mode, the reviewer is dispatched as an independent agent with `agentType` set to the appropriate read-only reviewer type from `{SUBAGENT_TYPES}`.
{{/if}}

---

## Eval-gating changes to the harness's own skills

Changes to **release-gating skills** — `topology-verify`, `topology-e2e`, `topology-promote` — must hold a reliability bar before merging: run `/topology-eval <skill>`, which executes the skill k times per task against pinned fixtures in isolated contexts and gates on **pass@k ≥ 0.90 (capability) + pass^k = 1.00 (regression)**. The script's exit code is the GO/NO-GO verdict — the agent reports it, it does not override it. A change that turns a GO into a NO-GO is a regression and must not merge. Graders are deterministic (grep / exit-code / script); a model grader may *advise* but never gates.

---

## Workflow-era orchestration doctrine

{{! This section describes the deterministic Workflow scripting pattern introduced in the topology2-* era.
    Projects that have not opted into the Workflow tool can still read this as guidance for structuring
    orchestration steps deterministically — the discipline applies even in prose-mode operation. }}

### The core shift: prose loops become deterministic scripts

In prose-mode operation, orchestration logic (`for each category …`, spawn→monitor→synthesize) is written as pseudocode that an agent executes by re-reading the markdown. That is where drift creeps in — a step gets skipped, a table doesn't get updated, an agent improvises.

When the `Workflow` tool is available and the user opts in by invoking a topology command whose instructions say to call `Workflow`, orchestration commands instead **author a `Workflow` script and invoke the `Workflow` tool.** The loop, the fan-out, the gates, and the accumulation are real JavaScript that runs deterministically; subagents inside the workflow do the judgment work (analysis, code, verification) and return **schema-validated structured data**, not prose to be re-parsed.

**This is itself the `Workflow` opt-in.** Invoking `/topology-sprint` (or any topology command configured to call `Workflow`) authorizes the workflow. No separate ask is needed. Surface the script and scope before a large run when the command says to.

In all cases — prose-mode or Workflow mode — replace every "for each category, do X" prose loop with a deterministic structure: enumerate items explicitly, process each in declared order, accumulate results into a schema-validated record, and gate on completeness criteria rather than agent intuition.

### What runs in a workflow vs. what stays in the main loop

| Runs inside the `Workflow` script (deterministic) | Stays in the main agent loop (judgment / human) |
|---|---|
| The per-category phase loop (A→F) | Adjudicating a proposed contract/seam **amendment** |
| Fan-out of independent analyses / verifications | Approving a DECISION-LOG entry in `strict` mode |
| Adversarial refutation panels | Deciding a cross-project pivot |
| Accumulating findings, cells, commits | The `topology-e2e` and `topology-promote` go/no-go |
| Worktree-isolated parallel category builds | Anything the workflow returns as `status: 'needs-hitl'` |
| Completeness-critic loops (discovery) | Final commit-boundary calls when the workflow flags ambiguity |

**The HITL boundary is absolute and lives in the main loop.** A `Workflow` script cannot pause mid-run to ask the user a question. Therefore every topology workflow is written so that any human-in-the-loop condition causes the responsible agent to **return a structured `HITL` object** and the workflow to **collect those and exit cleanly**, handing them back to the main loop. The main loop then adjudicates (or surfaces to the user) and, if resolved, re-invokes the workflow with `resumeFromRunId` so already-completed agents return cached and only the unblocked work re-runs.

> **Never** try to encode a contract amendment, a DL-approval in strict mode, or a cross-project pivot *inside* a workflow script. Those are main-loop decisions.

### Resume discipline

Every workflow invocation returns a `runId`. When a workflow exits for HITL and the gate is later resolved, re-invoke with `resumeFromRunId: <runId>` and the **same script** — completed `agent()` calls return cached, only the unblocked call and everything after re-runs. This replaces most bespoke CHECKPOINT.md bookkeeping (the checkpoint file is still written for human readability and cross-session recovery, but the workflow journal is the machine-resumable record). Workflow scripts must avoid `Date.now()`/`Math.random()`/`new Date()` — stamp timestamps after the workflow returns, or pass them via `args`.

### Budget-scaled thoroughness

When the user sets a token target, workflows use `budget.total` / `budget.remaining()` to scale: a verify panel widens its skeptic count, a discovery sweep runs more rounds, a sprint fans more categories. Guard every budget loop on `budget.total` being non-null (without a target, `remaining()` is `Infinity` and the loop would run to the agent cap).

### Five reusable workflow patterns

Each topology orchestration command composes from these. They map to recurring agent-fan-out shapes.

**Pattern 1 — Pipeline-over-categories** (used in sprint commands). Each category flows through stages `current-state → gap → phase-plan → future-state → implement → verify` independently via `pipeline()` — no barrier between stages. Category A can be on `verify` while B is still on `gap`. Wall-clock = slowest single chain, not sum-of-slowest-per-stage.

**Pattern 2 — Worktree-isolated parallel fan-out** (used in dispatch commands). Concurrent agents that mutate files run with `isolation: 'worktree'` so each gets its own git worktree off fresh `origin/main`. This demotes the original disjointness-precheck-as-hard-blocker to advisory: overlapping file scopes are a merge-order decision, not an abort. The orchestrator is the sole integrator, landing each branch via PR. Resolves index-race failures from shared worktrees.

**Pattern 3 — Find → adversarially verify** (used in verify and integrate commands). Fan out one finder per assertion/seam; for each `Pass` finding, run an N-skeptic refutation panel (each skeptic prompted to *refute*, with a distinct lens: correctness, seam-bilateral, regression, edge-case). A `Pass` survives only if a minority refute it. For fact-backed (green) Passes, the panel narrows to one coverage-adequacy skeptic only. Encodes "evidence required for Pass, not just Fail" as machinery.

**Pattern 4 — Multi-modal sweep → completeness critic → loop-until-dry** (used in discovery commands). Parallel finders each search a different modality (by-RPC, by-handler, by-consumer, by-event-subject, by-doc); a critic asks "what's missing?"; loop until two consecutive dry rounds find nothing new. Directly attacks the "missed operational methods" failure mode that expanded scope late. Track `foundVia` provenance per item.

**Pattern 5 — Workflow-per-group + main-loop HITL adjudication** (used in autopilot commands). Each group is one workflow returning `{status, hitlGates[]}`. The main loop runs them in sequence, adjudicates HITL between groups (or pivots cross-project), and resumes via `resumeFromRunId`. A single workflow spanning all groups would lose the ability to pause for amendments and pivots — the group loop must stay in the main loop. The E2E/promote boundary is never crossed by the script.

### The shared schema library

When using Workflow mode, define a shared schema library in your PRINCIPLES doc. Each orchestration command copies the schemas it needs verbatim into its Workflow script (scripts are self-contained — there is no import). Agents receive `schema: <schema>` and return structured objects the orchestrator can accumulate deterministically — never prose to re-parse. Changing a schema requires checking every command that returns or consumes it.

```js
// A single verification or analysis finding.
const FINDING = {
  type: 'object',
  required: ['id', 'kind', 'claim', 'verdict', 'evidence', 'proof'],
  properties: {
    id:       { type: 'string' },                                   // e.g. "C3", "S5-producer", "REG-2"
    kind:     { enum: ['contract', 'seam-producer', 'seam-consumer', 'regression', 'doc-coverage'] },
    claim:    { type: 'string' },                                   // the assertion being checked
    verdict:  { enum: ['Pass', 'Fail', 'Uncertain'] },
    evidence: { type: 'string' },                                   // "file:line — what was found"
    // The executable fact behind the verdict.
    // A Pass backed by a green executable proof is a deterministic verdict that survives a model
    // upgrade; a Pass backed only by code-reading is a sampled interpretation and MUST face the
    // refutation panel AND be logged as a coverage gap.
    proof: {
      type: 'object',
      required: ['kind'],
      properties: {
        kind:     { enum: ['test', 'property', 'lockdown', 'manual-evidence', 'none-yet'] },
        ref:      { type: 'string' },     // "path::name" for test/property/lockdown; DL id for manual-evidence; "" for none-yet
        ran:      { type: 'boolean' },    // true iff the proof was actually executed this run
        exitCode: { type: 'integer' },    // process exit code when ran (0 = the fact holds)
      },
    },
    severity: { enum: ['critical', 'high', 'medium', 'low', 'none'] },
    notes:    { type: 'string' },
  },
};

// One skeptic's attempt to refute a Pass finding (adversarial verify).
const VERDICT = {
  type: 'object',
  required: ['refuted', 'reasoning'],
  properties: {
    refuted:         { type: 'boolean' },     // true = the Pass claim does NOT hold up
    reasoning:       { type: 'string' },
    counterEvidence: { type: 'string' },      // file:line that contradicts the claim, if any
    lens:            { type: 'string' },      // which lens this skeptic used (correctness|seam|regression|edge-case)
  },
};

// Structured human-in-the-loop pause. The reason enum is the contract between workflow and main loop.
const HITL = {
  type: 'object',
  required: ['reason', 'details'],
  properties: {
    reason: { enum: [
      'contract-amendment-proposed', 'seam-amendment-proposed', 'dl-entry-proposed-strict-mode',
      'implementation-retry-exhausted', 'external-dep-unreachable', 'precommit-hook-unknown-failure',
      'security-sensitive-change', 'verification-architectural-failure', 'cross-project-scope-violation',
      'scaffolding-incomplete', 'commit-boundary-ambiguous', 'material-drift',
    ]},
    details: { type: 'string' },
    proposedDecisions: { type: 'array', items: { type: 'object', properties: {
      id: { type: 'string' }, title: { type: 'string' }, rationale: { type: 'string' },
      affects: { type: 'array', items: { type: 'string' } }, proposedBody: { type: 'string' },
    }}},
    remediationOptions: { type: 'array', items: { type: 'object', properties: {
      option: { type: 'string' }, command: { type: 'string' }, consequence: { type: 'string' },
    }}},
  },
};

// One cell of the VERIFICATION-TABLE that a command intends to set.
const CELL = {
  type: 'object',
  required: ['category', 'column', 'state'],
  properties: {
    category: { type: 'string' },
    column:   { type: 'string' },                  // "Internal" | "S1" | "S2" | ...
    state:    { enum: ['✓', '✗', '⏳', '⏳-one-side', '—'] },
    note:     { type: 'string' },                  // e.g. "(see report)" / "(impl complete, verify pending)"
  },
};

// Outcome of one phase running through implement.
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
    docImpact:    { type: 'string' },              // changelog line, or "none"
    hitl:         HITL,                             // present iff status === 'needs-hitl'
  },
};

// Outcome of one category running through the full A→F sequence.
const CATEGORY_RESULT = {
  type: 'object',
  required: ['category', 'status'],
  properties: {
    category:        { type: 'string' },
    status:          { enum: ['verified', 'partial', 'needs-hitl', 'aborted'] },
    phasesCompleted: { type: 'integer' },
    commits:         { type: 'array', items: { type: 'string' } },
    cells:           { type: 'array', items: CELL },
    branch:          { type: 'string' },           // worktree branch if parallel
    hitl:            HITL,
    summary:         { type: 'string' },
  },
};

// One seam checked at an integration checkpoint.
const SEAM_CHECK = {
  type: 'object',
  required: ['seam', 'status'],
  properties: {
    seam:           { type: 'string' },            // "S5 — producer → consumer"
    status:         { enum: ['both-verified', 'producer-only', 'consumer-only', 'regression', 'not-active'] },
    producerResult: { type: 'string' },            // "Honored — file:line" | "Violated — file:line"
    consumerResult: { type: 'string' },            // "Safe — file:line" | "Over-reliant — file:line"
    crossCheck:     { type: 'string' },            // does producer output match consumer expectation
    regression:     { type: 'boolean' },
    severity:       { enum: ['critical', 'high', 'medium', 'none'] },
  },
};

// A single item surfaced by a discovery sweep agent.
const DISCOVERY_ITEM = {
  type: 'object',
  required: ['kind', 'name'],
  properties: {
    kind:       { enum: ['category', 'seam', 'rpc', 'problem', 'decision', 'consumer-expectation'] },
    name:       { type: 'string' },
    detail:     { type: 'string' },
    foundVia:   { type: 'string' },                // which search modality surfaced it (by-rpc|by-handler|by-consumer|by-event|by-doc)
    confidence: { enum: ['high', 'medium', 'low'] },
  },
};

// A completeness critic's verdict over an accumulated set.
const COMPLETENESS = {
  type: 'object',
  required: ['done', 'missing'],
  properties: {
    done:      { type: 'boolean' },                // true = nothing material left to find
    missing:   { type: 'array', items: { type: 'string' } },   // angles/items not yet covered
    rationale: { type: 'string' },
  },
};
```

### Drift detection preflight before implementation

Before a category begins implementation, run a mandatory read-only drift check: spot-check for material changes since the category's planning docs were written — new migrations touching category tables, new DECISION-LOG entries citing this category's contracts/seams, sibling category CURRENT-STATE changes that could invalidate the approach, and file signature drift on target writer files. If drift is material, implementation halts and the upstream analysis chain must re-run before proceeding. If invoked from a sprint/autopilot workflow, a `material-drift` HITL is returned rather than re-running inline. Always emit the drift verdict as observable output before proceeding. The cost of re-running the upstream commands is low; the cost of implementing against a stale baseline is high.

### Multi-role vs single-role phase routing

Before executing any phase, classify it as **single-role** (one specialist writes all files) or **multi-role** (multiple specialists write disjoint file sets). Single-role phases route to a sequential shared skill. Multi-role phases route to the dispatch command with `isolation: 'worktree'` per specialist. Always emit the inference verdict before proceeding — it is the observable signal that routing happened. This prevents spawning parallel worktree agents for a phase that only has one writer, which wastes merge overhead.

{{#if MULTI_AGENT}}
### Subagent model & type discipline

- Default workflow agents inherit the session model unless a tier clearly fits. Unpinned subagents default to the build-tier model; named agents (security-auditor, orchestrator) escalate to the analysis tier via their own `model:` setting.
- **Escalation trigger:** escalate an unpinned stage to the analysis tier only when it clears a real bar — the task failed at build tier, OR it spans 5+ files, OR it is architecture/security-sensitive. Otherwise use the build tier for implementation, search-only agents for enumeration.
- For implementation stages, set `agentType` to the specialist per the path→role table (`{SUBAGENT_TYPES}`). Analysis/verification stages use the default workflow agent or `Explore` for search-only.
- The security reviewer type is a **non-blocking reviewer** — findings land in the report, never a hard gate, unless it returns a `security-sensitive-change` HITL.
{{/if}}

---

## When discipline trades against pragmatism

Two well-known carve-outs:

**Evidence-deferral via DL pattern** (`topology-verify` Important Notes): when a verification criterion requires out-of-session tooling (CLI not installed, live production traffic, multi-minute observation window), defer evidence capture via an explicit DL with completion criteria. Do NOT block category Verified ✓ on evidence housekeeping. Cross-reference the DL in the VERIFICATION-REPORT and TOPOLOGY-CLAUDE status.

**Live patch → durable code** (`topology-implement` Important Notes): when diagnosing a runtime gap, a temporary live patch (curl PUT, manual SQL UPDATE) is often the fastest path to "this is the shape that works." But the live patch is fragile — the next sync wipes it. Before declaring the finding verified, land the fix in the code-side path that produces the patch durably, in the same commit as the evidence.

Both patterns trade textbook strictness for end-to-end pragmatism. They are NOT excuses to skip discipline — they are explicit, named exceptions with documented rules.

---

## Anti-patterns to refuse

- **Slim-mirror `implementation/CLAUDE.md`** — substituting a hand-written CLAUDE.md mirror for `project-prep-scaffolding` output. `topology-phase-plan` Step 4 is non-skippable. Halt rather than substitute.
- **Retroactive scaffolding back-fill** — when a category shipped phases under a pre-tightening looser regime, override the gate without back-fill; apply strict rules prospectively only.
- **Skipping topology-verify, marking cells `✓` from implement** — implement marks `⏳`; only verify marks `✓`. The distinction is load-bearing.
- **Half-migrated seams** — if a phase modifies a seam boundary, both producer and consumer ship in the same phase. Half-migrated seams are worse than unmigrated ones.
- **Silent contract relaxation to make a verify pass** — if a failing verify reveals a contract was wrong, fix path is: Decision Log entry → update CONTRACT-SHEET → fix code → re-run verify. Do not relax silently.
- **Prose loops in orchestration** — any "for each X, do Y" prose instruction in an orchestration command is drift-prone. Replace with a deterministic structure: enumerate, process, accumulate, gate.
- **LLM vote as a verification verdict** — the exit code of the named proof is the verdict, not an agent's judgment on whether the code "looks right."
- **Encoding a HITL gate inside a workflow** — human-in-the-loop decisions (amendment approval, cross-project pivot) must be returned as a `HITL` object to the main loop, never resolved inside the running script.

---

## How this doc relates to each skill

| Skill | What it consumes from here |
|---|---|
| `topology-discovery` | Responsibility-aligned framing (§ Categories are responsibility slices); five failure modes inform the per-category and per-seam interview fields; multi-modal sweep pattern (Pattern 4) guides exhaustive enumeration |
| `topology-init` | Foundation document mutation discipline; category CLAUDE.md template responds to failure modes 1, 2, 4; Git & PR coordination note block; parallel fan-out of per-category authoring (Pattern 2) |
| `topology-phase-plan` | Failure mode 5 informs the Decisions column on phase tables; foundation mutation discipline informs append-only Decision Log; multi-role vs single-role routing |
| `topology-implement` | Implementer pre-flight context loadout (§) is the canonical Step 2.7 checklist; failure modes 4 + 5; drift detection preflight; reviewer ≠ author rule |
| `topology-verify` | Producer/consumer bilateral discipline (§ failure mode 3); consumer-expectations field; evidence-deferral pattern; fact-first verification; find-then-adversarial-refutation pattern (Pattern 3); eval-gating for skill changes |
| `topology-sprint` | Pipeline-over-categories (Pattern 1); worktree-isolated fan-out (Pattern 2); HITL boundary discipline |
| `topology-autopilot` | Workflow-per-group + main-loop HITL adjudication (Pattern 5); E2E/promote stop gate |
| `topology-dispatch` | Worktree-isolated parallel fan-out (Pattern 2); multi-role vs single-role routing |
| *(all commands)* | Teaching stance (§) — the loadout reads the active stance and selects the teaching surface per `TEACHING-STANCE-PROTOCOL.md`; applies everywhere, additive only |

When updating any topology skill, check this doc first. If a proposed change weakens any failure-mode mitigation, the change is wrong. If a proposed change strengthens a mitigation but contradicts another principle here, update this doc first to reflect the new principle, then update the skill. The shared schema library is the contract between commands — changing a schema requires checking every command that returns or consumes it. Changes to a **release-gating skill** (`topology-verify` / `topology-e2e` / `topology-promote`) additionally require `/topology-eval <skill>` to hold at GO before merging. `/topology-self-audit` reports whether these gates — eval coverage, write-time guards, ledger health — are actually wired; run it in the project's recurring review cadence.

{{#if COMPASS_ENABLED}}
Wire `/topology-self-audit` into the Compass weekly cadence and run it after any change to topology tooling.
{{/if}}

---

## Versioning

- **v4** (2026-06-06) — **Workflow-era fold-in.** Added the full Workflow-era orchestration doctrine (the core shift; HITL boundary; five reusable workflow patterns; shared schema library; resume discipline; budget-scaled thoroughness; drift detection preflight; multi-role vs single-role phase routing). Added "Facts over prose" fact-first verification principle + FINDING schema with `proof` object. Added "The reviewer is not the author" principle. Added eval-gating section for release-critical skills. Folded teaching-stance item into the pre-flight loadout (item 7). Extended How-this-doc-relates table to cover sprint, autopilot, dispatch. Workflow tooling is folded into the existing prose-mode template — prose-mode path preserved as fallback throughout. No separate topology2-* template; USE_SUBAGENTS=true activates Workflow mode from the same commands.
- **v3** (2026-05-25) — Added the **Git & PR coordination (MANDATORY)** discipline: branch-per-feature off fresh `origin/main`, never commit feature work to local `main`, land via GitHub PR, live coordination registry for parallel agents. Supersedes the older commit-straight-to-main guidance for feature/topology/multi-agent work.
- **v2** (2026-05-23) — Added the teaching-stance axis (`student`/`curious`/`quiet-pro`) and its pre-flight loadout step. Orthogonal to autonomy; spec in `TEACHING-STANCE-PROTOCOL.md`.
- **v1** (2026-05-07) — Initial principles doc. Authored as part of a topology-skill-tightening session. Based on the existing topology-* skills + 5-failure-mode analysis. Replaces no prior doc.

$ARGUMENTS
