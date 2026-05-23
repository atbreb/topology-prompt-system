# topology-install

Install and **mold** the Topology (and optionally Compass) prompt system into *this* project.
You scan the codebase, interview the operator about the few things a scan can't infer, write a
`profile`, and **compile** every abstract template into a concrete, project-native command — so
every `/topology-*` and `/compass-*` command speaks this project's real paths, stack, commands,
and conventions instead of generic placeholders.

This is the first thing a user runs. It runs once to set up; re-running it recompiles
(equivalent to `/topology-update --recompile`).

> Read `{SYSTEM_DIR}/ABSTRACTION-SPEC.md` before compiling — it is the canonical contract for
> the template syntax (§2), the token registry (§4), and the compile algorithm (§8). Where this
> command and the spec disagree, the spec wins.

## Usage

```
/topology-install
/topology-install --recompile        # skip the interview, recompile from the existing profile
/topology-install --no-compass       # set up Topology only; leave Compass uninstalled
/topology-install --yes              # accept all scan-detected defaults; minimal interview
```

### Where things live

`install.sh` has already vendored the system into this project:

```
.topology/
├── system/                 # the abstract system (templates, spec, skeletons, updates)
│   ├── templates/          # topology command + protocol templates
│   ├── compass/templates/  # compass command + skeleton templates
│   ├── skeletons/          # global + foundation doc skeletons
│   ├── updates/            # one-time semantic updates (§ topology-update)
│   └── ABSTRACTION-SPEC.md
└── profile.yml             # THIS project's molding (written by this command)
```

Throughout this command, `{SYSTEM_DIR}` = `.topology/system`. Compiled commands are written to
the project's command directory (default `.claude/commands/`), captured in the profile as
`paths.commands_dir`.

---

## Instructions

### Step 0: Announce

Open with this (adapt tone, keep the substance):

> I'm going to scan this project end-to-end — its structure, stack, test/build commands,
> conventions, and existing docs — and then ask you a handful of things a scan can't infer.
> Then I'll tailor the entire Topology prompt system so every command speaks *your* project's
> language: real paths, real commands, real examples — not generic placeholders. This takes a
> few minutes and only has to happen once. After this, updates re-mold automatically.

If a `.topology/profile.yml` already exists, say so and offer: recompile from it
(`--recompile`), or re-run the interview to change answers. Do not silently overwrite a profile.

### Step 1: Scan the project (build the detected draft)

Detect as much of the profile as possible from the codebase. Do **not** ask the user anything a
file can answer. Gather:

**Languages & package manager** — presence of `go.mod` (Go), `package.json` (JS/TS; read it),
`Cargo.toml` (Rust), `pyproject.toml`/`requirements.txt` (Python), `composer.json`, etc.
Lockfiles disambiguate the package manager (`pnpm-lock.yaml`→pnpm, `yarn.lock`→yarn,
`package-lock.json`→npm, `go.sum`→go, `Cargo.lock`→cargo, `poetry.lock`→poetry).

**Commands** — read `package.json` `scripts` (test/lint/build/typecheck/e2e/codegen), `Makefile`
targets, `Taskfile.yml`, or language conventions (`go test ./...`, `cargo test`, `pytest`). Map
to `{TEST_COMMAND}`, `{TEST_COMMAND_E2E}`, `{LINT_COMMAND}`, `{BUILD_COMMAND}`,
`{TYPECHECK_COMMAND}`, `{CODEGEN_COMMAND}`. Leave a token empty if no command exists (the
templates gate the relevant prose on `{{#if HAS_E2E}}` / `{{#if HAS_CODEGEN}}`).

**Layout** — monorepo vs single package. Detect a code root (`apps/`, `packages/`, `src/`,
`services/`, or repo root) → `{APPS_DIR}`. Enumerate apps/modules with their paths and infer a
one-line role from their README/package name → the `{APPS}` roster.

