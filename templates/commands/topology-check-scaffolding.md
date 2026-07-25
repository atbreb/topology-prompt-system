# topology-check-scaffolding

Verify that every phase-planned category has complete implementation scaffolding — session prompts and runbooks for each phase. Detects the slim-mirror anti-pattern. Read-only. CI-safe.

## Usage

```
/topology-check-scaffolding <project-name> [--category <slug>]
```

## Prerequisites

Run: `/topology-ready --action system-ready`.
If NO-GO: resolve each unmet check per the remediation, then re-run.

## Instructions

### Step 1: Load phase plans

For each category with a `PHASE-PLAN.md`, extract the declared phases and their implementation directories.

### Step 2: Check scaffolding completeness

For each phase-N directory under `implementation/`:
- Expected: `PHASE-N-SESSION-PROMPT.md` + `PHASE-N-RUNBOOK.md`
- Flag missing files
- Detect slim-mirror: CLAUDE.md exists but no per-phase scaffolding

### Step 3: Return results

```
{
  "project": "<name>",
  "categories": [
    {
      "category": "<slug>",
      "phases": [
        {
          "phase": "phase-1",
          "expected": ["PHASE-1-SESSION-PROMPT.md", "PHASE-1-RUNBOOK.md"],
          "present": ["PHASE-1-SESSION-PROMPT.md"],
          "missing": ["PHASE-1-RUNBOOK.md"]
        }
      ],
      "slimMirror": false
    }
  ],
  "summary": { "total_phases": N, "complete": N, "missing_scaffolding": N, "slim_mirrors": N }
}
```

**Exit codes:** 0 = all scaffolding present, 1 = findings.

> **Result footer:** See `.claude/commands/topology-PRINCIPLES.md` § Result footer. Stop condition: complete scaffolding before running topology-implement.
