# Profile schema — `.topology/profile.yml`

> The profile is the **only** place a project's molding lives. `topology-install` writes it;
> every compile reads it. Edit a value and recompile (`topology-update`) to re-mold every
> command. See `ABSTRACTION-SPEC.md` §4 for the token registry each field feeds, and
> `profile.example.yml` for a filled-in instance.

Types: `string`, `bool`, `list<...>`, `enum(...)`. `empty-able` means the empty string/`[]` is
valid and (for strings) gates an `{{#if}}` derived boolean. Fields marked **derived** are
computed by the compiler if omitted; set them only to override.

---

## Top-level metadata

| Key | Type | Required | Notes |
|-----|------|----------|-------|
| `system_version` | string | yes | Template version this profile was last compiled against (semver). |
| `compiled_at` | string | auto | ISO-8601 timestamp of last compile. Written by the engine. |
| `applied_updates` | list<string> | auto | IDs of one-time semantic updates already woven in (§6 of spec). |

## `paths:`

| Key | Type | Default | Token |
|-----|------|---------|-------|
| `docs_root` | string | `docs` | `{DOCS_ROOT}` |
| `commands_dir` | string | `.claude/commands` | `{COMMANDS_DIR}` |
| `code_root` | string | `.` | `{CODE_ROOT}` |
| `apps_dir` | string | `src` | `{APPS_DIR}` |
| `tier_enabled` | bool | `true` | `{TIER_ENABLED}` |
| `tier_1_label` | string (derived) | `platform` | `{TIER_1_LABEL}` |
| `tier_2_label` | string (derived) | `workstreams` | `{TIER_2_LABEL}` |
| `tier_3_label` | string (derived) | `patterns` | `{TIER_3_LABEL}` |

> `projects_*`, `compass_dir`, `scratch_dir`, `audits_dir`, `tier_N_dir` are all **derived**
> from `docs_root` per the spec defaults. Override only if your layout differs.

## `stack:`

| Key | Type | empty-able | Token |
|-----|------|------------|-------|
| `primary_language` | string | no | `{PRIMARY_LANGUAGE}` |
| `languages` | list<string> | no | `{LANGUAGES}` |
| `backend_stack` | string | yes | `{BACKEND_STACK}` |
| `frontend_stack` | string | yes | `{FRONTEND_STACK}` |
| `package_manager` | string | yes | `{PACKAGE_MANAGER}` |
| `test_command` | string | no | `{TEST_COMMAND}` |
| `test_command_unit` | string (derived → test_command) | no | `{TEST_COMMAND_UNIT}` |
| `test_command_e2e` | string | yes → `{HAS_E2E}` | `{TEST_COMMAND_E2E}` |
| `lint_command` | string | yes | `{LINT_COMMAND}` |
| `build_command` | string | yes | `{BUILD_COMMAND}` |
| `typecheck_command` | string | yes | `{TYPECHECK_COMMAND}` |
| `codegen_command` | string | yes → `{HAS_CODEGEN}` | `{CODEGEN_COMMAND}` |
| `api_style` | enum(grpc,rest,graphql,none) | — | `{API_STYLE}` |
| `database` | string | yes | `{DATABASE}` |
| `deploy_platform` | string | yes | `{DEPLOY_PLATFORM}` |
| `secrets_tool` | string | yes | `{SECRETS_TOOL}` |
| `commit_convention` | enum(conventional,freeform) | — | `{COMMIT_CONVENTION}` |
| `branch_prefix` | string | — | `{BRANCH_PREFIX}` |
| `push_policy` | enum(per-category,end-of-sprint,manual) | — | `{PUSH_POLICY}` |

## `identity:`

| Key | Type | Notes | Token |
|-----|------|-------|-------|
| `project_name` | string | repo/product name | `{PROJECT_NAME}` |
| `apps` | list<{name,path,role}> | module/app roster; empty-able | `{APPS}` |
| `example_project_slug` | string (derived from scan) | illustrative example anchor | `{EXAMPLE_PROJECT_SLUG}` |

## `agents:`

| Key | Type | Default | Token |
|-----|------|---------|-------|
| `multi_agent` | bool | `false` | `{MULTI_AGENT}` |
| `delegate_agent_name` | string | — | `{DELEGATE_AGENT_NAME}` |
| `delegate_flag` | string | `--delegate` | `{DELEGATE_FLAG}` |
| `delegate_invoke` | string | — | `{DELEGATE_INVOKE}` |
| `delegate_protocol_file` | string (empty-able) | — | `{DELEGATE_PROTOCOL_FILE}` |
| `use_subagents` | bool (auto) | `true` | `{USE_SUBAGENTS}` — auto-true when `.claude/agents/*.md` exist |
| `subagent_types` | list<string> (auto) | `[general-purpose]` | `{SUBAGENT_TYPES}` — **auto-detected from `.claude/agents/*.md`, applied without asking** (ask-by-exception; spec §3) |
| `autonomy_default` | enum(strict,balanced,autopilot) | `strict` | `{AUTONOMY_DEFAULT}` |
| `teaching_stance` | enum(student,curious,quiet-pro) | `curious` | `{TEACHING_STANCE}` — how much the agent explains while it works (orthogonal to autonomy; always on; `TEACHING-STANCE-PROTOCOL.md`) |
| `memory_enabled` | bool | `false` | `{MEMORY_ENABLED}` |
| `memory_dir` | string (empty-able) | — | `{MEMORY_DIR}` |

## `compass:`

| Key | Type | Default | Token |
|-----|------|---------|-------|
| `enabled` | bool | `true` | `{COMPASS_ENABLED}` |
| `team_model` | enum(solo,small-team,distributed) | `solo` | `{TEAM_MODEL}` |
| `roles` | list<string> | `[general]` | `{ROLES}` |
| `milestone_model` | enum(dated,none) | `none` | `{MILESTONE_MODEL}` |
| `primary_milestone` | string (empty-able) | — | `{PRIMARY_MILESTONE}` |
| `cadence.brief_day` | string | `Monday` | `{CADENCE_BRIEF_DAY}` |
| `cadence.check_days` | string | `Tue/Wed` | `{CADENCE_CHECK_DAYS}` |
| `cadence.update_day` | string | `Friday` | `{CADENCE_UPDATE_DAY}` |
| `cadence.risk_day` | string | `Sunday` | `{CADENCE_RISK_DAY}` |
| `cadence.sprint_window` | string | `Mon–Wed` | `{CADENCE_SPRINT_WINDOW}` |
| `cadence.lighter_window` | string | `Thu–Sun` | `{CADENCE_LIGHTER_WINDOW}` |

---

## Validation rules

- Every `{{#if KEY}}` / `{{#each LIST}}` in any template must map to a boolean / list resolvable
  from this profile (compiler checks before writing anything).
- `system_version` must be present; a missing/older version triggers `topology-update`'s
  new-token mini-interview path.
- Unknown top-level keys are a warning (forward-compat: an older engine reading a newer profile).
