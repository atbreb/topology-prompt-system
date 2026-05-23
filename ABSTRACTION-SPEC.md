# Abstraction Spec — the contract every template compiles against

> This is the single source of truth for **how** the Topology and Compass prompts are made
> project-agnostic and **how** they are molded back into concrete, project-specific prompts.
> Template authors abstract prompts against this doc. The `topology-install` /
> `topology-update` engines compile against this doc. If a change to a template would
> break a rule here, the change is wrong — fix the template, or amend this spec first.

---

## 1. The two-state model

Every prompt in this system exists in exactly two states:

| State | Lives in | Contains | Read by |
|-------|----------|----------|---------|
| **Template (abstract)** | this repo, `templates/` | placeholders + control blocks | the compiler |
| **Compiled (concrete)** | the user's project, `{COMMANDS_DIR}/` | resolved, zero placeholders | Claude Code at runtime |

The compiled state is a **build artifact**. It is produced from `template + profile`, and it is
always regenerable. Users never hand-edit compiled output; all customization lives in the
**profile** (§5). This is what makes updates safe: an update changes templates and/or the
profile, never the user's irreplaceable edits — because there are none.

```
templates/commands/topology-implement.md   (abstract)
        +  .topology/profile.yml            (this project's answers)
        =  {COMMANDS_DIR}/topology-implement.md   (concrete, native-feeling)
```

---

## 2. Template syntax

The template language is intentionally tiny and reads cleanly even before compilation.

### 2.1 Scalar substitution — `{TOKEN}`

`{TOKEN}` where `TOKEN` is an UPPER_SNAKE name **in the registry** (§4) is replaced by its
resolved value.

> **Closed-vocabulary rule (load-bearing).** The compiler replaces a `{...}` sequence **only
> if its exact name is a registered token.** Every other brace sequence is left untouched.
> This is non-negotiable: the prompts are full of literal braces — TypeScript types
> (`Message { message_id }`), JSON schemas, and the foundation-doc templates
> (`<TypeName> { field1, field2 }`). Registry-driven matching means those literals survive
> compilation unharmed. If you want a brace string to be substituted, it must be a registered
> token; if you want it left literal, simply don't name it like a registered token.

Unknown-but-tokenish strings (e.g. `{SOMETHING_NOT_REGISTERED}`) are a **compile warning**, not
a substitution — they pass through literally and are reported so the author can fix a typo or
register the token.

### 2.2 Conditional blocks — `{{#if KEY}}` / `{{#unless KEY}}`

```
{{#if MULTI_AGENT}}
## Delegate Pair Mode (optional)
If `{DELEGATE_FLAG}` appears in $ARGUMENTS, enter pair mode with {DELEGATE_AGENT_NAME}...
{{/if}}
```

- `KEY` resolves against a **boolean** profile value.
- A false block is removed **whole**, including one trailing blank line, so the compiled prose
  has no holes or doubled blank lines.
- `{{#unless KEY}}…{{/unless}}` is the negation.
- Conditionals may nest.

### 2.3 List expansion — `{{#each LIST as x}}`

```
{{#each APPS as app}}
- **{app.name}** (`{app.path}`) — {app.role}
{{/each}}
```

- `LIST` resolves to a profile array; the block repeats once per element.
- Inside, `{x.field}` references the element's fields. `{x}` alone references a scalar element.
- An empty list removes the block whole (same blank-line discipline as conditionals).
- Optional join separator: `{{#each LIST as x sep=", "}}…{{/each}}` emits the separator
  *between* elements only (no trailing separator). Use it for inline comma-joined lists
  (e.g. a `--agents a,b,c` usage hint). Without `sep`, elements are emitted back-to-back
  exactly as written in the block.

### 2.4 Author comments — `{{! ... }}`

Stripped at compile. Use for notes to other template authors. Never appears in compiled output.

### 2.5 Raw escape — `{{raw}} ... {{/raw}}`

Anything between `{{raw}}` and `{{/raw}}` is emitted verbatim, including registered-token-looking
strings. Rarely needed (the closed-vocabulary rule already protects literals), but available for
the edge case where you must document a token literally inside a compiled prompt.

