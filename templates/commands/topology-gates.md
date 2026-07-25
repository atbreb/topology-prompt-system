# topology-gates

Aggregate all open HITL gates across active topology projects into a single operator dashboard. Ranked by unblocking impact — gates that block downstream categories first.

## Usage

```
/topology-gates [--all-projects] [--project <name>]
```

## Prerequisites

Run: `/topology-ready --action system-ready`.
If NO-GO: resolve each unmet check per the remediation, then re-run.

## Instructions

### Step 1: Discover active projects

Scan `{PROJECTS_ACTIVE_DIR}` for all topology projects with a `CHECKPOINT.md`.

### Step 2: Parse each CHECKPOINT.md

For each project, read CHECKPOINT.md YAML frontmatter. Filter to entries with:
- `status: paused-hitl`
- `status: paused-cross-project-pivot`

Extract: project name, category/group, hitl_reason, paused_at timestamp, proposedDecisions (if any), workflow_runId (if any).

### Step 3: Rank by unblocking impact

Use the shared ranking utility (`topology-rank-actions.js --mode gates`) to rank gates by:
- How many downstream categories this gate blocks (from SYSTEM-TOPOLOGY.md seam graph)
- How many projects are affected
- How long the gate has been open

### Step 4: Check for resolved-but-unresumed gates

For gates where a DL proposal was approved but `/topology-resume` hasn't been run:
- Flag as "resolved, awaiting resume"
- These are the highest-value gates — one command unblocks them

### Step 5: Return dashboard

```
## HITL Gate Dashboard

**Total open gates:** N across M projects

### Critical (blocks downstream)
| Project | Category | Reason | Open since | Blocks | Action |
|---------|----------|--------|------------|--------|--------|
| <name> | <cat> | <reason> | <date> | 3 downstream | `/topology-resume <project>` after DL-XXX approval |

### Resolved, awaiting resume
| Project | Category | DL approved | Action |
|---------|----------|-------------|--------|
| <name> | <cat> | DL-XXX (2026-07-24) | `/topology-resume <project> <category>` |

### Other open gates
| Project | Category | Reason | Open since |
|---------|----------|--------|------------|
| <name> | <cat> | <reason> | <date> |
```

> **Result footer:** See `.claude/commands/topology-PRINCIPLES.md` § Result footer. Stop condition: this is a read-only dashboard — no state is modified.
