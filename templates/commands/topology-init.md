# topology-init

Initialize a new topology-driven rebuild project. Creates the project root directory and all four foundation documents from source material, then authors per-category `CLAUDE.md` files (serially or, when the `Workflow` tool is available, in a parallel fan-out). This is the only topology command that runs without prior topology outputs — it must run first.

> **See `{COMMANDS_DIR}/topology-PRINCIPLES.md` for the design discipline behind this skill.** In particular: foundation document mutation discipline (CONTRACT-SHEET / SYSTEM-TOPOLOGY append-only after init; DECISION-LOG append-only forever); the category CLAUDE.md template (Step 8.5) responds directly to failure modes 1, 2, and 4 (context overload, scattered cross-cutting concerns, phase-context loss); seams are bilateral (failure mode #3).

## Usage

```
/topology-init <project-name> --from-doc <path>
/topology-init <project-name> --from-dir <path>
/topology-init <project-name> --from-doc <primary-path> --from-dir <supporting-dir-path>
```

### Arguments

- `<project-name>` — slug for the project directory (e.g., `{EXAMPLE_PROJECT_SLUG}`). Used as the directory name under `{PROJECTS_ACTIVE_DIR}/`.
- `--from-doc <path>` — path to a single primary context document. This document is the anchor — it takes precedence over all other sources for any contested decisions.
- `--from-dir <path>` — path to a directory of supporting documents. All markdown files in the directory are read and synthesized.
- Both flags may be combined. If both are provided, `--from-doc` is the primary anchor and `--from-dir` provides supporting context.

At least one of `--from-doc` or `--from-dir` is required. Running without source material is not permitted — the agent cannot derive correct contracts from general knowledge alone.

### Placeholders

| Placeholder | Meaning |
|-------------|---------|
| `<project-name>` | Project slug → directory under `{PROJECTS_ACTIVE_DIR}/` |
| `<slug>` | A single category's directory slug |
| `<date>` | Run date, stamped by the main loop (never inside a workflow script) |

---

## Orchestration mode

**Steps 1–8 and 9–10 always run in the main agent loop.** The four shared foundation documents (CONTRACT-SHEET, SYSTEM-TOPOLOGY, DECISION-LOG, VERIFICATION-TABLE) are single-author synthesis — they demand one coherent voice across categories and must not be fanned out.

**Step 8.5 (per-category CLAUDE.md authoring)** can run in either of two modes:

| Mode | When to use | How |
|------|-------------|-----|
| **Prose / serial** | Default; `Workflow` tool unavailable or N ≤ 3 categories | Iterate over categories in the main loop, write each CLAUDE.md directly |
| **Workflow / parallel fan-out** | `Workflow` tool available and N ≥ 4 categories | Author a JS Workflow script with `parallel()`, one agent per category; see Step 8.5 |

Invoking `/topology-init` is sufficient opt-in for whichever mode is used — no separate authorization step is needed. The parallel mode has **no HITL-mid-run risk** and crosses **no E2E/promote boundary**; it only creates docs.

---

## Instructions

### Step 1: Read All Source Material

Read every file specified by the flags:

- If `--from-doc` is provided: read the full document. Note any sections explicitly labeled as contracts, invariants, seams, decisions, or categories.
- If `--from-dir` is provided: list all `.md` files in the directory, read each one. Build a synthesis across them — note areas of agreement, note any conflicts.
- If both provided: read `--from-doc` first as the anchor. Use `--from-dir` files for depth on specific categories. Where the two conflict, `--from-doc` wins.

### Step 1.5: Check E2E Projects for Overlap

After reading source material but before creating the project, scan `{PROJECTS_E2E_DIR}/` for semantically related projects. E2E projects contain verified architectural work (contracts, seams, decisions, topology docs) that will be promoted to canonical topology docs upon completion.

1. List all directories in `{PROJECTS_E2E_DIR}/`
2. For each, read `TOPOLOGY-CLAUDE.md` (summary + category list) to check for semantic overlap with the new project
3. If overlap exists:
   - Read the overlapping e2e project's CONTRACT-SHEET.md, SYSTEM-TOPOLOGY.md, and DECISION-LOG.md
   - Inherit relevant contracts, seams, and decisions into the new project's foundation docs — do not re-derive what has already been verified
   - Reference the e2e project by name in the DECISION-LOG.md (e.g., "Inherited from e2e project `{EXAMPLE_PROJECT_SLUG}`")
   - If the new project extends the e2e project's scope, document the extension boundary clearly
   - If the new project contradicts the e2e project, flag the conflict for user resolution before proceeding

This prevents redundant analysis and ensures new projects build on verified foundations rather than starting from scratch in areas that have already been systematically analyzed.

### Step 2: Check for Existing Project

Check if `{PROJECTS_ACTIVE_DIR}/<project-name>/` already exists.

If it exists and contains a `TOPOLOGY-CLAUDE.md`, stop and report:

> Project `<project-name>` is already initialized at `{PROJECTS_ACTIVE_DIR}/<project-name>/`. To re-initialize, delete or rename the existing directory first. To check status, run `/topology-status <project-name>`.

If it exists but is empty or only contains source-staged docs, proceed.

### Step 3: Create Project Directory Structure

Create the following directory structure:

```
{PROJECTS_ACTIVE_DIR}/<project-name>/
├── TOPOLOGY-CLAUDE.md
├── CONTRACT-SHEET.md
├── SYSTEM-TOPOLOGY.md
├── DECISION-LOG.md
├── VERIFICATION-TABLE.md
├── categories/
└── integration-checkpoints/
```

### Step 4: Derive Categories

From the source material, extract the complete list of categories for this project. Each category is an isolated, coherent slice of the system that will get its own `topology-current-state`, gap analysis, phase plan, and verification pass.

For each category, identify:
- Its name (slug for directory, title for docs)
- What it owns (the system responsibilities it governs)
- Which other categories it connects to (preliminary seam identification)

If the source material explicitly lists categories, use them exactly. If categories must be inferred, derive them from the system's major subsystems and document the inference in the Decision Log.

**Create a subdirectory for each category** under `categories/`:

```
categories/
├── <category-1-slug>/
├── <category-2-slug>/
├── ...
└── <category-N-slug>/
```

These directories will be populated by later topology commands (`topology-current-state`, `topology-gap`, etc.).

### Step 5: Create CONTRACT-SHEET.md

Extract all contract invariants from the source material. Each invariant must be:

- Stated as an always-true fact, not a goal or aspiration
- Assigned a number (Contract 1, Contract 2, etc.)
- Linked to one or more categories it governs
- Given a status of `Proposed`

Format:

```markdown
# Contract Sheet

> Status: Proposed | Last amended: <date>
> Source: <path to --from-doc or synthesized from --from-dir>

## Contract 1 — <Title>

**Status:** Proposed
**Governs:** <category names>
**Invariant:**

<The always-true statement. Written as a fact. No hedging.>

**Verification criteria:**
- <Binary check 1>
- <Binary check 2>
```

End the document with the Verification Summary table:

```markdown
## Verification Summary

| Contract | Governs | Status | Verified In Phase |
|----------|---------|--------|------------------|
| C1 — <Title> | <categories> | Proposed | — |
```

### Step 6: Create SYSTEM-TOPOLOGY.md

Extract all seams from the source material. A seam is a boundary between two categories where data, events, or control flow crosses. For each seam:

- Assign a number (Seam 1, Seam 2, etc.)
- Identify producer category and consumer category
- Define what crosses the boundary (named, typed)
- List what the producer guarantees (explicit commitments)
- List what the consumer can depend on
- List what the consumer cannot assume
- Assign ownership (which category is responsible for the producer side)
- Set status to `Proposed`

Format:

```markdown
# System Topology

> All seams start as Proposed. A seam becomes Verified only after both participating
> categories pass topology-verify for that seam.

## Seam 1 — <Producer Category> → <Consumer Category>

**Status:** Proposed
**Producer:** <category>
**Consumer:** <category>
**Ownership:** <category> owns the producer side

### What Crosses
`<TypeName> { field1, field2, ... }`

### Producer Guarantees
- <Explicit commitment 1>
- <Explicit commitment 2>

### Consumer Can Depend On
- <What is safe to rely on>

### Consumer Cannot Assume
- <What must not be relied upon>

### Verification Criteria
- [ ] Producer always emits <X> before crossing boundary
- [ ] Consumer never reads <Y> that wasn't guaranteed
```

End with a seam index table:

```markdown
## Seam Index

| Seam | Producer | Consumer | Status |
|------|----------|----------|--------|
| S1 — <title> | <cat> | <cat> | Proposed |
```

### Step 7: Create DECISION-LOG.md

Seed the log with all decisions made in the source material (look for sections labeled "decisions", "design decisions", "decision record", or similar). Add the topology-init run itself as an entry.

Format:

```markdown
# Decision Log

> Decisions are permanent. Once written, they record why a choice was made.
> To amend a contract or seam, add a new decision entry — do not delete prior ones.

## {EXAMPLE_DL_ID} — <Title>

**Date:** <date>
**Decision:** <What was decided>
**Rationale:** <Why this choice over alternatives>
**Alternatives considered:** <What else was considered>
**Affects:** <Contract N, Seam N, Category name>
**Status:** Active

---
```

### Step 8: Create VERIFICATION-TABLE.md

Build the two-dimensional verification table. Rows are categories. Columns are: Internal Contract, then one column per seam that involves at least one category. Mark cells `—` where a category does not participate in a seam.

Format:

```markdown
# Verification Table

> A category is not complete until every cell in its row is green.
> Run `/topology-status <project-name>` at any time to see current state.

| Category | Internal | S1 | S2 | S3 | S4 | S5 | S6 | S7 | S8 |
|----------|----------|----|----|----|----|----|----|----|-----|
| <Cat 1>  | —        | —  | —  | —  | —  | —  | —  | —  | —  |
```

Legend:
- `—` = Category does not participate in this seam
- ` ` (blank) = Not yet started
- `⏳` = In progress
- `✓` = Verified
- `✗` = Failing (needs remediation)

> **The four foundation docs above (Steps 5–8) are written by the main loop, single-author.** They are the synthesis substrate the per-category CLAUDE.md authoring step (Step 8.5) reads from. Do not start any fan-out until all four exist on disk — each agent reads them to build its filtered view.

### Step 8.5: Author per-category CLAUDE.md (forward-apply only)

For each category identified in Step 4, create `categories/<slug>/CLAUDE.md`. This is the doc the implementing agent loads first when picking up the category cold. It is the **filtered view** of the project-wide foundation documents, narrowed to what THIS category needs.

> **Forward-apply only.** This step runs only on `topology-init` for new projects. Existing projects (initialized before this step landed) keep their current shape; do NOT retroactively scaffold category CLAUDE.md files into pre-existing projects. The original project owner can opt in by deleting `categories/<slug>/CLAUDE.md` and re-running a project-prep step (or hand-authoring per the template here).

#### Option A — Prose / serial mode (default)

When the `Workflow` tool is unavailable, or when there are three or fewer categories, iterate over the category list in the main loop and write each `categories/<slug>/CLAUDE.md` directly using the template below. Apply the filtering rules (Decisions in scope, Cross-category touchpoints) for each category before writing. Proceed to Step 8.6 after all files are written.

#### Option B — Workflow / parallel fan-out mode

When the `Workflow` tool is available and there are four or more categories, author the script below (substituting the project-specific values into `args`) and invoke it via the `Workflow` tool. The main loop resumes at Step 8.6 once the workflow returns.

Each category's CLAUDE.md is an independent filtered view of foundation docs that are already final, so one agent per category authors its own with no contention. No shared file is mutated inside the workflow; there is no HITL boundary to cross.

```js
export const meta = {
  name: 'topology-init-category-claudes',
  description: 'Fan out one agent per category to author its filtered CLAUDE.md from the finished foundation docs',
  phases: [
    { title: 'Author', detail: 'one agent per category writes categories/<slug>/CLAUDE.md and returns its filtered slice' },
  ],
}

// --- inline schema for this command's structured return ---
// One category's authored CLAUDE.md, summarized for the main loop to reconcile.
const CATEGORY_CLAUDE = {
  type: 'object',
  required: ['category', 'dlsInScope', 'touchpoints'],
  properties: {
    category:    { type: 'string' },                  // category slug
    written:     { type: 'boolean' },                 // true once categories/<slug>/CLAUDE.md is on disk
    dlsInScope:  { type: 'array', items: { type: 'object', required: ['id', 'why'], properties: {
      id:  { type: 'string' },                        // "DL-003"
      why: { type: 'string' },                        // one line: which contract/seam/responsibility this DL anchors here
    }}},
    touchpoints: { type: 'array', items: { type: 'object', required: ['seam', 'role', 'adjacent'], properties: {
      seam:     { type: 'string' },                   // "S5"
      role:     { enum: ['Producer', 'Consumer'] },
      adjacent: { type: 'string' },                   // adjacent category slug
    }}},
    notes: { type: 'string' },
  },
}

const { project, categories, root, template } = args
// categories: [{ slug, title }]
// root:       "{PROJECTS_ACTIVE_DIR}/<project-name>/"
// template:   the verbatim category CLAUDE.md template string (below), with placeholders intact

phase('Author')
const authored = await parallel(
  categories.map(c => () => agent(
    `You are authoring the filtered category CLAUDE.md for ONE category of topology project "${project}".\n` +
    `Category: ${c.title} (slug: ${c.slug})\n` +
    `Project root: ${root}\n\n` +
    `Read these finished foundation docs (do NOT modify them — they are append-only after init):\n` +
    `- ${root}TOPOLOGY-CLAUDE.md\n` +
    `- ${root}CONTRACT-SHEET.md\n` +
    `- ${root}SYSTEM-TOPOLOGY.md\n` +
    `- ${root}DECISION-LOG.md\n\n` +
    `Produce ${root}categories/${c.slug}/CLAUDE.md by filling this exact template:\n\n` +
    template + `\n\n` +
    `FILTERING RULES (load-bearing — these are why this doc exists):\n` +
    `- Decisions in scope: include a DL row iff (a) its Affects: line names a contract or seam this category participates in, ` +
    `OR (b) its Affects: line names this category explicitly, OR (c) it is a project-wide foundational decision (first ~5–10 DLs). ` +
    `If unsure, INCLUDE it — over-inclusion is recoverable; a missing load-bearing decision is the failure mode this section prevents. ` +
    `For a DL that touches the category broadly without anchoring on a specific contract/seam, mark the third column "general scope".\n` +
    `- Cross-category touchpoints: for every seam in SYSTEM-TOPOLOGY.md where this category is producer or consumer, add a row citing the adjacent category's CLAUDE.md path.\n` +
    `- Responsibility/Owns/Produces/Consumes/Out-of-scope: derive sole-ownership claims from the foundation docs; surface EVERY clear out-of-scope claim; never blur with adjacent categories.\n` +
    `- Implementation entry points: leave empty (later commands populate it).\n\n` +
    `Write the file, then return a CATEGORY_CLAUDE summarizing the DLs you scoped in and the touchpoints you listed.`,
    { label: `author:${c.slug}`, phase: 'Author', schema: CATEGORY_CLAUDE }
  ))
)

