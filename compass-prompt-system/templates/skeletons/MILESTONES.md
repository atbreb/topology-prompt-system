<!-- Seeded skeleton. The compass bootstrap generates the filled version from your onboarding interview. -->

# Milestones

**Last updated:** <date>

{{#if PRIMARY_MILESTONE}}
## {PRIMARY_MILESTONE}: <Milestone Name> — <target date>

**Definition:** <One paragraph stating exactly what "done" means for {PRIMARY_MILESTONE}. Concrete and binary — a reader should be able to tell whether it's met.>

### Cross-cutting Success Criteria

- [ ] <Criterion that spans multiple apps/modules — stated as a checkable outcome>
- [ ] <Criterion>
- [ ] <Criterion>

### Per-App "Done" Definitions

{{#each APPS}}
#### {app.name}

- [ ] <What this app must do to be milestone-complete>
- [ ] <Criterion>
{{/each}}

### Infrastructure

- [ ] <Deployment / hosting / database / secrets criterion>
- [ ] <Monitoring + alerting criterion>

### Foundation Already Shipped

<Work closed before the {PRIMARY_MILESTONE} window opened. Listed for context, not active work.>

| Area | Outcome | Verified |
|---|---|---|
| <area> | <what shipped> | <date> |
{{/if}}
{{#unless PRIMARY_MILESTONE}}
## Roadmap

<No dated primary milestone is set. Track outcomes as themed waves rather than dated gates.>

### <Wave / Theme Name>

**Definition:** <What "done" means for this wave.>

- [ ] <Outcome>
- [ ] <Outcome>

### Foundation Already Shipped

| Area | Outcome | Verified |
|---|---|---|
| <area> | <what shipped> | <date> |
{{/unless}}
