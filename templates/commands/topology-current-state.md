# topology-current-state

Audit the actual codebase for one category and produce a truthful current state document. Uses the Contract Sheet and System Topology as the audit lens. Records only what the code actually does — including violations. Does not express aspirations.

## Usage

```
/topology-current-state <project-name> <category-slug>
```

### Arguments

- `<project-name>` — the project directory name under `{PROJECTS_ACTIVE_DIR}/`
- `<category-slug>` — the category slug matching a directory in `categories/` (e.g., `{EXAMPLE_CATEGORY_SLUG}`)

---

## Prerequisites

The following must exist before this command runs:

- [ ] `{PROJECTS_ACTIVE_DIR}/<project-name>/TOPOLOGY-CLAUDE.md`
- [ ] `{PROJECTS_ACTIVE_DIR}/<project-name>/CONTRACT-SHEET.md`
- [ ] `{PROJECTS_ACTIVE_DIR}/<project-name>/SYSTEM-TOPOLOGY.md`
- [ ] The category slug must appear in the categories table in `TOPOLOGY-CLAUDE.md`

If any prerequisite is missing, stop and report: "Run `/topology-init <project-name>` first."

---

{{#if MULTI_AGENT}}
## {DELEGATE_AGENT_NAME} Pair Mode (optional)

If `{DELEGATE_FLAG}` appears anywhere in `$ARGUMENTS`, enter **{DELEGATE_AGENT_NAME} Pair Mode** before executing any step below. Full rules live in `{DELEGATE_PROTOCOL_FILE}`.

Procedure:

1. Read `{DELEGATE_PROTOCOL_FILE}`.
2. Post a Handoff Plan table mapping every step in the Instructions section below to either `Claude` or `{DELEGATE_AGENT_NAME}`, with a one-line rationale each. **Informational** — the `{DELEGATE_FLAG}` flag is already the user's ACK.
3. Proceed immediately per the Handoff Plan; record attribution in the category RUNBOOK per the protocol. If you need to deviate from the Default split in a way the user might not expect (e.g., delegating a deliverable writeup to {DELEGATE_AGENT_NAME}), flag it as a notice in the Handoff Plan and proceed unless the user objects in the same turn.

Where {DELEGATE_AGENT_NAME} pays off most for this command: **Step 2 (source file enumeration)** and the grep sweeps inside **Steps 4–5 (seam compliance)**. Synthesis, interpretation of invariants, and the CURRENT-STATE.md writeup (Step 6) stay on Claude.

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

### Step 2: Locate Source Code

Using `TOPOLOGY-CLAUDE.md` key directories and any source documents from `topology-init`, locate the actual source files for this category.

For each file found, note:
- File path
- Primary responsibility
- Approximate lines of code

If source files have moved or been renamed since the source documents were written, note the discrepancy. Do not stop — adapt to current reality.

### Step 3: Audit Internal Contract Compliance

For each relevant contract identified in Step 1, examine the codebase and determine:

**Pass** — The code currently satisfies this invariant
**Fail** — The code currently violates this invariant
**Partial** — The code satisfies some aspects but not others
**Unknown** — Insufficient code visibility to determine (flag for manual review)

For each Fail or Partial, document:
- The specific code path that violates the invariant
- The file and approximate line reference
- The nature of the violation

### Step 4: Audit Seam Compliance (Producer Side)

For each seam where this category is the **producer**:

Examine whether the current code actually produces what it committed to guarantee. Check each producer guarantee item:

- Does the code always produce the named type/structure?
- Are all guaranteed fields always populated?
- Is the failure behavior correct (ERROR event vs. silent drop)?

Mark each guarantee: Honored | Violated | Partial | Unknown

### Step 5: Audit Seam Compliance (Consumer Side)

For each seam where this category is the **consumer**:

Examine whether the current code only depends on what the producer guarantees — not on undocumented behavior.

- Does the code assume things not in the producer guarantees?
- Does the code handle the case where guaranteed values are absent?

Mark each dependency: Safe | Over-reliant | Unknown

### Step 6: Create Category Directory and CURRENT-STATE.md

Create directory: `{PROJECTS_ACTIVE_DIR}/<project-name>/categories/<category-slug>/`

Create `CURRENT-STATE.md` with the following structure:

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

<Bulleted list of every violation, partial compliance, or over-reliance found. This becomes
the primary input to topology-gap. Be precise — generic statements are not useful here.>

- **[Contract N]** <specific violation>
- **[Seam N — producer]** <specific violation>
- **[Seam N — consumer]** <specific over-reliance>

---

## Code Paths Requiring Manual Review

<Any areas where the code is too complex, abstracted, or undocumented to audit confidently.
Flag these for human review before gap analysis proceeds.>
```

### Step 7: Update TOPOLOGY-CLAUDE.md

Update the categories table in `TOPOLOGY-CLAUDE.md` to reflect that current state has been documented for this category:

```
| N | <Category Name> | `categories/<slug>/` | Current State Documented |
```

### Step 8: Report Completion

```
## topology-current-state Complete

**Category:** <title>
**Project:** <project-name>
**Output:** {PROJECTS_ACTIVE_DIR}/<project-name>/categories/<slug>/CURRENT-STATE.md

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
<Brief list of the most critical issues>

### Requires Manual Review: <Y/N>
<If Y, list the specific areas>

### Next Step
Run: /topology-gap <project-name> <category-slug>
```

---

## Important Notes

- **Truth only** — this document records what IS, not what SHOULD BE. Aspirational statements belong in `topology-future-state`, not here.
- **Evidence required** — every compliance finding must reference a specific file or code path. "Probably compliant" is not a finding.
- **Unknown is valid** — if a code path is too complex to audit in one pass, mark it Unknown and flag it. Do not guess.
- **Categories are independent** — do not audit a neighboring category's code in this pass. Only audit the category specified. Cross-category issues are seam violations and belong in the compliance sections.
- **Run for every category before running topology-gap on any** — gap analysis is more accurate when multiple current-state documents exist, because boundary gaps require both sides to be visible.

$ARGUMENTS
