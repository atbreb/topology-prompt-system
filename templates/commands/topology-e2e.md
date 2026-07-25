# topology-e2e

Move a verified topology project into the E2E testing stage. Extracts all items requiring manual or runtime verification from the project's verification reports and integration checkpoints, produces a comprehensive E2E-TESTING.md checklist, and moves the project from `{PROJECTS_ACTIVE_DIR}/` to `{PROJECTS_E2E_DIR}/`. This stage is optional but recommended — skipping it via `topology-promote` will produce a warning.

> **This command is ALWAYS human-initiated.** Autopilot and sprint workflows drive a project up to "all categories Verified ✓ and the latest integration checkpoint CLEAN" — and then **stop and hand back to the operator.** The transition into E2E (and onward to promotion) is a deliberate human go/no-go, never an automated step. No agent inside any workflow moves a project to `{PROJECTS_E2E_DIR}/`, runs the E2E gauntlet, or promotes.

## Usage

```
/topology-e2e <project-name>
/topology-e2e <project-name> --resume <runId>   # resume extraction after an Uncertain category was clarified
```

### Arguments

- `<project-name>` — the project directory name under `{PROJECTS_ACTIVE_DIR}/`

### Flags

- `--resume <runId>` — re-invoke the extraction workflow from a prior run; completed per-category extractors return cached, only the re-pointed category re-runs.

---

## When to Run

Run `topology-e2e` after `topology-integrate` confirms all seams are clean and all categories are verified. This is the stage where code-path verification (what `topology-verify` does) transitions to runtime verification (what a human or CI pipeline does against a running system).

