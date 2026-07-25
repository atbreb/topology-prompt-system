# topology-current-state

Audit the actual codebase for one category and produce a truthful current state document. Uses the Contract Sheet and System Topology as the audit lens. Records only what the code actually does — including violations. Does not express aspirations.

When the Workflow tool is available, this command fans out one read-only finder per code area the category owns (handlers, DB layer, API boundary, frontend, …); each returns a schema-validated slice of findings; the main loop synthesizes those slices into the single CURRENT-STATE.md. When the Workflow tool is not available, the same steps run sequentially (the prose-mode path documented below).

> **See `{COMMANDS_DIR}/topology-PRINCIPLES.md`** for the design discipline and the shared schema library. In particular: failure mode #3 (producer/consumer bilateral discipline — the consumer side is as load-bearing as the producer); the "evidence required, file:line or nothing" rule; the foundation-document mutation discipline.

## Usage

```
/topology-current-state <project-name> <category-slug>
```

### Arguments

- `<project-name>` — the project directory name under `{PROJECTS_ACTIVE_DIR}/`
- `<category-slug>` — the category slug matching a directory in `categories/` (e.g., `{EXAMPLE_CATEGORY_SLUG}`)

---

## Prerequisites

Run: `/topology-ready <project-name> <category-slug> --action current-state`.
If NO-GO: resolve each unmet check per the remediation, then re-run.

## {DELEGATE_AGENT_NAME} Pair Mode (optional)

If `{DELEGATE_FLAG}` appears anywhere in `$ARGUMENTS`, enter **{DELEGATE_AGENT_NAME} Pair Mode** before executing any step below. Full rules live in `{DELEGATE_PROTOCOL_FILE}`.

Procedure:

1. Read `{DELEGATE_PROTOCOL_FILE}`.
2. Post a Handoff Plan table mapping every step in the Instructions section below to either `Claude` or `{DELEGATE_AGENT_NAME}`, with a one-line rationale each. **Informational** — the `{DELEGATE_FLAG}` flag is already the user's ACK.
3. Proceed immediately per the Handoff Plan; record attribution in the category RUNBOOK per the protocol. If you need to deviate from the Default split in a way the user might not expect (e.g., delegating a deliverable writeup to {DELEGATE_AGENT_NAME}), flag it as a notice in the Handoff Plan and proceed unless the user objects in the same turn.

Where {DELEGATE_AGENT_NAME} pays off most for this command: **Step 2 (source file enumeration / code-area partition)** and the grep sweeps inside **Steps 4–5 (seam compliance)** in prose mode, or as the sweep agents inside the Workflow in orchestrated mode. Synthesis, interpretation of invariants, and the CURRENT-STATE.md writeup stay on Claude.

Strip `{DELEGATE_FLAG}` from `$ARGUMENTS` before substituting into the positional args below.

---

{{/if}}
## Instructions

### Step 1: Load Foundation Documents

Read:
1. `TOPOLOGY-CLAUDE.md` — get category list, project root, and any category-specific notes
2. `CONTRACT-SHEET.md` — extract all contracts that govern this category (check the "Governs" field on each contract)
3. `SYSTEM-TOPOLOGY.md` — extract all seams where this category appears as either producer or consumer

Build a working reference:
- **Relevant contracts:** list of Contract IDs and their invariant statements
- **Relevant seams (producer):** seams where this category is the producer — what it must guarantee
- **Relevant seams (consumer):** seams where this category is the consumer — what it is allowed to depend on

### Step 2: Partition the Category into Code Areas