**Doc root** — look for an existing docs home (`docs/`, `.docs/`, `documentation/`, `doc/`,
`.docs/v2`). Propose the best candidate for `{DOCS_ROOT}`; if none, default `docs`.

**API style & data** — `proto/` or `.proto` files (gRPC), `schema.graphql` (GraphQL),
`openapi.*` (REST); DB hints from deps/config → `{API_STYLE}`, `{DATABASE}`,
`{CODEGEN_COMMAND}`.

**Conventions** — `git log --oneline -30`: do messages follow Conventional Commits? →
`{COMMIT_CONVENTION}`. Existing `CLAUDE.md`/`AGENTS.md`/`.cursorrules`: read them — they often
state the stack, test command, and house rules verbatim; treat them as high-confidence sources.

**Agent setup** — existing `.claude/agents/*.md` → `{SUBAGENT_TYPES}`, **auto-adopted with no
interview question** (sets `{USE_SUBAGENTS}=true`; ask-by-exception only — spec §3). Presence of a
delegation CLI/protocol (e.g. a GLM/Codex pair-protocol) is a *separate* axis and IS asked
(`{MULTI_AGENT}` intent can't be inferred — an operator may have the infra but want solo runs).

Produce a **detected draft** of the profile and hold it. Note confidence per field
(detected / inferred / unknown). Do not write anything yet.

### Step 2: Interview (confirm + fill the gaps)

Ask in short rounds (2–4 questions at a time), not one giant wall. Lead with what you detected so
the user mostly confirms. For `--yes`, accept all detected defaults and ask only the unknowns
that have no safe default (multi-agent, compass enable).

**Round 1 — Foundations (confirm the scan).**
- Doc root: "I'll put topology + strategy docs under `{detected}`. Good, or elsewhere?"
- Stack & commands: present the detected language/test/lint/build/codegen and let them correct.
- Apps roster: present `{APPS}`; let them prune/rename/add roles.

**Round 2 — Execution posture.**
- Tier-doc layer: "Keep a tiered platform-doc layer (platform / workstreams / patterns), or skip
  it for a flatter docs tree?" → `{TIER_ENABLED}` (+ labels if they want custom names).
- Autonomy default — how much the agent *does* without you: strict (every decision pauses for you) /
  balanced / autopilot → `{AUTONOMY_DEFAULT}`.
- Teaching stance — how much the agent *explains* while it works (orthogonal axis, always on):
  `student` (lessons by default; dial down on request) / `curious` (flags learnable moments, you pick
  what to go deep on) / `quiet-pro` (silent unless it infers you hit a snag) → `{TEACHING_STANCE}`.
  See `TEACHING-STANCE-PROTOCOL.md`.
- Branch prefix for worktrees → `{BRANCH_PREFIX}` (default `topology/`); push policy
  (`per-category` / `end-of-sprint` / `manual`) → `{PUSH_POLICY}`.

**Round 3 — Delegation & subagents.**
- "Work solo with Claude, or delegate some work to another agent (e.g. a CLI like GLM/Codex)?"
  → `{MULTI_AGENT}`. If yes: agent name → `{DELEGATE_AGENT_NAME}`, opt-in flag →
  `{DELEGATE_FLAG}`, shell invocation → `{DELEGATE_INVOKE}`, optional pair-protocol path →
  `{DELEGATE_PROTOCOL_FILE}`. If no, every delegation block compiles out — confirm that's wanted.
- Subagents — **auto, do not ask (ask-by-exception, spec §3).** If `.claude/agents/*.md` exist, set
  `{USE_SUBAGENTS}=true` and `{SUBAGENT_TYPES}` to the detected roster and integrate them with no
  stoppage — a pre-existing specialist agent is unambiguous intent. Surface a question **only** on a
  genuine ambiguity the scan can't resolve (zero agents but dispatch needs one; two detected agents with
  colliding roles). Otherwise just report what was adopted.
