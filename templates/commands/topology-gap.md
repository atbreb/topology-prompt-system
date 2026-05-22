# topology-gap

Produce a gap analysis for one category using its Current State document and the foundation documents. Generates two strictly separated gap lists: internal gaps (category doesn't meet its own contracts) and boundary gaps (category violates a seam contract with a neighbor). Seeds the Verification Table with initial gap counts.

## Usage

```
/topology-gap <project-name> <category-slug>
```

### Arguments

- `<project-name>` — the project directory name under `{PROJECTS_ACTIVE_DIR}/`
- `<category-slug>` — the category to analyze

---

## Prerequisites

- [ ] `TOPOLOGY-CLAUDE.md` exists
- [ ] `CONTRACT-SHEET.md` exists
- [ ] `SYSTEM-TOPOLOGY.md` exists
- [ ] `categories/<category-slug>/CURRENT-STATE.md` exists and is not empty

If `CURRENT-STATE.md` is missing, stop and report: "Run `/topology-current-state <project-name> <category-slug>` first."

---

{{#if MULTI_AGENT}}
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

### Step 1: Load Documents

Read:
1. `CURRENT-STATE.md` for this category — the full audit findings
2. `CONTRACT-SHEET.md` — the invariants relevant to this category
3. `SYSTEM-TOPOLOGY.md` — all seams involving this category
4. Any `CURRENT-STATE.md` files for neighboring categories (categories that share a seam with this one) — these exist if those categories have already been audited. They provide the other side of boundary gaps.

### Step 2: Extract Internal Gaps

An internal gap is a place where this category's current implementation fails to satisfy one of its own contract invariants.

Source: the "Internal Contract Compliance" section of `CURRENT-STATE.md`.

For each Fail or Partial finding, create a gap entry:

- **Gap ID:** IG-<category-slug>-<N> (e.g., IG-{EXAMPLE_CATEGORY_SLUG}-1)
- **Type:** Internal
- **Contract:** Contract N — <title>
- **Severity:** Critical | High | Medium | Low
  - Critical: System correctness is broken (data loss, billing errors, security)
  - High: Feature doesn't work reliably
  - Medium: Feature works but incorrectly in edge cases
  - Low: Code quality / maintainability issue
- **Description:** What the code does vs. what the contract requires
- **Blocks:** Which seams or other categories this gap blocks from being verified
- **Effort estimate:** Small (< 4h) | Medium (4-16h) | Large (> 16h)

### Step 3: Extract Boundary Gaps

A boundary gap is a place where this category violates a seam contract — either as a producer failing to provide guarantees, or as a consumer relying on things not guaranteed.

Source: the "Seam Compliance — Producer Side" and "Seam Compliance — Consumer Side" sections of `CURRENT-STATE.md`. Cross-reference with the neighboring category's `CURRENT-STATE.md` if available.

For each Violated, Partial, or Over-reliant finding, create a gap entry:

- **Gap ID:** BG-<seam-slug>-<N> (e.g., BG-{EXAMPLE_SEAM_SLUG}-1)
- **Type:** Boundary
- **Seam:** Seam N — <title>
- **Side:** Producer | Consumer | Both
- **Severity:** Critical | High | Medium | Low
- **Description:** Which guarantee is violated or which undocumented dependency exists
- **Both-side visibility:** If the neighboring category's `CURRENT-STATE.md` is available, describe the gap from both sides. If not, flag as "one-sided view — confirm after neighboring category's current-state is complete."
- **Blocks:** What cannot be verified until this gap is closed
- **Effort estimate:** Small | Medium | Large

### Step 4: Build Dependency Graph

For all gaps identified, build a dependency graph:
- Which gaps must be closed before other gaps can be addressed?
- Which gaps unblock the most other categories?
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

- **Separate internal and boundary gaps strictly** — mixing them obscures the dependency graph. Internal gaps can sometimes be fixed independently; boundary gaps always require coordination across categories.
- **One-sided boundary gaps are still gaps** — if the neighboring category hasn't been audited yet, record the gap with what you know. Flag it as one-sided and revisit after that category's current-state runs. Do not wait.
- **Gaps belong to categories, not files** — a gap in file X belongs to whichever category owns file X. If ownership is unclear, flag it.
- **Severity is about impact, not effort** — a small-effort fix can be Critical severity if it's causing data loss right now.

$ARGUMENTS
