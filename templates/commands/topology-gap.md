# topology-gap

Produce a gap analysis for one category using its Current State document and the foundation documents. Generates two strictly separated gap lists: internal gaps (category doesn't meet its own contracts) and boundary gaps (category violates a seam contract with a neighbor). Seeds the Verification Table with initial gap counts.

When the Workflow tool is available the fan-out path (Step 2 — Workflow mode) runs one read-only agent per governed contract and per participating seam concurrently. When the Workflow tool is not available, follow the sequential prose path (Step 2 — Sequential mode) instead. Synthesis — merging slices, the dependency graph, and the recommended sequencing — is always single-author in the main loop, never inside a fan-out agent.

## Usage

```
/topology-gap <project-name> <category-slug>
```

### Arguments

- `<project-name>` — the project directory name under `{PROJECTS_ACTIVE_DIR}/`
- `<category-slug>` — the category to analyze

---

## Prerequisites

Run: `/topology-ready <project-name> <category-slug> --action gap`.
If NO-GO: resolve each unmet check per the remediation, then re-run.

## {DELEGATE_AGENT_NAME} Pair Mode (optional)

If `{DELEGATE_FLAG}` appears anywhere in `$ARGUMENTS`, enter **{DELEGATE_AGENT_NAME} Pair Mode** before executing any step below. Full rules live in `{DELEGATE_PROTOCOL_FILE}`.

Procedure:

1. Read `{DELEGATE_PROTOCOL_FILE}`.
2. Post a Handoff Plan table mapping every step in the Instructions section below to either `Claude` or `{DELEGATE_AGENT_NAME}`, with a one-line rationale each. **Informational** — the `{DELEGATE_FLAG}` flag is already the user's ACK.
3. Proceed immediately per the Handoff Plan; record attribution in the category RUNBOOK per the protocol. If you need to deviate from the Default split in a way the user might not expect, flag it as a notice and proceed unless the user objects in the same turn.

Where {DELEGATE_AGENT_NAME} pays off most for this command: **narrow cross-reference lookups** (e.g., "list every call site of contract-governed function X" or "confirm no caller of Y bypasses the producer seam"). Gap identification, categorization, the dependency graph, and the GAP-ANALYSIS.md writeup stay on Claude — this command is synthesis-heavy and benefits least from delegation.

Strip `{DELEGATE_FLAG}` from `$ARGUMENTS` before substituting into the positional args below.

---

{{/if}}
## Instructions

### Step 1: Assemble the Target Set

Read these foundation documents and build the flat work-list that the gap analysis will cover:

1. `CURRENT-STATE.md` for this category — the full audit findings.
2. `CONTRACT-SHEET.md` — enumerate every contract **this category governs**. Each becomes one **internal target** (`{contract, criteria, currentState}`).
3. `SYSTEM-TOPOLOGY.md` — enumerate every seam **this category participates in** (as producer, consumer, or both). Each becomes one **boundary target** (`{seam, seamSlug, side, producerGuarantees, consumerExpectations, currentState}`).
4. Any `CURRENT-STATE.md` files for neighboring categories (categories that share a seam with this one) — these exist if those categories have already been audited. They provide the other side of boundary gaps. Attach each neighbor's relevant findings to its matching boundary target as `neighborState`.

Emit the count before proceeding:
`Gap analysis for <category>: <N> governed contracts, <M> participating seams (<P> producer, <K> consumer).`

---

### Step 2 — Workflow mode (preferred when the Workflow tool is available)

Author the script below and call the `Workflow` tool. **Invoking `/topology-gap` is the Workflow opt-in** — a skill whose instructions tell you to call Workflow is the authorization. All agents in this workflow are **read-only**; they read code and docs and return structured gap slices. The main loop does all writing.

```js
export const meta = {
  name: 'topology-gap',
  description: 'Gap analysis for one category: fan out per governed contract + per participating seam, return structured gaps',
  phases: [
    { title: 'Internal', detail: 'one agent per governed contract — internal gaps' },
    { title: 'Boundary', detail: 'one agent per participating seam — boundary gaps (bilateral)' },
  ],
}

// --- inline gap schema ---
const GAP = {
  type: 'object',
  required: ['id', 'type', 'severity', 'description', 'effort'],
  properties: {
    id:                 { type: 'string' },                                 // "IG-<slug>-N" | "BG-<seam-slug>-N"
    type:               { enum: ['internal', 'boundary'] },
    contract:           { type: 'string' },                                 // internal: "C<N> — <title>"
    seam:               { type: 'string' },                                 // boundary: "S<N> — <Producer> → <Consumer>"
    side:               { enum: ['producer', 'consumer', 'both', 'n/a'] }, // boundary only
    severity:           { enum: ['critical', 'high', 'medium', 'low'] },   // impact, NOT effort
    description:        { type: 'string' },                                 // what the code does vs. what is required
    evidence:           { type: 'string' },                                 // "file:line — precise violation"
    producerCurrent:    { type: 'string' },                                 // boundary: what producer emits today
    consumerCurrent:    { type: 'string' },                                 // boundary: what consumer depends on today
    bothSideVisibility: { enum: ['complete', 'one-sided'] },               // boundary: neighbor CURRENT-STATE available?
    blocks:             { type: 'array', items: { type: 'string' } },       // seams/categories that can't verify until fixed
    effort:             { enum: ['small', 'medium', 'large'] },             // small <4h | medium 4-16h | large >16h
    belongsToNeighbor:  { type: 'string' },                                 // set iff gap belongs to another category
  },
}
// A whole slice for one target (one contract or one seam) — agents return one of these.
const GAP_SLICE = {
  type: 'object',
  required: ['target', 'gaps'],
  properties: {
    target: { type: 'string' },              // the contract or seam id analyzed
    gaps:   { type: 'array', items: GAP },  // [] when the target is fully met (record the clean pass)
    notes:  { type: 'string' },
  },
}

const { project, category, slug, internalTargets, boundaryTargets } = args

phase('Internal')
// One read-only agent per governed contract → internal gaps (CURRENT-STATE vs. own contract).
const internal = await parallel(
  internalTargets.map((t, i) => () => agent(
    `READ-ONLY gap analysis. Project ${project}, category "${category}".\n` +
    `Compare CURRENT-STATE against ONE governed contract.\n` +
    `Contract: ${t.contract}\nVerification criteria: ${t.criteria}\n` +
    `CURRENT-STATE findings for this contract:\n${t.currentState}\n\n` +
    `An INTERNAL gap = a place where this category's implementation fails to satisfy this contract invariant.\n` +
    `For each Fail or Partial, read the actual code and emit a GAP:\n` +
    `- id "IG-${slug}-${i + 1}" (suffix -a/-b if a contract yields several)\n` +
    `- severity by IMPACT not effort (critical=correctness/data-loss/security; high=feature broken; medium=edge-case; low=quality)\n` +
    `- description = what the code does vs. what the contract requires\n` +
    `- evidence = "file:line — precise violation" (read the code; do not guess)\n` +
    `- blocks = which seams/categories cannot be verified until this is closed\n` +
    `- effort = small|medium|large\n` +
    `If a gap actually belongs to a neighboring category, set belongsToNeighbor and keep it minimal.\n` +
    `Return a GAP_SLICE with gaps:[] if the contract is fully met. You may not write files.`,
    { label: `internal:${t.contract}`, phase: 'Internal', schema: GAP_SLICE, agentType: 'Explore' }
  ))
)

