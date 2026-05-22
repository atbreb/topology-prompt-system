# Project Prep Scaffolding

Scaffold the full implementation directory structure for a project that already has an implementation plan prepared. Optionally detects and integrates topology context from the project's `{PROJECTS_DIR}/` folder to inject contract and seam awareness into session prompts and runbooks.

## Usage

```
/project-prep-scaffolding <implementation-plan-directory>
```

The argument is the path to the directory containing the implementation plan (e.g., `{PROJECTS_ACTIVE_DIR}/{EXAMPLE_PROJECT_SLUG}/implementation`).

## Prerequisites

The target directory MUST already contain an implementation plan markdown file (e.g., `*-Implementation-Plan*.md` or `*-IMPLEMENTATION-PLAN*.md`). The skill will fail if no plan is found.

## Instructions

### Step 1: Locate and read the implementation plan

1. Look in the provided directory for a markdown file matching `*Implementation*Plan*` or `*IMPLEMENTATION*PLAN*`
2. Read the full plan to extract:
   - **Project name** (from the plan title or H1 heading)
   - **Phase list** with phase numbers and titles (look for `## Phase N` headings or phase tables)
   - **Phase descriptions** (the content under each phase heading)
   - **Key directories** mentioned in the plan
   - **Architecture overview** if present
   - **Conventions** if specified

### Step 2: Scan for topology context

After reading the implementation plan, scan upward from the implementation plan directory to detect existing topology artifacts. Check the following locations in order:

**Project-level topology docs** (within the same project under `{PROJECTS_ACTIVE_DIR}/`):
- `CONTRACT-SHEET.md`
- `SYSTEM-TOPOLOGY.md`
- `DECISION-LOG.md`
- `TOPOLOGY-CLAUDE.md`

**Global topology docs** (at the docs root):
- `{DOCS_ROOT}/GLOBAL-CONTRACTS.md`
- `{DOCS_ROOT}/GLOBAL-TOPOLOGY.md`
- `{DOCS_ROOT}/GLOBAL-DECISIONS.md`

Classify the project into one of three topology states:

| State | Condition | Behavior |
|-------|-----------|----------|
| **Full topology project** | `TOPOLOGY-CLAUDE.md` exists in the project root | This project is managed by the topology command sequence. Do NOT add topology context sections — `topology-phase-plan` handles that. Scaffold normally. |
| **Topology-aware project** | No `TOPOLOGY-CLAUDE.md`, but global docs exist | Read the global docs and extract relevant contracts and seams. Add a Topology Watch List to each session prompt. |
| **Standalone project** | No topology artifacts found anywhere | Scaffold normally with no topology additions. |

If the state is **Topology-aware**, build a working reference:

1. Read `GLOBAL-CONTRACTS.md` — extract all `Active` and `Proposed` contracts. For each, check if the plan's key directories or files overlap with the contract's governing categories or known code paths.
2. Read `GLOBAL-TOPOLOGY.md` — extract all `Active` and `Proposed` seams. For each, check if the plan touches either the producer or consumer side.
3. Read `GLOBAL-DECISIONS.md` — extract any decisions that affect the code paths this plan touches.

Build a **Topology Watch List** — the subset of contracts, seams, and decisions that are relevant to this project. "Relevant" means the plan modifies, reads, or depends on code paths that a contract governs or a seam crosses.

If no contracts, seams, or decisions are relevant, treat the project as **Standalone** — do not add empty topology sections.

### Step 3: Derive the project name

Extract the project name from the plan's title. This becomes the prefix for naming conventions:
- Plan title: "PaymentsGateway -- Implementation Plan v4" -> Project name: "Payments Gateway"
- Plan title: "Reporting Engine -- Implementation Plan" -> Project name: "Reporting Engine"

Use the directory name as a fallback if the title is ambiguous.

### Step 4: Create the CLAUDE.md

