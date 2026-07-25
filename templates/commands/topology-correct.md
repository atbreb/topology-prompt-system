# topology-correct

Correct a misrouted NL classification. Lets the developer fix the intent map in place without re-running the full interview.

## Usage

```
/topology-correct <intent-id> --action <add-phrase|remove-phrase|change-command|adjust-confidence> [--phrase "<text>"] [--command <command>] [--confidence <0-1>]
```

## Prerequisites

Run: `/topology-ready --action system-ready`.
If NO-GO: resolve each unmet check per the remediation, then re-run.

## Instructions

### Step 1: Identify the intent

Read the intent map at `~/.claude/topology/intent-map.<hash>.json`. Find the intent with the given `intent-id`. If not found, report the available intent IDs.

### Step 2: Apply the correction

| --action | Effect |
|----------|--------|
| `add-phrase` | Add `--phrase` to the intent's phrases array |
| `remove-phrase` | Remove `--phrase` from the intent's phrases array |
| `change-command` | Change the intent's target command to `--command` |
| `adjust-confidence` | Set the intent's default confidence to `--confidence` |

### Step 3: Validate and save

- Validate the modified intent map against the JSON Schema
- Recompute SHA-256 hash
- Write updated intent map + hash file
- Log the correction: `{timestamp, intentId, action, previous, updated, operator}`

### Step 4: Report

```
Corrected intent <intent-id>:
  Action: <action>
  Before: <previous state>
  After: <updated state>
```

The correction takes effect on the next prompt — the hook reloads the intent map on each invocation.

> **Result footer:** See `.claude/commands/topology-PRINCIPLES.md` § Result footer. Stop condition: corrections are atomic — verify the next prompt routes correctly.
