# topology-patch

Surgical fix for a confirmed seam break. Takes the break point evidence from `topology-trace` and produces a targeted fix — scoped to the minimum change that restores the violated guarantee, nothing more. Updates the Verification Table to reflect the regression was resolved. Does not trigger a full rebuild cycle.

## Usage

```
/topology-patch <project-name> <seam-slug>
```

Run after `topology-trace` has confirmed a specific break point. The trace report is required input — `topology-patch` reads it as part of context loading.

---

## Prerequisites

- [ ] `categories/*/VERIFICATION-REPORT.md` exists for both producer and consumer categories
- [ ] A `topology-trace` report exists for this seam (in `{PROJECTS_ACTIVE_DIR}/<project-name>/` or `{PROJECTS_ARCHIVE_DIR}/`)
- [ ] The break point is confirmed — not just suspected

If no trace report exists:
> Run `/topology-trace <project-name> <seam-slug> "<data flow>"` first to confirm the break point before patching.

---

## Instructions

### Step 1: Load Break Point Evidence

Read:
1. The `topology-trace` report for this seam — full break point details
2. `SYSTEM-TOPOLOGY.md` — the full seam contract, producer guarantees, consumer dependencies
3. `CONTRACT-SHEET.md` — any contract invariants the violated guarantee maps to
4. The original `FUTURE-STATE.md` for the producer category — what the intended implementation was
5. The `VERIFICATION-REPORT.md` for the producer and consumer — how the seam was originally verified

Build a complete picture of:
- What the code currently does at the break point
- What it must do to honor the guarantee
- What the original implementation intended

### Step 2: Define the Patch Scope

A patch is not a refactor. It is the minimum change that restores the specific violated guarantee without touching anything else.

Define the scope:
- **Files to modify:** only files directly involved in the break point
- **Files NOT to modify:** everything else — even if nearby code looks improvable
- **Guarantee being restored:** the exact guarantee text from `SYSTEM-TOPOLOGY.md`
- **Guarantees that must not break:** all other guarantees in this seam and adjacent seams

If the break point is complex enough that a minimum fix isn't clearly isolatable — if fixing it properly requires touching multiple systems or changing a data structure — stop and surface this:

> This break point cannot be resolved with a surgical patch. The scope required to restore
> the guarantee exceeds what topology-patch is designed for. Recommend opening a new
> topology project targeting [category/seam] with full discovery and phase planning.

### Step 3: Produce the Patch Plan

```markdown
## Patch Plan — Seam <N>: <Producer> → <Consumer>

**Project:** <project-name>
**Break point confirmed by:** topology-trace report, <date>
**Status:** Pending Review

---

### The Violated Guarantee

> <exact guarantee text from SYSTEM-TOPOLOGY.md>

### The Break

**File:** `<path>`
**Function:** `<n>`
**Trigger condition:** <always / specific input / error path>

**Current behavior:**
<what the code does>

**Required behavior:**
<what honoring the guarantee looks like in code>

---

### Patch

#### Change 1 — `<file>`

**Purpose:** <one sentence: what this change does and why>
**Scope:** <function name, ~N lines>

**Before:**
```
<relevant current code — enough context to locate it>
```

**After:**
```
<patched code>
```

**Why this restores the guarantee:**
<causal chain from the code change to the honored guarantee>

#### Change 2 — `<file>` (if needed)

[same structure]

---

### Guarantees That Must Not Break

For each other guarantee in this seam and adjacent seams, confirm the patch does not affect them:

| Guarantee | Affected by patch? | Safe |
|-----------|-------------------|------|
| <guarantee text> | No / Minimally | ✓ |

---

### Verification Steps

After applying the patch, verify the guarantee is restored:

- [ ] <specific binary check 1 — observable behavior>
- [ ] <specific binary check 2 — code path check>
- [ ] <regression check — previously passing behavior still passes>

---

### Decision Log Entry Required?

<Yes / No>

If yes — the patch represents a meaningful change to how the seam operates and should be
recorded. Add this entry to DECISION-LOG.md before applying the patch:

**DL-NNN — <Title>**
Decision: <what the patch changes>
Rationale: <why this is the right fix>
Affects: Seam <N>
```

### Step 4: Wait for Review

Stop. Do not apply the patch. Output:

```
## topology-patch: Patch Plan Ready

Patch plan written above.

Review the Before/After for each change before applying.
Confirm the guarantee being restored and the verification steps.

To apply: confirm you want to proceed and I will make the changes.
To revise: tell me what to adjust in the plan.
```

### Step 5: Apply the Patch

After explicit confirmation, apply each change exactly as specified in the patch plan. No scope creep — if anything adjacent looks wrong, note it but do not touch it.

After all changes are applied:

Run the verification steps from the patch plan against the codebase. Report each:

```
### Verification Results

- [ ] <check 1>: Pass / Fail
- [ ] <check 2>: Pass / Fail
- [ ] <regression check>: Pass / Fail
```

If any verification step fails: stop, report, do not update the Verification Table.

### Step 6: Update Project Records

If all verification steps pass:

**Update VERIFICATION-TABLE.md:**
- Find the cell for this seam on the producer category row — change from `✗ (regression)` to `✓ (patched <date>)`
- Find the cell for this seam on the consumer category row — same update

**Add to DECISION-LOG.md** (if flagged in patch plan):
```markdown
## DL-NNN — <Title>

**Date:** <date>
**Decision:** <what the patch changed>
**Rationale:** <why>
**Affects:** Seam <N>, Contract <N> (if applicable)
**Status:** Active
```

**Create patch record:**
`{PROJECTS_ACTIVE_DIR}/<project-name>/patches/patch-<seam-slug>-<date>.md` (or under `{PROJECTS_ARCHIVE_DIR}/<project-name>/patches/` if the project has already been archived)

Copy the full patch plan and verification results into this file for traceability.

### Step 7: Report Completion

```
## topology-patch Complete

**Seam:** <N> — <Producer> → <Consumer>
**Guarantee restored:** <guarantee text>
**Files modified:** <list>
**Verification:** All steps passed ✓

### Verification Table Updated
- <Category A> × Seam <N>: ✓ (patched <date>)
- <Category B> × Seam <N>: ✓ (patched <date>)

### Recommended Follow-up
Run topology-integrate to confirm no adjacent seams were affected:
  /topology-integrate <project-name>
```

---

## Important Notes

- **Minimum viable fix, always.** The patch restores one guarantee. It does not improve nearby code, refactor related logic, or address other issues spotted during the trace. Those go in the backlog.
- **Confirmation gate before applying.** The plan is always reviewed before any code is touched. No exceptions.
- **If the scope exceeds a patch, stop.** Some breaks reveal that the original implementation was fundamentally wrong in a way a patch cannot correct. Naming this clearly is more valuable than attempting an oversized fix.
- **topology-integrate after patching.** A patch that restores one guarantee can unknowingly stress an adjacent seam. The integration checkpoint catches this.
- **Patch records are permanent.** Every applied patch gets a record file, regardless of how small. These become the audit trail for future debugging sessions.

---

## Placeholders in This File

| Placeholder | Replace With |
|-------------|-------------|
| `{PROJECTS_ACTIVE_DIR}` | Path to your active projects directory |
| `{PROJECTS_ARCHIVE_DIR}` | Path to your archived projects directory |

$ARGUMENTS
