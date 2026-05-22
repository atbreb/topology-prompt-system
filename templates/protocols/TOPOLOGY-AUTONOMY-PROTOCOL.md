# topology Autonomy Protocol

**Status:** Spec for existing `topology-*` commands to adopt
**Purpose:** Small, backward-compatible enhancements to existing commands that enable autonomous orchestration (by `topology-sprint` and `topology-autopilot`).

## What this protocol adds

Three backward-compatible enhancements to **existing** topology commands (`topology-current-state`, `topology-gap`, `topology-phase-plan`, `topology-future-state`, `topology-implement`, `topology-verify`, `topology-integrate`):

1. **Machine-readable result footer** — every command emits a structured block that orchestrators parse
2. **Drift detection hook** — automatic re-analysis on detected drift
3. **Retry budget on implement** — 2 attempts before HITL

None of these change the command's human-facing prose output. They only add a structured footer and specific runtime behaviors.

---

## 1. Machine-Readable Result Footer

### Specification

Every `topology-*` command, at the very end of its output, emits this block:

```
<topology-result>
command: topology-<name>
project: <project-name>
category: <slug-or-null>
outcome: <enum>
next_suggested_command: <command-line or null>
proposed_decisions: []
hitl_trigger: <enum or null>
hitl_details: {}
files_written: []
files_committed: []
commits: []
timing_seconds: <N>
</topology-result>
```

### Field definitions

