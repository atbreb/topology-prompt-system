# topology-diagnose

Two complementary diagnostic modes in one command:

1. **Symptom mode** (default) — symptom-driven seam chain analysis. Takes an observable failure description and traces it through the project's seam contracts to produce a ranked list of candidate seams with the specific violated guarantee that would produce the observed symptom. The starting point for any production issue that crosses a category boundary.

2. **Health-check mode** (`--health`) — read-only doc/state consistency scan. Surfaces the drift that accumulates between the foundation documents, the per-category artifacts, the Verification Table, and the code as a project moves through its lifecycle: missing docs, stale cells, half-migrated seams, scaffolding gaps, and divergence between what the docs claim and what the tree actually contains. Produces a ranked findings report that names the exact `topology-*` command to run next. Never mutates anything.

> **See `{COMMANDS_DIR}/topology-PRINCIPLES.md`** for the design discipline and, in the Workflow-era section, the shared schema library (`FINDING`, `HITL`). In particular: the five failure modes (health-check mode is a detector for the *artifacts* of each one); the foundation-document mutation discipline (append-only CONTRACT-SHEET/SYSTEM-TOPOLOGY, command-only VERIFICATION-TABLE) — diagnose flags any violation it sees but fixes none; the `project-prep-scaffolding` gate (scaffolding completeness is one of the health-check classes); the half-migrated-seam anti-pattern (both producer and consumer must ship in the same phase).

## Usage

```
/topology-diagnose <project-name> "<symptom>"            # symptom mode (default)
/topology-diagnose <project-name> --health               # health-check mode (sequential)
/topology-diagnose <project-name> --health --parallel    # health-check: fan check classes out as a read-only Workflow
/topology-diagnose <project-name> --health --checks <list>  # restrict to named check classes (comma-separated)
```

### Arguments

- `<project-name>` — the project whose seam contracts govern this system (and whose directory lives under `{PROJECTS_ACTIVE_DIR}/`, or `{PROJECTS_E2E_DIR}/`)
- `"<symptom>"` — *(symptom mode)* plain language description of the observable failure. Be specific about what is happening vs. what should be happening. Examples:
  - `"credits are reserved but never debited to the final balance"`
  - `"billing events are emitted but usage_percent never updates in the frontend"`
  - `"session status shows running after the task completes"`

### Flags

- `--health` — run health-check mode instead of symptom mode
- `--parallel` — *(health-check mode only)* run the independent check classes as a read-only `Workflow` fan-out (one agent per class) instead of sequentially. Optional; the sequential path is the default and is always sufficient
- `--checks <list>` — *(health-check mode only)* restrict to a subset of the five check classes: `doc-existence`, `cell-staleness`, `seam-migration`, `scaffolding`, `drift`. Default is all five

---

## Output

**Symptom mode:** A ranked candidate list — seams most likely to contain the violated guarantee, with the specific guarantee named, the expected behavior, and the observed behavior mapped to it. Ready to hand directly to `topology-trace`.

**Health-check mode:** A consistency report — findings grouped by check class, each ranked by severity, each naming the exact artifact at fault, the rule it violates, and the `topology-*` command that resolves it. Diagnose produces a worklist, not a fix.

---

## Instructions — Symptom Mode

### Step 1: Load Project Contracts

Read:
1. `CONTRACT-SHEET.md` — all invariants, their governing categories, verification criteria
2. `SYSTEM-TOPOLOGY.md` — all seam contracts, producer guarantees, consumer dependencies
3. `VERIFICATION-TABLE.md` — current cell states (identifies known regressions)
4. All `VERIFICATION-REPORT.md` files — what was verified and how
5. Most recent integration checkpoint — any regressions already flagged

### Step 2: Parse the Symptom

Break the symptom into components:

- **What is happening:** `<observable behavior>`
- **What should be happening:** `<expected behavior per contracts>`
- **Where it surfaces:** `<which category or system boundary is the observation point>`
- **Implied data flow:** `<what data or event must travel through the system to produce the correct behavior>`

