# topology-diagnose

Symptom-driven seam chain analysis. Takes an observable failure description and traces it through the project's seam contracts to produce a ranked list of candidate seams with the specific violated guarantee that would produce the observed symptom. The starting point for any production issue that crosses a category boundary.

## Usage

```
/topology-diagnose <project-name> "<symptom>"
```

### Arguments

- `<project-name>` — the project whose seam contracts govern this system
- `"<symptom>"` — plain language description of the observable failure. Be specific about what is happening vs. what should be happening. Examples:
  - `"credits are reserved but never debited to the final balance"`
  - `"billing events are emitted but usage_percent never updates in the frontend"`
  - `"session status shows running after the task completes"`

---

## Output

A ranked candidate list — seams most likely to contain the violated guarantee, with the specific guarantee named, the expected behavior, and the observed behavior mapped to it. Ready to hand directly to `topology-trace`.

---

## Instructions

### Step 1: Load Project Contracts

Read:
1. `CONTRACT-SHEET.md` — all invariants, their governing categories, verification criteria
2. `SYSTEM-TOPOLOGY.md` — all seam contracts, producer guarantees, consumer dependencies
3. `VERIFICATION-TABLE.md` — current cell states (identifies known regressions)
4. All `VERIFICATION-REPORT.md` files — what was verified and how
5. Most recent integration checkpoint — any regressions already flagged

### Step 2: Parse the Symptom

Break the symptom into components:

- **What is happening:** `<observable behavior>`
- **What should be happening:** `<expected behavior per contracts>`
- **Where it surfaces:** `<which category or system boundary is the observation point>`
- **Implied data flow:** `<what data or event must travel through the system to produce the correct behavior>`

For the billing example:
- What is happening: credits reserved, final balance unchanged
- What should happen: reserved credits are debited on settlement, balance reflects actual spend
- Where it surfaces: billing / usage display
- Implied data flow: reservation → usage tracking → settlement → balance update

### Step 3: Identify the Relevant Seam Chain

Starting from the observation point, walk backward through `SYSTEM-TOPOLOGY.md` to find every seam in the data flow that must operate correctly to produce the expected behavior.

For each seam in the chain, note:
- The producer's relevant guarantees
- The consumer's relevant dependencies
- Whether this seam's Verification Table cell is `✓`, `✗`, `⏳`, or blank

### Step 4: Score Each Seam as a Candidate

For each seam in the chain, evaluate likelihood of being the break point:

**High** — One of these is true:
- The seam's Verification Table cell is `✗` or blank
- The seam has a guarantee that, if violated, directly produces the observed symptom
- The seam was flagged in the most recent integration checkpoint

**Medium** — One of these is true:
- The seam was verified but the verification criteria didn't explicitly cover this scenario
- The seam touches the observation category but indirectly
- A prior verification report noted manual review items here

**Low** — All of these are true:
- The seam has a `✓` in the Verification Table
- Its guarantee was explicitly checked against the failure scenario
- No integration checkpoint has flagged it

### Step 5: Map Each Candidate to a Specific Violated Guarantee

For each High and Medium candidate, name the specific guarantee from `SYSTEM-TOPOLOGY.md` that would need to be violated to produce the symptom. This is the hypothesis `topology-trace` will investigate.

Format:

**Candidate:** Seam N — Producer → Consumer
**Violated guarantee hypothesis:** `<exact guarantee text from SYSTEM-TOPOLOGY.md>`
**How violation produces symptom:** `<causal chain from violated guarantee to observed behavior>`
**Evidence pointing here:** `<what in the verification history or table suggests this>`

### Step 6: Check for Contract Violations

For each relevant contract in `CONTRACT-SHEET.md`, check whether the symptom represents a contract violation — not just a seam issue. Some failures span seams and manifest as contract violations.

If a contract appears violated, add it to the candidate list with the same structure.

### Step 7: Produce Diagnosis Report

```markdown
## topology-diagnose: <project-name>

**Symptom:** "<symptom text>"
**Analyzed:** <date>

### Symptom Breakdown
- **What is happening:** <parsed behavior>
- **What should happen:** <expected per contracts>
- **Observation point:** <category>
- **Implied data flow:** <A → B → C → D>

### Seam Chain

`<Cat A>` → `[S1]` → `<Cat B>` → `[S2]` → `<Cat C>` → `[S3]` → `<observation point>`

### Candidate Seams — Ranked

#### 🔴 HIGH — Seam <N>: <Producer> → <Consumer>

**Violated guarantee hypothesis:**
> <exact guarantee text from SYSTEM-TOPOLOGY.md>

**How violation produces symptom:**
<causal chain>

**Evidence:**
- Verification Table: `<cell state>`
- <any checkpoint findings or verification report notes>

**Investigate with:**
  /topology-trace <project-name> <seam-slug> "<specific data flow to follow>"

---

#### 🟡 MEDIUM — Seam <N>: <Producer> → <Consumer>

[same structure]

---

#### 🟢 LOW — Seam <N>: <Producer> → <Consumer>

[same structure — included for completeness, unlikely source]

---

### Contract Violation Candidates

#### Contract <N> — <Title>

**Relevant invariant:** <exact invariant text>
**How symptom maps to violation:** <description>
**Governs:** <category list>

---

### Recommended Investigation Order

1. `/topology-trace <project-name> <highest-candidate-seam-slug> "<flow>"`
2. `/topology-trace <project-name> <second-candidate-seam-slug> "<flow>"`

If Seam <N> is confirmed broken:
  `/topology-patch <project-name> <seam-slug>`
```

---

## Important Notes

- **Diagnose produces hypotheses, not conclusions.** The ranked candidates tell you where to look, not what is broken. `topology-trace` confirms.
- **Low candidates still matter.** If High and Medium candidates are ruled out by `topology-trace`, Low candidates become the next investigation tier. Don't discard them.
- **A blank Verification Table cell is as suspicious as `✗`.** If a seam was never verified, it was never confirmed to work.
- **The symptom description quality matters.** The more specific the symptom, the more precise the candidate ranking. "Billing seems off" produces a wide candidate list. "Credits are reserved but the settled_amount field in usage_events is always 0" produces a narrow one.

---

$ARGUMENTS
