# compass-check

Quick pulse check on progress and direction. Run on {CADENCE_CHECK_DAYS} for daily focus and a mid-week gut check. Takes ~5 minutes to review.

## Usage

```
/compass-check
```

No arguments required. The command detects context (day of week, time) to adjust its output.

---

## Instructions

### Step 1: Load Context

Read:
1. `{COMPASS_DIR}/PRIORITY-MAP.md`
2. `{COMPASS_DIR}/MILESTONES.md`

Check for the most recent weekly brief output. If this conversation doesn't have one, check git log for recent activity to infer what's been worked on.

### Step 2: Determine Check Type

Based on the current day and context:

- **Early-week check day ({CADENCE_CHECK_DAYS})** → Daily Check (focused, ~5 min)
- **Mid-week, end of day** → Mid-Week Gut Check (reflective, ~10 min)
- **Any other day** → General Check (flexible, useful anytime)

### Step 3: Check Recent Progress

Run `git log --oneline --since="1 day ago" --no-merges` (for daily) or `--since="3 days ago"` (for mid-week) to see what was shipped.

Cross-reference with the current week's must-do list from the most recent weekly brief.

### Step 3b: Reconcile PRIORITY-MAP against reality

Before answering "what's open?", check whether PRIORITY-MAP itself is stale. Run this reconciliation pass:

1. **Walk recent merges.** `git log --oneline --since="<last priority-map update>" --no-merges main` and pick out commits whose title or body cites a slash command (`/topology-promote`, `/topology-merge`, `/topology-integrate`) or whose footer ratifies a project. PR numbers (`#NN`) and "promote to e2e/" / "promoted to e2e/" / "SHIPPED" phrases are the strongest signals.

2. **Walk recently-promoted projects.** `ls -lt {PROJECTS_E2E_DIR}/ | head` — projects whose mtime is after the PRIORITY-MAP `Last updated:` date may not have closed their Compass row.

3. **For each candidate, grep PRIORITY-MAP for the project slug and its English synonyms.** If you find an open row (no `~~strikethrough~~`, no `CLOSED`/`SHIPPED` prefix) that names the just-promoted project, the doc is stale.

4. **Flag drift loudly in the check output, BEFORE answering the user's question.** Use this block:

   ```
   ⚠️  PRIORITY-MAP DRIFT DETECTED

   The following projects appear shipped but PRIORITY-MAP still shows them open:
     - <project-slug> ← <merge commit SHA, PR#, e2e/ promotion date>
       PRIORITY-MAP row: Sprint N P? — "<row title>"

   The "current focus" / "must-do" analysis below uses the doc as-written,
   but those rows may already be done. Recommend running /topology-promote
   to close the rows, or updating PRIORITY-MAP manually.
   ```

5. **Continue with the rest of the check.** Don't refuse to render — just disclose the conflict so the user can correct before the analysis lands.

The reconciliation pass exists because compass docs are append-mostly and lossy by default. Without this step, `/compass-check` quotes whichever stale text happens to be in the doc, which produces confidently-wrong status reports (the classic failure mode: a project that has been Verified ✓ in `e2e/` for a day while its PRIORITY-MAP row still reads as open work).

### Step 4: Render Check

#### Daily Check ({CADENCE_CHECK_DAYS} AM)

```
───────────────────────────────────────────────────────────
  COMPASS CHECK — <Day>, <Date>
  Sprint Day <N> of <total>{{#if PRIMARY_MILESTONE}}  |  <N> weeks to {PRIMARY_MILESTONE}{{/if}}
───────────────────────────────────────────────────────────

YESTERDAY
  Completed: <what shipped>
  In Progress: <what's still open>

TODAY'S MUST-DO
  -> <The single most important task for today>
     <Brief context on what "done" looks like>

  Also on deck:
  -> <Secondary task if time allows>

STATUS
  Sprint Must-Dos: <N>/<total> complete
  On Track: YES / SLIPPING — <reason if slipping>

  <If slipping, one specific recommendation>
───────────────────────────────────────────────────────────
```

#### Mid-Week Gut Check (end of mid-week)

```
───────────────────────────────────────────────────────────
  COMPASS MID-WEEK CHECK — <Day>, <Date>
  Sprint Window Closing{{#if PRIMARY_MILESTONE}}  |  <N> weeks to {PRIMARY_MILESTONE}{{/if}}
───────────────────────────────────────────────────────────

SPRINT RESULTS
  ✓  <completed must-do>
  ✓  <completed must-do>
  ✗  <missed must-do> — <why>
  ⏳  <in progress, not finished>

  Sprint Score: <N>/<total> must-dos completed

CARRYOVER DECISION
  <For each missed/in-progress item:>
  -> <task>: CARRY OVER | DEFER TO NEXT WEEK | DESCOPE
     <rationale>

REST-OF-WEEK OUTLOOK
  <Adjusted like-to-do list accounting for any carryover>

PACE CHECK
  Phase <N> progress: <X>%
{{#if PRIMARY_MILESTONE}}  {PRIMARY_MILESTONE} timeline: ON TRACK / AT RISK / BEHIND
  <If behind, what needs to change>{{/if}}
───────────────────────────────────────────────────────────
```

#### General Check (Any Day)

```
───────────────────────────────────────────────────────────
  COMPASS CHECK — <Day>, <Date>
{{#if PRIMARY_MILESTONE}}  <N> weeks to {PRIMARY_MILESTONE}{{/if}}
───────────────────────────────────────────────────────────

CURRENT FOCUS
  Phase: <current phase>
  Active work: <what's in progress>

PROGRESS SINCE LAST CHECK
  <git log summary>

NEXT UP
  -> <highest priority incomplete task>

ON TRACK: YES / AT RISK / BEHIND
  <brief assessment>
───────────────────────────────────────────────────────────
```

---

## Important Notes

- **Keep it short.** This is a 5-minute read, not a 20-minute planning session. Save deep analysis for the weekly brief.
- **Flag drift immediately.** If must-do items are slipping, say so on the first check — don't wait for the mid-week gut check.
- **One task at a time.** The daily check should make it crystal clear what to work on *right now*. Not a list of everything — the one thing.
- **Be honest about slipping.** "SLIPPING" is not a judgment — it's information that enables a course correction.