{{! example }}
For the billing example:
- What is happening: credits reserved, final balance unchanged
- What should happen: reserved credits are debited on settlement, balance reflects actual spend
- Where it surfaces: billing / usage display
- Implied data flow: reservation → usage tracking → settlement → balance update

### Step 3: Identify the Relevant Seam Chain

Starting from the observation point, walk backward through `SYSTEM-TOPOLOGY.md` to find every seam in the data flow that must operate correctly to produce the expected behavior.

For each seam in the chain, note:
- The producer's relevant guarantees
- The consumer's relevant dependencies
- Whether this seam's Verification Table cell is `✓`, `✗`, `⏳`, or blank

### Step 4: Score Each Seam as a Candidate

For each seam in the chain, evaluate likelihood of being the break point:

**High** — One of these is true:
- The seam's Verification Table cell is `✗` or blank
- The seam has a guarantee that, if violated, directly produces the observed symptom
- The seam was flagged in the most recent integration checkpoint

**Medium** — One of these is true:
- The seam was verified but the verification criteria didn't explicitly cover this scenario
- The seam touches the observation category but indirectly
- A prior verification report noted manual review items here

**Low** — All of these are true:
- The seam has a `✓` in the Verification Table
- Its guarantee was explicitly checked against the failure scenario
- No integration checkpoint has flagged it

### Step 5: Map Each Candidate to a Specific Violated Guarantee

For each High and Medium candidate, name the specific guarantee from `SYSTEM-TOPOLOGY.md` that would need to be violated to produce the symptom. This is the hypothesis `topology-trace` will investigate.

Format:

**Candidate:** Seam N — Producer → Consumer
**Violated guarantee hypothesis:** `<exact guarantee text from SYSTEM-TOPOLOGY.md>`
**How violation produces symptom:** `<causal chain from violated guarantee to observed behavior>`
**Evidence pointing here:** `<what in the verification history or table suggests this>`

### Step 6: Check for Contract Violations

For each relevant contract in `CONTRACT-SHEET.md`, check whether the symptom represents a contract violation — not just a seam issue. Some failures span seams and manifest as contract violations.

If a contract appears violated, add it to the candidate list with the same structure.

### Step 7: Produce Diagnosis Report (Symptom Mode)

```markdown
## topology-diagnose: <project-name>

**Symptom:** "<symptom text>"
**Analyzed:** <date>

### Symptom Breakdown
- **What is happening:** <parsed behavior>
- **What should happen:** <expected per contracts>
- **Observation point:** <category>
- **Implied data flow:** <A → B → C → D>

### Seam Chain

`<Cat A>` → `[S1]` → `<Cat B>` → `[S2]` → `<Cat C>` → `[S3]` → `<observation point>`

### Candidate Seams — Ranked

#### 🔴 HIGH — Seam <N>: <Producer> → <Consumer>

**Violated guarantee hypothesis:**
> <exact guarantee text from SYSTEM-TOPOLOGY.md>

**How violation produces symptom:**
<causal chain>

**Evidence:**
- Verification Table: `<cell state>`
- <any checkpoint findings or verification report notes>

**Investigate with:**
  /topology-trace <project-name> <seam-slug> "<specific data flow to follow>"

---

#### 🟡 MEDIUM — Seam <N>: <Producer> → <Consumer>

[same structure]

---

#### 🟢 LOW — Seam <N>: <Producer> → <Consumer>

[same structure — included for completeness, unlikely source]

---

### Contract Violation Candidates

#### Contract <N> — <Title>

**Relevant invariant:** <exact invariant text>
**How symptom maps to violation:** <description>
**Governs:** <category list>

---

### Recommended Investigation Order

1. `/topology-trace <project-name> <highest-candidate-seam-slug> "<flow>"`
2. `/topology-trace <project-name> <second-candidate-seam-slug> "<flow>"`

If Seam <N> is confirmed broken:
  `/topology-patch <project-name> <seam-slug>`
```

---

## Instructions — Health-Check Mode

### Step 1: Load Project State

Read (read-only — make no edits anywhere in this command):

