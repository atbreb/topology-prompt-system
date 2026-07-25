# topology-coverage

Fact-coverage analysis — the ratio of fact-backed (test/property/lockdown) vs prose-only assertions across a project. The primary metric for the "Facts over prose" migration.

## Usage
```
/topology-coverage <project-name> [--category <slug>] [--all-projects]
```

## Prerequisites

Run: `/topology-ready <project-name> --action project-read`.
If NO-GO: resolve each unmet check per the remediation, then re-run.

## Instructions

### Step 1: Parse assertion tables
Read `FUTURE-STATE.md` for each category in scope. Extract the assertion table: assertion ID, description, proof kind (test/property/lockdown/manual-evidence/none-yet).

### Step 2: Compute coverage
Count fact-backed (test + property + lockdown), prose-only (none-yet), deferred (manual-evidence). Compute per-category and per-project ratios.

### Step 3: Build backlog
Sort prose-only assertions by priority: contract assertions first, then seam-producer, then seam-consumer, then regression. Suggest proof kind per item.

### Step 4: Return
```
## Coverage: <project>
| Category | Fact-Backed | Prose-Only | Deferred | Ratio |
|----------|-------------|------------|----------|-------|
| <cat> | 8 | 2 | 1 | 80% |

**Project total:** 73% fact-backed (24/33 assertions)
**Backlog:** 9 prose-only assertions to address
```

Exit 0 always (analysis, not a gate).

> **Result footer:** See `.claude/commands/topology-PRINCIPLES.md` § Result footer.
