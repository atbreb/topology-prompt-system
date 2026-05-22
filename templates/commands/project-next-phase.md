# Project Next Phase

Advance a scaffolded implementation project to its next phase. Validates completed work, fixes issues, and sets up the next phase for execution. If the project was scaffolded with topology awareness, performs advisory contract and seam checks during validation.

## Usage

```
/project-next-phase <project-path>
```

The argument is the path to the project directory (e.g., `{PROJECTS_ACTIVE_DIR}/{EXAMPLE_PROJECT_SLUG}/implementation`).

## Prerequisites

The target directory MUST have been scaffolded by `/project-prep-scaffolding` — it must contain:
- A `CLAUDE.md` with an **Implementation Phases** table
- Phase directories (`phase-N/`) with session prompts and runbooks
- An implementation plan markdown file

If any of these are missing, abort and tell the user to run `/project-prep-scaffolding` first.

## Instructions

### Step 1: Load project context

1. Read the project's `CLAUDE.md` to get:
   - The **Implementation Phases** table (phase numbers, names, statuses)
   - Key directories and conventions
   - The implementation plan filename
   - Whether a **Topology Context** section exists (indicates topology-aware project)
2. Read the implementation plan for phase details and exit criteria

### Step 1b: Load topology context (if topology-aware)

If the project's `CLAUDE.md` contains a **Topology Context** section:

1. Note which GC, GS, and GD IDs are listed as relevant
2. Read the global topology docs:
   - `{DOCS_ROOT}/GLOBAL-CONTRACTS.md` — extract the relevant contracts by ID
   - `{DOCS_ROOT}/GLOBAL-TOPOLOGY.md` — extract the relevant seams by ID
   - `{DOCS_ROOT}/GLOBAL-DECISIONS.md` — extract the relevant decisions by ID
3. Build a topology reference for use during validation steps

If global docs have been deleted or moved since scaffolding, note the issue in the output but continue — topology checks become advisory warnings without source material, not blocking failures.

### Step 2: Determine project state

Scan all phase runbooks (`phase-N/PHASE-N-RUNBOOK.md`) to determine which phases are complete:

- **A phase is "Complete"** if its runbook exists AND has `## Status: Complete` (case-insensitive)
- **A phase is "In Progress"** if its runbook exists AND has `## Status: In Progress` (case-insensitive)
- **A phase is "Not Started"** if its runbook has `## Status: Not Started` OR the runbook only contains the starter template

Classify the project into one of three states:

| State | Condition | Action |
|-------|-----------|--------|
| **Fresh** | No phases are Complete or In Progress | Go to Step 3 |
| **In Progress** | At least one phase is Complete, and at least one is Not Started | Go to Step 4 |
| **All Complete** | Every phase is Complete | Go to Step 5 |

If a phase is "In Progress", treat it as the current phase — go to Step 4 but focus on completing it rather than advancing.

### Step 3: Fresh project — validate scaffolding and set up first phase

This is the first time the project is being worked on.

#### 3a: Validate scaffolding completeness

Check that all expected files exist:
- [ ] `CLAUDE.md` exists and has all required sections (Purpose, Conventions, Implementation Phases, Phase Directory Convention, Context Recovery)
- [ ] Implementation plan markdown file exists
- [ ] Every phase listed in the CLAUDE.md phases table has a corresponding `phase-N/` directory
- [ ] Every phase directory has a `PHASE-N-SESSION-PROMPT.md`
- [ ] Every phase directory has a `PHASE-N-RUNBOOK.md`

If anything is missing, report what's missing and offer to create it before proceeding.

#### 3b: Validate first phase docs against codebase reality

Read the first phase's session prompt and implementation plan section. For every file listed in:
- **FILES TO READ** — verify those files exist in the codebase
- **FILES TO MODIFY** — verify those files exist in the codebase
- **Key directories** — verify they exist

If discrepancies are found (files moved, renamed, deleted since the plan was written):
1. List each discrepancy
2. Fix the session prompt and runbook to reflect current reality
3. Note the fixes in the output

#### 3c: Validate topology watch list (if topology-aware)