return authored.filter(Boolean)
```

Pass `args: { project, categories, root, template }` where `template` is the verbatim category CLAUDE.md template (next subsection) with all `<placeholders>` intact for the agent to fill.

> **Why fan-out here is safe.** Each agent writes a distinct file (`categories/<slug>/CLAUDE.md`), reads-only the shared foundation docs, and mutates nothing else. There is no shared-file contention, no git mutation, and no decision to adjudicate — so there is no HITL boundary to cross inside the workflow. The workflow returns the per-category slices; the main loop reconciles them in Step 8.6.

#### The category CLAUDE.md template

```markdown
# <Category Title> — Category CLAUDE

**Project:** <project-name>
**Category slug:** <slug>
**Created by:** topology-init Step 8.5 on <date>

> This is the filtered view the implementing agent loads first when working in this category. The umbrella project doc is `TOPOLOGY-CLAUDE.md`; the canonical decision register is `DECISION-LOG.md`; this doc points at both with this category's slice highlighted.

---

## Responsibility (one sentence)

<the single sole-ownership claim from discovery; do not blur with adjacent categories>

## Owns

<what this category is the sole writer of — data, state, types>

## Produces

<contracts (events, types, service methods) this category emits — list each with the seam it belongs to>

## Consumes

<contracts this category depends on from elsewhere — list each with the seam it belongs to>