1. `TOPOLOGY-CLAUDE.md` — the categories table, declared statuses, and the lifecycle stage the project claims to be in
2. `CONTRACT-SHEET.md` — all contracts, governing categories, verification summary rows
3. `SYSTEM-TOPOLOGY.md` — all seam contracts, producer guarantees, consumer expectations
4. `VERIFICATION-TABLE.md` — current cell states for every category row × seam column
5. `DECISION-LOG.md` — for any `**Reopened**` annotations and deferral DLs cited by cells
6. Every `categories/<slug>/` directory — note which of `CLAUDE.md`, `CURRENT-STATE.md`, `GAP.md`, `PHASE-PLAN.md`, `FUTURE-STATE.md`, `VERIFICATION-REPORT.md`, and `implementation/phase-N/` artifacts exist vs. are expected for the category's declared status
7. `CHECKPOINT.md` if present — the last integration checkpoint and any in-flight workflow `runId`

### Step 2: Detect a Resumable Workflow (report-only)

If `CHECKPOINT.md` (or a category's session prompt) records a `Workflow runId` from an interrupted `topology-sprint`, `topology-dispatch`, `topology-verify`, or `topology-autopilot` run, capture it. Health-check does **not** resume it — it reports it so the operator knows a `--resume <runId>` is available rather than starting cold. Surface it in the report's header.

This is part of the Workflow-era resume discipline: the `runId` is the machine-resumable record; `CHECKPOINT.md` is for human readability. If a `runId` is present, prefer `--resume <runId>` over a cold restart in the owning command.

### Step 3: Run the Five Check Classes

Each check class is independent and read-only. Run them sequentially (default) or fan them out with `--parallel` (Step 3a). For each class, emit `FINDING` records.

**A. Doc-existence** — for every category, the set of artifacts that should exist is a function of its declared lifecycle status:

| Declared status | Expected artifacts |
|---|---|
| Planned | `categories/<slug>/CLAUDE.md` |
| Current-state done | + `CURRENT-STATE.md` |
| Gap'd | + `GAP.md` |
| Phase-planned | + `PHASE-PLAN.md` + `implementation/phase-N/` scaffolding |
| Future-state done | + `FUTURE-STATE.md` |
| Implemented (`⏳`) | + phase RUNBOOKs / session prompts populated |
| Verified (`✓`) | + `VERIFICATION-REPORT.md` |

A doc that should exist for the declared status but is missing is a finding. A foundation doc (`CONTRACT-SHEET`, `SYSTEM-TOPOLOGY`, `VERIFICATION-TABLE`, `DECISION-LOG`, `TOPOLOGY-CLAUDE`) that is absent is **critical**.

**B. Cell-staleness** — a Verification Table cell is stale when it disagrees with the artifacts around it:
- A cell marked `✓` with no corresponding `VERIFICATION-REPORT.md`, or whose report records a Partial/Fail outcome.
- A cell marked `⏳` (impl complete, verify pending) for a category whose `TOPOLOGY-CLAUDE` row says `Verified`.
- A blank cell in a category row whose status claims the seam is done. (Per PRINCIPLES: a blank cell is as suspicious as `✗` — it was never confirmed.)
- A `✓ (with DL-XXX)` deferral cell whose cited DL is missing from `DECISION-LOG.md` or has no completion criteria.

**C. Seam half-migration** — for each seam in `SYSTEM-TOPOLOGY.md`, compare producer-side and consumer-side states:
- Producer cell `✓` but consumer cell blank/`✗` (or vice versa) → the seam is half-migrated. Per the anti-pattern, both sides must ship in the same phase.
- A `⏳`-one-side cell where the neighbor category *is* implemented (so the one-sidedness is no longer justified by an unbuilt neighbor) → stale half-migration.
- A seam predating the Consumer-Expectations field (producer-only contract) → legacy finding + recommend a backfill DL.

**D. Scaffolding completeness** — for any category at phase-planned or later, confirm the `project-prep-scaffolding` output exists and is not a slim-mirror substitute (the refused anti-pattern). Each planned phase should have its `implementation/phase-N/` directory with a session prompt + RUNBOOK. A phase-planned category with no scaffolding, or scaffolding that is a thin `implementation/CLAUDE.md` stand-in, is a finding. **Do not** propose retroactive back-fill on grandfathered categories — flag prospectively only and say so.

**E. Drift** — divergence between doc claims and the actual tree:
- `TOPOLOGY-CLAUDE` claims `Verified` but the category's source files named in its `FUTURE-STATE.md` don't exist or don't contain the asserted code paths (spot-check, read-only).
- A contract's Verification Summary says `Verified (in <category>)` but that category's table row isn't all-green.
- A `**Reopened**` decision in `DECISION-LOG.md` with no follow-on re-ratification entry.
- Local-`main` divergence relevant to the project (`git rev-list --count origin/main..main` > 0) — surface as a coordination drift finding, not a doc fix.

### Step 3a (optional): Parallel read-only Workflow fan-out

When `--parallel` is set, run the five check classes as a strictly read-only `Workflow` fan-out — one agent per class — and assemble the returned findings into the report. This is the Workflow opt-in: invoking `/topology-diagnose --health --parallel` authorizes it. The workflow does **no** mutation (no commits, no doc writes, no table edits) — it only returns `FINDING[]`. All assembly, ranking, and reporting happen in the main loop after it returns.

**Prose path (default):** Run each check class in sequence. Emit findings after each class. This always works and requires no Workflow tool. The parallel path and the sequential path produce identical findings; `--parallel` is a speed convenience on large projects.

**Workflow path (`--parallel`):** Author and invoke the following script. Every agent uses `agentType: 'Explore'` (read-only); the script writes nothing.

```js
export const meta = {
  name: 'topology-diagnose-health',
  description: 'Read-only doc/state consistency health check: fan out one agent per check class',
  phases: [{ title: 'Check', detail: 'one read-only agent per check class' }],
}

// --- schema library (copy verbatim from PRINCIPLES Part II) ---
const FINDING = { type:'object', required:['id','kind','claim','verdict','evidence'], properties:{
  id:{type:'string'}, kind:{enum:['contract','seam-producer','seam-consumer','regression','doc-coverage']},
  claim:{type:'string'}, verdict:{enum:['Pass','Fail','Uncertain']}, evidence:{type:'string'},
  severity:{enum:['critical','high','medium','low','none']}, notes:{type:'string'} }}

const { project, checks } = args   // checks: [{ class, instructions }]

phase('Check')
const perClass = await parallel(
  checks.map(c => () => agent(
    `You are running ONE read-only consistency check class ("${c.class}") on topology project "${project}".\n` +
    `Do NOT edit, commit, or write anything — read the docs and the tree, report only.\n` +
    `${c.instructions}\n\n` +
    `Return an ARRAY of FINDING. Rules:\n` +
    `- id is "<class>-<n>" (e.g. "doc-existence-1"); kind maps the artifact (contract|seam-producer|seam-consumer|regression|doc-coverage).\n` +
    `- verdict Fail = a confirmed inconsistency; Uncertain = needs out-of-session tooling or a deeper read; Pass = checked, clean.\n` +
    `- evidence is "artifact:line — what was found" and is REQUIRED for every Fail.\n` +
    `- severity: missing foundation doc or broken-but-green cell = critical; half-migrated live seam = high; stale ⏳ / scaffolding gap = medium; legacy/backfill = low.`,
    { label: `check:${c.class}`, phase: 'Check', schema: { type:'array', items: FINDING }, agentType: 'Explore' }
  ))
)
return perClass.flat().filter(Boolean)
```

Pass `args: { project, checks }` where `checks` is the (possibly `--checks`-filtered) class list with per-class instruction strings (built from the Step 3 descriptions above). Because every agent is `Explore` and the script writes nothing, this fan-out has the same effect as the sequential path — just faster on a large project.

### Step 4: Rank and Map Each Finding

For every finding, assign severity and name the resolving command:

| Severity | When | Resolving command |
|---|---|---|
| 🔴 critical | Missing foundation doc; a `✓` cell with no/failing report; a contract marked Verified over a non-green category | `topology-init` (missing foundation) · `topology-verify` (re-verify the cell) |
| 🟠 high | Half-migrated live seam (one side green, neighbor built) | `topology-implement` then `topology-verify` the lagging side; `topology-integrate` to re-check the seam |
| 🟡 medium | Stale `⏳` past Verified claim; scaffolding gap on a phase-planned category | `topology-verify` (flip ⏳→✓) · `topology-phase-plan` (regenerate scaffolding gate) |
| 🟢 low | Legacy producer-only seam; reopened DL without re-ratification; coordination drift | backfill DL via the owning command; reconcile local `main` per PRINCIPLES Git rules |

### Step 5: Produce Diagnosis Report (Health-Check Mode)

```markdown
## topology-diagnose --health: <project-name>

**Analyzed:** <date>
**Lifecycle stage (claimed):** <from TOPOLOGY-CLAUDE>
**Resumable workflow:** <runId from CHECKPOINT.md, or "none">   ← report-only; resume with the owning command's --resume

### Summary
- Doc-existence: <N> findings (<crit>/<high>/<med>/<low>)
- Cell-staleness: <N>
- Seam half-migration: <N>
- Scaffolding completeness: <N>
- Drift: <N>

### 🔴 Critical
#### <id> — <kind> — <class>
**Inconsistency:** <claim>
**Evidence:** `<artifact:line — what was found>`
**Rule violated:** <which PRINCIPLES rule / failure-mode artifact this is>
**Resolve with:**
  /topology-<command> <project-name> <args>

### 🟠 High
[same structure]

### 🟡 Medium
[same structure]

### 🟢 Low
[same structure — included for completeness]

### Recommended Order
1. /topology-<command> <project-name> <args>   — <why first>
2. /topology-<command> <project-name> <args>

<If a runId was found:>  An interrupted run exists — prefer `/topology-<owning-command> <project> --resume <runId>` over a cold restart.
```

---

## Important Notes

### Symptom Mode
- **Diagnose produces hypotheses, not conclusions.** The ranked candidates tell you where to look, not what is broken. `topology-trace` confirms.
- **Low candidates still matter.** If High and Medium candidates are ruled out by `topology-trace`, Low candidates become the next investigation tier. Don't discard them.
- **A blank Verification Table cell is as suspicious as `✗`.** If a seam was never verified, it was never confirmed to work.
- **The symptom description quality matters.** The more specific the symptom, the more precise the candidate ranking. A vague symptom produces a wide candidate list; a symptom that names the exact field and its observed value produces a narrow one.

### Health-Check Mode
- **Diagnose produces a worklist, not fixes.** It is strictly read-only — it never edits a doc, sets a cell, or commits. Every finding names the `topology-*` command that owns the fix. If diagnose itself mutated state it would violate the foundation-document mutation discipline (cells are command-only).
- **A blank Verification Table cell is as suspicious as `✗`.** If a seam was never verified it was never confirmed to work — cell-staleness treats blanks in a "done" row as findings, not as benign.
- **Half-migration is the highest-value catch.** A seam green on the producer side with a blank/`✗` consumer side (or vice versa) is the producer-breaks-consumer failure mode mid-flight. Rank it high and route it to the lagging side's `topology-implement` + `topology-verify`, then `topology-integrate` to re-check the seam bilaterally.
- **Scaffolding gaps are flagged prospectively only.** Per PRINCIPLES, do not propose retroactive scaffolding back-fill on grandfathered categories — note them as legacy and move on. A slim-mirror `implementation/CLAUDE.md` standing in for real `project-prep-scaffolding` output is a finding, not a pass.
- **The resumable-workflow detection is report-only.** Diagnose surfaces a `runId` so the operator can `--resume` via the owning command (`topology-sprint`, `topology-dispatch`, `topology-verify`, `topology-autopilot`); diagnose itself never resumes or runs that workflow.
- **The `--parallel` fan-out and the sequential path produce identical findings.** The workflow is a speed convenience only; because it writes nothing, diagnose must always work as a plain sequential read with no Workflow opt-in required.
- **Diagnose quality tracks doc honesty.** It compares declared status against artifacts and tree; if a project's `TOPOLOGY-CLAUDE` statuses are themselves fabricated, drift findings will be wide. The narrower and more truthful the declared state, the sharper the report.

---

$ARGUMENTS