---

## 3. Abstraction rules (how to turn a CalibraOS-coupled prompt into a template)

When abstracting a prompt, apply these in order:

1. **Paths → path tokens.** Every hardcoded doc path becomes a path token from §4.1. Never
   leave `.docs/v2/...` literal. Derive sub-paths from their parent token where the registry
   says so (e.g. write `{PROJECTS_ACTIVE_DIR}`, which already includes the root).
2. **Stack nouns → stack tokens.** `Go`, `pnpm test`, `gRPC`, `Neon`, `proto:gen` → the
   matching §4.2 token. If a stack noun is part of an *illustrative example only* and naming a
   generic equivalent reads fine, prefer the token; if the example is load-bearing for meaning,
   keep it inside an example block (rule 6).
3. **Product / app / company names → identity tokens or removal.** `CalibraOS` → `{PROJECT_NAME}`.
   App names (Sync, IQ, Learn…) → `{{#each APPS}}` where a roster is listed, or `{PROJECT_NAME}`
   where it's a generic self-reference. Third-party SaaS names that are pure examples (Shopify,
   NetSuite, Odoo) move into example blocks (rule 6), not tokens — a new user won't have them.
4. **Agent/delegation roster → conditional + tokens.** Every `--glm` / "GLM Pair Mode" /
   "GLM pays off here" passage is wrapped in `{{#if MULTI_AGENT}}…{{/if}}` and its nouns
   tokenized (`{DELEGATE_AGENT_NAME}`, `{DELEGATE_FLAG}`, `{DELEGATE_INVOKE}`). For a solo user
   the entire passage vanishes — no dead flags, no confusing references. The `La Costa Council`
   framing, the council CLI, `/delegate-glm` etc. are **never** required; they only ever appear
   inside `MULTI_AGENT` blocks.
5. **Cadence / roles → Compass tokens + conditionals.** Weekly-rhythm days, milestone dates,
   role lists become §4.5 tokens. Compass-only content in a topology prompt (rare) is wrapped in
   `{{#if COMPASS_ENABLED}}`.
6. **Concrete examples → neutralized or re-anchored examples.** Illustrative content
   (`bifrost-billing`, real DL-IDs, real seams) is replaced with `{EXAMPLE_PROJECT_SLUG}` etc.
   The compiler resolves these to a **real subsystem detected during the scan** when available,
   otherwise to neutral defaults (`payments-rebuild`, `S1`, `DL-001`). Wrap a multi-line worked
   example in `{{! example }}` framing so its illustrative nature is clear in the template.
7. **Preserve discipline verbatim.** The *methodology* — the five failure modes, append-only
   foundation docs, bilateral seams, the implementer pre-flight loadout, closure discipline —
   is the product. Do **not** abstract it away or soften it. Only the *environment bindings*
   (paths, stack, names, roster, cadence) get tokenized. When unsure whether a sentence is
   methodology or binding: if removing it would weaken a failure-mode mitigation, it's
   methodology — keep it exactly.
8. **`$ARGUMENTS` stays.** The trailing `$ARGUMENTS` (Claude Code argument injection) is a
   runtime convention, not a binding. Leave it.

### What NOT to tokenize

- Foundation-doc filenames (`CONTRACT-SHEET.md`, `SYSTEM-TOPOLOGY.md`, `DECISION-LOG.md`,
  `VERIFICATION-TABLE.md`, `TOPOLOGY-CLAUDE.md`) and global-doc filenames
  (`GLOBAL-CONTRACTS.md`, `GLOBAL-TOPOLOGY.md`, `GLOBAL-DECISIONS.md`) are **system constants**.
  They are internal to the methodology and identical across every install. Keeping them constant
  keeps updates simple and keeps cross-references between commands stable.
- `CLAUDE.md` — a Claude Code platform convention. Universal. Never tokenized.
- ID grammars (`DL-`, `GC-`, `GS-`, `GD-`, `C1`, `S1`) — methodology, not binding.