## Out of scope

<at least one explicit "don't try to solve X here; that lives in <other category>" statement; surface every clear-out-of-scope claim from discovery>

---

## Decisions in scope

> Decisions from `DECISION-LOG.md` that constrain THIS category. The full register is canonical; this list is the agent's filter to avoid scanning the whole register at every phase boundary.

| DL-ID | Title | Why this category cares |
|-------|-------|------------------------|
| DL-<N> | <title> | <one-line: which contract/seam/responsibility this DL anchors here> |

<If a DL touches the category broadly without anchoring on a specific contract or seam, list it with "general scope" in the third column.>

---

## Cross-category touchpoints

> Seams this category participates in. When changing the producer side of any seam below, read the adjacent category's CLAUDE.md first to surface consumer expectations (`topology-PRINCIPLES.md` failure mode #3).

| Seam | Role | Adjacent category | Read before changing |
|------|------|-------------------|----------------------|
| S<N> | Producer / Consumer | <slug> | `categories/<slug>/CLAUDE.md` |

---

## Implementation entry points

<Initially empty — populated by `topology-current-state` and `topology-phase-plan` as those commands run. Examples once populated: file:line locations for the producer side of each owned contract; the package-level boundaries the implementer first edits; the test files most relevant to verification.>

---

## How to use this doc