Using `TOPOLOGY-CLAUDE.md` key directories and any source documents from `topology-init`, identify the **code areas** this category spans. Each area becomes one parallel finder in the Workflow sweep (or one sequential pass in prose mode). Typical areas (include only those that apply for this project's stack):

- `handlers` — request handlers, command/query files
- `db` — DB layer, repositories, migrations
- `api-boundary` — API schema definitions and generated boundary code
- `frontend` — UI routes, components, and server actions for the category
- `worker` — background workers, message-broker subscribers
- `shared` — SDK or shared-package code this category owns

For each area, prepare an `area` object: `{ name, dirs: [paths], contracts: [the subset relevant to this area], seamsProducer: [...], seamsConsumer: [...] }`. Slice the contracts/seams from Step 1 so each finder gets only the lens items its code can actually evidence. A contract or seam may appear in more than one area — that overlap is fine (synthesis dedupes by ID).

Emit the partition to the user:
```
Auditing <category>: <N> code areas (<area names>), <C> contracts, <P> producer seams, <K> consumer seams in scope.
```

### Step 3: Sweep — Workflow Mode (preferred) or Prose Mode

**Choose the path based on whether the Workflow tool is available.**

---

#### Step 3A: Workflow Mode (Workflow tool available)

Author the script below and call the `Workflow` tool. **Invoking `/topology-current-state` is the explicit opt-in for Workflow use.** Every agent is **read-only**: it reads code and returns findings; it never writes a file. The main loop writes CURRENT-STATE.md (Step 4). There is no HITL mid-run — this is a pure read sweep.

```js
export const meta = {
  name: 'topology-current-state',
  description: 'Audit one category in parallel by code area; main loop synthesizes CURRENT-STATE.md',
  phases: [
    { title: 'Sweep', detail: 'one read-only finder per code area returns a findings slice' },
  ],
}

// --- inline schema: one code area's slice of the audit (self-contained) ---
const AREA_SLICE = {
  type: 'object',
  required: ['area', 'files', 'findings'],
  properties: {
    area: { type: 'string' },                                 // echo of the area name
    files: { type: 'array', items: { type: 'object', required: ['path', 'responsibility'], properties: {
      path:           { type: 'string' },                     // file path audited
      responsibility: { type: 'string' },                     // primary responsibility
      lines:          { type: 'integer' },                    // approx LOC
      moved:          { type: 'string' },                     // note if moved/renamed since source docs, else ""
    }}},
    findings: { type: 'array', items: { type: 'object', required: ['id', 'kind', 'status', 'evidence'], properties: {
      id:       { type: 'string' },                           // e.g. "C3", "S5-producer", "S2-consumer"
      kind:     { enum: ['contract', 'seam-producer', 'seam-consumer'] },
      status:   { enum: ['Pass', 'Fail', 'Partial', 'Honored', 'Violated', 'Safe', 'Over-reliant', 'Unknown'] },
      claim:    { type: 'string' },                           // the invariant / guarantee / expectation being checked
      evidence: { type: 'string' },                           // "file:line — what the code does vs. what is required"
      severity: { enum: ['critical', 'high', 'medium', 'low', 'none'] },
    }}},
    drift:         { type: 'array', items: { type: 'string' } },  // current behavior diverging from documented intent (file:line)
    parallelImpls: { type: 'array', items: { type: 'string' } },  // duplicate/competing implementations (file:line)
    manualReview:  { type: 'array', items: { type: 'string' } },  // code too complex/abstracted to audit confidently
  },
}

const { project, category, areas } = args   // areas: [{ name, dirs, contracts, seamsProducer, seamsConsumer }]

phase('Sweep')
const slices = await parallel(
  areas.map(area => () => agent(
    `You are auditing ONE code area of topology category "${category}" (project ${project}).\n` +
    `Code area: "${area.name}". Directories/files: ${(area.dirs || []).join(', ') || 'discover them'}\n\n` +
    `Lens for THIS area only (do not audit neighboring categories' code):\n` +
    `- Contracts to check: ${JSON.stringify(area.contracts || [])}\n` +
    `- Seam guarantees as PRODUCER: ${JSON.stringify(area.seamsProducer || [])}\n` +
    `- Seam expectations as CONSUMER: ${JSON.stringify(area.seamsConsumer || [])}\n\n` +
    `Read the ACTUAL code and return an AREA_SLICE. Rules:\n` +
    `- Record what IS, not what should be. Including violations.\n` +
    `- Every finding's evidence MUST be "file:line — <what the code does vs. what the lens item requires>". No evidence = mark Unknown.\n` +
    `- Contract findings use Pass/Fail/Partial/Unknown. Producer seam findings use Honored/Violated/Partial/Unknown. Consumer seam findings use Safe/Over-reliant/Unknown.\n` +
    `- For a consumer seam: check whether the code depends on anything NOT in the producer guarantees, and whether it handles guaranteed values being absent.\n` +
    `- drift: current behavior that diverges from documented intent, with file:line.\n` +
    `- parallelImpls: any second implementation of this responsibility you find (the dangerous "two code paths" case), with file:line.\n` +
    `- manualReview: code too complex/abstracted/undocumented to audit confidently in one pass — flag it, do not guess.\n` +
    `You are READ-ONLY. Do not write or edit any file.`,
    { label: `sweep:${area.name}`, phase: 'Sweep', schema: AREA_SLICE, agentType: 'Explore' }
  ))
)