### Agent-integration rule (ask-by-exception)

When the project already defines subagents (`.claude/agents/*.md`), the installer **adopts them
automatically** — sets `USE_SUBAGENTS=true` and `SUBAGENT_TYPES` to the detected roster — and does
**not** ask the operator to confirm the roster. A pre-existing specialist agent is unambiguous intent.
The installer surfaces a question **only** when there is a genuine ambiguity it cannot resolve from the
repo (e.g., zero agents exist but a command's dispatch logic needs one, or two detected agents have
colliding roles). This keeps the interview focused on the few preferences a scan truly can't infer
(autonomy posture, teaching stance, delegation intent) rather than re-confirming what the filesystem
already states.

---

## 4. The placeholder registry

Every token the compiler knows. `auto` = resolvable by the scan; `interview` = asked; `derived`
= computed from another token's value (overridable). Booleans gate `{{#if}}`; lists drive
`{{#each}}`.

### 4.1 Paths

| Token | Resolved by | Default | Notes |
|-------|-------------|---------|-------|
| `{DOCS_ROOT}` | interview (scan suggests) | `docs` | Root for all topology + strategy docs. CalibraOS used `.docs/v2`. |
| `{COMMANDS_DIR}` | auto | `.claude/commands` | Where compiled commands are written. |
| `{CODE_ROOT}` | auto | `.` | Repo root for implementation code. |
| `{APPS_DIR}` | auto | `src` | Where app/module code lives (`apps`, `src`, `packages`). |
| `{PROJECTS_DIR}` | derived | `{DOCS_ROOT}/projects` | |
| `{PROJECTS_ACTIVE_DIR}` | derived | `{PROJECTS_DIR}/active` | |
| `{PROJECTS_E2E_DIR}` | derived | `{PROJECTS_DIR}/e2e` | Verified-but-not-promoted projects. |
| `{PROJECTS_ARCHIVE_DIR}` | derived | `{PROJECTS_DIR}/archive` | |
| `{COMPASS_DIR}` | derived | `{DOCS_ROOT}/compass` | Only meaningful if `COMPASS_ENABLED`. |
| `{SCRATCH_DIR}` | derived | `{DOCS_ROOT}/notes/scratch` | Discovery scratch output. |
| `{AUDITS_DIR}` | derived | `{DOCS_ROOT}/audits` | |
| `{TIER_ENABLED}` | interview | `true` | Whether the project keeps a tiered platform-doc layer. |
| `{TIER_1_DIR}` | derived | `{DOCS_ROOT}/tier-1-platform` | |
| `{TIER_2_DIR}` | derived | `{DOCS_ROOT}/tier-2-workstreams` | |
| `{TIER_3_DIR}` | derived | `{DOCS_ROOT}/tier-3-patterns` | |
| `{TIER_1_LABEL}` | derived | `platform` | Human label for tier 1. |
| `{TIER_2_LABEL}` | derived | `workstreams` | |
| `{TIER_3_LABEL}` | derived | `patterns` | |

### 4.2 Stack & tooling