When picking up this category cold, load (in order):

1. `TOPOLOGY-CLAUDE.md` (umbrella; ~5 min)
2. This file (responsibility + filtered decisions + touchpoints)
3. `DECISION-LOG.md` entries cited in the "Decisions in scope" table above (skip the rest of the register)
4. Adjacent categories' CLAUDE.md ONLY for seams this phase touches
5. `VERIFICATION-TABLE.md` row for this category
6. The active phase's `implementation/phase-N/PHASE-N-SESSION-PROMPT.md` and `PHASE-N-RUNBOOK.md`

Loading more is over-eager; loading less is under-prepared. See `topology-PRINCIPLES.md` § "Implementer's pre-flight context loadout".
```

#### Filtering Decisions in scope

For each DL in `DECISION-LOG.md`, decide whether it constrains this category. A DL is "in scope" for category X if any of the following are true:
- The DL's `Affects:` line names a contract or seam that category X participates in
- The DL's `Affects:` line names category X explicitly
- The DL is a project-wide foundational decision (architectural posture, scope grammar, audit shape — typically the first 5–10 DLs)

If unsure, include the DL — over-inclusion is recoverable; missing a load-bearing decision is the failure mode this section exists to prevent.

#### Filtering Cross-category touchpoints

For each seam in `SYSTEM-TOPOLOGY.md`, if category X is the producer or consumer, add a row. Cite the adjacent category's CLAUDE.md path so the implementer can navigate without re-deriving the seam graph.

### Step 8.6: Reconcile category CLAUDE.md files (main loop)

After Step 8.5 completes — whether serial or fan-out — verify coherence across the authored files. In Workflow mode, read the returned `CATEGORY_CLAUDE[]`; in serial mode, verify against what was just written.

- **Every category authored.** If any category is missing a file (or `written !== true` in Workflow mode), author its CLAUDE.md from the template directly — never leave a category without its filtered view.
- **Touchpoint symmetry (seams are bilateral).** For each touchpoint where category A names category B as adjacent (Producer), confirm B's CLAUDE.md lists the same seam with role Consumer (and vice versa). If a seam appears on only one side, that is an authoring gap — patch the missing side's CLAUDE.md so both ends agree. A one-sided seam reference is failure mode #2/#3 leaking in.
- **DL coverage.** Confirm every project-wide foundational DL (first ~5–10) appears in scope for the categories it governs. If a load-bearing DL is absent from a category that participates in its affected contract/seam, add it (over-inclusion is correct here).

Do not edit the foundation docs during reconciliation — they are append-only after init. Reconciliation only touches `categories/<slug>/CLAUDE.md` files.

### Step 9: Create TOPOLOGY-CLAUDE.md

The master project file. Analogous to `CLAUDE.md` in the implementation project system.

```markdown
# <Project Name> — Topology Project

