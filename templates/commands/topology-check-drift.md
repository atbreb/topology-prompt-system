# topology-check-drift

Detect inconsistencies between documentation claims and code reality. Checks FUTURE-STATE assertions against actual source files, contract verification claims against table state, and git divergence. Read-only. CI-safe.

## Usage

```
/topology-check-drift <project-name> [--category <slug>]
```

## Prerequisites

Run: `/topology-ready --action system-ready`.
If NO-GO: resolve each unmet check per the remediation, then re-run.

## Instructions

### Step 1: Check doc/code consistency

For assertions in `FUTURE-STATE.md` that name specific source files:
- Verify the file exists
- Spot-check that the asserted code path is present (grep for the named function/symbol)
- Flag: file missing, symbol not found, file modified since last verification

### Step 2: Check contract verification claims

Read `CONTRACT-SHEET.md` Verification Summary:
- Contracts claiming "Verified (in <category>)" → check that category's row in VERIFICATION-TABLE.md is all-green
- If the category row has non-green cells → contract claim is stale

### Step 3: Check git state

- `git rev-list --count origin/main..main` → must be 0
- Uncommitted changes in files named in FUTURE-STATE → flag

### Step 4: Return results

```
{
  "project": "<name>",
  "findings": [
    {
      "type": "doc-code-mismatch",
      "assertion": "A1",
      "claimedFile": "apps/api/handlers/example.go",
      "finding": "symbol not found: ExampleHandler",
      "severity": "high"
    }
  ],
  "git": {
    "divergence": 0,
    "uncommittedInAssertedFiles": []
  },
  "summary": { "total_checks": N, "mismatches": N, "git_clean": true }
}
```

**Exit codes:** 0 = no drift, 1 = findings.

> **Result footer:** See `.claude/commands/topology-PRINCIPLES.md` § Result footer. Stop condition: resolve drift before promoting.