return slices.filter(Boolean)
```

Pass `args: { project, category, areas }` (the partition from Step 2).

> **Why parallel-by-area and not one big audit:** current-state is the slowest read-heavy stage in the pipeline — handlers, DB layer, API boundary, and frontend are independent reads with no data dependency between them. Fanning them out collapses wall-clock to the slowest single area, and each finder loads only its own slice of the contract/seam lens (failure mode #1: context overload). The cost of overlap (a contract appearing in two areas) is a trivial dedupe in synthesis, paid once.

---

#### Step 3B: Prose Mode (Workflow tool not available)

Perform Steps 3B-i through 3B-iii sequentially, treating each code area as a separate pass.

**3B-i: Locate Source Code**

Using `TOPOLOGY-CLAUDE.md` key directories and any source documents from `topology-init`, locate the actual source files for this category.

For each file found, note:
- File path
- Primary responsibility
- Approximate lines of code

If source files have moved or been renamed since the source documents were written, note the discrepancy. Do not stop — adapt to current reality.

**3B-ii: Audit Internal Contract Compliance**

For each relevant contract identified in Step 1, examine the codebase and determine:

**Pass** — The code currently satisfies this invariant
**Fail** — The code currently violates this invariant
**Partial** — The code satisfies some aspects but not others
**Unknown** — Insufficient code visibility to determine (flag for manual review)

For each Fail or Partial, document:
- The specific code path that violates the invariant
- The file and approximate line reference
- The nature of the violation

**3B-iii: Audit Seam Compliance (Producer Side)**

For each seam where this category is the **producer**:

Examine whether the current code actually produces what it committed to guarantee. Check each producer guarantee item:

- Does the code always produce the named type/structure?
- Are all guaranteed fields always populated?
- Is the failure behavior correct (ERROR event vs. silent drop)?

Mark each guarantee: Honored | Violated | Partial | Unknown

**3B-iv: Audit Seam Compliance (Consumer Side)**

For each seam where this category is the **consumer**:

Examine whether the current code only depends on what the producer guarantees — not on undocumented behavior.

- Does the code assume things not in the producer guarantees?
- Does the code handle the case where guaranteed values are absent?

Mark each dependency: Safe | Over-reliant | Unknown

---

### Step 4: Synthesize CURRENT-STATE.md (single-author)

**In Workflow Mode:** Read the returned `AREA_SLICE[]`. Synthesis is **not** fanned out — one author holds the whole picture so cross-area findings reconcile correctly:

- **Files** — union all `files[]` across slices; sort by path.
- **Findings** — group by `id`. When the same contract/seam was checked from two areas, reconcile to the **worst** status (a Fail in any area beats a Pass elsewhere) and merge the evidence strings, attributing each to its area. This is exactly the cross-area regression the sweep exists to catch.
- **Drift / parallel implementations** — union; `parallelImpls` are first-class Known Issues (two code paths for one responsibility is a top-tier finding).
- **Manual review** — union all `manualReview[]`.

**In Prose Mode:** Use findings accumulated across the sequential passes in Step 3B.

Create directory: `{PROJECTS_ACTIVE_DIR}/<project-name>/categories/<category-slug>/`

Create `CURRENT-STATE.md` with the following structure. This is the regression baseline `topology-verify` consumes — carry it over intact between runs:

```markdown
# <Category Title> — Current State

**Project:** <project-name>
**Category:** <category-slug>
**Audited:** <date>
**Status:** Current State Documented

---

## Summary

<2-3 sentences: what this category does today, its primary code paths, its current health.>

## Source Files Audited

| File | Responsibility | Lines |
|------|---------------|-------|
| `path/to/file` | <what it does> | ~N |

## Relevant Contracts

<List each contract ID and title that governs this category>

## Relevant Seams

**As producer:**
- Seam N — <title>

**As consumer:**
- Seam N — <title>

---

## Internal Contract Compliance

### Contract <N> — <Title>