If the first phase's session prompt has a **TOPOLOGY WATCH LIST** section:

1. For each contract in the watch list, verify the invariant statement still matches the current `GLOBAL-CONTRACTS.md` entry (contracts can be amended between scaffolding and execution)
2. For each seam in the watch list, verify the guarantee text still matches `GLOBAL-TOPOLOGY.md`
3. Check if any new contracts or seams have been added to the global docs since scaffolding that are relevant to this phase's files

If watch list items are stale (contract amended, seam updated, new items relevant):
1. Update the session prompt's watch list
2. Note what changed in the output

#### 3d: Enter plan mode with first phase

Switch to plan mode. Present a plan that includes:
1. Summary of the first phase's objective
2. The validated task list from the session prompt
3. Prerequisites and preparation steps
4. Any discrepancies found and how they were resolved
5. *(If topology-aware)* Summary of topology watch list items for this phase

Tell the user: "Phase N is ready to begin. Accept this plan to start implementation, or adjust as needed."

### Step 4: In-progress project — validate completed work and advance

#### 4a: Identify completed phases and the next phase

From the runbooks, determine:
- Which phases are **Complete** (list them)
- Which phase is **next** (first phase with status "Not Started")
- If a phase is "In Progress", that IS the current phase

#### 4b: Validate the most recently completed phase

Read the most recently completed phase's runbook. For each item in its **Exit Criteria** section:
1. Verify the criteria against the actual codebase — check that files were created/modified as documented
2. If the runbook lists **Files Created** or **Files Modified**, spot-check that those files exist and contain the described changes
3. Run a quick sanity check: do any files referenced in the runbook not exist?

