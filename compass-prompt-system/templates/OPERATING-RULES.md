# Compass — operating rules

The compass directory (`{COMPASS_DIR}`) holds the strategic-layer SSOT for what we're committed to deliver: `PRIORITY-MAP.md`, `MILESTONES.md`, `STATE-OF-THE-UNION.md`, `RISK-REGISTER.md`, and dated audit/brief docs. These files are read by every operator-facing slash command (`/compass-check`, `/compass-update`, `/compass-weekly-brief`, `/compass-risk`) and by humans when they want to know "what's on the plan." When the docs lie about reality the entire planning loop lies — so the load-bearing discipline is keeping them current.

## Closure discipline (load-bearing)

**When a topology project ships, its Compass row must close in the same operator pass.** The shipping side (Verified ✓ in `{PROJECTS_E2E_DIR}/`, archived after `/topology-promote --execute`) and the planning side (open row in `PRIORITY-MAP.md`) are two doors on the same artifact. The closure side is easy to skip — the classic failure is a stale-PRIORITY-MAP incident where a project has been Verified ✓ in `e2e/` for a day while its sprint row (e.g. a `Sprint N P0` line) still reads as open work, so every status report that quotes the doc is confidently wrong for that window.

The `/topology-promote` slash command (Step 6E "Close the Compass Row") owns this. If you run topology-promote with `--execute` and it skips the Compass closure, that's a bug in the command — fix the command. Don't paper over it by closing the row manually each time without updating the command.

**Closure shape** — any time a row in PRIORITY-MAP transitions to done, write all four pieces or the next reader will miss something:

1. Prefix the priority cell with `— ✓ CLOSED <date>` (or `— ✓ SHIPPED <date>` if the work hasn't yet promoted but is in production behind a flag)
2. Wrap the title in `~~strikethrough~~`
3. Append a closure block to the description cell citing the load-bearing identifiers — PR numbers, commit SHAs, migration numbers + the tenant DB they ran against + verification timestamp, lockdown-test LOC if any
4. Rotate the `Last updated:` header at the top of PRIORITY-MAP (existing `Last updated:` → `Previous update:` → `Earlier update:` chain)

Items 1+2 are the load-bearing-for-greppability parts. `/compass-check` reconciles by scanning for un-struck rows whose project slug shows up in `e2e/`, and a row that only updated item 3 (description text) still reads as open.

## Source of truth for sprint scope

- **PRIORITY-MAP.md** — current commitment (what we said we'd ship this week). Lossy by design — old details get demoted to "Previous update:" so the top of the file always reads as a tactical brief, not a history book.
- **`{PROJECTS_E2E_DIR}/<slug>/`** — Verified ✓ projects. The presence of a project here outranks any open row in PRIORITY-MAP. When the two disagree, PRIORITY-MAP is wrong.
- **`{PROJECTS_ACTIVE_DIR}/<slug>/`** — in-flight work. Should always have a corresponding open row in PRIORITY-MAP. If a project lives here for more than one sprint without a Compass row, file one with `/compass-update`.
- **`{PROJECTS_ARCHIVE_DIR}/<slug>/`** — post-promotion final state. Once a project lands here, its Compass row must already be CLOSED.

## When you find a stale PRIORITY-MAP row

The right move is *not* to silently fix it in passing — that hides the drift signal. Instead:

1. Flag the drift to the user before doing the work that revealed it
2. Update PRIORITY-MAP with proper closure (the four-part shape above)
3. If the drift was caused by a missing closure step in a slash command, update the slash command in the same commit so the next project doesn't drop the same closure
4. Update any persistent project memory/notes if they claimed the work was still open

## Trigger-doc hygiene

The `Trigger:` lines near the top of PRIORITY-MAP record *why* the current plan exists (audits, incidents, decisions). New triggers should be added when the plan materially shifts — not when a row closes. A closed row is normal completion, not a trigger. Triggers describe re-plans; closures describe progress.

## Don't

- **Don't append closure history under "Last updated:" without rotating** — the chain is `Last updated → Previous update → Earlier update → Earliest tracked update`. Skipping the rotation buries the prior context.
- **Don't strike out a row without also writing the four-part closure shape** — `/compass-check` and humans both rely on the structure being uniform.
- **Don't close a row before the project promotes to `e2e/`** — Compass tracks ratified work, not work-in-flight. If the substantive code is shipped but the project hasn't been through `/topology-promote`, the row is `— ⚠ SHIPPED, awaiting promote` instead of `— ✓ CLOSED`.
- **Don't backfill closures by sweeping the file at end of quarter** — that loses the dates and commit attribution. Closures land at the moment the work ratifies, not weeks later.
