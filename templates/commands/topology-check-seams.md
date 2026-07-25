# topology-check-seams

Detect half-migrated seams — where the producer side is verified but the consumer side is not, or where one side is in-progress while the neighbor is already implemented. Read-only. CI-safe.

## Usage

```
/topology-check-seams <project-name> [--seam <id>]
```

## Prerequisites

Run: `/topology-ready --action system-ready`.
If NO-GO: resolve each unmet check per the remediation, then re-run.

## Instructions

### Step 1: Read seam contracts

Parse `SYSTEM-TOPOLOGY.md` → extract all seams: producer category, consumer category, status.

### Step 2: Cross-reference verification table

For each seam, read both the producer and consumer rows in `VERIFICATION-TABLE.md`:
- Producer ✓ / consumer blank or ✗ → half-migrated
- Producer ⏳ / consumer ✓ → inverted half-migration (consumer verified before producer? suspicious)
- Both ⏳ but one side's category is implemented while the other is not → stale half-migration
- Seam predates Consumer-Expectations field in SYSTEM-TOPOLOGY.md → legacy seam

### Step 3: Return results

```
{
  "project": "<name>",
  "findings": [
    {
      "seam": "S4",
      "producer": { "category": "<slug>", "status": "✓" },
      "consumer": { "category": "<slug>", "status": " " },
      "finding": "half-migrated",
      "severity": "high"
    }
  ],
  "summary": { "total_seams": N, "clean": N, "half_migrated": N, "legacy": N }
}
```

**Exit codes:** 0 = no half-migrations, 1 = findings.

> **Result footer:** See `.claude/commands/topology-PRINCIPLES.md` § Result footer. Stop condition: resolve half-migrations before integration checkpoint.
