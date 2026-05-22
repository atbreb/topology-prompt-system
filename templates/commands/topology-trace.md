# topology-trace

Follows a specific data flow through the seam contracts step by step against the actual codebase. Where `topology-diagnose` identifies candidate seams, `topology-trace` walks one specific flow end to end and finds the exact point where the chain breaks — the file, the function, the condition. Produces evidence ready for `topology-patch`.

## Usage

```
/topology-trace <project-name> <seam-slug> "<data flow description>"
```

### Arguments

- `<project-name>` — the project whose seam contracts govern this system
- `<seam-slug>` — the seam to investigate (from the Seam Index in `SYSTEM-TOPOLOGY.md`)
- `"<data flow description>"` — the specific event, record, or state transition to follow. Examples:
  - `"a completed task's billing event from emission to balance update"`
  - `"a session status transition from running to complete"`
  - `"a reservation from creation to settlement"`

---

## Output

The exact break point in the chain — file, function, line range, and the specific condition under which the guarantee is violated. If the chain is unbroken, confirmation with evidence. Ready to hand directly to `topology-patch` if a break is found.

---

## Instructions

### Step 1: Load the Seam Contract

Read `SYSTEM-TOPOLOGY.md` and extract the full seam contract for `<seam-slug>`:
- Producer category and consumer category
- Every producer guarantee (full text)
- Every consumer dependency (full text)
- The type or structure that crosses the boundary

Also read:
- The relevant `VERIFICATION-REPORT.md` for the producer category — how was this seam verified, and what was the exact evidence cited?
- The relevant `VERIFICATION-REPORT.md` for the consumer category — same question
- The relevant `FUTURE-STATE.md` files — what was the intended behavior specification?

### Step 2: Locate the Boundary in Code

Find the actual code locations where this seam's boundary is crossed:

- **Producer side:** where does the producer emit, write, or return what crosses this seam? Identify the specific function or handler.
- **Consumer side:** where does the consumer receive, read, or depend on what crosses this seam? Identify the specific function or handler.
- **The crossing point itself:** what is the mechanism? (message-broker event, {API_STYLE} call, {DATABASE} write/read, function return, KV store write, etc.)

### Step 3: Walk the Data Flow

Follow the specific data flow described in the argument through the code, step by step. At each step:

1. **Identify what enters this step** — what value, event, or state is being processed
2. **Check it against the seam contract** — does the code honor the guarantee at this step?
3. **Identify what exits this step** — what value, event, or state is produced
4. **Check for silent failures** — is there any code path where the step fails without surfacing a typed error?

Continue step by step through the full chain from producer emission to consumer consumption.

### Step 4: Identify Break Points

A break point is any location in the chain where one of the following is true:

- **Missing emission:** The producer should emit but a code path exists where it doesn't
- **Wrong structure:** The producer emits but with missing or incorrect fields
- **Silent failure:** An error is caught and swallowed rather than propagated as a typed error
- **Over-reliance:** The consumer depends on something the producer never guaranteed
- **Conditional guarantee:** The guarantee is honored sometimes but not always — find the condition
- **Sequencing violation:** The guarantee is honored but too late or in the wrong order
- **Partial write:** The data crosses the boundary but is written incompletely

For each break point found:

```
BREAK POINT FOUND

File: <path/to/file>
Function: <function name>
Line range: ~<N>–<M>
Type: Missing emission / Wrong structure / Silent failure / Over-reliance / Conditional guarantee / Sequencing violation / Partial write

Violated guarantee:
> <exact guarantee text from SYSTEM-TOPOLOGY.md>

Current behavior:
<what the code actually does>

Expected behavior:
<what the contract requires>

Condition that triggers violation:
<under what circumstances does this break — always? specific input? race condition? error path only?>

Evidence:
<specific code logic that demonstrates the violation>
```

### Step 5: Check for Upstream Causes

If a break point is found, check whether it is itself caused by a break in a prior seam. A downstream break can be a symptom of an upstream violation.

For example: if the consumer never receives the billing event, the break point might appear to be in the consumer's handler — but the actual cause might be the producer never emitting it in the first place.

If an upstream cause is suspected, note it and recommend running `topology-trace` on the upstream seam first.

### Step 6: Produce Trace Report

```markdown
## topology-trace: Seam <N> — <Producer> → <Consumer>

**Project:** <project-name>
**Data flow:** "<data flow description>"
**Traced:** <date>

### Seam Contract Under Investigation

**Producer guarantees:**
- <guarantee 1>
- <guarantee 2>

**Consumer dependencies:**
- <dependency 1>

**Crossing mechanism:** <message-broker event / {API_STYLE} / {DATABASE} / KV / function return>

---

### Chain Walked

| Step | Location | Input | Output | Contract Status |
|------|----------|-------|--------|----------------|
| 1 | `file:function` | <what enters> | <what exits> | ✓ Honored / ✗ Violated / ⚠ Conditional |
| 2 | `file:function` | | | |
| ... | | | | |

---

### Result: BREAK FOUND / CHAIN INTACT

<If break found:>

### Break Point

**File:** `<path>`
**Function:** `<name>`
**Line range:** ~<N>–<M>
**Violation type:** <type>

**Violated guarantee:**
> <exact text>

**Current behavior:**
<what the code does>

**Expected behavior:**
<what the contract requires>

**Trigger condition:**
<always / specific input / error path / race condition>

**Upstream cause suspected:** Yes / No
<If yes: which seam, why>

---

<If chain intact:>

### Chain Intact

Every step honored the seam contract for this data flow. No break found.

This means either:
1. The symptom originates in a different seam — return to topology-diagnose candidates
2. The break is environment or configuration dependent — not visible in static code analysis
3. The break is in the crossing mechanism itself (message-broker delivery, {DATABASE} write atomicity, etc.) — requires runtime observation

---

### Recommended Next Step

<If break found:>
  /topology-patch <project-name> <seam-slug>
  Reference this report as the break point evidence.

<If chain intact:>
  /topology-trace <project-name> <next-candidate-seam-slug> "<flow>"
  or
  Return to: /topology-diagnose <project-name> "<original symptom>"
```

---

## Important Notes

- **Walk the actual code, not the intended code.** The future-state and verification documents describe what should be true. The trace follows what is true. Discrepancies between them are findings.
- **Silent failures are the most common break type.** Look especially for error paths where exceptions are caught and logged but not propagated as typed errors — these are the mechanism that makes events disappear silently (e.g., a billing event that is emitted on the happy path but swallowed on the error path).
- **Conditional guarantees are subtle.** A guarantee that says "always" but has an edge case where it doesn't fire is a violation. The condition that triggers the violation is as important as the violation itself.
- **Stop at the first confirmed break point.** Once the chain is broken, downstream behavior is unreliable and tracing further produces noise. Fix the first break, then re-trace.
- **If the chain appears intact but the symptom persists**, the break is likely in the runtime environment rather than the static code — message-broker delivery, database write ordering, race conditions under load. Note this explicitly in the report.

---

## Placeholders in This File

| Placeholder | Replace With |
|-------------|-------------|
| `{API_STYLE}` | Your service-call style (e.g., gRPC, REST, GraphQL) |
| `{DATABASE}` | Your database (e.g., Postgres, MySQL, SQLite) |

$ARGUMENTS
