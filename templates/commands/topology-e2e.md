# topology-e2e

Move a verified topology project into the E2E testing stage. Extracts all items requiring manual or runtime verification from the project's verification reports and integration checkpoints, produces a comprehensive E2E-TESTING.md checklist, and moves the project from `{PROJECTS_ACTIVE_DIR}/` to `{PROJECTS_E2E_DIR}/`. This stage is optional but recommended — skipping it via `topology-promote` will produce a warning.

## Usage

```
/topology-e2e <project-name>
```

### Arguments

- `<project-name>` — the project directory name under `{PROJECTS_ACTIVE_DIR}/`

---

## When to Run

Run `topology-e2e` after `topology-integrate` confirms all seams are clean and all categories are verified. This is the stage where code-path verification (what topology-verify does) transitions to runtime verification (what a human or CI pipeline does against a running system).

**This step is optional.** If your project has no items requiring manual verification (all verification reports have empty "Items Requiring Manual Verification" sections), you can skip directly to `topology-promote`. However, most non-trivial projects will have behavioral checks, end-to-end flows, or runtime assertions that cannot be confirmed by static code analysis alone.
{{#if HAS_E2E}}

Where a test case maps to an automated end-to-end suite, prefer codifying it there and running `{TEST_COMMAND_E2E}` rather than re-checking it by hand — reserve the manual checklist for flows the suite does not cover.
{{/if}}

---

## Prerequisites

- [ ] All categories have `VERIFICATION-REPORT.md`
- [ ] `VERIFICATION-TABLE.md` has no `✗` or blank cells (all `✓` or `--`)
- [ ] Most recent integration checkpoint is `CLEAN`
- [ ] Project is currently in `{PROJECTS_ACTIVE_DIR}/<project-name>/`

If any prerequisite fails, stop:

> Project `<project-name>` is not ready for E2E testing.
> [List which prerequisite failed and what command to run to resolve it.]

---

## Instructions

### Step 1: Load All Verification Artifacts

Read:
1. All `categories/<slug>/VERIFICATION-REPORT.md` files
2. All integration checkpoint reports in `integration-checkpoints/`
3. `SYSTEM-TOPOLOGY.md` — for seam context
4. `CONTRACT-SHEET.md` — for contract context
5. All phase runbooks — for implementation details that inform test setup

For each verification report, extract:
- **Items Requiring Manual Verification** — these become primary E2E test cases
- **Behavioral Checks** that were deferred — these become secondary E2E test cases
- **Deferred Items** that relate to runtime behavior — these become exploratory test suggestions

For each integration checkpoint, extract:
- **Cross-check notes** that mention behavioral gaps or runtime dependencies
- **Seam checks** that could only be fully confirmed with a running system

### Step 2: Categorize Test Cases

Group extracted items into test categories:

**Critical Path Tests** — Must pass before promotion:
- End-to-end user flows that exercise the primary contracts
- Seam boundary behaviors that cross process boundaries (cross-service API calls, message-bus events, database writes)
- Data integrity checks (correct records created, correct relationships established)

**Regression Tests** — Must pass to confirm backward compatibility:
- Existing features that must continue working after the rebuild
- Legacy data that must render correctly
- Existing API contracts that external consumers depend on

**Behavioral Tests** — Should pass, may reveal design issues:
- UI rendering and user interaction flows
- Error handling and edge cases
- Performance under expected load

**Exploratory Tests** — Recommended but not blocking:
- Items from deferred lists that relate to runtime behavior
- Edge cases discovered during verification that couldn't be checked statically
- Performance benchmarks and stress tests

### Step 3: Build Test Cases

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

### Step 4: Create E2E-TESTING.md

Create the comprehensive testing document in the project directory before moving:

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

### Step 5: Move Project to E2E Directory

Move the entire project directory:
```
{PROJECTS_ACTIVE_DIR}/<project-name>/ → {PROJECTS_E2E_DIR}/<project-name>/
```

Create `{PROJECTS_E2E_DIR}/` if it doesn't exist.

### Step 6: Update TOPOLOGY-CLAUDE.md

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

### Step 7: Update PROJECTS-INDEX.md

Update the project's status in `{PROJECTS_DIR}/PROJECTS-INDEX.md`:
```
| <project-name> | E2E Testing | — | — |
```

### Step 8: Report Completion

```
## topology-e2e Complete

**Project:** <project-name>
**Moved to:** {PROJECTS_E2E_DIR}/<project-name>/

### E2E Testing Checklist Created
- Total test cases: <N>
- P0 (Critical Path): <N> — blocks promotion
- P1 (Regression + Behavioral): <N>
- P2 (Exploratory): <N>

### Sources
- Verification reports: <N> categories
- Integration checkpoints: <N>
- Manual verification items extracted: <N>
- Behavioral checks extracted: <N>
- Deferred items included: <N>

### Next Steps

Execute tests from E2E-TESTING.md, then:
  /topology-promote <project-name>

Or skip E2E (with warning):
  /topology-promote <project-name>
```

---

## Important Notes

- **This step is optional but recommended.** Projects can proceed directly from `topology-integrate` to `topology-promote`. However, `topology-promote` will warn about skipped E2E testing.
- **E2E tests validate what static analysis cannot.** Code-path verification (topology-verify) confirms the right code exists. E2E testing confirms the code actually works when deployed. These are complementary, not redundant.
- **P0 tests are the promotion gate.** If any P0 test fails, the project should not be promoted until it's fixed or the test is reclassified with a Decision Log entry explaining why.
- **The E2E-TESTING.md is a living document.** Testers should fill in the Test Execution Log as tests are run. This provides an audit trail for the promotion decision.
- **Projects in `{PROJECTS_E2E_DIR}/` are not archived.** They remain in the e2e directory until `topology-promote` moves them to `{PROJECTS_ARCHIVE_DIR}/`. If a project sits in `{PROJECTS_E2E_DIR}/` for too long, it may need re-verification (code may have changed since verification).

$ARGUMENTS
