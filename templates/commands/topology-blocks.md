# topology-blocks

Blocking chain computation. Aggregates all blockers for a category — internal gaps, external dependencies, pending decisions, and unsatisfied prerequisites.

## Usage
```
/topology-blocks <project-name> <category-slug>
```

## Prerequisites

Run: `/topology-ready <project-name> --action project-read`.
If NO-GO: resolve each unmet check per the remediation, then re-run.

## Instructions

### Step 1: Aggregate blockers
Read GAP-ANALYSIS.md (internal gaps), SYSTEM-TOPOLOGY.md (upstream dependencies), DECISION-LOG.md (pending DL proposals), CHECKPOINT.md (HITL gates).

### Step 2: Compute blocking chain
Order blockers by dependency: upstream categories → decisions → internal gaps. Each blocker must resolve before the next can be addressed.

### Step 3: Return
```
## Blocking chain: <category>
1. cat-a must verify Seam S4 (upstream dependency)
2. DL-XXX must be approved (pending decision)
3. Gap 2 must be closed (internal)
**Estimated unblock:** after DL-XXX approval + cat-a verification
```

Exit 0 always.

> **Result footer:** See `.claude/commands/topology-PRINCIPLES.md` § Result footer.