**Status:** Pass | Fail | Partial | Unknown

<If Fail or Partial:>
**Violation:** <description>
**Code path:** `file:approx-line` — <what the code does vs. what the contract requires>

---

## Seam Compliance — Producer Side

### Seam <N> — <Title> (This category is producer)

**Overall status:** Honored | Violated | Partial

For each guarantee:

| Guarantee | Status | Notes |
|-----------|--------|-------|
| <guarantee text> | Honored/Violated/Partial | <specific code evidence> |

---

## Seam Compliance — Consumer Side

### Seam <N> — <Title> (This category is consumer)

**Overall status:** Safe | Over-reliant | Mixed

| Dependency | Status | Notes |
|------------|--------|-------|
| <what code depends on> | Safe/Over-reliant | <evidence> |

---

## Known Issues Summary

<Bulleted list of every violation, partial compliance, over-reliance, drift, or parallel implementation found.
This becomes the primary input to topology-gap. Be precise — generic statements are not useful here.>

- **[Contract N]** <specific violation>
- **[Seam N — producer]** <specific violation>
- **[Seam N — consumer]** <specific over-reliance>
- **[Parallel impl]** <two competing code paths for one responsibility, file:line each>

---

## Code Paths Requiring Manual Review

<Any areas where the code is too complex, abstracted, or undocumented to audit confidently.
Flag these for human review before gap analysis proceeds.>
```

### Step 5: Update TOPOLOGY-CLAUDE.md

Update the categories table in `TOPOLOGY-CLAUDE.md` to reflect that current state has been documented for this category:

```
| N | <Category Name> | `categories/<slug>/` | Current State Documented |
```

### Step 6: Report Completion

```
## topology-current-state Complete

**Category:** <title>
**Project:** <project-name>
**Output:** {PROJECTS_ACTIVE_DIR}/<project-name>/categories/<slug>/CURRENT-STATE.md
**Mode:** Workflow (<N> finders) | Prose (sequential)
**Workflow runId:** <runId>  (Workflow mode only)

### Code Areas Swept
<area names> — <N> finders, <M> files audited  (Workflow mode)
OR
<N> files audited across <M> code areas  (prose mode)

### Contract Compliance Summary
| Contract | Status |
|----------|--------|
| C<N> — <title> | Pass/Fail/Partial/Unknown |

### Seam Compliance Summary
| Seam | Role | Status |
|------|------|--------|
| S<N> — <title> | Producer | Honored/Violated/Partial |
| S<N> — <title> | Consumer | Safe/Over-reliant/Mixed |

### Issues Found: <N>
<Brief list of the most critical issues, including any parallel implementations>

### Requires Manual Review: <Y/N>
<If Y, list the specific areas>

### Next Step
Run: /topology-gap <project-name> <category-slug>
```

---

## Important Notes

- **Truth only** — this document records what IS, not what SHOULD BE. Aspirational statements belong in `topology-future-state`, not here.
- **Evidence required** — every compliance finding must reference a specific file or code path. "Probably compliant" is not a finding. In Workflow mode the `AREA_SLICE` schema enforces this: a finding with no `file:line` evidence is `Unknown`, never Pass.
- **Unknown is valid** — if a code path is too complex to audit in one pass, mark it Unknown and flag it. Do not guess.
- **The workflow is read-only and writes nothing** — finders only return `AREA_SLICE` data; the main loop writes CURRENT-STATE.md and updates TOPOLOGY-CLAUDE.md. This keeps the audit boundary clean and non-destructive.
- **Synthesis is single-author, not fan-out** — one author reconciles cross-area findings (worst-status wins on a shared contract; parallel implementations surface as a top-tier Known Issue). Fanning out the synthesis would lose exactly the cross-area regressions the sweep exists to catch.
- **Categories are independent** — do not audit a neighboring category's code in this pass. Only audit the category specified. Cross-category issues are seam violations and belong in the compliance sections.
- **Run for every category before running topology-gap on any** — gap analysis is more accurate when multiple current-state documents exist, because boundary gaps require both sides to be visible.
- **Parallel implementations are a top-tier finding** — two competing code paths for one responsibility are more dangerous than a straightforward violation because neither path knows the other exists. Surface them explicitly in Known Issues with file:line for both paths.

$ARGUMENTS
