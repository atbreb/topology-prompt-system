# compass-install

Install and **mold** the Compass strategic layer into *this* project — north-star, milestones,
priority-map, risk-register, weekly cadence, and the team playbook. Use this when you want Compass
**without** (or before) the full Topology execution system, or to add Compass to a Topology install
that was done with `--no-compass`.

You read any existing profile (or do a light scan + minimal interview for the shared basics),
interview the operator about the strategic tokens a scan can't infer, write/extend the `compass:`
section of the profile, and **compile** every Compass command template into a concrete,
project-native command — so every `/compass-*` command speaks this project's real apps, paths, team
model, and cadence instead of generic placeholders.

This runs once to set up; re-running it recompiles (equivalent to `/compass-install --recompile`).

> Read `{SYSTEM_DIR}/ABSTRACTION-SPEC.md` before compiling — it is the canonical contract for the
> template syntax (§2), the §4.5 Compass token registry, and the compile algorithm (§8). Where this
> command and the spec disagree, the spec wins.

## Usage

```
/compass-install
/compass-install --recompile        # skip the interview, recompile from the existing profile
/compass-install --yes              # accept all detected defaults; minimal interview
```

### Where things live

`install.sh` has already vendored the system into this project. Throughout this command,
`{SYSTEM_DIR}` = `.topology/system`:

```
.topology/
├── system/
│   └── compass/
│       ├── templates/
│       │   ├── commands/    # compass command templates (compass-onboard/check/update/...)
│       │   └── skeletons/   # the compass doc skeletons (NORTH-STAR, MILESTONES, ...)
│       └── updates/         # one-time semantic updates (applied by /topology-update or /compass-install --recompile)
└── profile.yml              # THIS project's molding (this command writes the compass: section)
```

Compiled commands are written to the project's command directory (default `.claude/commands/`),
captured in the profile as `paths.commands_dir`.

---

## Instructions

### Step 0: Announce

Open with this (adapt tone, keep the substance):

> I'm going to set up Compass — the strategic layer that gives this project a north-star,
> milestones, a priority-map, a risk-register, and a weekly cadence. I'll ask you a handful of
> things about how your team works and what you're steering toward, then tailor every `/compass-*`
> command to speak *your* project's language. This only has to happen once.

If a `.topology/profile.yml` already exists, say so. If it already has a `compass:` section, offer:
recompile from it (`--recompile`), or re-run the interview to change answers. Do not silently
overwrite a profile.

### Step 1: Establish shared basics (read profile, else light scan)

Compass needs only a little shared identity; most of what it needs is interview, not scan.

- **If a profile exists** (from `topology-install`): read `{PROJECT_NAME}`, `{APPS}`, `{DOCS_ROOT}`,
  `{COMMANDS_DIR}`, and the tier/path tokens straight from it. Do not re-ask any of this.
- **If no profile exists**: do a *light* scan for the shared basics only:
  - **Project name** — repo/dir name, `package.json` `name`, or `go.mod` module → `{PROJECT_NAME}`.
  - **Apps roster** — code root (`apps/`, `packages/`, `src/`) and a one-line role per
    app/module from its README/package name → `{APPS}`.
  - **Doc root** — an existing docs home (`docs/`, `.docs/`, `.docs/v2`) → `{DOCS_ROOT}`; else
    default `docs`. Confirm the one-question default in Round 1.
  Hold these as a detected draft (note confidence per field); don't write anything yet.

### Step 2: Interview (the Compass tokens — §4.5)

Ask in short rounds (2–3 questions at a time). Lead with anything detected so the user confirms.
For `--yes`, accept the spec §4.5 defaults and ask only what has no safe default.

`{COMPASS_ENABLED}` is implied **true** here — you are installing Compass.

**Round 1 — Foundations (only if no profile supplied them).**
- Doc root: "I'll put strategy docs under `{detected}/compass`. Good, or elsewhere?"
- Apps roster: present `{APPS}`; let them prune/rename/add roles.

**Round 2 — Team & roles.**
- Team model: solo / small-team / distributed → `{TEAM_MODEL}` (sets the playbook tone).
- Onboarding roles → `{ROLES}` (e.g. frontend / backend / infra / security; default `[general]`).

**Round 3 — Milestones.**
- "Steer toward dated milestones, or none?" → `{MILESTONE_MODEL}` (`dated` / `none`).
- If dated: the current primary one → `{PRIMARY_MILESTONE}` (e.g. "M1"). Gates milestone math in
  the compass prompts; leave empty for `none`.

**Round 4 — Cadence (confirm or adjust the weekly rhythm).**
- `{CADENCE_BRIEF_DAY}` (default Monday), `{CADENCE_CHECK_DAYS}` (Tue/Wed),
  `{CADENCE_UPDATE_DAY}` (Friday), `{CADENCE_RISK_DAY}` (Sunday).
- Window labels: `{CADENCE_SPRINT_WINDOW}` (Mon–Wed deep-work) and `{CADENCE_LIGHTER_WINDOW}`
  (Thu–Sun catch-up).

### Step 3: Resolve the registry and write the profile

