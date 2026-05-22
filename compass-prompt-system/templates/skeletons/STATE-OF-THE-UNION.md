<!-- Seeded skeleton. The compass bootstrap generates the filled version; /compass-update maintains it thereafter. -->

# State of the Union

Point-in-time snapshot of where {PROJECT_NAME} stands. Updated at key inflection points.

**Snapshot date:** <date>
{{#if PRIMARY_MILESTONE}}**Target milestone:** {PRIMARY_MILESTONE} — <milestone name>, <target date>
**Weeks remaining:** <N>
{{/if}}**Doctrine:** <The current operating doctrine in one line — the rule that governs how decisions get made this phase.>

---

## Overall Assessment

<Two or three paragraphs. The honest picture: what's built, what's missing, and the single biggest thing standing between here and the next milestone.>

**What's built:** <The capabilities that are real and working today.>

**What's missing:** <The gaps that remain, and roughly when each is scheduled to close.>

---

## Per-App Status

{{#each APPS}}
### {app.name}

| Aspect | Status | Notes |
|--------|--------|-------|
| <aspect> | <Built / Verified ✓ / Partial / Not started> | <one-line detail> |
| <aspect> | <status> | <detail> |
{{/each}}

---

## Open Questions / Decisions Pending

- <Decision that must be made soon, and what it gates>
- <Open question>
