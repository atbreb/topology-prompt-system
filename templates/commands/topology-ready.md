# topology-ready

Centralized prerequisite checker for all topology command actions. Replaces the copy-pasted prerequisite sections across 28 commands. Returns GO/NO-GO with specific remediation for each failed check.

## Usage

```
/topology-ready <project-name> <category-slug> --action <action>
```

### Actions

| --action | Prerequisites checked |
|----------|----------------------|
| `current-state` | Foundation docs exist, category CLAUDE.md exists |
| `gap` | CURRENT-STATE.md exists |
| `phase-plan` | GAP-ANALYSIS.md exists |
| `future-state` | PHASE-PLAN.md exists |
| `implement` | FUTURE-STATE.md exists, scaffolding complete, git clean, no divergence, no conflicting sessions |
| `verify` | All implementation phases complete, VERIFICATION-REPORT.md scaffold exists, reviewer pass done (if required) |
| `dispatch` | Category CLAUDE.md + phase docs exist, git clean |
| `sprint` | Project initialized, categories scoped, sprint plan written |
| `autopilot` | Sprint plan exists, git clean, no divergence |
| `integrate` | All group categories verified, integration checkpoint scaffolded |
| `e2e` | All categories verified, project not already in e2e/ |
| `promote` | All categories verified, integration clean, compass row ready |
| `merge` | Category verified, worktree branch exists, no PR merge conflicts |
| `project-read` | Project exists in active/ or e2e/, TOPOLOGY-CLAUDE.md exists |
| `system-ready` | Topology commands directory exists, environment passes basic sanity (git, gh CLI) |
| `patch` | Trace report exists for the seam, VERIFICATION-REPORT.md exists for producer and consumer categories |
| `global-init` | DOCS_ROOT exists, global docs not already created (refuse overwrite) |

## Instructions

### Step 1: Load project state

Read `TOPOLOGY-CLAUDE.md` → verify project and category exist. Read `CHECKPOINT.md` if it exists.

### Step 2: Run action-specific checks

Execute each check for the specified --action. Every check returns `{name, passed: bool, detail: string, remediation: string}`.

### Step 3: Return GO/NO-GO

```
{
  "action": "implement",
  "project": "<name>",
  "category": "<slug>",
  "status": "GO",
  "checks": [
    {"name": "future-state-exists", "passed": true, "detail": "FUTURE-STATE.md found"},
    {"name": "scaffolding-complete", "passed": true, "detail": "All 4 phases have session prompts and runbooks"},
    {"name": "git-clean", "passed": true, "detail": "Working tree clean"},
    {"name": "no-divergence", "passed": true, "detail": "local main == origin/main"},
    {"name": "no-conflicting-sessions", "passed": true, "detail": "No other active sessions on this category"}
  ]
}
```

If NO-GO: each failed check includes a `remediation` field with the exact command or action needed.

**Exit codes:** 0 = GO, 1 = NO-GO.

> **Result footer:** See `.claude/commands/topology-PRINCIPLES.md` § Result footer. Stop condition: NO-GO → resolve each unmet check per remediation, then re-run.