- Persistent agent memory to keep in sync at promotion? → `{MEMORY_ENABLED}` / `{MEMORY_DIR}`
  (default off).

**Round 4 — Compass (skip if `--no-compass`).**
- "Install Compass, the strategic layer (north-star / milestones / priority-map / risk-register /
  weekly cadence)?" → `{COMPASS_ENABLED}`.
- Team model: solo / small-team / distributed → `{TEAM_MODEL}`; onboarding roles → `{ROLES}`.
- Milestones: dated milestones, or none? → `{MILESTONE_MODEL}` / `{PRIMARY_MILESTONE}`.
- Cadence: confirm or adjust the weekly rhythm tokens (`{CADENCE_BRIEF_DAY}`,
  `{CADENCE_CHECK_DAYS}`, `{CADENCE_UPDATE_DAY}`, `{CADENCE_RISK_DAY}`, and the
  sprint/lighter window labels).

**Round 5 — The value-add scan (this is a feature, surface it explicitly).**
Ask:
> While I scan, I can also flag gaps in how this codebase is set up to get the most out of the
> Topology system — e.g. no contracts registry, no tiered platform docs, no e2e-promotion path,
> or examples that could anchor on one of your real subsystems — and **propose** concrete
> additions. I won't write any of them without your say-so. Want that? (report+propose /
> report-only / off)

Record the choice; default **report+propose**.

### Step 3: Resolve the registry and write the profile

Merge detected + answered values. Fill defaults for anything still unset (per `ABSTRACTION-SPEC`
§4). Compute derived tokens (paths from `{DOCS_ROOT}`; `{HAS_E2E}`/`{HAS_CODEGEN}` from their
command tokens; `{CADENCE_DESCRIPTION}` from the cadence tokens; `{EXAMPLE_*}` from a real
subsystem found in the scan, else neutral defaults).