## Purpose
<Derived from source material — why this rebuild exists>

## Project Root
`{PROJECTS_ACTIVE_DIR}/<project-name>/`

## Foundation Documents
| Document | Purpose | Mutated After Init? |
|----------|---------|-------------------|
| `CONTRACT-SHEET.md` | 8+ invariants — SSOT | Only via Decision Log |
| `SYSTEM-TOPOLOGY.md` | All seam contracts | Only via Decision Log |
| `DECISION-LOG.md` | Permanent decision record | Append-only |
| `VERIFICATION-TABLE.md` | Two-dimensional status | Updated by commands |

## Categories
| # | Name | Directory | CLAUDE | Status |
|---|------|-----------|--------|--------|
| 1 | <Cat 1> | `categories/<slug>/` | `categories/<slug>/CLAUDE.md` | Not Started |

## Command Sequence
```
topology-init          ← You are here (complete)
topology-current-state ← Run per category
topology-gap           ← Run per category
topology-phase-plan    ← Run per category
topology-future-state  ← Run per category
topology-implement     ← Run per category (delegates to project-next-phase); worktrees off origin/main
topology-verify        ← Run per category
topology-merge         ← Land worktree branches via PR (never merge into local main)
topology-integrate     ← Run after every 2-3 categories verify
topology-e2e           ← Optional: extract runtime test cases, move to e2e/
topology-promote       ← Final: synthesize to tier docs, archive
topology-status        ← Run at any time
```