Merge detected + answered values. Fill defaults for anything still unset (per `ABSTRACTION-SPEC`
§4.5). Compute derived tokens (`{COMPASS_DIR}` from `{DOCS_ROOT}`; `{CADENCE_DESCRIPTION}` from the
cadence tokens).

Write the `compass:` section to `.topology/profile.yml` following `{SYSTEM_DIR}/profile.schema.md`.
If the file already exists, merge — add/replace the `compass:` block and any shared identity/path
keys you had to establish; **preserve `applied_updates` and every other section untouched**. If it's
a fresh file, set `system_version` from `{SYSTEM_DIR}/VERSION`, `compiled_at` to now, and
`applied_updates: []`.

Show the resolved compass profile and get a final confirm before compiling (skip on `--yes`).

### Step 4: Compile (templates → concrete commands)

Run the compile algorithm from `ABSTRACTION-SPEC` §8 for every file in
`{SYSTEM_DIR}/compass/templates/commands/`:

1. Read template. Strip `{{! comments }}`.
2. Expand `{{#each LIST as x sep=…}}` blocks (innermost first), then evaluate
   `{{#if KEY}}`/`{{#unless KEY}}` (innermost first; drop a false block whole + one trailing blank
   line so no holes remain).
3. Substitute every `{TOKEN}` whose name is in the registry — **closed vocabulary**: leave all
   other braces (TS types, JSON, `<...>` placeholders) untouched.
4. Honor `{{raw}}…{{/raw}}` passthrough.
5. Write to `{commands_dir}/<basename>`.

This covers `compass-onboard`, `compass-check`, `compass-update`, `compass-weekly-brief`, and
`compass-risk`. Normalize any residual `.claude/commands/`-style references to the resolved
`{commands_dir}`.

**Validate before declaring success:** no `{{#…}}` control markers remain in any output; no leftover
`{UPPER_SNAKE}` that maps to a registry token; warn (don't fail) on any leftover tokenish string not
in the registry, and report it.

Emit a compile report: commands written, blocks dropped (e.g. "delegation: removed — solo profile"),
tokens resolved, warnings.

### Step 5: Seed the Compass doc tree (skeletons)

Create `{COMPASS_DIR}/` if absent. Compile the skeletons in `{SYSTEM_DIR}/compass/templates/skeletons/`
through the same §8 algorithm and place them as the user's starting docs:

- `NORTH-STAR.md`
- `MILESTONES.md`
- `PRIORITY-MAP.md`
- `RISK-REGISTER.md`
- `STATE-OF-THE-UNION.md`
- `CADENCE.md`
- `TEAM-PLAYBOOK.md`

These are **skeletons to fill in**, not finished docs. Do **not** fabricate roadmap, milestone,
priority, or risk content — the operator (and later `/compass-*` runs) populate them from real
project material. If a skeleton already exists in `{COMPASS_DIR}/`, leave it; report it as kept.

### Step 6: Report completion

```
## compass-install Complete

Profile:        .topology/profile.yml   (compass: section, system v<version>)
Commands molded: <N> compass → <commands_dir>/
Compiled for:   <PROJECT_NAME> · team=<TEAM_MODEL> · docs at <COMPASS_DIR>
Cadence:        <CADENCE_DESCRIPTION>
Milestones:     <MILESTONE_MODEL><, primary PRIMARY_MILESTONE>

Skeletons seeded: <list, or "kept existing"> in <COMPASS_DIR>/
Dropped:        <e.g. delegation prose (solo profile), or "none">

### Next steps
1. Fill in {COMPASS_DIR}/NORTH-STAR.md — the rest of Compass orients off it.
2. Onboard someone: /compass-onboard <role>
3. Start the weekly rhythm: /compass-weekly-brief
4. To pull future improvements: re-run install.sh from the system repo, then /topology-update (covers Compass) or /compass-install --recompile
```

---

## Important Notes

- **Compiled commands are build artifacts — never hand-edit them.** All molding lives in
  `.topology/profile.yml`. To change how a command reads, edit the `compass:` section and recompile.
  This is what makes `/compass-install --recompile` (and `/topology-update`) safe: there is nothing of
  yours in the compiled output to clobber. (Note: `/compass-update` is the weekly STATE-OF-THE-UNION
  cadence command, not a recompile command — see ABSTRACTION-SPEC §7.)
- **Closed-vocabulary substitution is load-bearing.** Only registry tokens are replaced, so literal
  `{...}` strings in the prompts survive intact.
- **Empty tokens gate prose, they don't leave holes.** Empty `{PRIMARY_MILESTONE}` flips the
  milestone math off and that prose compiles out. Don't invent a fake value to fill a gap.
- **The interview confirms; the scan detects.** Don't ask what a file already answers, and don't
  guess what only the operator knows (team model, milestones, cadence).
- **Never fabricate roadmap or risk content.** The seeded docs are skeletons; the strategic
  substance comes from the operator and the lifecycle `/compass-*` commands, not from this installer.
- **This is additive to a profile.** It only writes the `compass:` section (plus shared basics it
  must establish on a fresh project); a co-resident Topology install is left untouched.

$ARGUMENTS