| Token | Resolved by | Default | Notes |
|-------|-------------|---------|-------|
| `{PRIMARY_LANGUAGE}` | auto | `(detected)` | e.g. Go, TypeScript, Python, Rust. |
| `{LANGUAGES}` | auto (list) | — | All detected languages. |
| `{BACKEND_STACK}` | auto/interview | — | Free-form, e.g. "Go + gRPC". Empty-able. |
| `{FRONTEND_STACK}` | auto/interview | — | e.g. "Next.js + React". Empty-able. |
| `{PACKAGE_MANAGER}` | auto | — | pnpm/npm/yarn/cargo/go/pip/poetry. |
| `{TEST_COMMAND}` | auto/interview | — | The catch-all test command. |
| `{TEST_COMMAND_UNIT}` | auto/interview | `{TEST_COMMAND}` | |
| `{TEST_COMMAND_E2E}` | interview | — | Empty-able (gates e2e prose via `{{#if HAS_E2E}}`). |
| `{LINT_COMMAND}` | auto | — | |
| `{BUILD_COMMAND}` | auto | — | |
| `{TYPECHECK_COMMAND}` | auto | — | Empty-able. |
| `{CODEGEN_COMMAND}` | interview | — | e.g. proto generation. Gates `{{#if HAS_CODEGEN}}`. |
| `{API_STYLE}` | auto/interview | — | gRPC / REST / GraphQL / none. |
| `{DATABASE}` | auto/interview | — | Postgres, Neon, MySQL, SQLite, none. |
| `{DEPLOY_PLATFORM}` | interview | — | Empty-able. |
| `{SECRETS_TOOL}` | interview | — | Doppler/Vault/dotenv. Empty-able. |
| `{COMMIT_CONVENTION}` | auto/interview | `conventional` | conventional / freeform. |
| `{BRANCH_PREFIX}` | interview | `topology/` | Prefix for worktree branches. |
| `{PUSH_POLICY}` | interview | `per-category` | When sprint/autopilot push: `per-category` / `end-of-sprint` / `manual`. |
| `{HAS_E2E}` | derived | — | bool: `{TEST_COMMAND_E2E}` non-empty. |
| `{HAS_CODEGEN}` | derived | — | bool: `{CODEGEN_COMMAND}` non-empty. |

### 4.3 Project identity & examples

| Token | Resolved by | Default | Notes |
|-------|-------------|---------|-------|
| `{PROJECT_NAME}` | auto/interview | `(repo name)` | The product/repo name. |
| `{APPS}` | auto/interview (list) | — | `[{name, path, role}]` — the module/app roster. Empty-able. |
| `{EXAMPLE_PROJECT_SLUG}` | scan/derived | `payments-rebuild` | A real subsystem slug if the scan finds a good one, else neutral. |
| `{EXAMPLE_CATEGORY_SLUG}` | derived | `ingestion` | |
| `{EXAMPLE_SEAM}` | derived | `S1` | The seam *ID* form. |
| `{EXAMPLE_SEAM_SLUG}` | scan/derived | `ingestion-pricing` | The hyphenated producer→consumer *slug* form (for `BG-<slug>-N` ids). |
| `{EXAMPLE_CONTRACT}` | derived | `C1` | |
| `{EXAMPLE_DL_ID}` | derived | `DL-001` | |

### 4.4 Agent roster & delegation

| Token | Resolved by | Default | Notes |
|-------|-------------|---------|-------|
| `{MULTI_AGENT}` | interview | `false` | **Gates every delegation block.** False ⇒ all pair-mode prose vanishes. |
| `{DELEGATE_AGENT_NAME}` | interview | — | e.g. GLM, Codex, Aider. Only if MULTI_AGENT. |
| `{DELEGATE_FLAG}` | interview | `--delegate` | The opt-in flag in $ARGUMENTS. |
| `{DELEGATE_INVOKE}` | interview | — | Shell form, e.g. `glm "<task>"`. |
| `{DELEGATE_PROTOCOL_FILE}` | interview | — | Pair-protocol path. Empty-able. |
| `{USE_SUBAGENTS}` | auto | `true` | Auto-set true when `.claude/agents/*.md` exist. Whether to use Claude Code Task subagents for dispatch. |
| `{SUBAGENT_TYPES}` | auto (list) | `[general-purpose]` | **Auto-detected from `.claude/agents/*.md` and applied with no question** (ask-by-exception only — see §3 agent-integration rule). e.g. backend-coder, frontend-coder. |
| `{AUTONOMY_DEFAULT}` | interview | `strict` | strict / balanced / autopilot — default HITL posture. |
| `{TEACHING_STANCE}` | interview | `curious` | `student` / `curious` / `quiet-pro` — default *teaching* posture (how much the agent explains while it works). Orthogonal to autonomy. Always on; behavior spec in `TEACHING-STANCE-PROTOCOL.md`. |
| `{MEMORY_ENABLED}` | interview | `false` | Whether the agent keeps a persistent long-term memory store to sync at promotion. Gates `topology-promote` Step 6F. |
| `{MEMORY_DIR}` | interview | — | Path to that memory store. Empty-able; only meaningful if `MEMORY_ENABLED`. |