phase('Boundary')
// One read-only agent per participating seam → boundary gaps (bilateral where neighbor CURRENT-STATE exists).
const boundary = await parallel(
  boundaryTargets.map((t, i) => () => agent(
    `READ-ONLY gap analysis. Project ${project}, category "${category}".\n` +
    `Compare CURRENT-STATE against ONE seam this category participates in.\n` +
    `Seam: ${t.seam}\nThis category's role: ${t.side}\n` +
    `Producer Guarantees: ${t.producerGuarantees}\nConsumer Expectations: ${t.consumerExpectations}\n` +
    `This category's seam findings:\n${t.currentState}\n` +
    `Neighbor's CURRENT-STATE (other side), if available:\n${t.neighborState || 'NOT YET AUDITED — one-sided view'}\n\n` +
    `A BOUNDARY gap = this category violates the seam contract: a PRODUCER failing to provide a guarantee, ` +
    `or a CONSUMER relying on something not guaranteed. Check BOTH sides where the neighbor state is present.\n` +
    `For each Violated/Partial/Over-reliant finding, read the code and emit a GAP:\n` +
    `- id "BG-${t.seamSlug}-${i + 1}", type "boundary", seam "${t.seam}", side producer|consumer|both\n` +
    `- producerCurrent = what the producer actually emits today; consumerCurrent = what the consumer actually depends on today\n` +
    `- evidence = "file:line — precise violation"; severity by IMPACT; effort = small|medium|large\n` +
    `- bothSideVisibility = "complete" if neighbor CURRENT-STATE was available, else "one-sided"\n` +
    `- blocks = what cannot be verified until closed\n` +
    `If a gap actually belongs to the neighbor, set belongsToNeighbor.\n` +
    `Return a GAP_SLICE with gaps:[] if the seam is honored on this category's side. You may not write files.`,
    { label: `boundary:${t.seam}`, phase: 'Boundary', schema: GAP_SLICE, agentType: 'Explore' }
  ))
)

