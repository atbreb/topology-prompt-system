# topology-impact

Change blast-radius analysis. Given a symbol, file, or directory, enumerate governed contracts, crossed seams, downstream categories, and affected verification cells.

## Usage
```
/topology-impact <symbol|file|directory>
```

## Prerequisites

Run: `/topology-ready <project-name> --action project-read`.
If NO-GO: resolve each unmet check per the remediation, then re-run.

## Instructions

### Step 1: Enumerate symbols in scope
Use codegraph to find all symbols and their callers/callees.

### Step 2: Cross-reference contracts and seams
Read CONTRACT-SHEET.md → find contracts governing these symbols. Read SYSTEM-TOPOLOGY.md → find seams crossing through these symbols.

### Step 3: Find affected verification cells
Read VERIFICATION-TABLE.md → find cells affected by changes to these contracts/seams.

### Step 4: Return
```
## Impact: <symbol>
**Governed contracts:** C1, C3
**Crossed seams:** S4 (producer), S5 (consumer)
**Downstream categories:** cat-a, cat-b
**Affected verification cells:** cat-a×S4, cat-b×S5
**Recommended re-verification scope:** cat-a, cat-b
```

Exit 0 always (analysis, not a gate).

> **Result footer:** See `.claude/commands/topology-PRINCIPLES.md` § Result footer.
