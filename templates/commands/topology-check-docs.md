# topology-check-docs

Verify that every category in a topology project has the expected documentation artifacts on disk for its declared lifecycle stage. Read-only. CI-safe.

## Usage

```
/topology-check-docs <project-name> [--category <slug>]
```

## Prerequisites

Run: `/topology-ready --action system-ready`.
If NO-GO: resolve each unmet check per the remediation, then re-run.

## Instructions

### Step 1: Load project structure

Read `TOPOLOGY-CLAUDE.md` → extract category list and each category's declared status (from the categories table or CHECKPOINT.md). For each category, determine the expected artifact set based on its status:

| Status | Expected artifacts |
|--------|-------------------|
| Not Started | `CLAUDE.md` |
| In Progress | `CLAUDE.md`, `CURRENT-STATE.md` |
| Gap Analyzed | + `GAP-ANALYSIS.md` |
| Phase Planned | + `PHASE-PLAN.md` |
| Future Stated | + `FUTURE-STATE.md` |
| Implemented | + `implementation/phase-*/` directory |
| Verified | + `VERIFICATION-REPORT.md` |

### Step 2: Check each category

For each category directory under `categories/<slug>/`:
- List files on disk
- Compare against the expected artifact set for its declared status
- Flag: missing expected files, unexpected files, wrong-phase files

### Step 3: Return results

```
{
  "project": "<name>",
  "categories": [
    {
      "category": "<slug>",
      "status": "Not Started",
      "expected": ["CLAUDE.md"],
      "present": ["CLAUDE.md"],
      "missing": [],
      "unexpected": []
    }
  ],
  "summary": {
    "total": N,
    "clean": N,
    "missing_artifacts": N,
    "wrong_phase": N
  }
}
```

**Exit codes:** 0 = all docs present, 1 = findings (missing or unexpected artifacts).

> **Result footer:** See `.claude/commands/topology-PRINCIPLES.md` § Result footer. Stop condition: review missing-artifact list before running topology-gap.