return { internal: internal.filter(Boolean), boundary: boundary.filter(Boolean) }
```

Pass `args: { project, category, slug, internalTargets, boundaryTargets }`. Each `internalTargets` element is `{contract, criteria, currentState}`; each `boundaryTargets` element is `{seam, seamSlug, side, producerGuarantees, consumerExpectations, currentState, neighborState}`.

> **Why fan out per target (not one big agent):** each contract/seam comparison is independent, so they run concurrently — the wall-clock is the slowest single comparison, not the sum. Each agent stays in a tiny context (one contract or one seam + its CURRENT-STATE slice) which keeps evidence precise. **Synthesis is single-author**: merging the slices, deduping cross-target gaps, building the dependency graph, and sequencing are judgment that lives in the main loop, never in a fan-out agent.

Capture the `runId` returned by the Workflow tool. Record it in the completion report (Step 8). If a neighbor's current-state lands later and you want to re-check a one-sided boundary gap, re-invoke with `resumeFromRunId: <runId>` so the unaffected per-contract/per-seam slices return cached.

Proceed to **Step 3** with the returned `{ internal, boundary }` slices.

---

### Step 2 — Sequential mode (when Workflow tool is not available)

Work through the target set assembled in Step 1 in a single pass:

**Internal gaps:** For each governed contract, compare the "Internal Contract Compliance" section of `CURRENT-STATE.md` against the contract invariants. For each Fail or Partial finding, create a gap entry following the schema in Step 3 below.

**Boundary gaps:** For each participating seam, compare the "Seam Compliance — Producer Side" and "Seam Compliance — Consumer Side" sections of `CURRENT-STATE.md` against the seam guarantees. Cross-reference with the neighboring category's `CURRENT-STATE.md` if available. For each Violated, Partial, or Over-reliant finding, create a gap entry.

Then proceed to Step 3.

---

### Step 3: Extract and Finalize Gap Lists (main loop — single-author synthesis)

Whether arriving from the Workflow path or the sequential path, produce two strictly separated gap lists.

**Internal gap entry fields:**

- **Gap ID:** IG-<category-slug>-<N> (e.g., IG-{EXAMPLE_CATEGORY_SLUG}-1)
- **Type:** Internal
- **Contract:** Contract N — <title>
- **Severity:** Critical | High | Medium | Low
  - Critical: System correctness is broken (data loss, billing errors, security)
  - High: Feature doesn't work reliably
  - Medium: Feature works but incorrectly in edge cases
  - Low: Code quality / maintainability issue
- **Description:** What the code does vs. what the contract requires
- **Evidence:** `file:line` — precise violation (read the code; do not guess)
- **Blocks:** Which seams or other categories this gap blocks from being verified
- **Effort estimate:** Small (< 4h) | Medium (4–16h) | Large (> 16h)

**Boundary gap entry fields:**

- **Gap ID:** BG-<seam-slug>-<N> (e.g., BG-{EXAMPLE_SEAM_SLUG}-1)
- **Type:** Boundary
- **Seam:** Seam N — <title>
- **Side:** Producer | Consumer | Both
- **Severity:** Critical | High | Medium | Low
- **Description:** Which guarantee is violated or which undocumented dependency exists
- **Producer side (current):** What the producer actually emits/produces today
- **Consumer side (current):** What the consumer actually depends on today
- **Both-side visibility:** If the neighboring category's `CURRENT-STATE.md` is available, describe the gap from both sides. If not, flag as "one-sided view — confirm after neighboring category's current-state is complete."
- **Blocks:** What cannot be verified until this gap is closed
- **Effort estimate:** Small | Medium | Large

**When arriving from the Workflow path:** flatten `GAP_SLICE`s into the internal-gap list and the boundary-gap list. Renumber within each family so IDs are contiguous. Pull any gap with `belongsToNeighbor` set into the **Gaps Deferred to Neighboring Categories** table. Mark every boundary gap whose `bothSideVisibility` is `one-sided` for revisit after the neighbor's current-state runs.

### Step 4: Build Dependency Graph (main loop — single-author synthesis)

For all gaps identified, build a dependency graph:
- Which gaps must be closed before other gaps can be addressed?
- Which gaps unblock the most other categories (use each gap's `blocks` list)?
- Which gaps are truly isolated?

This graph drives phase ordering in `topology-phase-plan`.

Express as a simple ordered list:
1. Gaps with no dependencies (can be fixed in any order)
2. Gaps that unblock other categories (fix these first)
3. Gaps with dependencies (must wait for their prerequisites)

### Step 5: Create GAP-ANALYSIS.md

```markdown
# <Category Title> — Gap Analysis