Create `CLAUDE.md` in the project directory. Follow the exact structure used by completed projects under `{PROJECTS_DIR}/`. The CLAUDE.md must include:

```markdown
# <Project Name> -- <Short Description>

## Purpose

<1-2 paragraph summary derived from the plan's overview/problem statement>

## Project Context

<Summarize the before/after or current-state/goal-state from the plan>

## Key Directories

<Extract from the plan -- list the relevant source directories and files>

## Conventions

- **500-line file limit** for source files. Split if larger.
- **{PRIMARY_LANGUAGE} patterns**: <project's idiomatic test/error/naming conventions>
- **Shared components first**: check the project's shared UI/library packages before creating new ones; use generated types{{#if HAS_CODEGEN}} (from `{CODEGEN_COMMAND}`){{/if}} instead of hand-writing API types.
<Add any project-specific conventions from the plan, e.g. database/connection-pool rules, framework idioms>

## Implementation Phases

| Phase | Name | Est. Hours | Dependencies | Status |
|-------|------|-----------|--------------|--------|
<Extract phase table from the plan -- all phases start as "Not Started">

**Critical Path**: <Extract from plan or derive from dependencies>

## Phase Directory Convention

Each phase gets its own subdirectory:

\```
Implementation/<Project Name>/
├── CLAUDE.md                              # This file
├── <PLAN-FILENAME>.md                     # Implementation plan
├── phase-N/                               # Phase N: <Title>
│   ├── PHASE-N-SESSION-PROMPT.md          #   Session prompt (paste to start)
│   └── PHASE-N-RUNBOOK.md                 #   Progress tracking (created during impl)
\```

**Rules:**
1. Each phase directory is `phase-N/` (lowercase, hyphenated)
2. Session prompt (`PHASE-N-SESSION-PROMPT.md`) is created **before** starting the phase
3. Runbook (`PHASE-N-RUNBOOK.md`) is updated **during** implementation
4. Session prompts include: preparation tasks, implementation tasks, constraints, FILES TO CREATE/MODIFY/READ tables

## Reference Documents

<List the implementation plan and any related docs mentioned in it>

<If topology-aware:>
## Topology Context

This project has been scaffolded with awareness of the platform's topology layer. The following global documents were consulted during scaffolding:

| Document | Relevant Items |
|----------|---------------|
| GLOBAL-CONTRACTS.md | <list relevant GC IDs> |
| GLOBAL-TOPOLOGY.md | <list relevant GS IDs> |
| GLOBAL-DECISIONS.md | <list relevant GD IDs, or "None"> |

Each session prompt includes a **Topology Watch List** — contracts and seams that this phase's work might affect. These are advisory, not blocking gates. If a watch list item appears to be violated during implementation, log it in the phase runbook's Design Decisions Log and flag it for review.

**Promotion path:** When all phases are complete, run `/project-verify <project-path>` followed by `/project-promote <project-path>` to feed findings back into the tier docs and global topology layer.
<End if>

## Context Recovery

If context is compacted mid-phase, read in this order:
1. This `CLAUDE.md` for conventions, structure, and design decisions
2. `<PLAN-FILENAME>.md` for the relevant phase details
3. `phase-N/PHASE-N-RUNBOOK.md` for progress on the current phase
```

### Step 5: Create phase directories and session prompts

For EACH phase extracted from the plan, create:

1. **Directory**: `phase-N/` (use the phase number from the plan; if phases start at 0, start at 0)

2. **Session Prompt**: `phase-N/PHASE-N-SESSION-PROMPT.md` with this structure:

