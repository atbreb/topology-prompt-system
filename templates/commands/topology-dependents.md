# topology-dependents

Downstream dependency enumeration. Traverses the seam graph to find all consumers of a category or seam.

## Usage
```
/topology-dependents <project-name> <category-slug|seam-id>
```

## Prerequisites

Run: `/topology-ready <project-name> --action project-read`.
If NO-GO: resolve each unmet check per the remediation, then re-run.

## Instructions

### Step 1: Traverse seam graph
Read SYSTEM-TOPOLOGY.md. Starting from the given category/seam, follow consumer edges to find all direct and transitive dependents.

### Step 2: Check verification status
For each dependent, read VERIFICATION-TABLE.md to see if it's verified, in progress, or not started.

### Step 3: Return
```
## Dependents: <category/seam>
**Direct consumers:** cat-a (S4), cat-b (S5)
**Indirect consumers:** cat-c (consumes S6, which consumes S4)
**Blocked phases:** cat-a Phase 3 (waiting on S4 verification)
```

Exit 0 always.

> **Result footer:** See `.claude/commands/topology-PRINCIPLES.md` § Result footer.