**This step is optional.** If your project has no items requiring manual verification (all verification reports have empty "Items Requiring Manual Verification" sections), you can skip directly to `topology-promote`. However, most non-trivial projects will have behavioral checks, end-to-end flows, or runtime assertions that cannot be confirmed by static code analysis alone.
{{#if HAS_E2E}}

Where a test case maps to an automated end-to-end suite, prefer codifying it there and running `{TEST_COMMAND_E2E}` rather than re-checking it by hand — reserve the manual checklist for flows the suite does not cover.
{{/if}}

**This step is human-initiated.** It is never reached by an autopilot or sprint run — see the boundary callout above.

---

## Prerequisites

Run: `/topology-ready <project-name> <category-slug> --action e2e`.
If NO-GO: resolve each unmet check per the remediation, then re-run.

## Instructions

### Step 1: Load the Project Frame (main loop, before any workflow)

Confirm prerequisites, then read enough to scope the extraction:

1. `TOPOLOGY-CLAUDE.md` — the verified category roster (this is the extraction work-list).
2. `VERIFICATION-TABLE.md` — confirm every cell is `✓` or `—`.
3. `SYSTEM-TOPOLOGY.md` — seam context (which seams cross process boundaries).
4. `CONTRACT-SHEET.md` — contract context.
5. The latest report in `integration-checkpoints/` — confirm `CLEAN` and note any seam cross-check that could only be confirmed against a running system.
6. All `categories/<slug>/VERIFICATION-REPORT.md` files — for manual-verification items, deferred behavioral checks, and deferred runtime items.
7. All phase runbooks — for implementation details that inform test setup.

Build the list of **verified categories** — one extraction agent will run per category (or, in prose mode, one extraction pass per category). Emit the count to the user: `Extracting E2E test cases from <N> verified categories.`

### Step 2: Extract Runtime Test Cases

**Prose mode (no Workflow tool):** For each verified category, read its `VERIFICATION-REPORT.md`, `FUTURE-STATE.md`, and relevant seam cross-checks. Extract:

- **Items Requiring Manual Verification** — these become primary E2E test cases.
- **Behavioral Checks** that were deferred — these become secondary E2E test cases.
- **FUTURE-STATE assertions whose proof needs a running system** (live traffic, real database, UI flow) — these become test cases.
- **Seam cross-checks confirming cross-process behavior** (service calls, message-bus events, cross-process database writes) — these become test cases where end-to-end confirmation is required.
- **Deferred items that relate to runtime behavior** — these become exploratory test suggestions.

{{#if USE_SUBAGENTS}}
**Workflow mode (Workflow tool available):** Author the script below and invoke the `Workflow` tool. One agent per verified category extracts that category's runtime/E2E test cases (read-only) and returns a schema-validated array of `E2E_TESTCASE` objects. The main loop assembles, renumbers, and deduplicates. The workflow is **read-only**: it reads verification artifacts and returns proposed test cases — it writes nothing, moves nothing, runs no tests.

```js
export const meta = {
  name: 'topology-e2e',
  description: 'Extract runtime/E2E test cases from every verified category (read-only). Main loop assembles E2E-TESTING.md and gates the active→e2e move.',
  phases: [
    { title: 'Extract', detail: 'one agent per verified category extracts its E2E test cases' },
  ],
}

// --- inline test-case schema (compact, self-contained) ---
const E2E_TESTCASE = {
  type: 'object',
  required: ['id', 'category', 'priority', 'title', 'steps', 'expected'],
  properties: {
    id:            { type: 'string' },
    category:      { type: 'string' },
    priority:      { enum: ['P0', 'P1', 'P2'] },
    bucket:        { enum: ['critical-path', 'regression', 'behavioral', 'exploratory'] },
    title:         { type: 'string' },
    source:        { type: 'string' },
    seamOrContractRef: { type: 'string' },
    preconditions: { type: 'array', items: { type: 'string' } },
    steps:         { type: 'array', items: { type: 'string' } },
    expected:      { type: 'array', items: { type: 'string' } },
    verification:  { type: 'array', items: { type: 'string' } },
    notes:         { type: 'string' },
  },
}

const { project, categories, projectsActiveDir } = args   // categories: [{ slug, title }]

phase('Extract')
const perCategory = await parallel(
  categories.map(c => () => agent(
    `You are extracting RUNTIME / END-TO-END test cases for ONE verified topology category.\n` +
    `Project: ${project}   Category: ${c.title} (${c.slug})\n\n` +
    `READ (read-only — do NOT modify any file):\n` +
    `  ${projectsActiveDir}/${project}/categories/${c.slug}/FUTURE-STATE.md\n` +
    `  ${projectsActiveDir}/${project}/categories/${c.slug}/VERIFICATION-REPORT.md\n` +
    `  ${projectsActiveDir}/${project}/SYSTEM-TOPOLOGY.md  (this category's seams only)\n` +
    `  the latest integration checkpoint report (seam cross-checks touching this category)\n\n` +
    `EXTRACT a test case for each runtime-observable thing static analysis could NOT confirm:\n` +
    `  - every "Items Requiring Manual Verification" entry  → primary test case\n` +
    `  - every deferred Behavioral Check                    → secondary test case\n` +
    `  - every FUTURE-STATE assertion whose proof needs a running system (live traffic, real DB, UI flow) → test case\n` +
    `  - every seam cross-check that could only be confirmed end-to-end (cross-process calls, message-bus events, cross-process DB writes) → test case\n` +
    `  - Deferred items that relate to runtime behavior → exploratory test case\n\n` +
    `CLASSIFY each:\n` +
    `  priority P0 / bucket critical-path = exercises a primary contract or a cross-process seam end-to-end; MUST pass before promotion.\n` +
    `  priority P1 / bucket regression    = an existing behavior the rebuild must preserve (from CURRENT-STATE Pass behaviors).\n` +
    `  priority P1 / bucket behavioral    = UI rendering, interaction flow, error handling, edge case.\n` +
    `  priority P2 / bucket exploratory   = recommended, non-blocking; perf, stress, deferred runtime items.\n\n` +
    `Number ids E2E-001, E2E-002, … within THIS category (the main loop renumbers globally).\n` +
    `Populate seamOrContractRef from SYSTEM-TOPOLOGY / CONTRACT-SHEET. Be concrete in steps/expected/verification — an operator with no project context must be able to run it.\n` +
    `Return an ARRAY of E2E_TESTCASE objects. If this category has nothing runtime-observable, return [].`,
    { label: `extract:${c.slug}`, phase: 'Extract', schema: { type: 'array', items: E2E_TESTCASE }, agentType: 'Explore' }
  ))
)

return perCategory   // array (per category) of arrays of test cases; main loop flattens + renumbers + assembles
```

Pass `args: { project, categories, projectsActiveDir }` where `projectsActiveDir` is the resolved path for `{PROJECTS_ACTIVE_DIR}`. Capture the `runId` from the Workflow result for reporting (enables `--resume`).

> **Why per-category fan-out:** each verified category already owns a tight, isolated set of FUTURE-STATE assertions and a self-contained VERIFICATION-REPORT. Extraction is embarrassingly parallel — there are no cross-category dependencies in *finding* test cases (only in *assembling* them, which the main loop does). This mirrors the discovery sweep's parallelism without its completeness-critic loop: the verified category roster is already the exhaustive work-list.
{{/if}}

### Step 3: Assemble and Categorize Test Cases (main loop)

{{#if USE_SUBAGENTS}}
Flatten the per-category arrays returned by the workflow. Renumber globally (`E2E-001`, `E2E-002`, …) in stable category order, preserving each case's `category` and `seamOrContractRef`. De-duplicate where two categories surfaced the same end-to-end seam flow from opposite sides — keep one, list both refs.
{{/if}}

Group extracted items into test categories:

**Critical Path Tests (P0)** — Must pass before promotion:
- End-to-end user flows that exercise the primary contracts
- Seam boundary behaviors that cross process boundaries (cross-service calls, message-bus events, database writes)
- Data integrity checks (correct records created, correct relationships established)

**Regression Tests (P1)** — Must pass to confirm backward compatibility:
- Existing features that must continue working after the rebuild
- Legacy data that must render correctly
- Existing API contracts that external consumers depend on

**Behavioral Tests (P1)** — Should pass, may reveal design issues:
- UI rendering and user interaction flows
- Error handling and edge cases
- Performance under expected load

**Exploratory Tests (P2)** — Recommended but not blocking:
- Items from deferred lists that relate to runtime behavior
- Edge cases discovered during verification that couldn't be checked statically
- Performance benchmarks and stress tests

### Step 4: Build Test Cases

For each extracted item, produce a structured test case:

```markdown
### E2E-<NNN>: <Title>

**Source:** <VERIFICATION-REPORT.md or checkpoint reference>
**Category:** Critical Path | Regression | Behavioral | Exploratory
**Priority:** P0 (blocks promotion) | P1 (should pass) | P2 (nice to have)
**Contracts:** <C1, C2, ...> (which contracts this validates)
**Seams:** <S1, S2, ...> (which seams this validates)

**Preconditions:**
- <What must be true before running this test>
- <Database state, deployed services, test data>

**Steps:**
1. <Specific action>
2. <Specific action>
3. <Specific action>

**Expected Result:**
- <Observable outcome 1>
- <Observable outcome 2>

**Verification:**
- [ ] <Specific thing to check — database query, UI element, log entry>
- [ ] <Specific thing to check>

**Notes:**
<Any additional context — known limitations, environment requirements, related tests>
```

### Step 5: Create E2E-TESTING.md

Create the comprehensive testing document in the project directory **before moving**:

```markdown
# E2E Testing Checklist — <project-name>

**Generated:** <date>
**Project:** <project-name>
**Status:** Pending

---

## Overview

**Total test cases:** <N>
**Critical path (P0):** <N> — must pass before promotion
**Regression (P1):** <N> — should pass
**Behavioral (P1):** <N> — should pass
**Exploratory (P2):** <N> — recommended

---

## Environment Requirements

<What needs to be running to execute these tests>

- [ ] <Service 1> deployed and accessible
- [ ] <Service 2> deployed and accessible
- [ ] <Database migrations applied>
- [ ] <Test data seeded>
- [ ] <Environment variables configured>

---

## Critical Path Tests

<These must ALL pass before the project can be promoted.>

### E2E-001: <Title>
...

---

## Regression Tests

<These validate that existing behavior was not broken.>

### E2E-0NN: <Title>
...

---

## Behavioral Tests

<These validate user-facing behavior and interaction flows.>

### E2E-0NN: <Title>
...

---

## Exploratory Tests

<These are recommended but not blocking. They may reveal issues
that warrant follow-up work outside this project's scope.>

### E2E-0NN: <Title>
...

---

## Test Execution Log

<Fill in as tests are executed>

| Test ID | Date | Tester | Result | Notes |
|---------|------|--------|--------|-------|
| E2E-001 | | | | |

---

## Promotion Gate

**All P0 tests must pass.** P1 failures should be documented with
a rationale for why they don't block promotion. P2 failures are
logged as deferred items for future work.

When all P0 tests pass:
  /topology-promote <project-name>

To skip E2E and promote directly (not recommended):
  /topology-promote <project-name>
  (You will be warned about skipped E2E testing)
```

### Step 6: Move Project to E2E Directory — HUMAN-GATED, main loop only

> This is a deliberate, human-gated step. It is **never** done inside the workflow and **never** done by an autopilot/sprint run. The extraction workflow is read-only; the move happens here in the main loop only after the operator confirms the project is ready to enter the E2E stage.

Move the entire project directory:
```
{PROJECTS_ACTIVE_DIR}/<project-name>/ → {PROJECTS_E2E_DIR}/<project-name>/
```

Create `{PROJECTS_E2E_DIR}/` if it doesn't exist. Use `git mv` so the move is tracked and attributable, consistent with the Git & PR coordination discipline in topology-PRINCIPLES.

### Step 7: Update TOPOLOGY-CLAUDE.md

Add an E2E Testing section to the project's TOPOLOGY-CLAUDE.md:

```markdown
## E2E Testing Stage

**Entered:** <date>
**Checklist:** `E2E-TESTING.md`
**Status:** Pending

### Test Summary
- P0 (Critical): <N> tests — 0/<N> passing
- P1 (Regression + Behavioral): <N> tests — 0/<N> passing
- P2 (Exploratory): <N> tests — 0/<N> passing
```

### Step 8: Update PROJECTS-INDEX.md

Update the project's status in `{PROJECTS_DIR}/PROJECTS-INDEX.md`:
```
| <project-name> | E2E Testing | — | — |
```

### Step 9: Report Completion

```
## topology-e2e Complete

**Project:** <project-name>
**Moved to:** {PROJECTS_E2E_DIR}/<project-name>/
{{#if USE_SUBAGENTS}}
**Workflow runId:** <runId>   (for --resume)
{{/if}}

### E2E Testing Checklist Created
- Total test cases: <N>
- P0 (Critical Path): <N> — blocks promotion
- P1 (Regression + Behavioral): <N>
- P2 (Exploratory): <N>

### Sources
- Verified categories extracted: <N>
- Manual verification items extracted: <N>
- Behavioral checks extracted: <N>
- Seam cross-checks extracted: <N>
- Deferred items included: <N>

### Next Steps (human-initiated)

Operator executes tests from E2E-TESTING.md against the running system, then:
  /topology-promote <project-name>

Or skip E2E (with warning):
  /topology-promote <project-name>
```

---

## Important Notes

- **This command is ALWAYS human-initiated.** It is the hard boundary the orchestration layer cannot cross: autopilot and sprint workflows drive a project up to "all categories Verified ✓, latest checkpoint CLEAN" and then **stop and hand back to the operator.** No workflow moves a project into `{PROJECTS_E2E_DIR}/`, runs the gauntlet, or promotes. (See topology-PRINCIPLES — the E2E/promote go/no-go stays in the main loop.)
- **The extraction workflow is read-only.** It reads verification artifacts and returns proposed test cases. The actual *running* of E2E tests is operator-driven (a human or CI pipeline against a running system), and the `{PROJECTS_ACTIVE_DIR}/ → {PROJECTS_E2E_DIR}/` move is a deliberate human-gated step in the main loop. **No agent inside the workflow moves files or runs tests.**
- **This step is optional but recommended.** Projects can proceed directly from `topology-integrate` to `topology-promote`. However, `topology-promote` will warn about skipped E2E testing.
- **E2E tests validate what static analysis cannot.** Code-path verification (`topology-verify`, including its adversarial refutation panel) confirms the right code exists and survives skeptics. E2E testing confirms the code actually works when deployed. These are complementary, not redundant.
- **P0 tests are the promotion gate.** If any P0 test fails, the project should not be promoted until it's fixed or the test is reclassified with a Decision Log entry explaining why.
- **The E2E-TESTING.md is a living document.** Testers fill in the Test Execution Log as tests are run. This provides an audit trail for the promotion decision.
- **Projects in `{PROJECTS_E2E_DIR}/` are not archived.** They remain in the e2e directory until `topology-promote` moves them to `{PROJECTS_ARCHIVE_DIR}/`. If a project sits in `{PROJECTS_E2E_DIR}/` for too long, it may need re-verification (code may have changed since verification).
{{#if USE_SUBAGENTS}}
- **Resume over re-run.** If a category extractor returned thin (or you re-pointed it at the right report), prefer `--resume <runId>` over a full re-extraction — the unaffected categories return cached.
- **Changing this skill is eval-gated.** `topology-e2e` is a release-gating skill: a change to its prompt must hold `/topology-eval topology-e2e` at GO before merging. See topology-PRINCIPLES § "Eval-gating changes to our own skills".
{{/if}}

$ARGUMENTS
