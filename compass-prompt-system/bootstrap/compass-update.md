# compass-update

Pull improvements to the Compass strategic layer into *this* project's molded commands —
**without** clobbering your project's tailoring. Two channels, both keyed on stable command
basenames (see `{SYSTEM_DIR}/ABSTRACTION-SPEC.md` §6 and §7):

1. **Template-sync** — compass templates changed (new wording, new steps, new tokens). Recompiling
   against your unchanged profile re-molds every compass command with the improvements.
2. **Semantic updates** — genuinely new paradigms a recompile can't carry, shipped as one-time
   directives in `{SYSTEM_DIR}/compass/updates/`. Each runs **once**, then is recorded in your
   profile so it never re-applies.

Because compiled commands are build artifacts and all your molding lives in `.topology/profile.yml`,
this operation is always safe and idempotent. It touches only the compass commands and the
`compass:` section — a co-resident Topology install is left alone.

> Prerequisite: re-vendor the latest system first. In the system repo: `git pull`, then
> `./install.sh <this-project>`. That refreshes `.topology/system/compass/`. Then run this here.

## Usage

```
/compass-update                 # recompile + apply any unapplied compass semantic updates
/compass-update --recompile     # recompile only; skip the semantic-update queue
/compass-update --dry-run       # report what WOULD change; write nothing
/compass-update --check         # just show version + pending compass updates, then stop
```

`{SYSTEM_DIR}` = `.topology/system`. The profile is `.topology/profile.yml`.

---

## Instructions

### Step 1: Version & drift check

Read `.topology/profile.yml` (`system_version`, `applied_updates`, the `compass:` section) and the
vendored system version (`{SYSTEM_DIR}/VERSION`). Report the move (e.g. `1.0.0 → 1.2.0`) and list
the `{SYSTEM_DIR}/compass/updates/` entries whose `id` is **not** in `applied_updates`. On
`--check`, stop here.

If there is no `compass:` section, Compass was never installed here — tell the user to run
`/compass-install` first, then stop. If the profile's `system_version` is newer than the vendored
system, warn: the system wasn't re-vendored — tell the user to `git pull` + re-run `install.sh`,
then stop.

> `applied_updates` is one shared list. Compass update ids are globally unique and namespaced
> (`0001-compass-…`), so they coexist with topology update ids without collision; only consider the
> compass-namespaced ids here.

### Step 2: New-token mini-interview (compass tokens only)

Diff the tokens used across `{SYSTEM_DIR}/compass/templates/` against the keys present in the
profile's `compass:` section. For every **new** §4.5 token an updated template introduced that the
profile has no value for:

- Auto-resolve from a fresh light scan if the token is `auto`/`derived` (per spec §4).
- Otherwise ask the user — but **only** for the genuinely new keys, one short round. Never re-ask
  anything the profile already answers.

Write the new keys into the `compass:` section. This is the entire cost of a template that adds a
setting: a question or two, not a re-interview.

### Step 3: Recompile (template-sync channel)

Run the compile algorithm (`ABSTRACTION-SPEC` §8) for every template in
`{SYSTEM_DIR}/compass/templates/commands/`, exactly as `compass-install` Step 4 — same
closed-vocabulary substitution, same `{{#if}}`/`{{#each}}` handling. Overwrite the compass commands
in `{commands_dir}/`. (Skeletons already seeded in `{COMPASS_DIR}/` are the operator's docs — do not
overwrite them.)

On `--dry-run`, instead of writing, diff each freshly compiled command against the on-disk one and
report which compass commands would change and roughly how (added step, reworded section, dropped
block). Write nothing.

### Step 4: Apply semantic updates (skip on `--recompile`)

For each `{SYSTEM_DIR}/compass/updates/NNNN-*.md` whose `id` is **not** in `profile.applied_updates`,
in ascending id order:

1. Read its frontmatter (`id`, `title`, `type`, `targets`, `min_system_version`).
2. If `type: template-sync` → it's changelog-only (the recompile in Step 3 already delivered it).
   Record the id as applied and continue.
3. If `type: semantic`:
   - Confirm `min_system_version` is satisfied; if not, skip and report.
   - Read the directive body. For each target command (by **basename**; `"all"` = every compiled
     compass command), apply the change to the **compiled** command in `{commands_dir}/`, molding the
     new content to this project using the profile exactly as install did (real apps, real cadence,
     gated by the same `{{#if}}` logic).
   - On `--dry-run`, describe the intended edit per target instead of writing.
4. After a semantic update is successfully applied to all its targets, append its `id` to
   `profile.applied_updates` and update `compiled_at`.

> **Run-once guarantee.** An update already in `applied_updates` is skipped. A fresh install gets the
> same paradigm because the author also committed it to the template; an existing install gets it
> woven in here. Both paths converge on the same end state. Re-running this command is always
> idempotent.

### Step 5: Bump version & report

Set the profile's `system_version` to the vendored version. Report:

```
## compass-update Complete

System:   <old> → <new>
Recompiled: <N> compass commands
New settings asked: <list, or none>
Semantic updates applied: <ids + titles, or none>
Already-applied (skipped): <count>
Warnings: <leftover-token / target-not-found / version-skips, or none>
```

On `--dry-run`, title it "Dry Run — no files written" and present the would-change list only.

---

## Important Notes

- **Your tailoring is never at risk.** It lives in `.topology/profile.yml`; updates touch templates
  and the compiled build artifacts, never the profile's answers (except to *add* new keys you
  confirm) and never the seeded `{COMPASS_DIR}/` docs.
- **Semantic updates target compiled output, not templates.** The template already carries the
  paradigm for fresh installs; the semantic update retro-fits projects that compiled before it
  existed. `applied_updates` makes it run exactly once.
- **Naming stability is the contract.** Updates address compass commands by frozen basename. A
  rename ships as an explicit migration with a major version bump (spec §7) — handle those first.
- **Shared update queue, namespaced ids.** Topology and compass updates record into the same
  `applied_updates` list; compass ids are `NNNN-compass-…` so the queues never collide. This command
  only applies the compass-namespaced ones.
- **`--dry-run` before a big jump.** When crossing several versions, dry-run first to see the surface
  of change before writing.
- **If a semantic update can't find a target** (command renamed/removed locally), report it and skip
  — do not guess a substitute.

$ARGUMENTS
