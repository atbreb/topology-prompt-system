# compass-weekly-brief

Generate the weekly briefing for {PROJECT_NAME} development. Run every {CADENCE_BRIEF_DAY} to set the week's direction. This is the most important ritual in the Compass cadence.

## Usage

```
/compass-weekly-brief
```

No arguments required. The command reads all Compass docs and current project state to generate the brief.

---

## Instructions

### Step 1: Load Compass Context

Read all Compass documents:
1. `{COMPASS_DIR}/MILESTONES.md`
2. `{COMPASS_DIR}/PRIORITY-MAP.md`
3. `{COMPASS_DIR}/RISK-REGISTER.md`
4. `{COMPASS_DIR}/STATE-OF-THE-UNION.md`
5. `{COMPASS_DIR}/CADENCE.md`

### Step 2: Assess Current Phase

From PRIORITY-MAP.md, identify which phase we're currently in based on the date and task statuses. Check:
- Which phase's date range contains today?
- What tasks from the current phase are marked complete vs. not started vs. in progress?
- Are any tasks from previous phases still incomplete (carryover)?

### Step 3: Check Recent Activity

Run `git log --oneline --since="7 days ago" --no-merges` to see what was actually shipped last week. Cross-reference with the previous week's must-do items if a prior weekly brief exists.

### Step 4: Identify This Week's Work

From the current phase in PRIORITY-MAP.md, select tasks for this week. Split them into a focused sprint window and a lighter window — the weekly cadence is: {CADENCE_DESCRIPTION}

**Must-Do (focused sprint window):**
- Pick the 3–5 highest priority items that should be completed during the focused deep-work window of the week
- These should be the hardest, highest-value tasks — the ones that need uninterrupted focus
- Order them by priority — task #1 is what starts the week
- Each must-do should be specific and completable (not "work on the importer" but "complete the field-mapping UI for the setup wizard")

**Like-To-Do (lighter window):**
- Pick 3–5 lighter tasks that move the ball forward but don't require deep focus
- These can include: testing, documentation, research, polish, bug fixes, smaller features
- These are valuable but movable — if other operational work takes over, these can slip

### Step 5: Risk Pulse

From RISK-REGISTER.md, flag any risks that have changed:
- Did anything happen last week that escalated a risk?
- Did any mitigation get applied?
- Are there new risks not yet in the register?

### Step 6: Timeline Check

Calculate:
{{#if PRIMARY_MILESTONE}}- Weeks remaining until {PRIMARY_MILESTONE}
- Current phase progress (% of phase tasks complete)
- Overall {PRIMARY_MILESTONE} progress (estimate based on all phases)
- Are we on pace? If we continue at last week's velocity, will we hit the {PRIMARY_MILESTONE} target date?{{/if}}
{{#unless PRIMARY_MILESTONE}}- Current phase progress (% of phase tasks complete)
- Are we on pace relative to last week's velocity?{{/unless}}

If we're falling behind, say so directly. Suggest what to cut, defer, or parallelize.

### Step 7: Render the Brief

Output the weekly brief in this format:

```
═══════════════════════════════════════════════════════════
  COMPASS WEEKLY BRIEF
  Week of <date>{{#if PRIMARY_MILESTONE}} | <N> weeks to {PRIMARY_MILESTONE}{{/if}}
  Phase: <current phase name>
═══════════════════════════════════════════════════════════

LAST WEEK RECAP
  Shipped: <list of completed items from git log / prior brief>
  Missed:  <any must-do items that didn't get done>
  Carried: <items rolling into this week>

───────────────────────────────────────────────────────────
MUST-DO — focused sprint window
───────────────────────────────────────────────────────────

  1. <Task description>
     Area: <app/system>  |  Priority: P<N>
     Why now: <brief rationale>

  2. <Task description>
     Area: <app/system>  |  Priority: P<N>
     Why now: <brief rationale>

  3. <Task description>
     Area: <app/system>  |  Priority: P<N>
     Why now: <brief rationale>

───────────────────────────────────────────────────────────
LIKE-TO-DO — lighter window
───────────────────────────────────────────────────────────

  4. <Task description>
     Area: <app/system>

  5. <Task description>
     Area: <app/system>

  6. <Task description>
     Area: <app/system>

───────────────────────────────────────────────────────────
RISK PULSE
───────────────────────────────────────────────────────────

  <Risk status changes, new risks, or "No changes this week">

───────────────────────────────────────────────────────────
TIMELINE
───────────────────────────────────────────────────────────

{{#if PRIMARY_MILESTONE}}  {PRIMARY_MILESTONE} Target: <target date>
  Weeks Left:    <N>
  Phase:         <current phase> (<X>% complete)
  Overall {PRIMARY_MILESTONE}: <estimated %>
  On Pace:       YES / AT RISK / BEHIND

  <If AT RISK or BEHIND, specific recommendations>{{/if}}
{{#unless PRIMARY_MILESTONE}}  Phase:    <current phase> (<X>% complete)
  On Pace:  YES / AT RISK / BEHIND

  <If AT RISK or BEHIND, specific recommendations>{{/unless}}

═══════════════════════════════════════════════════════════
  Start with task #1. No distractions until it's in progress.
═══════════════════════════════════════════════════════════
```

### Step 8: Update PRIORITY-MAP.md

After generating the brief, update the status column of any tasks in PRIORITY-MAP.md that have changed based on git history or user confirmation.

---

## Important Notes

- **Be direct.** If we're behind, say it. If scope needs to cut, recommend what to cut. Don't sugarcoat.
- **Be specific.** "Work on the importer" is not a task. "Complete the location mapping step in the setup wizard" is a task.
- **Respect the sprint.** Must-do items should be achievable in the focused deep-work window of one week, accounting for some interruptions.
- **Carryover is a signal.** If the same task carries over two weeks in a row, it's either too big (decompose it) or not actually a priority (demote it).