| Field | Type | Description |
|---|---|---|
| `command` | string | The command that emitted this block, e.g., `topology-current-state` |
| `project` | string | Project slug |
| `category` | string\|null | Category slug for per-category commands; null for project-level (e.g., `topology-integrate`) |
| `outcome` | enum | `success` \| `blocked-hitl` \| `blocked-preflight` \| `drift-detected-reanalysis-triggered` \| `failed` |
| `next_suggested_command` | string\|null | The next command the orchestrator should invoke, e.g., `/topology-gap {EXAMPLE_PROJECT_SLUG} {EXAMPLE_CATEGORY_SLUG}`. Null if no natural next step (e.g., post-verify of a sprint's final category). |
| `proposed_decisions` | array | List of DL proposals raised during this run. Each has `{id, title, rationale, affects, proposed_body}`. Empty if none. |
| `hitl_trigger` | enum\|null | One of: `contract-amendment-proposed`, `seam-amendment-proposed`, `dl-entry-proposed-strict-mode`, `implementation-retry-exhausted`, `external-dep-unreachable`, `precommit-hook-unknown-failure`, `security-sensitive-change`, `verification-architectural-failure`, `cross-project-scope-violation`. Null if outcome is `success`. |
| `hitl_details` | object | Context for the HITL trigger: `{description, blocking_dependencies, remediation_options}`. Empty object if no HITL. |
| `files_written` | array | Paths to files written during this run (e.g., `categories/{EXAMPLE_CATEGORY_SLUG}/CURRENT-STATE.md`) |
| `files_committed` | array | Paths included in any auto-commits |
| `commits` | array | SHAs created during this run, in order |
| `timing_seconds` | number | Duration of the command |

### Why this matters

- `topology-sprint` parses the footer to decide next action (proceed? escalate? pivot?)
- `topology-autopilot` parses to know when a group is done
- `topology-resume` parses the most recent footer of a paused run to know exactly where to resume
- Humans can still read the prose above the footer for narrative context

### Implementation note

Existing commands should emit this block whether or not they were called from an orchestrator. The cost is trivial (a few hundred bytes of structured text) and the block is visually separable from the prose.

---

## 2. Drift Detection Hook

### Specification

At the start of `topology-current-state`, the command performs a drift check:

1. Check if `CURRENT-STATE.md` already exists for this category
2. If yes: parse its `last_analyzed_commit_sha` and `last_analyzed_at` metadata from frontmatter
3. Compare against current `git log --oneline <last_sha>..HEAD -- <category-scope>`
4. If commits since last analysis touch files scoped to this category (per phase plan's file list): **drift detected**

### Drift response

If drift detected:

1. Emit an info message: "Drift detected since last CURRENT-STATE analysis (N commits, M files changed). Auto-refreshing."
2. Re-run full analysis (don't use cached doc)
3. After writing the new CURRENT-STATE, automatically trigger `topology-gap`, `topology-phase-plan`, `topology-future-state` in sequence
4. Report all four docs as refreshed in the result footer
5. Outcome: `drift-detected-reanalysis-triggered`

### Why automatic

Per user guidance: drift recovery should not require HITL. The auto-refresh preserves the analysis chain's coherence without interrupting the sprint. The orchestrator sees `drift-detected-reanalysis-triggered` in the footer and knows to expect a full re-analysis in a single command run.

### Frontmatter format

`CURRENT-STATE.md` gains this frontmatter:

```yaml
---
category: <slug>
project: <project-name>
last_analyzed_commit_sha: <SHA at time of analysis>
last_analyzed_at: <ISO datetime>
scope_files:
  - <path-pattern-1>
  - <path-pattern-2>
---
```

`scope_files` comes from the phase plan's "Files Touched" section and defines what constitutes drift-relevant changes.

---

## 3. Retry Budget on `topology-implement`

### Specification

`topology-implement` gains a retry budget for implementation failures with clear root causes:

- **Attempt 1:** narrow fix based on the specific failure (e.g., a failing test has an obvious assertion mismatch; fix and re-run)
- **Attempt 2:** broader investigation (read related code, check recent commits, look for drift in adjacent categories) and fix
- **After 2 failed attempts:** HITL with `hitl_trigger: implementation-retry-exhausted`

### What counts as "clear root cause"

Attempts 1 and 2 are used when:

- Test failure with specific assertion error and clear expected-vs-actual delta
- Lint/type error with a specific file:line and error message
- Import/missing-reference error that can be resolved by adding a missing import or fixing a typo
- Migration conflict that can be resolved by renaming the migration number

### What does NOT qualify (always HITL on first failure)

- Architectural mismatch between future-state doc and reality
- External dep failure (e.g., an upstream service down, a third-party auth error)
- Pre-commit hook failure with unexplained cause
- Contract/seam violation detected during test
- Security-sensitive file touched (auth, secrets, billing)

These should emit HITL on attempt 1, not burn retry budget.

### Implementation note

The retry counter resets per category (not per phase, not per sprint). Each category gets its own 2-attempt budget.

---

## Integration with orchestrators

### How `topology-sprint` uses this

```
for each phase in [current-state, gap, phase-plan, future-state, implement, verify]:
  result = invoke /topology-<phase> <project> <category>
  footer = parse_result_footer(result)

  if footer.outcome == drift-detected-reanalysis-triggered:
    # footer.files_written will list all re-analyzed docs; skip to implement
    continue to implement

  if footer.outcome == blocked-hitl:
    write_checkpoint(footer)
    exit with paused-hitl

  if footer.outcome == success:
    if footer.next_suggested_command:
      continue to next phase
    else:
      break  # category complete

  if footer.outcome == failed:
    abort sprint
```

### How `topology-resume` uses this

```
checkpoint = read_checkpoint(project)
last_footer = checkpoint.last_result_footer
resume_command = last_footer.next_suggested_command

if checkpoint.hitl_trigger == dl-entry-proposed-strict-mode:
  verify proposed_decisions are all now in DECISION-LOG (via topology-decide)

if checkpoint.hitl_trigger == external-dep-unreachable:
  probe the external dep; if still down, exit

invoke resume_command
```

---

## Migration path for existing commands

Existing commands adopt this protocol incrementally:

**Phase 1:** Add the result footer (low risk, no behavior change)
**Phase 2:** Add drift detection to `topology-current-state`
**Phase 3:** Add retry budget to `topology-implement`

Each phase is independently shippable. Orchestrators (`topology-sprint`, `topology-autopilot`) should gracefully handle commands that haven't adopted the protocol yet:

- If a command's output has no result footer: treat as outcome `success` if exit code 0, else `failed`
- If no drift detection: treat first-run CURRENT-STATE as fresh (standard behavior)
- If no retry budget: orchestrator's escalation on first failure is equivalent

---

## Placeholders in This File

| Placeholder | Replace With |
|-------------|-------------|
| `<topology-result>...</topology-result>` | Actual footer block emitted by every topology command |
| `<SHA>` | Git commit SHA |
| `<ISO datetime>` | ISO 8601 timestamp |