**Project:** <project-name>
**Category:** <category-slug>
**Analyzed:** <date>
**Source:** CURRENT-STATE.md + CONTRACT-SHEET.md + SYSTEM-TOPOLOGY.md
**Method:** <workflow fan-out — <N> per-contract + <M> per-seam read-only agents; synthesis single-author | sequential single-pass>

---

## Summary

**Internal gaps:** <N> (<N> Critical, <N> High, <N> Medium, <N> Low)
**Boundary gaps:** <N> (<N> Critical, <N> High, <N> Medium, <N> Low)
**Total gaps:** <N>
**Blocking other categories:** <Y/N — list which>

---

## Internal Gaps

> Gaps where this category's implementation fails its own contract invariants.

### IG-<slug>-1 — <Title>

**Severity:** Critical | High | Medium | Low
**Contract:** C<N> — <title>
**Effort:** Small | Medium | Large

**Current behavior:**
<What the code does today>

**Required behavior:**
<What the contract invariant requires>

**Specific violation:**
`file:approx-line` — <precise description>

**Blocks:**
- <Seam N or Category N that cannot verify until this is fixed>

---

## Boundary Gaps

> Gaps where this category violates a seam contract with a neighboring category.

### BG-<seam-slug>-1 — <Title>

**Severity:** Critical | High | Medium | Low
**Seam:** S<N> — <Producer> → <Consumer>
**This category's role:** Producer | Consumer | Both
**Effort:** Small | Medium | Large

**The violated commitment:**
<Which specific guarantee or dependency assumption is wrong>

**Producer side (current):**
<What the producer actually emits/produces today>

**Consumer side (current):**
<What the consumer actually depends on today>

**Gap:**
<The delta between what's committed and what's real>

**Both-side visibility:** Complete | One-sided (neighboring CURRENT-STATE.md not yet available)

**Blocks:**
- <What cannot be verified until this is closed>

---

## Dependency Graph

