# topology-next

Introspect the current topology state across all active projects, rank candidate next actions by leverage, and walk the user through the highest-value one with rationale. Can invoke other topology commands as sub-steps when doing so advances the work. Replaces the mental tax of asking "what should I do next?" with a single entry point that produces either a one-line command (brief mode) or an interactive walkthrough that ends with concrete decisions captured.

## Usage

```
/topology-next                              # default: interactive walkthrough with sub-command invocation
/topology-next --brief                      # one-line output: the next command to run; no interaction
/topology-next --batch                      # interactive: answer all decisions, commit at the end
/topology-next --focus <project-name>       # scope ranking to one project (still reads others for context)
/topology-next --skip <kind>                # skip one category of next-action (e.g., --skip dl-proposals)
/topology-next --dry-run                    # propose + show rationale; never invoke sub-commands
```

### Arguments

- `--brief` — Return a single line: the next recommended command the user should run. No rationale, no sub-invocation, no file writes.
- `--batch` — Interactive walkthrough, but defer all sub-command invocations until the end. Answer everything first, then commit as a batch.
- `--focus <project-name>` — Prioritize next actions inside the named project. Other projects are still scanned (for cross-project context) but their work is ranked lower.
- `--skip <kind>` — Omit a category from candidate ranking. Valid kinds: `dl-proposals`, `security-gates`, `paused-sprints`, `integration-checkpoints`, `e2e-readiness`.
- `--dry-run` — Analyze state, surface the recommendation with full rationale, but never invoke another command. User sees what would happen without it happening.

---

## Instructions

### Step 1: State detection (read-only; no confirmation needed)

Build a complete picture of the current topology state. Every source is read-only — no mutations in this step.

Sources to read:

1. **Active projects inventory**
   - `ls {PROJECTS_ACTIVE_DIR}/*/TOPOLOGY-CLAUDE.md` — which projects exist
   - For each: read TOPOLOGY-CLAUDE's categories table (status column)

2. **Paused autopilots**
   - `{PROJECTS_ACTIVE_DIR}/*/autopilot/CHECKPOINT.md` — parse `status` field
   - If paused: read the full checkpoint to understand the pivot state + DL proposal inventory

3. **Paused sprints**
   - `{PROJECTS_ACTIVE_DIR}/*/sprints/*/CHECKPOINT.md` — parse `status` field
   - For each paused sprint: record `hitl_reason`, `current_category`, `current_phase`, `proposed_decisions`

4. **Pending DL proposals** (authoritative source: sprint / autopilot CHECKPOINT.md files; detailed bodies: Implementation Plan "Open Decisions" sections)
   - Scan every `<topology-result>` block in `{PROJECTS_ACTIVE_DIR}/*/categories/*/` for `hitl_trigger` non-null
   - Scan Implementation Plan files for "Open Decisions Requiring DL Entries" section
   - Reconcile duplicates — a proposal mentioned in a CHECKPOINT is the same entity as its detailed body in an Implementation Plan

5. **Security-sensitive gates**
   - Same scan, filtered by `hitl_trigger: security-sensitive-change`

6. **Verified vs unverified categories**
   - `{PROJECTS_ACTIVE_DIR}/*/VERIFICATION-TABLE.md` — parse cell states
   - Count Verified ✓ per row; identify fully-verified categories vs partial vs blank

7. **Integration checkpoints pending**
   - For every group where all categories have Verified ✓: check if `{PROJECTS_ACTIVE_DIR}/<project>/integration-checkpoints/CP<N>-*.md` exists
   - If not: that group needs an integration checkpoint

8. **E2E / promote readiness**
   - A project is E2E-ready if all its categories are Verified ✓ and all integration checkpoints pass
   - Never auto-suggest past this boundary — surface as "you could now run /topology-e2e"

9. **Working tree state**
   - `git status --short` to detect uncommitted changes
   - If uncommitted: classify as (a) documentation from a prior run (expected), (b) mid-implementation (resume target), (c) dirty state requiring user attention