> **Git & PR coordination:** worktrees branch off fresh `origin/main` (git fetch first), feature work is never committed to local `main`, and branches land via `topology-merge` → PR (never `git merge` into local `main`). Run the divergence guard before starting any work. Parallel agents coordinate via the PR queue and the live coordination registry (`{DOCS_ROOT}/coordination/IN-FLIGHT.md`). Full rules: `{COMMANDS_DIR}/topology-PRINCIPLES.md § Git & PR coordination`.

## Recommended Category Execution Order
<Derived from source material dependency analysis. Update after topology-gap runs confirm ordering.>

## Parallel Groups

<Derived from execution order dependency analysis. Categories within the same group
touch non-overlapping files and can be implemented simultaneously in git worktrees.
topology-implement (and topology-dispatch in Workflow mode) use this section to decide
when worktree isolation is needed. All worktree branches are created off fresh
`origin/main` (git fetch first), never local `main`, and each lands via
`/topology-merge` → PR (never a git merge into local main). Run the divergence guard
before starting (git rev-list --count origin/main..main must be 0). Full rules:
`{COMMANDS_DIR}/topology-PRINCIPLES.md § Git & PR coordination`.>

<For each group of categories that can run in parallel, create a subsection:>

### Group 1 — <Phase or Description>
| Category | Files Touched | Worktree Branch (off origin/main) |
|----------|--------------|-----------------------------------|
| <cat-1> | `path/to/files/` | `{BRANCH_PREFIX}<project>/<cat-1>` |
| <cat-2> | `path/to/files/` | `{BRANCH_PREFIX}<project>/<cat-2>` |

