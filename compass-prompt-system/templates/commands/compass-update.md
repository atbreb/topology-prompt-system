# compass-update

Refresh STATE-OF-THE-UNION.md with current reality. Run on {CADENCE_UPDATE_DAY} each week. Reads code, git history, and project status to produce an accurate snapshot.

## Usage

```
/compass-update
```

No arguments required.

---

## Instructions

### Step 1: Load Current State

Read:
1. `{COMPASS_DIR}/STATE-OF-THE-UNION.md` (current snapshot to compare against)
2. `{COMPASS_DIR}/MILESTONES.md` (done definitions)
3. `{COMPASS_DIR}/PRIORITY-MAP.md` (phase status)
4. `{DOCS_ROOT}/PROJECTS-INDEX.md` (completed projects)

### Step 2: Gather Evidence

Collect real data about what has changed:

1. **Git history:** `git log --oneline --since="7 days ago" --no-merges` — what actually shipped
2. **Active topology projects:** Check `{PROJECTS_ACTIVE_DIR}/` and `{PROJECTS_E2E_DIR}/` for in-flight work
3. **App/module status spot-checks:** For each app/module, read key files to assess real status:
{{#each APPS as app}}
   - **{app.name}** ({app.role}): check `{app.path}` for current implementation state
{{/each}}
4. **Cross-cutting concerns:** Spot-check shared subsystems that span apps (e.g. billing/usage tracking, auth, data layer) for coverage
5. **Infrastructure:** Check deployment config, Dockerfiles, and health checks for production readiness

### Step 3: Diff Against Current Snapshot

Compare what you found in Step 2 against the current STATE-OF-THE-UNION.md. Identify:
- Status changes (things that moved forward)
- New information (things discovered this week)
- Stale information (things that are no longer accurate)
- New decisions made (from git commits, DECISION-LOG entries, or topology projects)

### Step 4: Update STATE-OF-THE-UNION.md

Rewrite STATE-OF-THE-UNION.md with:
- Updated snapshot date
{{#if PRIMARY_MILESTONE}}- Updated weeks remaining{{/if}}
- Updated per-app status tables (only change what actually changed)
- Updated infrastructure status
- Updated cross-cutting subsystem status
- New "Completed Projects" entries if any topology projects finished
- New "Key Decisions" entries
- Updated "Next Actions" pointing to current PRIORITY-MAP phase

**Preserve the document structure.** Don't reorganize — just update the content.

### Step 5: Update PRIORITY-MAP.md Statuses

Update the status column of tasks in PRIORITY-MAP.md based on evidence gathered:
- "Not started" → "In progress" if git log shows work began
- "In progress" → "Complete" if the feature is demonstrably working
- Add notes where helpful

### Step 6: Report Changes

After updating, output a brief summary of what changed:

```
───────────────────────────────────────────────────────────
  COMPASS UPDATE — <Date>
  STATE-OF-THE-UNION.md refreshed
───────────────────────────────────────────────────────────

CHANGES THIS WEEK

  <App/Area>
    <old status> → <new status>
    <what happened>

  <App/Area>
    <old status> → <new status>
    <what happened>

PRIORITY-MAP UPDATES
  <list of task status changes>

NEW DECISIONS
  <any decisions captured>

OVERALL TRAJECTORY
  <one sentence: are we accelerating, steady, or decelerating?>
───────────────────────────────────────────────────────────
```

---

## Important Notes

- **Evidence-based only.** Don't update status based on plans or intentions. Only update based on what you can verify in code, git history, or completed project documents.
- **Don't inflate progress.** "In progress" means work has demonstrably started (commits exist). Not "I plan to start this."
- **Preserve history.** When updating STATE-OF-THE-UNION.md, change the snapshot date and content — but don't delete the "Completed Projects" or "Key Decisions" sections. Those accumulate.
- **Flag stalls.** If something was "In progress" last week and shows no git activity this week, note it. Stalled work is a signal.