10. **DECISION-LOG freshness**
    - Cross-reference pending DL proposals with existing DECISION-LOG entries — if a proposal ID (e.g., `DL-PROP-1`) was already approved, mark it resolved; don't re-surface

### Step 2: Rank candidate next actions

Generate a ranked list of candidate actions. Ranking is deterministic; ties are broken by creation timestamp (oldest first).

**Ranking order (highest priority first):**

1. **External-lead-time items** — any DL proposal that requires external action (cloud provisioning, vendor account setup, purchase orders, user-managed secrets). Even if they don't unblock the most downstream work, starting them first minimizes total wall time. Detect via keywords in proposal body that signal an external dependency: e.g., a cloud provider name, a managed-service subscription, the secrets tool, "external", "portal", "provisioning".

2. **Security-sensitive gates** — `hitl_trigger: security-sensitive-change`. Typically take the longest to review (require human judgment, cross-team review, architectural read). Surface early even if blocking-impact is modest.

3. **DL proposals ranked by unblocking impact** — compute "unblocking weight" per proposal:
   - +10 if it unblocks a whole phase
   - +5 per category it gates
   - +3 per seam it unblocks
   - +2 if it is a precondition for another project (cross-project dependency)
   - -1 if it is produced by a future phase (cosmetic — documented for visibility, not actionable yet)
   Sort descending; surface top N (default 3).

4. **Paused sprints ready to resume** — a sprint is resume-ready when its CHECKPOINT's blocking dependencies are all satisfied. Run `/topology-resume` (or recommend it in `--brief`).

5. **Integration checkpoints pending** — if a group is fully verified but has no CP file, run `/topology-integrate`.

6. **Verified categories accumulating without integration** — same as above but scan cross-sprint (e.g., {EXAMPLE_PROJECT_SLUG} G1 + G2 both verified but no consolidated integration).

7. **E2E readiness boundary** — project fully verified, all integrations clean. Surface as "ready for `/topology-e2e`" but never auto-invoke.

8. **Promote readiness boundary** — after E2E runs clean, surface as "ready for `/topology-promote`" but never auto-invoke.

9. **Idle — all clean** — no paused work, no pending decisions, nothing to integrate. Suggest starting a new group via `/topology-sprint` or taking stock via `/topology-status`.

### Step 3: Mode branch

**If `--brief`:**
Output a single line: the next command the user should run, with minimal context. No file writes. No sub-command invocation. Exit.

Example brief outputs:
```
Run: /topology-decide {EXAMPLE_PROJECT_SLUG} DL-PROP-1 --approve  # external provisioning has lead time
```
```
Run: /topology-resume {EXAMPLE_PROJECT_SLUG}  # all pending DLs are approved; sprint is ready
```
```
Run: /topology-integrate {EXAMPLE_PROJECT_SLUG}  # G1 verified; CP-G1 pending
```
```
(all clean — run /topology-status for a full dashboard, or /topology-sprint-plan for new work)
```

