# topology-init

Initialize a new topology-driven rebuild project. Creates the project root directory and all four foundation documents from source material. This is the only topology command that runs without prior topology outputs — it must run first.

> **See `.claude/commands/topology-PRINCIPLES.md` for the design discipline behind this skill.** In particular: foundation document mutation discipline (CONTRACT-SHEET / SYSTEM-TOPOLOGY append-only after init; DECISION-LOG append-only forever); the category CLAUDE.md template (Step 8.5) responds directly to failure modes 1, 2, and 4 (context overload, scattered cross-cutting concerns, phase-context loss).

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

### Step 8.5: Create per-category CLAUDE.md (forward-apply only)

For each category identified in Step 4, create `categories/<slug>/CLAUDE.md`. This is the doc the implementing agent loads first when picking up the category cold. It is the **filtered view** of the project-wide foundation documents, narrowed to what THIS category needs.

> **Forward-apply only.** This step runs only on `topology-init` for new projects. Existing projects (initialized before this step landed) keep their current shape; do NOT retroactively scaffold category CLAUDE.md files into pre-existing projects. The original project owner can opt in by deleting `categories/<slug>/CLAUDE.md` and re-running a project-prep step (or hand-authoring per the template here).

The template:

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

<contracts (events, types, RPCs) this category emits — list each with the seam it belongs to>

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
topology-implement     ← Run per category (delegates to project-next-phase)
topology-verify        ← Run per category
topology-integrate     ← Run after every 2-3 categories verify
topology-e2e           ← Optional: extract runtime test cases, move to e2e/
topology-promote       ← Final: synthesize to tier docs, archive
topology-status        ← Run at any time
```

## Recommended Category Execution Order
<Derived from source material dependency analysis. Update after topology-gap runs confirm ordering.>

## Parallel Groups

<Derived from execution order dependency analysis. Categories within the same group
touch non-overlapping files and can be implemented simultaneously in git worktrees.
topology-implement uses this section to decide when worktree isolation is needed.>

<For each group of categories that can run in parallel, create a subsection:>

### Group 1 — <Phase or Description>
| Category | Files Touched | Worktree Branch |
|----------|--------------|-----------------|
| <cat-1> | `path/to/files/` | `{BRANCH_PREFIX}<project>/<cat-1>` |
| <cat-2> | `path/to/files/` | `{BRANCH_PREFIX}<project>/<cat-2>` |

**Isolation required:** Yes — files are in different directories with no shared modifications.

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

### Foundation Documents Created
- CONTRACT-SHEET.md — <N> contracts, all Proposed
- SYSTEM-TOPOLOGY.md — <N> seams, all Proposed
- DECISION-LOG.md — <N> seed decisions
- VERIFICATION-TABLE.md — <N> categories × <N> seams
- TOPOLOGY-CLAUDE.md — project master file

### Per-Category CLAUDE Files Created (Step 8.5)
- categories/<slug>/CLAUDE.md — <N> category-level filtered views (one per category)

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
- **Seams are bilateral** — both sides of a seam must be explicitly considered. Do not write a seam contract that only describes what one side needs.
- **Foundation documents are append-only after init** — CONTRACT-SHEET.md and SYSTEM-TOPOLOGY.md are only amended through Decision Log entries. topology-init is the only time they are written from scratch.
- **Status is always Proposed after init** — nothing is Verified until topology-verify runs.

$ARGUMENTS
