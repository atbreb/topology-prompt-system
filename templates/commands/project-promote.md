# Project Promote

Synthesize completed project knowledge into the permanent documentation layer.{{#if TIER_ENABLED}} Maps findings from the completed project to {TIER_1_LABEL}, {TIER_2_LABEL}, and {TIER_3_LABEL} tier docs.{{/if}} If the project is topology-aware, also updates the global topology layer (GLOBAL-CONTRACTS, GLOBAL-TOPOLOGY, GLOBAL-DECISIONS) with new discoveries — always as `Proposed`, never `Active`. Produces a promotion report for human review before any changes are written. Moves the project to archive once the promotion is confirmed clean.

This is the lighter-weight analog of `topology-promote`. The key difference: `topology-promote` can promote contracts and seams to `Active` status because they were formally verified. `project-promote` can only propose new entries or note observations — it cannot change verification status in the global layer.

## Usage

```
/project-promote <project-path>
/project-promote <project-path> --execute
```

The argument is the path to the project directory.

---

## Prerequisites

- [ ] All phases must have `## Status: Complete` in their runbooks
- [ ] `CLAUDE.md` exists with an Implementation Phases table
- [ ] An implementation plan markdown file exists

**Recommended but not required:**
- [ ] `VERIFICATION-REPORT.md` exists (from `/project-verify`)

If not all phases are complete, stop:

> Project at `<project-path>` is not ready for promotion.
> Not all phases are complete. Run `/project-next-phase <project-path>` to advance.

If `VERIFICATION-REPORT.md` does not exist, issue an advisory:

> No verification report found. Promotion will proceed, but the report will note
> that findings were not verified. Run `/project-verify <project-path>` first for
> a more thorough promotion.
>
> Continue without verification? (Proceeding...)

Do not block — continue with the promotion. The absence of verification is documented in the promotion report.

---

## Instructions

### Step 1: Load All Project Knowledge

Read every document in the project:
1. `CLAUDE.md` — project purpose, conventions, key directories, topology context (if present)
2. The implementation plan — overall goals, what was intended
3. All phase runbooks (`phase-N/PHASE-N-RUNBOOK.md`) — what was actually built:
   - Files Created and Files Modified tables
   - Design Decisions Logs (including `[TOPOLOGY]` entries)
   - Deferred Items
   - Topology Watch List Results (if topology-aware)
   - Exit criteria results
4. `VERIFICATION-REPORT.md` (if it exists) — what was confirmed

Determine:
- Whether this is a topology-aware project (Topology Context section in CLAUDE.md)
- Whether verification was performed (VERIFICATION-REPORT.md exists)

Build a synthesis: what is now true about this system that was not true before, or was not documented before, as a result of this project.

{{#if TIER_ENABLED}}
### Step 2: Read the Existing Tier Docs

Read every existing file in:
- `{TIER_1_DIR}/`
- `{TIER_2_DIR}/`
- `{TIER_3_DIR}/`

For each file, note:
- What it currently covers
- Whether this project touched any of that content
- Whether any of its current content is now incorrect or outdated

{{/if}}
### Step 2b: Read Global Docs (if topology-aware)

If the project is topology-aware, also read:
- `{DOCS_ROOT}/GLOBAL-CONTRACTS.md`
- `{DOCS_ROOT}/GLOBAL-TOPOLOGY.md`
- `{DOCS_ROOT}/GLOBAL-DECISIONS.md`

If global docs do not exist, note it in the report but do not block. Global layer sections of the promotion report will be marked "Skipped — global docs not initialized."

{{#if TIER_ENABLED}}
### Step 3: Map Findings to Tiers

For each finding from the project (combining implementation plan goals, runbook outcomes, design decisions, and verification results), determine where it belongs:

**Tier 1 — {TIER_1_LABEL}** (`{TIER_1_DIR}/`)
Stable, slow-changing, foundational. Promote here if the finding describes:
- A verified seam contract that governs how major system components talk to each other
- A contract invariant now enforced system-wide
- A data structure or API boundary that is now canonical
- An infrastructure or auth pattern that was codified
- An internal package change that affects consumers platform-wide

**Tier 2 — {TIER_2_LABEL}** (`{TIER_2_DIR}/`)
Active development state. Promote here if the finding describes:
- A workstream's current implementation state that changed
- A feature now built that was previously planned
- A known gap that was closed
- A new known gap that was discovered but deferred

**Tier 3 — {TIER_3_LABEL}** (`{TIER_3_DIR}/`)
Cross-cutting conventions. Promote here if the finding describes:
- A pattern that emerged during implementation that should be followed in future work
- A refactoring approach that proved effective and should be standardized
- An integration or event pattern that was established or changed
- A frontend convention that was codified

**Not promoted** — stays in archive only:
- Implementation details specific to this project (phase runbooks, session notes)
- Decisions that were considered and rejected
- Intermediate states that no longer exist

Build a promotion map:

| Finding | Source | Tier | Target File | Action |
|---------|--------|------|-------------|--------|
| <description> | Runbook / Decision Log / Verification Report | 1/2/3 | `filename.md` | Create / Update / Flag for deletion |

{{/if}}
### Step 4: Map Topology Findings to Global Layer (if topology-aware)

If the project is topology-aware, process topology-specific findings for the global layer:

#### Contracts

For each contract-related finding:
- **New contract discovered:** If the project revealed an invariant that should hold platform-wide but isn't in `GLOBAL-CONTRACTS.md`, propose a new GC entry with status `Proposed`.
- **Existing contract observed:** If the project worked with code governed by an existing contract and found it holding, note this in the report but do NOT promote to `Active`. Only `topology-promote` can do that.
- **Existing contract potentially violated:** If `project-verify` or runbook watch list results flagged a potential violation, include it in the report as a finding for human review.

#### Seams

For each seam-related finding:
- **New seam discovered:** If the project revealed a boundary between components that isn't in `GLOBAL-TOPOLOGY.md`, propose a new GS entry with status `Proposed`.
- **Existing seam observed:** Note in the report. Do NOT promote to `Active`.
- **Existing seam potentially regressed:** Include in the report for human review.

#### Decisions

For each `[TOPOLOGY]` design decision from the runbooks:
- If it has platform-wide implications, propose a new GD entry.
- If it's project-specific, note it as "Not promoted — project-specific."

**Critical rule: project-promote NEVER sets any global layer entry to `Active`.** Everything is `Proposed` or observational. The `Active` promotion path is reserved for the topology verification sequence (`topology-verify` → `topology-promote`). This preserves the integrity distinction between formally verified and informally observed.

### Step 5: Produce the Promotion Report

**Do not write any tier doc or global doc changes yet.** Produce the report first.

Create `<project-path>/PROMOTION-REPORT.md`:

```markdown
# Promotion Report — <Project Name>

**Generated:** <date>
**Project:** <project-path>
**Status:** Pending Human Review
**Verified:** Yes (VERIFICATION-REPORT.md) / No (verification not performed)
**Topology-aware:** Yes / No

---

## Summary

{{#if TIER_ENABLED}}
**Tier 1 changes:** <N> creates, <N> updates, <N> proposed deletions
**Tier 2 changes:** <N> creates, <N> updates, <N> proposed deletions
**Tier 3 changes:** <N> creates, <N> updates, <N> proposed deletions
{{/if}}
**Not promoted:** <N> findings (stays in archive)
<If topology-aware:>
**Global layer changes:** <N> proposed (all as Proposed status)

<If not verified:>
> ⚠ **No verification was performed.** Findings in this report are based on phase
> runbook self-reporting, not independent codebase verification. Consider running
> `/project-verify <project-path>` for higher-confidence promotion.

---

{{#if TIER_ENABLED}}
## Tier 1 — {TIER_1_LABEL} Changes

### Creates

#### `{TIER_1_DIR}/<filename>.md` — NEW

**Why:** <what this project delivered that warrants a permanent platform doc>
**Content summary:** <what the new doc will contain>
**Source:** <which project documents this is derived from>
**Verification status:** Verified by project-verify / Unverified (self-reported)

---

### Updates

#### `{TIER_1_DIR}/<existing-filename>.md` — UPDATE

**Current content:** <brief description of what's there now>
**What changes:** <specific section or assertion that is now outdated or incomplete>
**New content:** <what replaces or extends it>
**Source:** <which project documents this is derived from>
**Attribution:** Updated by project `<project-name>`, <date>

---

### Proposed Deletions

#### `{TIER_1_DIR}/<filename>.md` — PROPOSED DELETION

**Reason:** <why this doc is now obsolete>
**Risk if kept:** <what breaks or misleads if this stays>

> ⚠ Deletions require explicit human approval. This will not be executed automatically.

---

## Tier 2 — {TIER_2_LABEL} Changes

[same structure as Tier 1]

---

## Tier 3 — {TIER_3_LABEL} Changes

[same structure as Tier 1]

---

{{/if}}
## Findings Not Promoted

| Finding | Reason Not Promoted | Lives In |
|---------|--------------------|---------:|
| <description> | Implementation-specific / Superseded / Out of scope | archive/<project-name>/ |

---

<If topology-aware:>

## Global Layer Changes

> **All global layer entries from project-promote land as `Proposed`.** Only
> `topology-promote` (after formal verification) can promote entries to `Active`.
> This preserves the distinction between "observed during a project" and
> "formally verified against seam contracts."

### GLOBAL-CONTRACTS.md

#### New Entries

| GC ID | Title | Status | Source | Notes |
|-------|-------|--------|--------|-------|
| GC-NNN (new) | <title> | Proposed | This project | <what was discovered> |

#### Observations on Existing Entries

| GC ID | Title | Observation |
|-------|-------|-------------|
| GC-NNN | <title> | Compliance observed during implementation (not formally verified) |
| GC-NNN | <title> | Potential violation detected — see VERIFICATION-REPORT.md |

---

### GLOBAL-TOPOLOGY.md

#### New Seams

| GS ID | Title | Producer | Consumer | Status | Notes |
|-------|-------|----------|----------|--------|-------|
| GS-NNN (new) | <title> | <component> | <component> | Proposed | New seam discovered |

#### Observations on Existing Seams

| GS ID | Title | Observation |
|-------|-------|-------------|
| GS-NNN | <title> | Producer guarantees appear intact (not formally verified) |
| GS-NNN | <title> | Potential regression detected — see VERIFICATION-REPORT.md |

---

### GLOBAL-DECISIONS.md

#### New Platform-Level Decisions

| GD ID | Title | Affects | Summary |
|-------|-------|---------|---------|
| GD-NNN | <title> | GC-NNN, GS-NNN | <one line> |

#### Decisions Not Promoted

<Project decisions too implementation-specific for the global record.
They stay in the archived project.>

---

### Global Layer Human Review Checklist

- [ ] New GC entries are warranted — invariants are platform-wide, not project-specific
- [ ] New GS entries accurately describe the seam as it exists after this project
- [ ] Promoted decisions have platform-wide implications, not just local ones
- [ ] Observations on existing entries are accurate
- [ ] Potential violations/regressions should be investigated before accepting

<End if>

---

## Decisions from Design Decisions Logs

The following decisions from phase runbooks should be reflected in the tier docs
they affect. Listed here for traceability.

| Decision | Phase | Affects | Tier Doc |
|----------|-------|---------|---------|

---

## Human Review Checklist

Before approving this promotion:

- [ ] All creates are warranted — findings are stable enough for tier docs
- [ ] All updates are accurate — new content correctly reflects delivered behavior
- [ ] All proposed deletions are safe — nothing being removed is still true
- [ ] No findings are missing from the promotion map
- [ ] Attribution notes are present on all updates
<If not verified:>
- [ ] Acceptable to promote without independent verification, OR run /project-verify first
<If topology-aware:>
- [ ] Global layer proposals are warranted and accurately described
- [ ] Any flagged potential violations have been reviewed

To approve and execute:
  /project-promote <project-path> --execute

To revise the report before executing:
  Edit PROMOTION-REPORT.md, then run /project-promote <project-path> --execute
```

---

### Step 6: Wait for Human Approval

Stop here. Do not write any tier doc or global doc changes. Output:

```
## project-promote: Promotion Report Ready

Review: <project-path>/PROMOTION-REPORT.md

{{#if TIER_ENABLED}}<N> tier doc changes proposed across <N> files.
{{/if}}<If topology-aware:> <N> global layer changes proposed (all as Proposed).
<N> proposed deletions require explicit approval.
<If not verified:> ⚠ No verification performed — findings are self-reported.

When ready:
  /project-promote <project-path> --execute
```

---

### Step 7: Execute (--execute flag only)

When called with `--execute`, read `PROMOTION-REPORT.md` and execute all approved changes.

{{#if TIER_ENABLED}}
#### Step 7A: Write Tier Doc Changes

**Creates:** Write new tier doc files with the content described in the report. Add a footer:
```markdown
---
*Created by project-promote from project `<project-name>` on <date>.*
```

**Updates:** Make surgical edits to existing tier docs — targeted section replacements, not full rewrites. Add an inline attribution comment after each updated section:
```markdown
*Updated by project `<project-name>`, <date>: <one-line description of what changed>*
```

**Proposed deletions:** Do not execute. List them at the end of the execution report as still-pending human action.

{{/if}}
#### Step 7B: Write Global Layer Changes (if topology-aware)

If global docs exist and the report has global layer changes:

**New GC entries:** Add using the GC template with status `Proposed`. Add source attribution:
```
**Source:** project-promote from `<project-name>`, <date>
**Verification:** Not formally verified — observed during project implementation
```

**New GS entries:** Add using the GS template with status `Proposed`. Add source attribution.

**New GD entries:** Add using the GD template. Update the Decision Index.

**Observations on existing entries:** Add a note to the existing entry's History or Notes section:
```
<date> — Observed by project `<project-name>` (project-promote, not formally verified)
```

**Critical: project-promote NEVER changes the status of existing GC or GS entries.** No `Proposed` → `Active` transitions. No "Last verified by" updates. Those actions are reserved for `topology-promote`.

#### Step 7C: Archive the Project

After all writes succeed, move the project:
```
<project-path>/ → {PROJECTS_ARCHIVE_DIR}/<project-name>/
```

If the project is not under `{PROJECTS_ACTIVE_DIR}/` (e.g., it's in a separate planning/inbox location), move it to the most appropriate archive location. If no archive convention exists, create `<project-path>/../archive/<project-name>/`.

Update `PROJECTS-INDEX.md` if it exists:
- Status → `Archived`
- Completed date → today
{{#if TIER_ENABLED}}- Tier docs updated → list of files touched{{/if}}

---

### Step 8: Execution Report

```
## project-promote --execute Complete

**Project archived:** <archive-path>

{{#if TIER_ENABLED}}
### Tier Docs Written
| File | Action | Section |
|------|--------|---------|

{{/if}}
<If topology-aware:>
### Global Layer Updated
| Document | Changes |
|----------|---------|
| GLOBAL-CONTRACTS.md | <N> new (Proposed), <N> observations noted |
| GLOBAL-TOPOLOGY.md | <N> new (Proposed), <N> observations noted |
| GLOBAL-DECISIONS.md | <N> new |

### Pending Manual Deletions
<list or "None">

<If PROJECTS-INDEX.md exists:>
### Projects Index Updated
✓

Project `<project-name>` is complete.
```

---

## Important Notes

- **Report before execute — always.** The two-step flow exists to protect the permanent documentation layer. It is the platform's long-term memory. Changes to it need human eyes before they land.
- **Surgical updates, not rewrites.** A project that touched one feature doesn't get to rewrite an entire doc. Attribution comments make future audits possible.
- **Deletions are never automatic.** Even with `--execute`. A deletion removes knowledge that other people may depend on. That decision stays with the human.
{{#if TIER_ENABLED}}- **Tier docs are not project docs.** Don't promote implementation details, edge cases specific to this project, or decisions that were reversed. Only promote what is now permanently true.
{{/if}}- **Archive happens last.** The project lives in its current location through the entire promotion process. It only moves to archive after `--execute` confirms all writes succeeded.

### Global Layer Rules (Topology-Aware Projects Only)

**Everything is Proposed, never Active.**

This is the fundamental distinction between `project-promote` and `topology-promote`. A topology project goes through formal verification: future state specification → implementation → `topology-verify` (seam-by-seam producer/consumer checks) → `topology-promote` (which can set `Active`). A project goes through lighter verification: implementation → optional `project-verify` (exit criteria + spot-checks) → `project-promote` (which can only set `Proposed`).

This preserves the global layer's integrity. `Active` means "formally verified against seam contracts." `Proposed` means "observed during project work, awaiting formal verification." A future topology project can pick up a `Proposed` entry and verify it, promoting it to `Active` through `topology-promote`.

**What goes in the global docs vs. stays in the project archive:**

| Belongs in Global Docs | Stays in project archive only |
|----------------------|-------------------------------|
| New platform-wide invariant discovered | Implementation detail for this project |
| New seam between components discovered | Local architectural choice |
| Pattern with cross-cutting implications | Decision reversed before project ended |
| Observation that future projects need to know | Applies only to this project |

When in doubt: if a future project lead reading the global docs would need to know this to make good decisions, propose it. If it's internal project history, it stays in the archive.

$ARGUMENTS