```markdown
# Phase N Session Prompt -- <Phase Title>

> Use this prompt to start a new Claude Code conversation. It covers preparation tasks and Phase N implementation.

---

## The Prompt

\```
You are implementing Phase N of <Project Name>: <Phase Title>. <1-sentence objective from plan>.

## OBJECTIVE

<Expand from the plan's phase description -- what does this phase deliver?>

## PREREQUISITES

<List prior phases that must be complete, or "None" for Phase 0/1>

## PREPARATION TASKS

### Prep 1: Read the project CLAUDE.md
Read `<Project Dir>/CLAUDE.md` for conventions and project context.

### Prep 2: Read the implementation plan
Read `<Project Dir>/<PLAN-FILENAME>.md` Phase N section for the full task list and exit criteria.

<If phase > 0:>
### Prep 3: Read the previous phase runbook
Read `<Project Dir>/phase-<N-1>/PHASE-<N-1>-RUNBOOK.md` to understand what was delivered.

<Add additional prep tasks based on "Files to Read" or context from the plan>

<If topology-aware:>
### Prep T: Review the Topology Watch List
Read the TOPOLOGY WATCH LIST section at the bottom of this prompt. Before modifying any file listed in the watch list, confirm your changes do not violate the referenced contracts or seam guarantees.
<End if>

## IMPLEMENTATION TASKS

<Extract tasks from the plan for this phase. Structure as:>

### Task N.1: <Title> (<est. hours if available>)

<Description and details from the plan>

### Task N.2: <Title>

<Description and details from the plan>

## RUNBOOK

After completing all tasks, update `PHASE-N-RUNBOOK.md` in this directory with progress.

## CONSTRAINTS

<Extract constraints relevant to this phase from the plan, plus standard ones:>
1. **500-line file limit** for source files.
2. <Phase-specific constraints from the plan>

## FILES TO CREATE

| File | Language | Purpose |
|------|----------|---------|
<Extract from the plan if available, otherwise mark as "TBD during implementation">

## FILES TO MODIFY

| File | Change |
|------|--------|
<Extract from the plan if available>

## FILES TO READ (for context)

| File | Why |
|------|-----|
| `<Project Dir>/CLAUDE.md` | Project conventions |
| `<PLAN-FILENAME>.md` | Phase N task list and exit criteria |
<Add other files referenced in the plan for this phase>

<If topology-aware — add this section:>

## TOPOLOGY WATCH LIST

> These contracts and seams are relevant to this phase's work. They are advisory —
> not hard gates — but violations should be logged in the runbook and flagged for review.
> If you are unsure whether a change violates a watch list item, err on the side of
> logging the concern.

### Contracts to Watch

| Contract | Invariant | Why This Phase Is Relevant |
|----------|-----------|---------------------------|
| GC-NNN | <invariant statement from GLOBAL-CONTRACTS.md> | <this phase modifies code governed by this contract> |

### Seams to Watch

| Seam | Guarantee | Why This Phase Is Relevant |
|------|-----------|---------------------------|
| GS-NNN — <title> | <guarantee text from GLOBAL-TOPOLOGY.md> | <this phase touches producer/consumer code for this seam> |

### Relevant Decisions

| Decision | Summary | Implication |
|----------|---------|-------------|
| GD-NNN | <one-line summary> | <what this means for this phase's work> |

> If you discover a new contract violation, seam regression, or a situation where a
> global decision should be amended, add it to the runbook's Design Decisions Log
> with the prefix `[TOPOLOGY]` so it can be picked up during project-verify.
<End if>
\```

---

## Usage

1. Start a new Claude Code conversation in the `{PROJECT_NAME}` project root
2. Paste the prompt above (everything inside the code fence)
3. Claude will execute preparation tasks, then implementation tasks sequentially
4. Update the RUNBOOK as tasks complete

## Expected Output

<Summarize deliverables from the plan for this phase>

## Estimated Effort

<Extract from the plan>
```

3. **Runbook**: `phase-N/PHASE-N-RUNBOOK.md` with this starter template:

