# topology-check-cells

Verify that the VERIFICATION-TABLE.md cells are consistent with on-disk VERIFICATION-REPORT.md files. Detects stale checkmarks, broken deferrals, and suspicious blank cells. Read-only. CI-safe.

## Usage

```
/topology-check-cells <project-name>
```

## Prerequisites

Run: `/topology-ready --action system-ready`.
If NO-GO: resolve each unmet check per the remediation, then re-run.

## Instructions

### Step 1: Read the verification table

Parse `VERIFICATION-TABLE.md` — extract every cell: category, seam/column, cell state (✓, ⏳, ✗, blank, —), and any qualifiers (DL-XXX annotations).

### Step 2: Cross-reference with verification reports

For each ✓ cell:
- Check that a `VERIFICATION-REPORT.md` exists for that category
- If no report exists → stale checkmark
- If report exists but the assertion for that seam is not ✓ → stale checkmark

For each ✓ (with DL-XXX) cell:
- Check that DL-XXX exists in DECISION-LOG.md
- Check that DL-XXX has completion criteria
- If DL is missing or has no completion criteria → broken deferral

For each blank cell in a row where other cells are ✓:
- Flag as suspicious — a "done" category with unexamined seams

### Step 3: Return results

```
{
  "project": "<name>",
  "findings": [
    {
      "category": "<slug>",
      "column": "S4",
      "cellState": "✓",
      "finding": "stale-checkmark",
      "evidence": "VERIFICATION-REPORT.md missing for this category",
      "recommendedFix": "Run topology-verify for this category or update the cell"
    }
  ],
  "summary": { "total_cells": N, "stale": N, "broken_deferrals": N, "suspicious": N }
}
```

**Exit codes:** 0 = all cells consistent, 1 = findings.

> **Result footer:** See `.claude/commands/topology-PRINCIPLES.md` § Result footer. Stop condition: resolve stale/broken cells before promoting.