If issues are found:
1. List each issue clearly
2. Implement fixes directly (don't just report — fix them)
3. After fixes, update the runbook to reflect the corrections
4. Then proceed to set up the next phase

If no issues are found, report: "Phase N validated — all exit criteria confirmed."

#### 4c: Validate topology watch list results (if topology-aware)

If the completed phase's runbook has a **Topology Watch List Results** section:

1. **Check for logged concerns:** Look for any entries with "Potential violation" or "Potential regression" results. Also scan the Design Decisions Log for entries prefixed with `[TOPOLOGY]`.

2. **Spot-check contract compliance:** For each contract in the watch list, do a quick codebase check:
   - Read the contract's invariant from the topology reference
   - Check the files this phase modified — does the modification violate the invariant?
   - Mark as: `No violation found` / `Potential violation — <description>` / `Cannot determine`

3. **Spot-check seam integrity:** For each seam in the watch list, do a quick codebase check:
   - Read the seam's guarantee from the topology reference
   - Check the files this phase modified — does the modification break a producer guarantee or introduce an unsafe consumer dependency?
   - Mark as: `No regression found` / `Potential regression — <description>` / `Cannot determine`

**These checks are advisory, not blocking.** If potential violations are found:
- Report them clearly in the output with the specific contract/seam, the code path, and what looks wrong
- Add them to the runbook's Topology Watch List Results table
- Recommend the user review before proceeding, but do not block advancement
- Flag them for `/project-verify` to check more thoroughly later

If no topology concerns are found, report: "Topology watch list — no violations detected."

#### 4d: Validate next phase docs against codebase reality

Same as Step 3b but for the next phase. The codebase may have changed since scaffolding — verify that:
- Files referenced in the session prompt still exist where expected
- Any artifacts from prior phases that the next phase depends on are present
- The prerequisites listed in the session prompt match what was actually delivered

Fix any discrepancies in the session prompt.

#### 4e: Validate next phase topology watch list (if topology-aware)

Same as Step 3c but for the next phase — verify watch list items are still current and add any new relevant items.

#### 4f: Update the CLAUDE.md phases table

Update the Implementation Phases table in `CLAUDE.md`:
- Mark completed phases with their actual status (e.g., "Complete")
- Mark the next phase as the active one

#### 4g: Enter plan mode with next phase

Switch to plan mode. Present a plan that includes:
1. Summary of what was validated from prior phases
2. *(If topology-aware)* Topology check results from the completed phase
3. The next phase's objective
4. The validated task list
5. Prerequisites and what was delivered by prior phases
6. Any discrepancies found and how they were resolved
7. *(If topology-aware)* Summary of topology watch list items for this phase

Tell the user: "Phase N is ready to begin. Accept this plan to start implementation, or adjust as needed."

### Step 5: All phases complete — final validation

#### 5a: Full project validation

For EVERY phase, read the runbook and validate:
1. All exit criteria are met in the codebase
2. Files listed as created/modified actually exist
3. No obvious regressions (e.g., a file created in Phase 1 was deleted in Phase 3 without explanation)

#### 5b: Cross-phase consistency check

- Check that the implementation plan's overall goals were achieved
- Look for any **Deferred Items** across all runbooks that were never addressed
- Verify that the key directories listed in `CLAUDE.md` contain the expected code

#### 5c: Cross-phase topology check (if topology-aware)

Aggregate all topology watch list results across all phases:

1. Collect every `[TOPOLOGY]` entry from all Design Decisions Logs
2. Collect every "Potential violation" or "Potential regression" from all Topology Watch List Results tables
3. For any item that was flagged as a potential concern in an earlier phase, check if a later phase resolved it

Produce a **Topology Summary**:

```
### Topology Summary (across all phases)

**Contracts watched:** <N>
**Seams watched:** <N>
**Potential violations logged:** <N> (<N> resolved in later phases, <N> unresolved)
**Potential regressions logged:** <N> (<N> resolved in later phases, <N> unresolved)
**[TOPOLOGY] design decisions:** <N>
```

If there are unresolved potential violations or regressions, recommend running `/project-verify <project-path>` before `/project-promote <project-path>`.

#### 5d: Report results

**If issues are found:**
- List every issue with its phase and specific file/criteria
- Enter plan mode with a remediation plan to fix the issues
- Tell the user: "Found N issues across the completed phases. Accept this plan to fix them."

**If no issues are found:**
- Report: "All N phases validated successfully. No remaining phase work for this project."
- List a summary of what was delivered across all phases
- Note any deferred items that may warrant future work
- *(If topology-aware)* Include the Topology Summary
- Recommend next steps:

```
### Next Steps

<If topology-aware with unresolved concerns:>
1. Run `/project-verify <project-path>` to formally check topology compliance
2. Run `/project-promote <project-path>` to promote findings to{{#if TIER_ENABLED}} tier docs and{{/if}} the global layer

<If topology-aware with no concerns:>
1. Optionally run `/project-verify <project-path>` for formal topology verification
2. Run `/project-promote <project-path>` to promote findings to{{#if TIER_ENABLED}} tier docs and{{/if}} the global layer

<If standalone:>
1. Optionally run `/project-promote <project-path>` to promote findings{{#if TIER_ENABLED}} to tier docs{{/if}}
```

## Important Notes

- **Always read before judging** — don't assume a phase is incomplete just because the runbook template is sparse. Check the codebase.
- **Fix, don't just report** — when validation finds fixable issues (stale file paths, missing status updates), fix them directly.
- **Respect the plan** — the implementation plan is the source of truth for what each phase should deliver.
- **Don't modify implementation code** in this skill — only fix docs (session prompts, runbooks, CLAUDE.md). If codebase issues are found, include them in the plan for the user to accept.
- **Phase numbering follows the project** — some start at 0, some at 1. Don't assume.
- **Sub-phases** (e.g., 4a, 4b) are separate phases with their own runbooks.
- **Topology checks are advisory, not blocking** — the project commands use a lighter-touch approach than the full topology sequence. Potential violations are reported and logged, but they do not prevent phase advancement. The formal checking happens in `/project-verify`.
- **Stale topology context is expected** — the global docs may change between scaffolding and execution. Update watch lists when drift is detected, but don't treat it as an error.
- **Do not duplicate topology-implement behavior** — if `TOPOLOGY-CLAUDE.md` exists in the project root, this project is under topology management. `topology-implement` wraps `project-next-phase` and adds its own tracking. Do not double-track.

$ARGUMENTS
