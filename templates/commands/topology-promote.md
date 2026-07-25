# topology-promote

Synthesize verified project knowledge into the permanent documentation layer, using a **parallel draft → main-loop apply** flow. Maps findings from the completed project to tier-1-platform, tier-2-workstreams, and tier-3-patterns docs — creating, updating, or flagging for deletion as appropriate. Also updates the global topology layer (GLOBAL-CONTRACTS, GLOBAL-TOPOLOGY, GLOBAL-DECISIONS) and user-facing app docs. A Workflow fans out one drafting agent **per destination doc** to propose insertions/updates in parallel; the main loop reviews and applies every write. Produces a promotion report for human review before any change lands. Moves the project to archive once the promotion is confirmed clean.

This is the last command in the topology lifecycle. A project is not done until this runs.

> **THIS COMMAND IS ALWAYS HUMAN-INITIATED.** `topology-autopilot` and `topology-sprint` STOP at the promote boundary and never invoke it — promotion mutates the platform's long-term memory: tier docs, the global contract/seam/decision layer, app docs, and (if enabled) the Compass PRIORITY-MAP. Those writes require human eyes. The drafting workflow proposes; the human-initiated main loop disposes.

> **See `{COMMANDS_DIR}/topology-PRINCIPLES.md`** for the design discipline and the shared schema library. In particular: the absolute HITL boundary that keeps every canonical mutation in the main loop; the foundation-document mutation discipline (append-only, attribution); and the Global Layer promotion threshold (a single project verifying a contract/seam promotes it `Proposed → Active`, no further).

## Usage

```
/topology-promote <project-name>
/topology-promote <project-name> --execute
```

---

## Project Location Resolution

The project may live in one of two directories depending on its lifecycle stage:

1. **`{PROJECTS_E2E_DIR}/<project-name>/`** — project has completed E2E testing stage (preferred path)
2. **`{PROJECTS_ACTIVE_DIR}/<project-name>/`** — project is being promoted directly without E2E testing

Check `{PROJECTS_E2E_DIR}/` first. If found there, proceed normally — E2E testing was done.

If found only in `{PROJECTS_ACTIVE_DIR}/`, check whether `E2E-TESTING.md` exists:
- If `E2E-TESTING.md` does NOT exist, this project skipped `topology-e2e` entirely. Issue the E2E bypass warning (see below).
- If `E2E-TESTING.md` exists but the project is still in `{PROJECTS_ACTIVE_DIR}/`, something went wrong with the move — treat as E2E-complete.

### E2E Bypass Warning

When a project is being promoted from `{PROJECTS_ACTIVE_DIR}/` without having gone through `topology-e2e`:

```
⚠️  E2E TESTING BYPASSED

Project `<project-name>` has not gone through E2E testing.
The following items from verification reports require runtime validation
and have NOT been tested:

<List all "Items Requiring Manual Verification" from all VERIFICATION-REPORT.md files>

Proceeding with promotion means these items will be marked as
"E2E testing skipped" in the promotion report and archived without
runtime validation.

Options:
  1. Run E2E testing first (recommended):
     /topology-e2e <project-name>

  2. Proceed with promotion anyway (adds E2E-SKIPPED note to archive):
     /topology-promote <project-name> --execute
```

**This is a soft block.** The user can proceed with `--execute` to bypass the warning. If they do:
- Add an `## E2E Testing` section to the PROMOTION-REPORT.md noting it was skipped
- Add `E2E: Skipped` to the PROJECTS-INDEX.md entry
- Include all unverified manual items in the "Findings Not Promoted" section with reason "E2E testing skipped — runtime validation not performed"

If the user runs `/topology-promote <project-name>` (without `--execute`) and the E2E warning triggers, **stop after the warning**. Do not produce the promotion report. Wait for the user to choose option 1 or 2.

---

## Prerequisites

- [ ] All categories have `VERIFICATION-REPORT.md` with outcome `Full Pass`
- [ ] `VERIFICATION-TABLE.md` has no `✗` or blank cells (all `✓` or `--`)
- [ ] Most recent integration checkpoint is `Clean`
- [ ] `TOPOLOGY-CLAUDE.md` exists
- [ ] `{DOCS_ROOT}/GLOBAL-CONTRACTS.md` exists
- [ ] `{DOCS_ROOT}/GLOBAL-TOPOLOGY.md` exists
- [ ] `{DOCS_ROOT}/GLOBAL-DECISIONS.md` exists
{{! GLOBAL-*.md filenames are system constants per §3 — only the {DOCS_ROOT} prefix is tokenized. }}

If any prerequisite fails, stop:

> Project `<project-name>` is not ready for promotion.
> [List which prerequisite failed and what command to run to resolve it.]

If global docs are missing:
> Global topology documents have not been initialized.
> Run `/topology-global-init --from-projects --from-tiers` before promoting.

---

## Instructions