### Must fix first (unblocks others)
1. <Gap ID> — <title> — unblocks <category or seam>
2. <Gap ID> — <title> — unblocks <category or seam>

### Can fix in parallel
- <Gap ID> — <title>
- <Gap ID> — <title>

### Dependent (must wait)
- <Gap ID> — depends on <Gap ID>

---

## Recommended Phase Sequencing

Based on the dependency graph, recommended order for fixing gaps in this category:

**Phase 1 — Critical unblocking work:**
<Gap IDs and titles>

**Phase 2 — Core compliance:**
<Gap IDs and titles>

**Phase 3 — Remaining gaps:**
<Gap IDs and titles>

---

## Gaps Deferred to Neighboring Categories

<Any gaps that were discovered during this analysis that belong to a neighboring category,
not this one. These should be raised when that category's gap analysis runs.>

| Gap | Belongs To | Description |
|-----|-----------|-------------|
| <ID> | <category> | <description> |
```

### Step 6: Update VERIFICATION-TABLE.md

Add gap counts to the Verification Table for this category. Do not mark anything as verified — only record that gaps exist.

Update the category row with the gap count in parentheses where applicable:

```
| <Category> | ✗ (N gaps) | ✗ (N gaps) | — | ✗ (N gaps) | ... |
```

### Step 7: Update TOPOLOGY-CLAUDE.md

Update the categories table status:

```
| N | <Category Name> | `categories/<slug>/` | Gap Analysis Complete |
```

### Step 8: Report Completion

```
## topology-gap Complete

**Category:** <title>
**Project:** <project-name>
**Output:** {PROJECTS_ACTIVE_DIR}/<project-name>/categories/<slug>/GAP-ANALYSIS.md
**Workflow runId:** <runId | n/a — sequential mode>

### Gap Summary
- Internal gaps: <N> (C:<N> H:<N> M:<N> L:<N>)
- Boundary gaps: <N> (C:<N> H:<N> M:<N> L:<N>)

### Critical Gaps
<List critical gaps with IDs and one-line descriptions>

### Unblocking Priority
<The top 1-3 gaps that must be addressed first to unblock other categories>

### Neighboring Categories to Audit First
<Any categories where one-sided boundary gap views exist — their current-state
should be run before phase planning proceeds for this category>

### Next Step
Run: /topology-phase-plan <project-name> <category-slug>
(Or run topology-current-state for neighboring categories first if one-sided gaps exist)
```

---

## Important Notes

- **The workflow is fully read-only; the main loop owns synthesis.** Fan-out agents return gap slices only — they never write files, never build the dependency graph, never sequence. Merging slices, the dependency graph, and the recommended sequencing are single-author judgment in the main loop where the full picture is visible. This keeps the HITL boundary clean and the dependency graph coherent.
- **Separate internal and boundary gaps strictly** — mixing them obscures the dependency graph. Internal gaps can sometimes be fixed independently; boundary gaps always require coordination across categories.
- **One-sided boundary gaps are still gaps** — if the neighboring category hasn't been audited yet, record the gap with what you know. Flag it as one-sided and revisit after that category's current-state runs. Do not wait.
- **Gaps belong to categories, not files** — a gap in file X belongs to whichever category owns file X. When a fan-out agent finds a gap that belongs to a neighbor, it sets `belongsToNeighbor`; the main loop routes it to the Deferred table. If ownership is unclear, flag it.
- **Severity is about impact, not effort** — a small-effort fix can be Critical severity if it's causing data loss right now. The `GAP` schema separates `severity` (impact) from `effort` explicitly.
- **The gap IDs and dependency graph are consumed downstream** — `topology-phase-plan` reads the `IG-`/`BG-` IDs, the dependency graph, and the recommended sequencing directly. Do not rename the scheme or drop the graph.
- **Resume over re-run (Workflow mode).** The workflow returns a `runId`; if a neighbor's current-state lands later and you want to re-check a one-sided boundary gap, re-invoke with `resumeFromRunId: <runId>` so the unaffected per-contract/per-seam slices return cached rather than re-running from scratch.

$ARGUMENTS
