<!-- Seeded skeleton. The compass bootstrap generates the filled version from your cadence answers. -->

# Cadence

The operating rhythm for {PROJECT_NAME} development. {CADENCE_DESCRIPTION}

---

## Weekly Structure

### {CADENCE_SPRINT_WINDOW}: The Deep-Work Window

These are the sprint days — focused, hard problems, highest-value output. The biggest tasks of the week are front-loaded here.{{#if PRIMARY_MILESTONE}} If something is going to move the needle toward {PRIMARY_MILESTONE}, it happens in this window.{{/if}}

**Rules:**
- Start each day with a clear "must-do" list
- Work the hardest task first — before interruptions steal focus
- If a must-do isn't done by the end of the window, the week is at risk
- Like-to-do items here are bonus — don't let them crowd out must-dos

### {CADENCE_LIGHTER_WINDOW}: The Lighter Window

Lighter work that still moves the ball forward — polish, testing, documentation, research, smaller features. This window absorbs the reality that other obligations compete for attention.

**Rules:**
- Like-to-do items from the weekly brief live here
- If the deep-work window's goals were missed, the first day here is catch-up (escalate, don't ignore)
- End of the window: prep for next week (risk review, quick scan of what's ahead)

---

## Daily & Weekly Rituals

### {CADENCE_BRIEF_DAY} — Weekly Brief

**Command:** `compass-weekly-brief`

The most important ritual of the week. Generates a focused briefing that includes:

- What phase of the Priority Map we're in
- The 3–5 must-do tasks for the deep-work window (in priority order)
- The like-to-do tasks for the lighter window
- Any risks that escalated or deadlines approaching
{{#if PRIMARY_MILESTONE}}- A gut-check on the {PRIMARY_MILESTONE} timeline — are we on pace?{{/if}}

**Your job:** Review the brief, adjust if needed, then start on task #1.

### {CADENCE_CHECK_DAYS} — Daily Check

**Command:** `compass-check`

A quick pulse at the start of each deep-work day:

- What's the must-do for today?
- Did yesterday's must-do get completed? If not, it escalates.
- Any blockers discovered yesterday that change today's plan?
- Time remaining in the deep-work window

**Your job:** Read it, confirm or adjust, start working.

### {CADENCE_UPDATE_DAY} — State Update

**Command:** `compass-update`

Refresh `STATE-OF-THE-UNION.md` with current reality:

- What shipped this week?
- What changed in each app's status?
- Any new decisions made?

**Your job:** Review the updated snapshot. Flag anything that looks wrong.

### {CADENCE_RISK_DAY} — Risk Review + Week Prep

**Command:** `compass-risk`

Close out the week and set up the next one:

- Review each active risk — has anything changed?
- Any new risks discovered this week?
- Any mitigations applied?
- Quick preview of next week's Priority Map focus

**Your job:** Update or confirm risk statuses. Prepare for the next brief.

---

## Accountability

The cadence only works if it's followed. The agent's role:

1. **Flag drift.** If a `compass-check` reveals must-do items are slipping, say so directly — no sugarcoating.
2. **Track patterns.** If the same type of work keeps slipping week after week, that's a signal — the estimate, the priority, or the decomposition is wrong.
3. **Protect the sprint.** The deep-work window is sacred. If a like-to-do item is creeping into it, flag it.
4. **Celebrate wins.** When a must-do ships, acknowledge it. Momentum matters.

## Adapting the Cadence

This rhythm is a starting point. After 2–3 weeks, review what's working:

- Are the must-do lists the right size?
- Is the deep-work / lighter-window split realistic?
- Are the daily checks useful or just noise?
- Does the risk review actually happen, or should it move?

Update this document when the cadence evolves.
