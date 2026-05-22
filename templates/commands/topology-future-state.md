# topology-future-state

Produce the future state document for one category — what the category looks like when all implementation phases are complete. Written before implementation begins so there is no post-hoc rationalization. Becomes one half of the final topology-verify check.

## Usage

```
/topology-future-state <project-name> <category-slug>
```

### Arguments

- `<project-name>` — the project directory name under `{PROJECTS_ACTIVE_DIR}/`
- `<category-slug>` — the category to document

---

## Prerequisites

- [ ] `TOPOLOGY-CLAUDE.md` exists
- [ ] `CONTRACT-SHEET.md` exists
- [ ] `SYSTEM-TOPOLOGY.md` exists
- [ ] `categories/<category-slug>/CURRENT-STATE.md` exists
- [ ] `categories/<category-slug>/GAP-ANALYSIS.md` exists
- [ ] `categories/<category-slug>/implementation/` exists (phase plan scaffolded)

If the implementation directory is missing, run `/topology-phase-plan <project-name> <category-slug>` first.

---

{{#if MULTI_AGENT}}
## {DELEGATE_AGENT_NAME} Pair Mode (optional)

If `{DELEGATE_FLAG}` appears anywhere in `$ARGUMENTS`, enter **{DELEGATE_AGENT_NAME} Pair Mode** before executing any step below. Full rules live in `{DELEGATE_PROTOCOL_FILE}`.

Procedure:

1. Read `{DELEGATE_PROTOCOL_FILE}`.
2. Post a Handoff Plan table mapping every step in the Instructions section below to either `Claude` or `{DELEGATE_AGENT_NAME}`, with a one-line rationale each. **Informational** — the `{DELEGATE_FLAG}` flag is already the user's ACK.
3. Proceed immediately per the Handoff Plan; record attribution in the category RUNBOOK per the protocol. Given this command is judgment-dense (see note below), the plan should land with nearly every step on Claude; flag any {DELEGATE_AGENT_NAME}-delegated step as a notice so the user can object in the same turn if desired.

Where {DELEGATE_AGENT_NAME} pays off most for this command: **minimal**. This command is almost entirely judgment — defining the desired end state requires cross-category reasoning and trade-off calls that a stateless {DELEGATE_AGENT_NAME} call cannot do well. Consider running this one without `{DELEGATE_FLAG}`. If `{DELEGATE_FLAG}` is passed, propose a plan where nearly every step is `Claude`, and restrict {DELEGATE_AGENT_NAME} to narrow structured-extraction tasks only (e.g., "list every invariant bullet from Contract N as a normalized array"). Warn the user in the Handoff Plan that the savings will be small.

Strip `{DELEGATE_FLAG}` from `$ARGUMENTS` before substituting into the positional args below.

---

{{/if}}
## Instructions

### Step 1: Load All Context

Read:
1. `CURRENT-STATE.md` — baseline: what exists today
2. `GAP-ANALYSIS.md` — all gaps being addressed and their target resolutions
3. `CONTRACT-SHEET.md` — invariants this category must satisfy
4. `SYSTEM-TOPOLOGY.md` — seam guarantees this category must honor
5. The implementation plan (`implementation/<Category>-Implementation-Plan.md`) — all phases, tasks, and exit criteria

The future state document must describe the end state after all phases complete, derived from the current state plus all gap resolutions. It is not speculative — it is a projection of the explicit work in the plan.

### Step 2: Derive Future State Assertions

For each contract relevant to this category, write a concrete assertion about the future state:
- What code path satisfies the invariant?
- What is the explicit behavior that proves compliance?

For each seam where this category is producer, write assertions for every guarantee:
- What code produces the guarantee?
- What is the exact type/structure emitted?
- What is the failure behavior?

For each seam where this category is consumer, write assertions about safe dependency:
- What does the code depend on?
- Is that dependency within the guaranteed set?

These assertions become the binary verification checklist for `topology-verify`.

### Step 3: Create FUTURE-STATE.md

```markdown
# <Category Title> — Future State

**Project:** <project-name>
**Category:** <category-slug>
**Written:** <date>
**Describes:** End state after all <N> implementation phases complete
**Verified against:** CONTRACT-SHEET.md + SYSTEM-TOPOLOGY.md

> This document is written before implementation. It describes what WILL BE TRUE
> when the work is done. topology-verify uses this document as its checklist.
> If implementation discovers that a future state assertion is wrong, update this
> document via a Decision Log entry — not silently.

---

## Summary

<3-4 sentences describing this category's end state: what it does, how it works,
what guarantees it provides, what problems from the current state are resolved.>

---

## Contract Compliance — Future State

For each relevant contract, explicit statements of compliance.

### Contract <N> — <Title>

**Compliance status (future):** Full

**How compliance is achieved:**
<Specific code path or architectural decision that satisfies this invariant>

**Verifiable proof:**
- `<file>.<function/type>` — <what it does that satisfies the contract>
- <Observable behavior that can be checked>

---

## Seam Compliance — Producer Side (Future State)

### Seam <N> — <This Category> → <Consumer Category>

**Overall status (future):** Fully Honored

For each guarantee:

| Guarantee | Future Implementation | Verifiable Check |
|-----------|----------------------|-----------------|
| <guarantee text> | <how code produces this> | <binary check> |

**Failure behavior:**
<What happens when the producer-side code fails — what ERROR event is emitted,
what the consumer sees>

---

## Seam Compliance — Consumer Side (Future State)

### Seam <N> — <Producer Category> → <This Category>

**Overall status (future):** Safe

| Dependency | What code depends on | Is it guaranteed? |
|------------|---------------------|------------------|
| <dependency> | <code path> | Yes — by S<N> guarantee <N> |

---

## Key Structural Changes from Current State

<What changes architecturally. Not a list of files changed — a description of
the structural difference between current and future state.>

**Before:**
<Current structural description>

**After:**
<Future structural description>

---

## What This Category No Longer Does (After Rebuild)

<Explicit list of current behaviors that are removed. This is important —
it documents intentional removals, not accidental regressions.>

- ~~<Current behavior>~~ — removed because <reason tied to contract or decision>

---

## Future State Verification Checklist

> topology-verify will check every item on this list. Each item must be binary
> (pass/fail with evidence). If an item cannot be checked programmatically,
> describe the manual check precisely.

### Contract Checks
- [ ] **C<N>:** <specific binary check>
- [ ] **C<N>:** <specific binary check>

### Seam Producer Checks
- [ ] **S<N> guarantee 1:** <specific binary check>
- [ ] **S<N> guarantee 2:** <specific binary check>

### Seam Consumer Checks
- [ ] **S<N> dependency safe:** <specific binary check>

### Behavioral Checks
- [ ] <Observable system behavior that demonstrates correctness>
- [ ] <No regression from current working behaviors — specific>

---

## Deferred Items

<Anything discovered during planning that belongs in a future phase or a different
category. Does not affect this category's completion, but should be tracked.>

| Item | Belongs To | Priority | Notes |
|------|-----------|----------|-------|
```

### Step 4: Cross-Check Against Implementation Plan

After creating the future state document, do a quick cross-check:

- For every exit criteria item in every phase of the implementation plan, is there a corresponding verification check in the Future State Verification Checklist?
- For every contract listed in the plan's "Contracts This Plan Satisfies" table, is there a Contract Compliance section in this document?
- For every seam in the plan's "Seams This Plan Advances" table, is there a Seam Compliance section?

If any are missing, add them. The future state document and the implementation plan's exit criteria must be consistent.

### Step 5: Update TOPOLOGY-CLAUDE.md

Update the categories table:

```
| N | <Category Name> | `categories/<slug>/` | Future State Documented |
```

### Step 6: Report Completion

```
## topology-future-state Complete

**Category:** <title>
**Project:** <project-name>
**Output:** {PROJECTS_ACTIVE_DIR}/<project-name>/categories/<slug>/FUTURE-STATE.md

### Verification Checklist Summary
- Contract checks: <N>
- Seam producer checks: <N>
- Seam consumer checks: <N>
- Behavioral checks: <N>
- Total items: <N>

### Cross-Check Result
- Plan exit criteria covered: <N>/<N>
- Contracts covered: <N>/<N>
- Seams covered: <N>/<N>

### Deferred Items: <N>
<List any deferred items that other categories should know about>

### Next Steps
Begin implementation: /topology-implement <project-name> <category-slug>
```

---

## Important Notes

- **Written before implementation — always** — this document's value is that it was written before the code was changed. If it is written after implementation, it becomes a rationalization document, not a specification document. The date matters.
- **Assertions must be verifiable** — every item in the verification checklist must be checkable with a binary yes/no. "Works correctly" is not verifiable. "Component X is the only writer to data store Y" is verifiable.
- **Removals are as important as additions** — documenting what this category no longer does prevents the old behavior from being treated as a regression during verify.
- **No implementation surprises should change this document silently** — if implementation discovers that a future state assertion is incorrect, a Decision Log entry must be written explaining why, and this document is then amended. Silently changing it defeats its purpose.

$ARGUMENTS
