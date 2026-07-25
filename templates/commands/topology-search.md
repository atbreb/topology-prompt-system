# topology-search

Natural-language command discovery. Find which topology or compass command handles a given task, even before the NL router is active.

## Usage

```
/topology-search "<natural language query>"
```

## Prerequisites

Run: `/topology-ready --action system-ready`.
If NO-GO: resolve each unmet check per the remediation, then re-run.

## Instructions

### Step 1: Search the command surface

Search across all topology and compass commands for matches against the query:
1. **Name match:** Command names that contain query terms
2. **Description match:** Command descriptions that match the query semantically
3. **NL trigger match:** If intent map exists, check which intents' phrases match the query — those intents' target commands are the best match
4. **Category match:** Commands in the same category group as the query's domain

### Step 2: Rank results

Rank by: intent map phrase match (highest) → name match → description match → category match.

### Step 3: Return results

```
## Matching commands for "<query>"

| Command | Relevance | Why |
|---------|-----------|-----|
| /topology-diagnose | High | NL phrase match: "something is off with the billing events" |
| /topology-status | Medium | Name match: "status" |
| /topology-gates | Low | Category match: diagnosis → gates often checked together |

### Best match: `/topology-diagnose <project>`
<brief usage summary>
```

> **Result footer:** See `.claude/commands/topology-PRINCIPLES.md` § Result footer. Stop condition: read-only — no state modified.