**Isolation required:** Yes — files are in different directories with no shared modifications.
**Landing:** each branch lands via `/topology-merge` → PR off fresh `origin/main`; never `git merge` into local `main`.

### Group 2 — <Phase or Description>
<Same format. Categories here depend on Group 1 being merged first.>

<If no parallel groups exist (all categories are sequential), write:>

No parallel groups — all categories have sequential dependencies.

## Context Recovery
If context is lost mid-project:
1. Read `TOPOLOGY-CLAUDE.md` (this file) for project structure
2. Read `VERIFICATION-TABLE.md` for current state
3. Read `categories/<active-category>/` docs for active work
4. Run `/topology-status <project-name>` to get a full dashboard
```

### Step 10: Report Completion

Output a structured completion summary:

```
## topology-init Complete

**Project:** <name>
**Root:** {PROJECTS_ACTIVE_DIR}/<project-name>/
**Category-CLAUDE mode:** serial | parallel fan-out (runId: <runId if Workflow was used>)

### Foundation Documents Created (main loop, single-author)
- CONTRACT-SHEET.md — <N> contracts, all Proposed
- SYSTEM-TOPOLOGY.md — <N> seams, all Proposed
- DECISION-LOG.md — <N> seed decisions
- VERIFICATION-TABLE.md — <N> categories × <N> seams
- TOPOLOGY-CLAUDE.md — project master file

### Per-Category CLAUDE Files Created (Step 8.5)
- categories/<slug>/CLAUDE.md — <N> category-level filtered views (one per category)
- Touchpoint symmetry reconciled: <N> seams confirmed bilateral; <N> one-sided references patched
- DL coverage: <N> foundational DLs confirmed in scope across affected categories

### Categories Identified
<list with slugs>

### Required Human Review Before Proceeding

The following decisions require your review before running topology-current-state:

1. **Category list** — Are these the right categories and scoping?
2. **Contract invariants** — Are all invariants stated correctly as always-true facts?
3. **Seam contracts** — Are producer guarantees realistic commitments, not aspirations?
4. **Decision log seeds** — Are there additional decisions from source material that should be captured?

Once reviewed, run:
  /topology-current-state <project-name> <first-category-slug>
```

---

## Important Notes

- **Never guess contracts** — if source material is ambiguous about an invariant, write it as ambiguous and flag it for human review in the completion report. Do not resolve ambiguity by inventing a contract.
- **Seams are bilateral** — both sides of a seam must be explicitly considered. Do not write a seam contract that only describes what one side needs. The Step 8.6 touchpoint-symmetry reconciliation enforces this whether category CLAUDEs are authored serially or via fan-out.
- **Foundation documents are append-only after init** — CONTRACT-SHEET.md and SYSTEM-TOPOLOGY.md are only amended through Decision Log entries; DECISION-LOG.md is append-only forever. topology-init is the only time the foundation docs are written from scratch. The category-CLAUDE authoring step and its reconciliation read these docs but never mutate them.
- **Status is always Proposed after init** — nothing is Verified until topology-verify runs.
- **The four foundation docs stay single-author** — only the N independent per-category CLAUDE.md files may fan out in parallel. Cross-category synthesis (contracts, seams, decisions, verification table) demands one coherent voice and stays in the main loop.
- **No HITL, no E2E/promote boundary** — this command only creates docs. Whether serial or fan-out, no step pauses for adjudication mid-run.

$ARGUMENTS
