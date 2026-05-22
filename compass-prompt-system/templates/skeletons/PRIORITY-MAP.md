<!-- Seeded skeleton. The compass bootstrap generates the filled version; /compass-update and /compass-weekly-brief maintain it thereafter. -->

# Priority Map

{{#if PRIMARY_MILESTONE}}Sequenced work for **{PRIMARY_MILESTONE} — <milestone name>, <target date>.**{{/if}}{{#unless PRIMARY_MILESTONE}}Sequenced work for the current planning window.{{/unless}}

**Last updated:** <date> (<one line: what this pass changed>)
**Previous update:** <date> (<prior pass summary — rotates down as new updates land>)
**Earlier update:** <date> (<older summary>)

**Trigger (<date>):** <Why the current plan exists — the audit, incident, or decision that drove this shape. Triggers describe re-plans; closures describe progress, and do not get a trigger line.>

---

## Guiding Principles

1. **<Principle that constrains scope>.** <One line.>
2. **<Principle>.** <One line.>
3. **<Principle>.** <One line.>

---

## What's Shipped (Foundation)

<Verified-and-promoted work that the current plan builds on. One subsection per shipped project:>

### `<project-slug>` — <N>/<N> categories Verified ✓ (promoted to {PROJECTS_E2E_DIR}/)

| Category | Headline | Verified |
|---|---|---|
| **<category-slug>** | <one-line outcome> | <date> |

---

## Current Sprint

<The work committed for this window. Use the closure shape when a row lands:
- Prefix the priority cell with `— ✓ CLOSED <date>` (or `— ⚠ SHIPPED <date>` if in production behind a flag, not yet promoted)
- Wrap the title in ~~strikethrough~~
- Append a closure block citing load-bearing IDs (PRs, commit SHAs, migrations + tenant DB + timestamp).>

| Priority | Title | Description | Status |
|----------|-------|-------------|--------|
| P0 | <title> | <what + acceptance> | Not started |
| P1 | <title> | <what + acceptance> | Not started |

---

## Deferred / Out of Scope

<What was explicitly cut from the current window, and to where it slid.>

- <item> → deferred to <later milestone / backlog>, because <reason>