### 4.5 Compass & cadence

| Token | Resolved by | Default | Notes |
|-------|-------------|---------|-------|
| `{COMPASS_ENABLED}` | interview | `true` | Whether the strategic layer is installed at all. |
| `{ROLES}` | interview (list) | `[general]` | Onboarding roles, e.g. frontend/backend/infra/security. |
| `{TEAM_MODEL}` | interview | `solo` | solo / small-team / distributed — sets playbook tone. |
| `{CADENCE_BRIEF_DAY}` | interview | `Monday` | When `/compass-weekly-brief` runs. |
| `{CADENCE_CHECK_DAYS}` | interview | `Tue/Wed` | When `/compass-check` runs. |
| `{CADENCE_UPDATE_DAY}` | interview | `Friday` | When `/compass-update` runs. |
| `{CADENCE_RISK_DAY}` | interview | `Sunday` | When `/compass-risk` runs. |
| `{CADENCE_SPRINT_WINDOW}` | interview | `Mon–Wed` | The focused deep-work window label. |
| `{CADENCE_LIGHTER_WINDOW}` | interview | `Thu–Sun` | The lighter / catch-up window label. |
| `{CADENCE_DESCRIPTION}` | derived | — | Prose summary built from the cadence tokens. |
| `{MILESTONE_MODEL}` | interview | `none` | `dated` (named milestones w/ dates) / `none`. |
| `{PRIMARY_MILESTONE}` | interview | — | e.g. "M1". Empty-able. Gates milestone math in compass prompts. |

> **System version & bookkeeping** (not template tokens — profile metadata): `system_version`,
> `compiled_at`, `applied_updates[]`. See §5.

---

## 5. The profile

One file in the user's project: `.topology/profile.yml`. Produced by `topology-install`,
consumed by every compile. It is the **only** place a project's molding lives. Schema and a
worked example ship in `profile/`.

Shape (abridged — full schema in `profile/profile.schema.md`):

```yaml
system_version: "1.0.0"        # which template version this was compiled against
compiled_at: "<iso8601>"
applied_updates: []            # ids of one-time semantic updates already run (§6)

paths:
  docs_root: docs
  commands_dir: .claude/commands
  apps_dir: apps
  tier_enabled: true
stack:
  primary_language: Go
  package_manager: pnpm
  test_command: "pnpm test"
  # ...
identity:
  project_name: Acme
  apps:
    - { name: api, path: apps/api, role: "backend service" }
agents:
  multi_agent: false
  autonomy_default: strict
  use_subagents: true
  subagent_types: [general-purpose]
compass:
  enabled: true
  team_model: solo
  roles: [general]
  cadence: { brief_day: Monday, check_days: "Tue/Wed", update_day: Friday, risk_day: Sunday }
```

**Editing the profile is a supported workflow.** Change a value, run `topology-update`
(or `topology-install --recompile`), and every command re-molds. Nothing else to touch.

---

## 6. Updates (the hybrid model)

Two update channels, both keyed on **stable command basenames** (§7):

### 6.1 Template-sync updates (the common case)

The author improves a template — fixes wording, adds a step, tightens a rule. To ship it:
edit the template, bump `system_version`. Users run `topology-update`, which re-vendors the
latest templates and **recompiles against their unchanged profile**. New tokens introduced by
the update trigger a *mini-interview* for only the new keys; everything else is automatic.
Because compiled output is a build artifact, there is nothing to clobber.

### 6.2 Semantic updates (the new-paradigm case)

Some changes can't be expressed as a template edit a recompile would carry — e.g. "introduce a
whole new paradigm X and weave it into `topology-implement` and `topology-phase-plan`." These
ship as files in `updates/`:

```
updates/0007-introduce-evidence-ledger.md
```

Each has frontmatter and a directive body:

```markdown
---
id: 0007-introduce-evidence-ledger
title: Introduce the Evidence Ledger paradigm
type: semantic            # semantic | template-sync (template-sync = changelog only)
targets: [topology-implement, topology-verify]   # command basenames, or "all"
min_system_version: "1.0.0"
---

<Natural-language directive describing the change in abstract terms. The update engine reads
this together with the project's profile and applies the change to each target's COMPILED
prompt — molding the new content to the local context exactly as install did. Reference targets
by basename only; never by path.>
```

`topology-update` applies every `updates/NNN` whose `id` is **not** already in
`profile.applied_updates`, in id order, then records each applied id back into the profile.
This guarantees **run-once** semantics: an update that's already been woven in is skipped on the
next run. Re-running the engine is always safe and idempotent.

> **Why semantic updates target compiled output, not templates:** a new user installing fresh
> gets the paradigm because it's already in the template (the author committed it there too).
> An *existing* user who already compiled before the paradigm existed gets it woven into their
> molded prompts by the semantic update. The two paths converge on the same end state.

---

## 7. Naming-stability contract (load-bearing for updates)

- **Command basenames are frozen.** `topology-init.md`, `compass-check.md`, etc. never change
  name. Updates, cross-references, and the compiler all key off them. Renaming a command is a
  breaking change that requires a dedicated migration update and a major `system_version` bump.
- **Profile keys are frozen once shipped.** New keys may be *added* (with defaults +
  mini-interview); existing keys are never renamed in place. Renames ship as a profile-migration
  update.
- **Foundation/global doc filenames are frozen** (they're system constants, §3).
- **Token names are frozen.** Adding tokens is fine; renaming one breaks every template that
  uses it. Rename via a spec amendment + a sweep update.
- **`compass-update` is the weekly STATE-OF-THE-UNION cadence command** (the workflow basename,
  referenced throughout the cadence). It is **not** a system-management command. Recompiling/pulling
  improvements for the compass layer is done by `/topology-update` (which covers Topology *and*
  Compass) or `/compass-install --recompile` — never by a second command also named `compass-update`.
  The bootstrap installer must not vendor a `compass-update` "recompile" command; doing so collides
  with the workflow command and violates this contract. (Resolved 2026-05-23; see `updates/`.)

If all four hold, any future improvement reaches every existing install with no manual surgery.

---

## 8. Compile algorithm (reference)

```
load profile.yml
build registry = resolve all tokens (derived from auto + interview + defaults)
validate: every {{#if KEY}} / {{#each LIST}} references a known boolean/list
for each templates/commands/*.md:
    text = read template
    strip {{! comments }}
    expand {{#each}} blocks      (innermost-first)
    evaluate {{#if}}/{{#unless}} (innermost-first, whole-block + 1 trailing blank line)
    substitute {TOKEN} for every registry token (exact-match, closed vocabulary)
    honor {{raw}}…{{/raw}} passthrough
    warn on any leftover {UNKNOWN_UPPER_SNAKE} not in registry
    write {COMMANDS_DIR}/<basename>
emit compile report: tokens resolved, blocks dropped, warnings, files written
```

The same algorithm runs for `compass-prompt-system/templates/commands/` when
`COMPASS_ENABLED` is true.

---

## 9. Versioning

- **v1.0.0** — Initial spec. Extracted from the CalibraOS topology + compass prompt systems
  (2026-05-21). Establishes the two-state model, closed-vocabulary substitution, the hybrid
  update model, and the naming-stability contract.
- **v1.1.0** — (2026-05-23) Added the **teaching-stance** axis (`{TEACHING_STANCE}`, §4.4;
  `TEACHING-STANCE-PROTOCOL.md`) — orthogonal to autonomy, three modes (`student`/`curious`/
  `quiet-pro`), always on. Made subagent adoption **auto / ask-by-exception** (§3 agent-integration
  rule; `USE_SUBAGENTS`/`SUBAGENT_TYPES` now `auto`). Froze `compass-update` as the weekly workflow
  command in the naming contract (§7), resolving the bootstrap-vs-cadence collision. Ships with
  semantic update `updates/0002-add-teaching-stance`.