**If `--dry-run`:**
Produce the full interactive walkthrough synthesis (Step 4's output) but never invoke sub-commands. The user sees the rationale and the *would-invoke* plan without any state change.

**Otherwise (default or `--batch`):** proceed to Step 4.

### Step 4: Interactive walkthrough (synthesis outputs)

Before invoking any sub-command, produce the synthesis outputs — these are unique to `/topology-next` and cost nothing but save real cognitive load.

1. **"Where you are" paragraph** — 2-3 sentences merging state across all projects. If multiple projects are active, lead with the primary (per Step 8's primary-project selection rule) and note others as context. Example: *"Both projects have paused at phase-plan — {EXAMPLE_PROJECT_SLUG}'s {EXAMPLE_CATEGORY_SLUG} and all three of the other project's Group 1 categories. 13 DL proposals are pending across 4 categories, plus one security gate on a DB schema. No commits since the autopilot run at 18:30."*

2. **Do-first table** — ranked candidate actions with context:

   ```
   | # | Action                                                    | Why now                                        | Est. time |
   |---|-----------------------------------------------------------|------------------------------------------------|-----------|
   | 1 | Decide DL-PROP-3 (external deployment specifics)          | External lead time — start provisioning async  | 15m now + external |
   | 2 | Decide DL-PROP-1, 2 (external probe + config)             | Unblocks {EXAMPLE_CATEGORY_SLUG} Phases 1-2    | 10m       |
   | 3 | Review security gate: DB schema migration                 | Longest review cycle; also blocks Phase 2 PO   | 20-30m    |
   | 4 | Decide DL-PROP-4..6 (sibling category)                    | Unblocks a clean category in the other project | 15m       |
   ```

3. **Decision dependency graph** — which DL proposals unblock which phases / categories / seams. A compact diagram or table that makes the implication of each choice legible.

4. **Recommended sequence** — one sentence on the order you'd actually walk through, given all above.

Present these synthesis outputs. Then ask: *"Walk through decisions in this order, or show me something else?"*

### Step 5: Decision walkthrough (interactive, per-item)

For each DL proposal selected (in the agreed order):

1. **Context block**
   - Title
   - Why this decision exists (rationale section from CURRENT-STATE / GAP-ANALYSIS / Implementation Plan)
   - What it unblocks (downstream phases, categories, seams)
   - What prior decisions (existing DECISION-LOG entries) constrain this one
   - What sibling project decisions relate

2. **Proposed body** — from the Implementation Plan's Open Decisions section, verbatim

3. **Alternatives** — surface the alternatives considered, even if the proposal has a recommended choice

4. **Open question for user** — "Approve as-proposed? Amend any field? Reject and propose something else?"

5. **Capture the answer** in-memory. If default mode: confirm + invoke `/topology-decide` per batch boundary (see Step 6). If `--batch` mode: capture and move to next item; invoke all at the end.

**Principle:** never paraphrase the user's answer back as a synthesized decision without showing them the exact DL body that will land. If they amend a field, show the full amended proposal and confirm before writing.

### Step 6: Sub-command invocation (mutation tiers)

Obey these tiers when considering whether to invoke another topology command:

| Tier | Commands | Rule |
|------|----------|------|
| **Read-only** | `/topology-status`; raw file reads (CHECKPOINT, VERIFICATION-TABLE) | Invoke freely, no confirmation |
| **Writes review artifacts** | `/topology-current-state` (re-run for drift); `/topology-gap` (re-run after dependent category verifies) | Propose + single confirmation before invoking |
| **Mutates tracked state** | `/topology-decide`; `/topology-resume`; `/topology-integrate` | Propose + confirm + batch where possible |
| **Enters implementation** | Any phase-E work (via `/topology-implement`) | Never auto-invoke; always HITL |
| **E2E or promote** | `/topology-e2e`; `/topology-promote` | Never auto-invoke; always HITL |

**Batching rule for `/topology-decide`:** accumulate multiple decisions into a single confirmation. Example: *"I have your answers for DL-PROP-1 (approve), 2 (amend with a budget cap), 3 (approve), 4 (approve), 5 (approve). Ready to write 5 DECISION-LOG entries?"* → single ACK → invoke `/topology-decide` 5 times back-to-back.

**Default mode** executes the batch after each logical group (e.g., all proposals within one category). `--batch` mode defers all execution until the full walkthrough completes.

### Step 7: Nested HITL loop

If a sub-command invocation itself hits a HITL gate:

1. Capture the new HITL trigger in-memory
2. Return control to `/topology-next`
3. Re-run Step 1 (state detection) — the paused state will now include the new gate
4. Re-run Step 2 (ranking) — new gate gets ranked against everything else
5. Present: *"After running /topology-resume, the sprint paused again at [phase] with [trigger]. Here's the new top recommendation: ..."*

This makes the command a genuine walker through multi-blocker state — user stays in one flow even as the sub-commands generate more decisions.

Exit conditions:
- User says "stop" or equivalent
- No more actionable next steps (all green)
- A sub-command errors (not pauses) — report and exit, do not retry

### Step 8: Decisions walkthrough file

At the start of an interactive session, open `{PROJECTS_ACTIVE_DIR}/<primary-project>/autopilot/DECISIONS-<YYYYMMDD-HHMM>.md` (create if missing). Append an entry per decision asked:

```markdown
## DL-PROP-1 — <proposal title>

**Asked at:** <ISO datetime>
**Session:** /topology-next (default mode)

**Context shown to user:**
- Rationale: [from Implementation Plan]
- Unblocks: Phase 1 of {EXAMPLE_CATEGORY_SLUG}
- Constrained by: {EXAMPLE_DL_ID} (<the prior decision it depends on>)

**Proposed body:**
[verbatim from Implementation Plan]

**User answer:**
- Status: Approve as-proposed
- Notes (if any): [user-provided notes]

**Resulting action:**
Invoked: /topology-decide {EXAMPLE_PROJECT_SLUG} DL-PROP-1 --approve
DECISION-LOG entry: <assigned DL-NNN>
Timestamp: <ISO datetime>
```

This file is APPEND-ONLY across sessions. A second `/topology-next` invocation on the same day appends to the same file (creates a `## Session 2 — <ISO datetime>` header). The goal is a full audit trail of *the reasoning conversation*, complementing DECISION-LOG which only has the *final state*.

**Primary project selection (deterministic rule):**

The "primary" project anchors session-scoped artifacts (DECISIONS file location here; attribution footers in DL entries; the "Where you are" paragraph's framing in Step 4). Resolve it as follows:

1. **If `--focus <project>` is passed:** that project is primary. Done.
2. **Else, compute "latest-touch" per project** via git:
   ```
   git log -1 --format=%at -- {PROJECTS_ACTIVE_DIR}/<project>/
   ```
   This yields the committer timestamp of the most recent commit touching any file under the project's directory. Compare across all active projects; **the project with the greatest timestamp is primary.**
3. **Tie-breaker (rare — identical timestamps across projects):** alphabetical by project slug. Stable and deterministic.

This rule is preferred over filesystem mtime because (a) it survives clones, rebases, and worktree setup; (b) it correlates with where actual work landed, not where editors happened to touch files; (c) it's reproducible across machines and CI runs.

The resolved primary project's `autopilot/` directory houses the DECISIONS file:

- `{PROJECTS_ACTIVE_DIR}/<primary-project>/autopilot/DECISIONS-<YYYYMMDD-HHMM>.md`

### Step 9: End-of-session summary

Before exiting an interactive session, emit:

```
## /topology-next session complete

**Decisions landed:** <N>
**DL entries added to DECISION-LOG:** <list with IDs>
**Sub-commands invoked:** <list>
**Paused-state transitions:** <summary — e.g., "{EXAMPLE_PROJECT_SLUG} {EXAMPLE_CATEGORY_SLUG}: paused-hitl → implement-ready">

**Still pending:** <what remains>

**Suggested next:** `/topology-resume <project>` / `/topology-next` (if more decisions to make) / `/topology-integrate <project>` / etc.

**Decision walkthrough saved:** `{PROJECTS_ACTIVE_DIR}/<project>/autopilot/DECISIONS-<timestamp>.md`
```

---

## Scenarios (how the command behaves in common states)

### Scenario A: Multiple paused sprints with 10+ pending DLs

State at entry: Two projects both at phase-plan paused after an autopilot run; 13 DL proposals across 4 categories.

Action: Surface synthesis + ranked do-first table. Walk through decisions in external-lead-time → unblocking-impact order. Execute in batches per category. Likely end state: many decisions landed; suggest `/topology-resume` for each unblocked project.

### Scenario B: All categories verified; no integration checkpoint

State at entry: All categories in Group 1 Verified ✓, but `integration-checkpoints/CP1-*.md` doesn't exist.

Action: Surface *"You have a clean Group 1 but CP1 is pending. Run integration?"* → confirm → invoke `/topology-integrate`. If integration passes, recommend Group 2 start. If it fails, surface the violation and rank the fix as top action.

### Scenario C: Mid-implementation working tree dirty

State at entry: `git status` shows modified source files; a sprint has `current_phase: implement`.

Action: Surface *"Looks like you're mid-implementation on [category]. Want to continue (run tests, check drift) or step back (review what's changed)?"* Do NOT auto-commit. Do NOT auto-resume. This is the user's active work; respect their state.

### Scenario D: All green, everything verified

State at entry: Every VERIFICATION-TABLE cell Verified ✓; integration checkpoints clean; no pending DLs.

Action: Surface E2E / promote readiness. Explicitly note these are human-initiated. Offer `/topology-status` for a dashboard or `/topology-sprint-plan` to start the next group if any remain.

### Scenario E: First run on a project (nothing started yet)

State at entry: TOPOLOGY-CLAUDE exists; categories all "Not Started"; no sprints.

Action: Surface *"No sprints started yet. Recommended first move: `/topology-autopilot <project> --through-group 1` (or `/topology-sprint-plan <project> --group 1` for a review-first approach)."*

### Scenario F: Drift detected in an already-analyzed category

State at entry: A category has `CURRENT-STATE.md` with `last_analyzed_commit_sha` older than current HEAD, and files in its `scope_files` have changed.

Action: Surface *"`<category>` was last analyzed at commit X; N commits since have modified M files in its scope. Recommend re-running `/topology-current-state` before advancing. Run it now?"* → confirm → invoke.

---

## Important Notes

- **Command scope is topology only.** Do not reason about non-topology state (unrelated git branches, CI pipelines, random repo files). If `git status` shows changes unrelated to active topology work, mention them and move on.
- **Read-heavy, write-light.** The only files this command writes directly are the DECISIONS-<timestamp>.md walkthrough trace. All tracked state mutations happen via invoking other commands (`/topology-decide`, etc.), preserving their conventions.
{{#if MULTI_AGENT}}
- **No {DELEGATE_AGENT_NAME} Pair Mode on this command.** The synthesis work is judgment-dense; {DELEGATE_AGENT_NAME}'s strengths (bulk file scans, mechanical enumeration) don't fit. State detection is fast on the main Claude. If future usage shows scaling pain, add {DELEGATE_AGENT_NAME} mode then.
{{/if}}
- **Always show your work.** Rationale, alternatives, and downstream impact for every recommendation. User must be able to override without explanation.
- **Never paternalistic.** If the user says "show me DL-PROP-7 instead" out of order, accept and re-rank. If the user says "I want to defer all 13 and look at status first," defer and invoke `/topology-status`.
- **`--brief` is for muscle memory.** Once the user knows this command, `/topology-next --brief` becomes their daily startup incantation — "remind me what I'm doing." Keep its output single-line and parseable.
- **Don't duplicate `/topology-status`.** Status shows state across everything in structured form. `/topology-next` goes one level further: "given that state, here's what matters next." When unsure which to use, surface both options.
- **Audit trail goes in DECISIONS-<timestamp>.md, not DECISION-LOG.** DECISION-LOG is for approved-and-landed entries. The walkthrough trace captures the *conversation* — useful for retrospectives and for re-entering a session partway through.
- **Attribution in DECISION-LOG entries.** When `/topology-next` invokes `/topology-decide`, the written DECISION-LOG entry includes a footer: *"Approved via /topology-next walkthrough on <date> at session [path to DECISIONS file]."* This is for future archaeology.

---

## Placeholders in This File

| Placeholder | Replace With |
|-------------|-------------|
| `<primary-project>` | Project with the most active / most-recently-touched work |
| `<YYYYMMDD-HHMM>` | Timestamp of the /topology-next session start |
| `<category>` | Category slug being discussed |
| `<N>` | Numeric count |
