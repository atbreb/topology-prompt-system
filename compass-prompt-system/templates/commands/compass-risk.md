# compass-risk

Review and update the risk register. Run {CADENCE_RISK_DAY} as part of week-close prep. Surfaces new risks, checks mitigation progress, and flags anything that escalated.

## Usage

```
/compass-risk
```

No arguments required.

---

## Instructions

### Step 1: Load Context

Read:
1. `{COMPASS_DIR}/RISK-REGISTER.md`
2. `{COMPASS_DIR}/PRIORITY-MAP.md`
3. `{COMPASS_DIR}/MILESTONES.md`
4. `{COMPASS_DIR}/STATE-OF-THE-UNION.md`

### Step 2: Review Each Active Risk

For each risk with status "Open," assess whether anything changed this week:

1. **Check mitigation progress.** Did any work this week directly address the risk? Check git log and completed tasks.
2. **Check escalation signals.** Did anything happen that makes the risk more likely or more impactful?
3. **Check if resolved.** Is the risk now fully mitigated and can be marked "Mitigated"?

### Step 3: Scan for New Risks

Look for new risks not yet in the register by checking:

1. **Timeline pressure.**{{#if PRIMARY_MILESTONE}} With `<N>` weeks remaining until {PRIMARY_MILESTONE},{{/if}} are any phases looking compressed?
2. **Technical discoveries.** Did any work this week uncover unexpected complexity?
3. **Dependency risks.** Are any external dependencies (APIs, services, third-party docs) showing signs of trouble?
4. **Scope creep.** Has any new work been added that wasn't in the original Priority Map?
5. **Burnout signals.** Is the workload sustainable? Are must-do items consistently slipping?

### Step 4: Update RISK-REGISTER.md

For each risk:
- Update status if changed (Open → Mitigated, or adjust likelihood/impact)
- Add notes on what changed
- Update the risk assessment matrix if positions shifted

For new risks:
- Assign an ID (R<next number>)
- Fill in all fields: likelihood, impact, description, mitigation, status
- Add to the matrix

**Never delete risks.** Mark them as Mitigated or Accepted — they serve as historical record.

### Step 5: Preview Next Week

Based on the current risk landscape, flag any risks that could impact next week's planned work:

- Will any risk block a must-do item?
- Should any mitigation be promoted to a must-do?
- Are we carrying too many High/Critical risks without active mitigation?

### Step 6: Render Risk Report

```
───────────────────────────────────────────────────────────
  COMPASS RISK REVIEW — <Date>
{{#if PRIMARY_MILESTONE}}  <N> weeks to {PRIMARY_MILESTONE}{{/if}}
───────────────────────────────────────────────────────────

RISK CHANGES THIS WEEK

  R<N> — <name>
    <old status/likelihood> → <new status/likelihood>
    Reason: <what changed>

  <or "No changes this week" if stable>

NEW RISKS IDENTIFIED

  R<N> — <name>
    Likelihood: <L>  |  Impact: <I>
    <description>

  <or "None" if no new risks>

ACTIVE RISK SUMMARY
───────────────────────────────────────────────────────────

  Critical/High:  <count>
  Medium:         <count>
  Low/Accepted:   <count>

  Top concern: R<N> — <name>
  <one sentence on why this is the top concern right now>

IMPACT ON NEXT WEEK

  <risks that could affect next week's must-do items>
  <recommended mitigations to prioritize>

───────────────────────────────────────────────────────────
  RISK-REGISTER.md updated.
───────────────────────────────────────────────────────────
```

---

## Important Notes

- **Risks are not failures.** They're anticipated obstacles. Having a long risk register is a sign of awareness, not weakness.
- **Likelihood and impact shift.** A risk that was "Medium likelihood" three weeks ago might be "High" now if no mitigation has been applied and the deadline is closer.
{{#if PRIMARY_MILESTONE}}- **Time is a risk amplifier.** As weeks remaining until {PRIMARY_MILESTONE} decreases, every unmitigated risk becomes more impactful. Factor this into assessments.{{/if}}
- **Connect risks to work.** If a risk has a clear mitigation that maps to a PRIORITY-MAP task, note the connection. This helps when deciding what to prioritize.
