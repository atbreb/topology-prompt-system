# topology-debt

Contract debt aggregation across projects. Multi-dimensional view: coverage gaps + deferred items + carried-forward findings + manual-evidence assertions.

## Usage
```
/topology-debt [--all-projects] [--project <name>] [--category <slug>]
```

## Prerequisites

Run: `/topology-ready <project-name> --action project-read`.
If NO-GO: resolve each unmet check per the remediation, then re-run.

## Instructions

### Step 1: Aggregate debt sources
Read across projects: FUTURE-STATE.md (prose-only + manual-evidence), VERIFICATION-REPORT.md (deferred items, carried-forward), DEFERRED-PROPOSALS.md (deferred DL proposals).

### Step 2: Deduplicate and rank
Group by: coverage gaps / deferred items / carried-forward / manual-evidence. Rank top 10 by severity × blocking impact.

### Step 3: Return
```
## Contract Debt
**Total items:** N across M projects

### Top 10
| # | Item | Type | Severity | Blocks | Project |
|---|------|------|----------|--------|---------|
| 1 | A5 prose-only | coverage-gap | high | 2 cats | <project> |

### By type
- Coverage gaps: N
- Deferred: N
- Carried-forward: N
- Manual-evidence: N
```

> **Result footer:** See `.claude/commands/topology-PRINCIPLES.md` § Result footer.