```markdown
# Phase N Runbook: <Phase Title>

## Status: Not Started
## Started:
## Completed:

## Preparation Tasks

<List prep tasks as checkboxes, derived from the session prompt>

---

## Implementation Tasks

<List each task as a section with checkbox, derived from the session prompt>

### Task N.1: <Title>
- **Status**: Not Started
- **Notes**:

### Task N.2: <Title>
- **Status**: Not Started
- **Notes**:

---

## Exit Criteria

<Extract exit/verification criteria from the plan for this phase as checkboxes>

<If topology-aware — add this section:>

## Topology Watch List Results

> Record the outcome of each watch list item after phase completion.
> Prefix any new findings with `[TOPOLOGY]` in the Design Decisions Log below.

| Watch Item | Type | Result | Notes |
|------------|------|--------|-------|
| GC-NNN | Contract | No violation / Potential violation / N/A | |
| GS-NNN | Seam | No regression / Potential regression / N/A | |
<End if>

## Files Created

| File | Language | Lines | Purpose |
|------|----------|-------|---------|

## Files Modified

| File | Change |
|------|--------|

## Deferred Items

<!-- Items discovered during this phase that belong in later phases -->

## Design Decisions Log

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
```

### Step 6: Report completion

After creating all files, output a summary:

```
## Scaffolding Complete

**Project:** <name>
**Directory:** <Path>
**Phases:** <Count>
**Topology state:** Full topology project / Topology-aware / Standalone

<If topology-aware:>
### Topology Watch List Summary
- **Contracts watched:** <N> (across <N> phases)
- **Seams watched:** <N> (across <N> phases)
- **Decisions referenced:** <N>

Watch list items are advisory. Violations found during implementation should be logged
in runbooks with the `[TOPOLOGY]` prefix and reviewed during `/project-verify`.
<End if>

### Files Created

- CLAUDE.md
- phase-0/PHASE-0-SESSION-PROMPT.md
- phase-0/PHASE-0-RUNBOOK.md
- phase-1/PHASE-1-SESSION-PROMPT.md
- phase-1/PHASE-1-RUNBOOK.md
- ...

### Next Steps

1. Review `CLAUDE.md` for accuracy -- adjust conventions or key directories as needed
2. Review each `PHASE-N-SESSION-PROMPT.md` -- refine tasks and constraints
<If topology-aware:>
3. Review the Topology Watch List in each session prompt -- confirm the right contracts and seams are flagged
4. Start Phase <first> by pasting the session prompt into a new Claude Code conversation
5. After all phases complete: `/project-verify <project-path>` then `/project-promote <project-path>`
<Else:>
3. Start Phase <first> by pasting the session prompt into a new Claude Code conversation
<End if>
```

## Important Notes

- **Do NOT modify the implementation plan** -- it is the source of truth
- **Adapt to the plan's structure** -- some plans use `## Phase 1`, others use tables. Extract phases from whatever format is present.
- **Phase numbering follows the plan** -- if the plan starts at Phase 0, start at 0. If it starts at Phase 1, start at 1.
- **Deferred phases** (marked as "Deferred" in the plan) should still get directories and skeleton prompts, but mark them clearly as deferred in the session prompt and runbook.
- **Existing files in the directory should NOT be overwritten** -- if `CLAUDE.md` already exists, warn the user and ask before replacing.
- **Some plans have sub-phases** (e.g., Phase 4a, Phase 4b) -- create separate directories for each: `phase-4a/`, `phase-4b/`.
- **Reference other completed projects** under `{PROJECTS_DIR}/` for tone and detail level if unsure about formatting.
- **Topology context is advisory, not blocking** -- the watch list exists to raise awareness, not to gate implementation. The project-verify and project-promote commands handle the formal checking.
- **Full topology projects are excluded** -- if `TOPOLOGY-CLAUDE.md` exists, the project is already managed by the topology command sequence. `topology-phase-plan` adds its own, more rigorous topology sections to session prompts. Do not add watch lists on top of that.
- **Relevance filtering matters** -- do not dump every contract and seam into every session prompt. Only include items where the phase's FILES TO CREATE/MODIFY/READ overlap with the contract's governed code paths or the seam's crossing points. An irrelevant watch list is worse than no watch list.

$ARGUMENTS