Write `.topology/profile.yml` following `{SYSTEM_DIR}/profile.schema.md`. Set
`system_version` from `{SYSTEM_DIR}/VERSION` (or the spec's current version), `compiled_at` to
now, `applied_updates` to `[]` on first install (preserve it on `--recompile`).

Show the resolved profile and get a final confirm before compiling (skip on `--yes`).

### Step 4: Compile (templates → concrete commands)

Run the compile algorithm from `ABSTRACTION-SPEC` §8 for every file in
`{SYSTEM_DIR}/templates/commands/`:

1. Read template. Strip `{{! comments }}`.
2. Expand `{{#each LIST as x sep=…}}` blocks (innermost first), then evaluate
   `{{#if KEY}}`/`{{#unless KEY}}` (innermost first; drop a false block whole + one trailing
   blank line so no holes remain).
3. Substitute every `{TOKEN}` whose name is in the registry — **closed vocabulary**: leave all
   other braces (TS types, JSON, `<...>` placeholders, the `{ field1, field2 }` doc-template
   literals) untouched.
4. Honor `{{raw}}…{{/raw}}` passthrough.
5. Write to `{commands_dir}/<basename>`.

Also compile the protocols (`{SYSTEM_DIR}/templates/protocols/*`) and the principles doc into
`{commands_dir}/` so cross-references resolve. Normalize any residual `.claude/commands/`-style
references to the resolved `{commands_dir}`.

If `{COMPASS_ENABLED}`, repeat for `{SYSTEM_DIR}/compass/templates/commands/`.

**Validate before declaring success:** no `{{#…}}` control markers remain in any output; no
leftover `{UPPER_SNAKE}` that maps to a registry token; warn (don't fail) on any leftover
tokenish string not in the registry, and report it.

Emit a compile report: commands written, blocks dropped (e.g. "delegation: removed — solo
profile"), tokens resolved, warnings.

### Step 5: Seed the doc tree (light)

Create `{DOCS_ROOT}/` and the projects tree (`projects/active`, `projects/e2e`,
`projects/archive`) if absent. If `{TIER_ENABLED}`, create the tier dirs. If `{COMPASS_ENABLED}`,
create `{COMPASS_DIR}/`. Place the global + foundation doc **skeletons** from
`{SYSTEM_DIR}/skeletons/` into `{DOCS_ROOT}/` as reference (compiled). Do **not** fabricate
global contracts/seams/decisions — those are produced later by `/topology-global-init` and the
per-project `/topology-init`.

### Step 6: Value-add report + propose (per Round 5 choice)

If **off**, skip. If **report-only**, output the observations and stop. If **report+propose**,
output observations AND concrete proposals — then ask the user to approve each before writing.
Look for (non-exhaustive):
- No contracts/seam registry or decision log convention in the existing docs → propose seeding
  the foundation pattern.
- No tiered platform-doc layer though the project clearly has cross-cutting platform concerns.
- No e2e-promotion path (verified work has nowhere to graduate to) → propose the `projects/e2e`
  lifecycle.
- `{EXAMPLE_*}` defaulted to neutral because the scan found no clean subsystem to anchor on →
  propose anchoring examples on a specific real subsystem you did find.
- Conventions in `CLAUDE.md` that contradict detected reality (stale test command, moved paths).

For each approved proposal, make the change (scaffold the dir/skeleton, adjust the profile +
recompile the affected commands, etc.) and note it. Never write an unapproved proposal.

### Step 7: Report completion

```
## topology-install Complete

Profile:        .topology/profile.yml   (system v<version>)
Commands molded: <N> topology<, M compass> → <commands_dir>/
Compiled for:   <PRIMARY_LANGUAGE> · <PACKAGE_MANAGER> · docs at <DOCS_ROOT>
Posture:        autonomy=<…>  teaching=<student/curious/quiet-pro>  multi_agent=<yes/no>  subagents=<…>  compass=<on/off>

Dropped (not applicable to this project):
- <e.g. delegation pair-mode blocks (solo profile)>
- <e.g. tier-doc synthesis (tiers disabled)>

Value-add: <accepted proposals, or "none / declined">

### Next steps
1. Review a molded command, e.g. open <commands_dir>/topology-init.md — it should read as if
   written for this project.
{{#if COMPASS_ENABLED}}2. Set up the strategic layer: /compass-* commands are live; seed
   {COMPASS_DIR}/ docs when ready.{{/if}}
3. Stand up the global layer (optional, recommended): /topology-global-init
4. Start your first rebuild: /topology-discovery <area>  then  /topology-init <project> …
5. To pull future improvements: re-run install.sh from the system repo, then /topology-update
```

---

## Important Notes

- **Compiled commands are build artifacts — never hand-edit them.** All molding lives in
  `.topology/profile.yml`. To change how a command reads, edit the profile and recompile. This is
  what makes `/topology-update` safe: there is nothing of yours in the compiled output to clobber.
- **Closed-vocabulary substitution is load-bearing.** Only registry tokens are replaced. This is
  why the many literal `{...}` strings in the prompts (types, JSON, doc templates) survive intact.
- **Empty tokens gate prose, they don't leave holes.** A blank `{TEST_COMMAND_E2E}` flips
  `{HAS_E2E}` false and the e2e prose compiles out. Don't invent a fake value to fill a gap.
- **The interview confirms; the scan detects.** Don't ask what a file already answers, and don't
  guess what only the operator knows (delegation intent, autonomy posture, teaching stance,
  milestones). Subagents are the opposite — auto-adopt the detected `.claude/agents/` roster without
  asking (ask-by-exception only).
- **Never fabricate global contracts/seams/decisions or compass roadmap content.** Those are
  produced by the lifecycle commands from real project material, not by the installer.
- **Re-running is safe.** `--recompile` rebuilds from the existing profile; a full re-run lets the
  operator change answers. Either way, output is regenerated, not merged.

$ARGUMENTS