> **Changing this skill is eval-gated.** `topology-promote` is a release-gating skill — it writes to permanent tier/global docs and the Decision Log. A change to its prompt must hold `/topology-eval topology-promote` at GO before merging (scaffold a def with the eval script template if none exists). See PRINCIPLES § "Eval-gating changes to our own skills". This gate is about editing the *skill*; it does not change the project promotion flow below.

### Step 1: Load All Project Knowledge (main loop)

Read every document in the project:
1. `CONTRACT-SHEET.md` — all verified contracts
2. `SYSTEM-TOPOLOGY.md` — all verified seam contracts
3. `DECISION-LOG.md` — all decisions made during the project
4. All `CURRENT-STATE.md` files — what existed before
5. All `FUTURE-STATE.md` files — what was specified
6. All `VERIFICATION-REPORT.md` files — what was confirmed
7. All integration checkpoint reports — cross-category findings
8. All phase runbooks — implementation details and edge cases
9. All `categories/*/APP-DOC-IMPACT.md` files — user-facing doc impact

Build a synthesis: what is now true about this system that was not true before, or was not documented before, as a result of this project. This synthesis is the **source corpus** the drafting workflow's agents read from — every proposed edit must be derivable from these verified artifacts.

---

{{#if COMPASS_ENABLED}}
### Step 1b: Locate the Compass Anchor (main loop)

Grep `{COMPASS_DIR}/PRIORITY-MAP.md` for the project slug and for the project's two or three most likely English names (e.g., the slug `{EXAMPLE_PROJECT_SLUG}` might be referenced by a prose phrasing that does not match the slug exactly; check `TOPOLOGY-CLAUDE.md`'s opening paragraph and KICKOFF.md for the prose phrasing).

Record what you find for the promotion report under a new section, **Compass Anchor**:
- Sprint-N row(s) naming this project — line numbers + verbatim title
- Weekly-brief must-do item naming this project — line number + verbatim text
- "Last updated:" lines that reference earlier closures of related work (helps you write a consistent rotation later)

If no row names this project, write "Compass anchor: none — this project was not tracked in PRIORITY-MAP" and skip the Compass closure step in Step 6E.

This step is intentionally early: by the time you reach Step 6 you'll be deep in tier-doc detail. Capturing the anchor now ensures the closure pass doesn't depend on re-reading PRIORITY-MAP in a freshly-stretched context window. It is done in the main loop, not the workflow — Compass closure is a canonical mutation the workflow never touches.

---
{{/if}}

### Step 2: Read the Existing Tier Docs and Global Docs (main loop)

Read every existing file in:
{{#if TIER_ENABLED}}
- `{TIER_1_DIR}/`
- `{TIER_2_DIR}/`
- `{TIER_3_DIR}/`
{{/if}}
- `{DOCS_ROOT}/GLOBAL-CONTRACTS.md`
- `{DOCS_ROOT}/GLOBAL-TOPOLOGY.md`
- `{DOCS_ROOT}/GLOBAL-DECISIONS.md`
- Any `{DOCS_ROOT}/apps/<app>/` docs named in the merged APP-DOC-IMPACT set

For each file, note:
- What it currently covers
- Whether this project touched any of that content
- Whether any of its current content is now incorrect or outdated

This read is what lets the drafting workflow's per-target agents produce **surgical** proposed edits rather than blind rewrites — each agent is handed the current content of its target doc plus the relevant slice of the source corpus.

---

{{#if TIER_ENABLED}}
### Step 3: Enumerate the Doc Targets (main loop, before the workflow)

This is the hybrid pattern: the work-list is discovered inline, then fanned out. Walk the synthesis from Step 1 and the existing docs from Step 2 and build the flat list of **destination docs** this promotion will touch. Each entry becomes one drafting agent in the workflow. A target is any one of:

**Tier 1 — {TIER_1_LABEL}** (`{TIER_1_DIR}/`) — stable, slow-changing, foundational. A finding belongs here if it describes:
- A verified seam contract that governs how major system components talk to each other
- A contract invariant now enforced system-wide
- A data structure or API boundary that is now canonical
- An infrastructure or auth pattern that was codified
- An internal package change that affects consumers platform-wide

**Tier 2 — {TIER_2_LABEL}** (`{TIER_2_DIR}/`) — active development state. A finding belongs here if it describes:
- A workstream's current implementation state that changed
- A feature now built that was previously planned
- A known gap that was closed
- A new known gap that was discovered but deferred

**Tier 3 — {TIER_3_LABEL}** (`{TIER_3_DIR}/`) — cross-cutting conventions. A finding belongs here if it describes:
- A pattern that emerged during implementation that should be followed in future work
- A refactoring approach that proved effective and should be standardized
- An integration or event pattern that was established or changed
- A frontend convention that was codified

**Global layer** — three fixed targets, each its own drafting agent:
- `GLOBAL-CONTRACTS.md` — new GC entries (`Proposed` if net-new; `Proposed → Active` if this project verified an existing `Proposed`) + updates to existing entries
- `GLOBAL-TOPOLOGY.md` — new GS seams, retired seams, regressed-seams-resolved
- `GLOBAL-DECISIONS.md` — new GD platform-level decisions

**App docs** — one drafting agent **per affected app** (it drafts all of that app's affected docs: FEATURES, CONCEPTS, DATA-PATTERNS, INTEGRATIONS, PERMISSIONS, LIMITS, CHANGELOG). Source is the merged `APP-DOC-IMPACT.md` set. If no APP-DOC-IMPACT.md files exist but the project had user-facing changes, flag the gap and derive impact from verification reports and phase runbooks (still one agent per app).

**Not promoted** — stays in archive only (these get NO drafting agent; they are recorded in the report's "Findings Not Promoted" table):
- Implementation details specific to this project (phase runbooks, session notes)
- Decisions that were considered and rejected
- Intermediate states that no longer exist

Emit the count to the user: `Drafting promotion: <N1> tier-1, <N2> tier-2, <N3> tier-3, 3 global, <NA> app doc targets.`
{{/if}}
{{#unless TIER_ENABLED}}
### Step 3: Enumerate the Doc Targets (main loop, before the workflow)

This is the hybrid pattern: the work-list is discovered inline, then fanned out. Walk the synthesis from Step 1 and the existing docs from Step 2 and build the flat list of **destination docs** this promotion will touch. Each entry becomes one drafting agent in the workflow. Targets include:

**Global layer** — three fixed targets, each its own drafting agent:
- `GLOBAL-CONTRACTS.md` — new GC entries (`Proposed` if net-new; `Proposed → Active` if this project verified an existing `Proposed`) + updates to existing entries
- `GLOBAL-TOPOLOGY.md` — new GS seams, retired seams, regressed-seams-resolved
- `GLOBAL-DECISIONS.md` — new GD platform-level decisions

**App docs** — one drafting agent **per affected app** (it drafts all of that app's affected docs: FEATURES, CONCEPTS, DATA-PATTERNS, INTEGRATIONS, PERMISSIONS, LIMITS, CHANGELOG). Source is the merged `APP-DOC-IMPACT.md` set. If no APP-DOC-IMPACT.md files exist but the project had user-facing changes, flag the gap and derive impact from verification reports and phase runbooks (still one agent per app).

**Not promoted** — stays in archive only (these get NO drafting agent; they are recorded in the report's "Findings Not Promoted" table):
- Implementation details specific to this project (phase runbooks, session notes)
- Decisions that were considered and rejected
- Intermediate states that no longer exist

Emit the count to the user: `Drafting promotion: 3 global, <NA> app doc targets.`
{{/unless}}

### Step 4: Invoke the Drafting Workflow (parallel per doc target)

Author the script below (filling the enumerated targets and per-target source slices into `args`) and call the `Workflow` tool. **This is the `Workflow` opt-in — invoking `/topology-promote` authorizes it.** The workflow does exactly one thing: fan out one agent per destination doc and have each draft a structured `{docTarget, proposedEdit, rationale}` proposal from the verified source corpus and the current content of its target. It writes nothing, moves nothing, and mutates no canonical doc.

```js
export const meta = {
  name: 'topology-promote-draft',
  description: 'Draft a proposed insertion/update for each destination doc in parallel — DRAFT ONLY, no writes',
  phases: [
    { title: 'Draft', detail: 'one agent per doc target proposes a surgical edit from verified findings' },
  ],
}

// --- structured return for one proposed edit (promote-local schema) ---
const DOC_EDIT = {
  type: 'object',
  required: ['docTarget', 'tier', 'action', 'proposedEdit', 'rationale', 'sources'],
  properties: {
    docTarget:    { type: 'string' },                                  // relative path of the destination doc from repo root
    tier:         { enum: ['tier-1', 'tier-2', 'tier-3', 'global-contracts', 'global-topology', 'global-decisions', 'app-doc'] },
    action:       { enum: ['create', 'update', 'propose-deletion'] },
    proposedEdit: { type: 'string' },                                  // the verbatim text to insert, OR the surgical before/after for an update
    anchor:       { type: 'string' },                                  // for updates: the heading/section the edit attaches to (so the main loop can place it surgically)
    rationale:    { type: 'string' },                                  // why this is now permanently true; for deletions: what changed + risk if kept
    sources:      { type: 'array', items: { type: 'string' } },        // project docs this is derived from (CONTRACT-SHEET C3, DECISION-LOG DL-007, ...)
    globalStatus: { enum: ['Proposed', 'Active', 'Archived', 'n/a'] }, // for global-layer targets only: the status this entry should carry post-promote
    appDoc:       { type: 'string' },                                  // for app-doc targets: which file (FEATURES|CONCEPTS|DATA-PATTERNS|INTEGRATIONS|PERMISSIONS|LIMITS|CHANGELOG)
    confidence:   { enum: ['high', 'medium', 'low'] },                 // low = main loop should scrutinize before applying
  },
}

const { project, targets } = args   // targets: [{ docTarget, tier, action, currentContent, sourceSlice, appDoc }]

phase('Draft')
const drafts = await parallel(
  targets.map(t => () => agent(
    `You are drafting a PROPOSED documentation edit for the topology promotion of project "${project}".\n` +
    `You DRAFT ONLY. You do not write files, move anything, or change any canonical doc. Return a DOC_EDIT object.\n\n` +
    `Destination doc: ${t.docTarget}  (tier: ${t.tier}, action: ${t.action}${t.appDoc ? ', appDoc: ' + t.appDoc : ''})\n\n` +
    `Current content of the destination doc (for surgical placement):\n${t.currentContent || '(new file — does not exist yet)'}\n\n` +
    `Verified source corpus for this target (the ONLY material you may promote from):\n${t.sourceSlice}\n\n` +
    `Rules:\n` +
    `- Promote ONLY what is now permanently true and verified. No implementation trivia, no reversed decisions, no intermediate states.\n` +
    `- For an UPDATE: produce a SURGICAL section edit (name the anchor heading), not a rewrite. Carry an attribution note: "Updated by \`${project}\`, <date>".\n` +
    `- For a CREATE: produce the full new doc body. The main loop adds the created-by footer.\n` +
    `- For a PROPOSE-DELETION: do NOT produce replacement text — produce the reason + the risk-if-kept. Deletions are never auto-executed.\n` +
    `- For a global-layer target: set globalStatus. Net-new GC/GS = Proposed (one project is NOT platform-wide verification). An existing Proposed that THIS project verified = Active. Append-only for GLOBAL-DECISIONS history.\n` +
    `- For an app-doc target: language must be USER-FACING (no internal architecture). CHANGELOG entries are one line under [Unreleased].\n` +
    `- Cite every source artifact in 'sources' (e.g. "CONTRACT-SHEET C3", "DECISION-LOG DL-007", "categories/x/VERIFICATION-REPORT.md").\n` +
    `- If you cannot justify the edit from the source corpus, set action appropriately and confidence:'low' with a rationale saying so — do NOT invent platform truth.`,
    { label: `draft:${t.tier}:${t.docTarget.split('/').pop()}`, phase: 'Draft', schema: DOC_EDIT, agentType: 'Explore' }
  ))
)

return drafts.filter(Boolean)
```

Pass `args: { project, targets }`, where each `target` carries its `currentContent` (from Step 2) and a `sourceSlice` (the relevant portion of the Step 1 synthesis). The workflow returns a `runId` (capture it for `--resume`) and an array of `DOC_EDIT` proposals.

> **The workflow proposes; the main loop disposes.** Per `{COMMANDS_DIR}/topology-PRINCIPLES.md`, no agent inside this workflow writes a file, moves the project, or flips a global contract/decision. The drafting agents read verified artifacts and return proposed edits as data. Every actual write to a canonical tier doc, every global-layer status flip, every app-doc change, the Compass closure, the memory-index update, and the archival file move are **main-loop, human-gated** actions in Step 6.

**Prose-mode path (when the Workflow tool is not available):** Skip this step. Proceed directly to Step 5 and produce the promotion report by synthesizing the findings yourself from Steps 1–3. The two-step report-then-execute discipline is the same regardless of whether a Workflow ran.

---

### Step 5: Produce the Promotion Report (main loop)

**Do not write any tier doc changes yet.** Assemble the returned `DOC_EDIT[]` (or your direct synthesis if prose-mode) into the report first.

Create the promotion report in the project's current directory (either `{PROJECTS_ACTIVE_DIR}/` or `{PROJECTS_E2E_DIR}/`):

```markdown
# Promotion Report — <project-name>

**Generated:** <date>
**Project:** <project-name>
**Status:** Pending Human Review
**E2E Testing:** Completed | Skipped (see notes)
**Draft workflow runId:** <runId>   (for --resume after a revision; omit if prose-mode)

---

## Summary

{{#if TIER_ENABLED}}
**Tier 1 changes:** <N> creates, <N> updates, <N> proposed deletions
**Tier 2 changes:** <N> creates, <N> updates, <N> proposed deletions
**Tier 3 changes:** <N> creates, <N> updates, <N> proposed deletions
{{/if}}
**Not promoted:** <N> findings (stays in archive)
**Low-confidence drafts flagged for scrutiny:** <N>

---

{{#if TIER_ENABLED}}
## Tier 1 — {TIER_1_LABEL} Changes

### Creates

#### `{TIER_1_DIR}/<filename>.md` — NEW

**Why:** <what this project verified that warrants a permanent platform doc>
**Content summary:** <what the new doc will contain>
**Source:** <which project documents this is derived from — from DOC_EDIT.sources>

---

### Updates

#### `{TIER_1_DIR}/<existing-filename>.md` — UPDATE

**Current content:** <brief description of what's there now>
**What changes:** <specific section or assertion that is now outdated or incomplete — DOC_EDIT.anchor>
**New content:** <what replaces or extends it — DOC_EDIT.proposedEdit>
**Source:** <which project documents this is derived from>
**Attribution:** Updated by <project-name>, <date>

---

### Proposed Deletions

#### `{TIER_1_DIR}/<filename>.md` — PROPOSED DELETION

**Reason:** <why this doc is now obsolete — what changed that makes it incorrect or redundant>
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

## App Documentation Changes

Updates to user-facing app documentation in `{DOCS_ROOT}/apps/`.
Source: `APP-DOC-IMPACT.md` files from each category (merged + deduplicated).

### <app-name>

{{! example rows — illustrative only, real apps come from the project's own APP-DOC-IMPACT files }}
| Doc | Action | Entry |
|-----|--------|-------|
| FEATURES | Update | <one-line description> |
| CONCEPTS | Update | <new-term>: <definition> |
| DATA-PATTERNS | Update | <flow description> |
| INTEGRATIONS | Update | <integration description> |
| PERMISSIONS | Update | <access change> |
| LIMITS | Update | <constraint change> |
| CHANGELOG | Append | <release note entry> |

<Repeat for each affected app>

### App Doc Human Review Checklist

- [ ] All user-facing changes from this project are captured
- [ ] Language is user-facing (no internal architecture references)
- [ ] CHANGELOG entries accurately describe what changed from a user's perspective
- [ ] No app docs are being updated for purely internal/refactoring changes

---

## Findings Not Promoted

| Finding | Reason Not Promoted | Lives In |
|---------|--------------------|---------:|
| <description> | Implementation-specific / Superseded / Out of scope | {PROJECTS_ARCHIVE_DIR}/<project-name>/ |

---

## Global Layer Changes

### GLOBAL-CONTRACTS.md

#### New Entries (Proposed → Active or net-new)

| GC ID | Title | Was | Now | Source |
|-------|-------|-----|-----|--------|
| GC-NNN (new) | <title> | — | Proposed | This project — not yet verified platform-wide |
| GC-NNN (existing) | <title> | Proposed | Active | Verified by this project |

#### Updates to Existing Entries
<List any existing GC entries whose governing categories, verification history,
or known limitations need updating. Or: "None.">

---

### GLOBAL-TOPOLOGY.md

#### New Seams

| GS ID | Title | Producer | Consumer | Status | Notes |
|-------|-------|----------|----------|--------|-------|
| GS-NNN (new) | <title> | <cat> | <cat> | Proposed | New seam discovered this project |
| GS-NNN (existing) | <title> | <cat> | <cat> | Active | Re-verified by this project |

#### Retired Seams
<List any seams this project removed or replaced. These move to Archived status.>
<Or: "None.">

#### Regressed Seams Resolved
<List any GS entries that were Regressed and are now restored by this project.>
<Or: "None.">

---

### GLOBAL-DECISIONS.md

#### New Platform-Level Decisions

| GD ID | Title | Affects | Summary |
|-------|-------|---------|---------|
| GD-NNN | <title> | GC-NNN, GS-NNN | <one line> |

#### Decisions Not Promoted
<Project decisions that are too implementation-specific for the global record.
They stay in the archived project Decision Log.>

---

### Global Layer Human Review Checklist

- [ ] New GC entries are warranted — invariants are platform-wide, not project-specific
- [ ] New GS entries accurately describe the seam as it exists after this project
- [ ] Promoted decisions have platform-wide implications, not just local ones
- [ ] No existing GC or GS entries are being incorrectly updated or retired

---

## Decisions Promoted to Decision Log

The following decisions from this project's `DECISION-LOG.md` should be reflected in the
tier docs they affect. They are listed here for traceability.

| Decision | Affects | Tier Doc |
|----------|---------|---------|

---

{{#if COMPASS_ENABLED}}
## Compass Anchor

<From Step 1b. Sprint-N row(s) + weekly-brief item naming this project, with line numbers + verbatim titles.
Or: "Compass anchor: none — this project was not tracked in PRIORITY-MAP.">

---

{{/if}}
## Human Review Checklist

Before approving this promotion:

- [ ] All creates are warranted — findings are stable enough for tier docs
- [ ] All updates are accurate — new content correctly reflects verified behavior
- [ ] All proposed deletions are safe — nothing being removed is still true
- [ ] No findings are missing from the promotion map
- [ ] Attribution notes are present on all updates
- [ ] Every low-confidence draft has been scrutinized or rejected

To approve and execute:
  /topology-promote <project-name> --execute

To revise the report before executing:
  Edit PROMOTION-REPORT.md, then run /topology-promote <project-name> --execute
```

---

### Step 5b: Wait for Human Approval (main loop — the HITL gate)

Stop here. Do not write any tier doc changes. Output:

```
## topology-promote: Promotion Report Ready

Review: {PROJECTS_ACTIVE_DIR}/<project-name>/PROMOTION-REPORT.md (or {PROJECTS_E2E_DIR}/<project-name>/PROMOTION-REPORT.md if the project is in the E2E stage)
Draft workflow runId: <runId>  (if prose-mode, omit this line)

<N> tier doc changes proposed across <N> files.
<N> global layer changes proposed.
<N> app doc updates proposed across <N> apps.
<N> proposed deletions require explicit approval.
<N> low-confidence drafts flagged for scrutiny.

This is the terminal command and is human-gated. When ready:
  /topology-promote <project-name> --execute
```

> If the human edits the report and re-runs, you do **not** need to re-run the drafting workflow — the edited report is the source of truth for `--execute`. Only re-invoke the workflow (with `resumeFromRunId: <runId>`) if new doc targets were added that need fresh drafts; completed drafts return cached, only new targets re-run.

---

### Step 6: Execute (--execute flag only — all writes are main-loop)

When called with `--execute`, read `PROMOTION-REPORT.md` and execute all approved changes. **Every action in this step is a main-loop write. No workflow runs here.** The drafting workflow already did its only job in Step 4.

{{#if TIER_ENABLED}}
**Creates:** Write new tier doc files with the content described in the report. Add a footer:
```markdown
---
*Created by topology-promote from project `<project-name>` on <date>.*
```

**Updates:** Make surgical edits to existing tier docs — targeted section replacements at the `anchor`, not full rewrites. Add an inline attribution comment after each updated section:
```markdown
*Updated by `<project-name>`, <date>: <one-line description of what changed>*
```

**Proposed deletions:** Do not execute. List them again at the end of the execution report as still-pending human action:
```
The following deletions were proposed but not executed.
Delete these files manually after confirming they are safe to remove:
- {TIER_1_DIR}/<filename>.md
```

**After tier doc writes, update the global layer:**
{{/if}}
{{#unless TIER_ENABLED}}
**Update the global layer:**
{{/unless}}

#### Step 6A: Update GLOBAL-CONTRACTS.md

For each new GC entry in the promotion report:
- If net-new: add the full entry using the GC template, status `Proposed` (not Active — a single project verifying it is not platform-wide verification)
- If existing and was `Proposed`, this project verified it: update status to `Active`, add to verification history
- If existing and was `Active`: add this project to the verification history, update "Last verified by"

For each update to an existing entry: make the surgical change and add an Amendment Log entry:
```
| <date> | GC-NNN — <what changed> | <project-name> |
```

#### Step 6B: Update GLOBAL-TOPOLOGY.md

For each new GS entry:
- If net-new: add the full entry using the GS template, status `Proposed`
- If existing and was `Proposed`: update to `Active`, populate verification history
- If existing and was `Active`: update "Last verified by" and history
- If existing and was `Regressed`: update to `Active`, note resolution in history

For each retired seam: update status to `Archived`, add to the Archived Seams section:
```
Archived: <date> — removed by project <project-name>. <one sentence why.>
Replaced by: GS-NNN | Nothing (seam no longer exists)
```

Update the Seam Index table to reflect all changes.

#### Step 6C: Update GLOBAL-DECISIONS.md

For each new GD entry:
- Add the full entry using the GD template
- Update the Decision Index table

For each existing decision affected by this project:
- Add a note to the existing entry's History section
- Do NOT modify the original decision text — append only

#### Step 6D: Update App Documentation

For each app doc change in the promotion report's "App Documentation Changes" section:

**FEATURES.md** — Add or update feature entries in the appropriate section. Maintain the existing organizational structure. Add an attribution note:
```markdown
*Updated by `<project-name>`, <date>*
```

**CONCEPTS.md** — Add new terms in alphabetical order within the glossary. Use the same formatting style as existing entries.

**DATA-PATTERNS.md** — Add or update flow descriptions. Keep the same visual style (arrows, step descriptions) as existing patterns.

**INTEGRATIONS.md** — Add or update integration entries.

**PERMISSIONS.md** — Update role descriptions or access patterns.

**LIMITS.md** — Update constraint values or add new constraints.

**CHANGELOG.md** — Append entries under the `## [Unreleased]` heading. Each entry is one line. When a version is cut, the unreleased section is moved under a dated version heading.

```markdown
## [Unreleased]

- <entry from project-1>
- <entry from project-2>
```

**App docs follow the same two-step review flow as tier docs** — changes are proposed in Step 5 and only written with `--execute`.

{{#if COMPASS_ENABLED}}
#### Step 6E: Close the Compass Row (PRIORITY-MAP)

If this project was named in a Compass weekly-brief must-do or a Sprint-N row of `{COMPASS_DIR}/PRIORITY-MAP.md`, close that row in the same execute pass — otherwise PRIORITY-MAP will keep advertising the work as open even though `{PROJECTS_E2E_DIR}/` says shipped. Use the **Compass Anchor** section captured in Step 1b so this pass doesn't depend on re-scanning PRIORITY-MAP in a stretched context window.

**Detection — find any rows naming this project:**

```bash
grep -n "<project-name>" {COMPASS_DIR}/PRIORITY-MAP.md
```

Also grep for the project's near-synonyms (e.g., a prose row title that does not match the slug `{EXAMPLE_PROJECT_SLUG}` exactly) — the row name and the project slug rarely match exactly. Scan the project's `TOPOLOGY-CLAUDE.md` opening paragraph for the phrase Compass used to refer to the work; that phrase is usually the row's title.

**If no matching row is found, skip this step** and add one line to the execution report: `Compass row: none — project was not tracked in PRIORITY-MAP`.

**If a matching row is found, apply these surgical edits to PRIORITY-MAP.md:**

1. **Mark the Sprint-N row CLOSED.** Prefix the priority cell with `— ✓ CLOSED <date>` and wrap the title in `~~strikethrough~~`. Append a closure block to the description cell citing:
   - The promotion commit SHA (the one produced by Step 6G archive — capture before moving the directory)
   - The PR number(s) that shipped the substantive work
   - One sentence per category that landed (verifiable from each `VERIFICATION-REPORT.md`)
   - Any production-relevant footprint (e.g., migration numbers applied + the database they ran against + verification timestamp; lockdown-test LOC if any)

2. **Mark the weekly-brief must-do CLOSED.** If the project was named in the `Weekly-brief must-do (Mon-Wed)` numbered list near the top of the active sprint section, mark that line too:
   ```
   N. ~~<original title>~~ **CLOSED <date>** — <one-line summary citing PR + {PROJECTS_E2E_DIR}/ promotion>
   ```

3. **Rotate the `Last updated:` header.** Demote the existing `Last updated:` line to `Previous update:` and the existing `Previous update:` line to `Earlier update:` (if there are already `Earlier update:` lines, leave them — the field allows multiple). Write a new `Last updated:` line at the top with the project closure summary and the PR/commit references.

4. **Cross-row hygiene.** If any *other* sprint row in PRIORITY-MAP names this project as a dependency or as work expected to ship in a later sprint, update those rows too — replace the placeholder with the actual closure reference. (Example: a Sprint-5 verification row that says "verify X is gone" when X retirement was the closed project.)

**Format reminder:** the closure note must be specific enough that a future `/compass-check` reading the row can cite the closure to the user without re-reading the project tree. PR numbers + commit SHAs + verification timestamps are the load-bearing parts; the rest is gloss.
{{/if}}

{{#if MEMORY_ENABLED}}
#### Step 6F: Update Memory Index

If a memory file exists under `{MEMORY_DIR}/` for this project (e.g. `project_<slug>_*.md`), append a one-line closure note to its `description:` frontmatter and update the `MEMORY.md` index hook to match the new state. Skip if no memory exists. This catches drift between the codebase reality and the agent's long-term memory of project state.

{{/if}}
#### Step 6G: Archive the Project

After all tier doc writes, global layer writes, app doc writes,{{#if COMPASS_ENABLED}} Compass-row closure,{{/if}}{{#if MEMORY_ENABLED}} AND memory-index update{{/if}} succeed, move the project from its current location to archive:
```
{PROJECTS_E2E_DIR}/<project-name>/    → {PROJECTS_ARCHIVE_DIR}/<project-name>/   (if in the E2E stage)
{PROJECTS_ACTIVE_DIR}/<project-name>/ → {PROJECTS_ARCHIVE_DIR}/<project-name>/   (if in the active stage)
```

Update `PROJECTS-INDEX.md`:
- Status → `Archived`
- Completed date → today
- Tier docs updated → list of files touched
- E2E → `Completed` or `Skipped`

---

### Step 7: Execution Report (main loop)

```
## topology-promote --execute Complete

**Project archived:** {PROJECTS_ARCHIVE_DIR}/<project-name>/

{{#if TIER_ENABLED}}
### Tier Docs Written
| File | Action | Section |
|------|--------|---------|
{{/if}}

### Global Layer Updated
| Document | Changes |
|----------|---------|
| GLOBAL-CONTRACTS.md | <N> new, <N> updated, <N> promoted to Active |
| GLOBAL-TOPOLOGY.md | <N> new, <N> updated, <N> archived |
| GLOBAL-DECISIONS.md | <N> new |

### App Docs Updated
| App | Doc | Changes |
|-----|-----|---------|
<Or: "No app documentation changes (internal/refactoring project).">

{{#if COMPASS_ENABLED}}
### Compass Closure
| File | Change |
|------|--------|
| PRIORITY-MAP.md | Sprint-N row "<title>" → CLOSED + weekly-brief line updated + Last-updated rotated |
<Or: "No PRIORITY-MAP row named this project — nothing to close.">
{{/if}}

### Memory Index
| File | Change |
|------|--------|
| memory/project_<slug>_state.md | description: + body refreshed |
| memory/MEMORY.md | index hook updated |
<Or: "No memory entry for this project.">

### Pending Manual Deletions
<list or "None">

### Projects Index Updated
✓

Project `<project-name>` is complete.
Recommended next: nothing — the project is archived. (Optional: /topology-status to confirm the lifecycle is closed.)
```

---

## Important Notes

- **Always human-initiated — never autopilot.** `topology-autopilot` and `topology-sprint` STOP at this boundary. The promote go/no-go is a main-loop decision per `{COMMANDS_DIR}/topology-PRINCIPLES.md`. There is no flag, env var, or workflow path that lets an unattended run cross it. If you find yourself about to invoke `/topology-promote` from inside another command's flow, stop — that is the bug.
- **The workflow proposes; the main loop disposes.** The Step 4 drafting workflow reads verified artifacts and returns `DOC_EDIT[]` as data. It writes no file, moves no project, and flips no global status. Every canonical mutation — tier doc writes, global-layer `Proposed → Active` flips, app-doc edits,{{#if COMPASS_ENABLED}} Compass closure,{{/if}}{{#if MEMORY_ENABLED}} memory-index update,{{/if}} the archival move — happens in the human-gated main loop (Steps 5–6). This keeps the HITL boundary clean and is non-negotiable.
- **Report before execute — always.** The two-step flow exists to protect the tier docs. They are the platform's long-term memory. Changes to them need human eyes before they land.
- **Surgical updates, not rewrites.** A project that touched one seam doesn't get to rewrite the entire platform doc. The drafting agents are handed the current content precisely so their proposed edits are surgical (they return an `anchor`). Attribution comments make future audits possible.
- **Deletions are never automatic.** Even with `--execute`. A deletion removes knowledge that other people may depend on. That decision stays with the human. Drafting agents never produce replacement text for a deletion — only the reason and the risk-if-kept.
- **Tier docs are not project docs.** Don't promote implementation details, edge cases specific to this project, or decisions that were reversed. Only promote what is now permanently true. A drafting agent that cannot justify an edit from the source corpus must return `confidence: 'low'` rather than invent platform truth.
- **Low-confidence drafts are scrutinized, not auto-applied.** The report surfaces every `confidence: 'low'` proposal in the Human Review Checklist. The human approves or rejects each before `--execute` writes it.
- **Archive happens last.** The project lives in `{PROJECTS_ACTIVE_DIR}/` (or `{PROJECTS_E2E_DIR}/`) through the entire promotion process. It only moves to `{PROJECTS_ARCHIVE_DIR}/` after `--execute` confirms all writes succeeded.
- **Resume over re-draft.** If the human adds doc targets after reviewing the report, re-invoke the drafting workflow with `resumeFromRunId: <runId>` and the same script — completed drafts return cached, only new targets re-run. If they only edited the report text, skip the workflow entirely and `--execute` from the edited report.

### Global Layer Promotion Rules

**What becomes Active vs. Proposed in the global docs:**

A contract or seam is promoted to `Active` in the global layer only when it has been verified by a topology project. A single project verifying it promotes it from `Proposed` to `Active`. This is a deliberate threshold — the global layer should reflect verified reality, not aspirations. Net-new entries always land `Proposed` (one project is not platform-wide verification).

**What goes in GLOBAL-DECISIONS vs. stays in the project log:**

| Belongs in GLOBAL-DECISIONS | Stays in project Decision Log only |
|---------------------------|-----------------------------------|
| Changes a global contract | Implementation detail for this project |
| Retires or creates a platform seam | Local architectural choice |
| Establishes a cross-cutting pattern | Decision reversed before project ended |
| Affects multiple future projects | Applies only to this project's categories |
| Overrides a prior global decision | Superseded within the same project |

When in doubt: if a future project lead reading the global docs would need to know this to make good decisions, it belongs in GLOBAL-DECISIONS. If it's internal project history, it stays in the archive.

---

## Placeholders in This File

| Placeholder | Replace With |
|-------------|-------------|
| `{DOCS_ROOT}` | Path to your documentation root |
| `{PROJECTS_ACTIVE_DIR}` | Path to your active projects directory |
| `{PROJECTS_E2E_DIR}` | Path to your E2E-stage projects directory |
| `{PROJECTS_ARCHIVE_DIR}` | Path to your archived projects directory |
| `{COMPASS_DIR}` | Path to your Compass strategy docs (only if Compass is enabled) |
| `{TIER_1_DIR}` | Path to your tier-1 docs |
| `{TIER_2_DIR}` | Path to your tier-2 docs |
| `{TIER_3_DIR}` | Path to your tier-3 docs |
| `{TIER_1_LABEL}` | Human label for tier 1 (e.g., "Platform") |
| `{TIER_2_LABEL}` | Human label for tier 2 (e.g., "Workstreams") |
| `{TIER_3_LABEL}` | Human label for tier 3 (e.g., "Patterns") |
| `{MEMORY_DIR}` | Path to agent memory directory (only if Memory is enabled) |
| `{COMMANDS_DIR}` | Path to your slash-commands directory |
| `{EXAMPLE_PROJECT_SLUG}` | Illustrative project slug for examples |

$ARGUMENTS
