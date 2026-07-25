# topology-deferred

Deferred decision inventory. Lists all deferred proposals across projects with recommended revisit triggers.

## Usage
```
/topology-deferred [--all-projects] [--project <name>]
```

## Prerequisites

Run: `/topology-ready <project-name> --action project-read`.
If NO-GO: resolve each unmet check per the remediation, then re-run.

## Instructions

### Step 1: Scan deferred sources
Read DEFERRED-PROPOSALS.md files, CHECKPOINT.md deferred annotations, DECISION-LOG.md entries with "Deferred" status.

### Step 2: Identify revisit candidates
For each deferred item, check if its trigger condition is now met (dependency landed, sprint phase reached, time-based trigger elapsed).

### Step 3: Return
```
## Deferred Decisions
**Total:** N across M projects

### Suggested revisits (trigger condition met)
| Item | Deferred | Trigger | Recommended action |
|------|----------|---------|-------------------|
| DL-XXX | 2026-07-15 | "After Group 2 lands" | Revisit now — Group 2 landed 07-25 |

### All deferred
| Item | Project | Deferred date | Original rationale |
|------|---------|---------------|-------------------|
| DL-XXX | <project> | 2026-07-15 | <rationale> |
```

> **Result footer:** See `.claude/commands/topology-PRINCIPLES.md` § Result footer.
