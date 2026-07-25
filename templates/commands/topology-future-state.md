# topology-future-state

Produce the future state document for one category — what the category looks like when all implementation phases are complete. Written before implementation begins so there is no post-hoc rationalization. Becomes the **pre-written specification** that `topology-verify` checks against: its **Verification Assertions** section is lifted, as data, into `topology-verify`'s find→adversarially-verify work-list.

> **See `{COMMANDS_DIR}/topology-PRINCIPLES.md`** for the design discipline and the shared schema library (`FINDING`). In particular: the bilateral producer/consumer seam discipline (failure mode #3); the "Written before implementation — always" rule (this document only has value if it predates the code); and the foundation-document mutation discipline (a future-state assertion that turns out wrong is amended via a DECISION-LOG entry, never silently).

## Usage

```
/topology-future-state <project-name> <category-slug>
```

### Arguments

- `<project-name>` — the project directory name under `{PROJECTS_ACTIVE_DIR}/`
- `<category-slug>` — the category to document

---

## Prerequisites

- [ ] `TOPOLOGY-CLAUDE.md` exists
- [ ] `CONTRACT-SHEET.md` exists
- [ ] `SYSTEM-TOPOLOGY.md` exists
- [ ] `categories/<category-slug>/CURRENT-STATE.md` exists
- [ ] `categories/<category-slug>/GAP-ANALYSIS.md` exists
- [ ] `categories/<category-slug>/implementation/` exists (phase plan scaffolded)

If the implementation directory is missing, run `/topology-phase-plan <project-name> <category-slug>` first.

---

## What this command is (and is not)

**This command is single-author design synthesis.** Defining the desired end state requires cross-category reasoning and trade-off calls — it is not a fan-out problem. There is **no mandatory Workflow** here.

**The primary Workflow-era change is structural, not orchestrational: the output document must emit a clean, enumerable `Verification Assertions` section that `topology-verify` consumes directly as its assertion set.** In the original set, `topology-verify` re-derived its checklist by re-reading prose and the foundation docs. In the current protocol, `topology-verify` **Step 1** ("Assemble the assertion set") reads this document's `Verification Assertions` section and lifts each row straight into `args.assertions` for its find→verify pipeline. So the assertions you write here are the literal work-list of the verification workflow. Author them to match the shape the workflow consumes: each assertion carries `{id, kind, claim, verification-criteria, proof, likely-files}`, mirroring the inputs of the `FINDING` schema in topology-PRINCIPLES Part II.

**The fact-first rule (see PRINCIPLES → "Facts over prose").** A spec is a prediction about how a model will read it; only an executable assertion survives a model upgrade. So every machine-checkable assertion must name a **proof** — the test/property/lockdown that backs it (`path::name`). `topology-verify` then *runs* that proof and lets the exit code decide the verdict, instead of an LLM re-reading your `verification-criteria` and sampling a "Pass." Where no executable proof exists yet, mark the assertion `none-yet` (it becomes a tracked coverage gap, and its verify Pass stays provisional behind the refutation panel); where the claim genuinely needs out-of-session evidence, mark it `manual-evidence` (it routes to evidence-deferral). The `verification-criteria` prose stays — it is the human-read spec — but the `proof` column is what makes the ✓ reproducible.

**Optional, light fan-out (off by default).** If a category produces or consumes many seams and you want the per-seam future-state assertions drafted in parallel, you MAY author a small Workflow that runs one drafting agent per seam (each returning a structured array of assertion objects) and merge the returns in the main loop. Keep it light — it is a drafting accelerator, not an orchestration requirement. Invoking this command authorizes that Workflow use if you choose it; there is no HITL-mid-run, no E2E/promote boundary, and no resume obligation for this command. **The assertion-list structure below is the change that matters — do not let an optional fan-out distract from getting it right.**

If you do fan out, each per-seam drafting agent returns objects shaped like the assertion rows in Step 3's `Verification Assertions` section (`id`, `kind`, `claim`, `verification-criteria`, `proof`, `likely-files`); the main loop concatenates, de-duplicates ids, and renders the table.

---

{{#if MULTI_AGENT}}
## {DELEGATE_AGENT_NAME} Pair Mode (optional)

If `{DELEGATE_FLAG}` appears anywhere in `$ARGUMENTS`, enter **{DELEGATE_AGENT_NAME} Pair Mode** before executing any step below. Full rules live in `{DELEGATE_PROTOCOL_FILE}`.

Procedure:

1. Read `{DELEGATE_PROTOCOL_FILE}`.
2. Post a Handoff Plan table mapping every step in the Instructions section below to either `Claude` or `{DELEGATE_AGENT_NAME}`, with a one-line rationale each. **Informational** — the `{DELEGATE_FLAG}` flag is already the user's ACK.
3. Proceed immediately per the Handoff Plan; record attribution in the category RUNBOOK per the protocol. Given this command is judgment-dense (see note below), the plan should land with nearly every step on Claude; flag any {DELEGATE_AGENT_NAME}-delegated step as a notice so the user can object in the same turn if desired.

Where {DELEGATE_AGENT_NAME} pays off most for this command: **minimal**. This command is almost entirely judgment — defining the desired end state requires cross-category reasoning and trade-off calls that a stateless {DELEGATE_AGENT_NAME} call cannot do well. Consider running this one without `{DELEGATE_FLAG}`. If `{DELEGATE_FLAG}` is passed, propose a plan where nearly every step is `Claude`, and restrict {DELEGATE_AGENT_NAME} to narrow structured-extraction tasks only (e.g., "list every invariant bullet from Contract N as a normalized array"). Warn the user in the Handoff Plan that the savings will be small.

Strip `{DELEGATE_FLAG}` from `$ARGUMENTS` before substituting into the positional args below.

---

{{/if}}
## Instructions

### Step 1: Load All Context

Read:
1. `CURRENT-STATE.md` — baseline: what exists today
2. `GAP-ANALYSIS.md` — all gaps being addressed and their target resolutions
3. `CONTRACT-SHEET.md` — invariants this category must satisfy
4. `SYSTEM-TOPOLOGY.md` — seam guarantees this category must honor
5. The implementation plan (`implementation/<Category>-Implementation-Plan.md`) — all phases, tasks, and exit criteria

The future state document must describe the end state after all phases complete, derived from the current state plus all gap resolutions. It is not speculative — it is a projection of the explicit work in the plan.

### Step 2: Derive Future State Assertions

For each contract relevant to this category, write a concrete assertion about the future state:
- What code path satisfies the invariant?
- What is the explicit behavior that proves compliance?

For each seam where this category is producer, write assertions for every guarantee:
- What code produces the guarantee?
- What is the exact type/structure emitted?
- What is the failure behavior?

For each seam where this category is consumer, write assertions about safe dependency:
- What does the code depend on?
- Is that dependency within the guaranteed set?

**For every assertion, name its proof.** Ask: "what executable thing, run by a machine, proves this claim?" — and record it in the `proof` column:
- An existing or planned **test / property / lockdown** → `test:<path>::<name>` (resp. `property:`/`lockdown:`). Prefer the test the implementation phase will already produce. A `lockdown:`-kind structural/source-scanning test is the right proof for "negative-space" invariants ("the TRACK stage is the *only* writer to data store X", "no worker uses a banned API") — source-scanning lockdown tests are well-suited to these uniqueness and absence claims.
- A claim that genuinely requires out-of-session evidence (live traffic, a real tenant database, an uninstalled CLI) → `manual-evidence` (it will route through evidence-deferral at verify time, not get a fabricated Pass).
- No executable proof exists yet and one is not in the phase plan → `none-yet`. This is honest, not failure — but it is a **coverage gap**: the assertion is documented, not enforced, and its verify Pass will be provisional (prose-read + refutation panel). Drive these toward a real proof where the claim is machine-checkable.

These assertions become the binary verification checklist for `topology-verify` — and they are also emitted in a machine-consumable flat list (the `Verification Assertions` section in Step 3) that the verify workflow lifts as its work-list, running each named `proof` to decide the verdict.

### Step 3: Create FUTURE-STATE.md

```markdown
# <Category Title> — Future State

**Project:** <project-name>
**Category:** <category-slug>
**Written:** <date>
**Describes:** End state after all <N> implementation phases complete
**Verified against:** CONTRACT-SHEET.md + SYSTEM-TOPOLOGY.md

> This document is written before implementation. It describes what WILL BE TRUE
> when the work is done. topology-verify uses the Verification Assertions section
> below as its work-list (its Step 1 lifts each assertion into a find→refute pipeline).
> If implementation discovers that a future state assertion is wrong, update this
> document via a Decision Log entry — not silently.

---

## Summary

<3-4 sentences describing this category's end state: what it does, how it works,
what guarantees it provides, what problems from the current state are resolved.>

---

## Contract Compliance — Future State

For each relevant contract, explicit statements of compliance.

### Contract <N> — <Title>

**Compliance status (future):** Full

**How compliance is achieved:**
<Specific code path or architectural decision that satisfies this invariant>

**Verifiable proof:**
- `<file>.<function/type>` — <what it does that satisfies the contract>
- <Observable behavior that can be checked>

---

## Seam Compliance — Producer Side (Future State)

### Seam <N> — <This Category> → <Consumer Category>

**Overall status (future):** Fully Honored

For each guarantee:

| Guarantee | Future Implementation | Verifiable Check |
|-----------|----------------------|-----------------|
| <guarantee text> | <how code produces this> | <binary check> |

**Failure behavior:**
<What happens when the producer-side code fails — what ERROR event is emitted,
what the consumer sees>

---

## Seam Compliance — Consumer Side (Future State)

### Seam <N> — <Producer Category> → <This Category>

**Overall status (future):** Safe

| Dependency | What code depends on | Is it guaranteed? |
|------------|---------------------|------------------|
| <dependency> | <code path> | Yes — by S<N> guarantee <N> |

---

## Key Structural Changes from Current State

<What changes architecturally. Not a list of files changed — a description of
the structural difference between current and future state.>

**Before:**
<Current structural description>

**After:**
<Future structural description>

---

## What This Category No Longer Does (After Rebuild)

<Explicit list of current behaviors that are removed. This is important —
it documents intentional removals, not accidental regressions.>

- ~~<Current behavior>~~ — removed because <reason tied to contract or decision>

---

## Future State Verification Checklist

> topology-verify will check every item on this list. Each item must be binary
> (pass/fail with evidence). If an item cannot be checked programmatically,
> describe the manual check precisely. This human-readable checklist is the
> companion to the machine-consumable Verification Assertions section below;
> every checklist item must correspond to exactly one assertion id there.

### Contract Checks
- [ ] **C<N>:** <specific binary check>
- [ ] **C<N>:** <specific binary check>

### Seam Producer Checks
- [ ] **S<N> guarantee 1:** <specific binary check>
- [ ] **S<N> guarantee 2:** <specific binary check>

### Seam Consumer Checks
- [ ] **S<N> dependency safe:** <specific binary check>

### Behavioral Checks
- [ ] <Observable system behavior that demonstrates correctness>
- [ ] <No regression from current working behaviors — specific>

---

## Verification Assertions

> **This section is the machine-consumable contract with topology-verify.** Its
> Step 1 ("Assemble the assertion set") reads this table and lifts each row, as
> data, into the workflow's `args.assertions` — one finder per row. The finder
> RUNS the named `proof` and the exit code decides the verdict; a prose-only
> (`none-yet`) Pass then faces an N-skeptic refutation panel. Each row mirrors
> the inputs of the FINDING schema in topology-PRINCIPLES Part II. Keep it a
> FLAT, enumerable list. Rules:
> - **id** — stable, unique, mnemonic. Convention: contract → `C<N>`; seam producer →
>   `S<N>-producer` (or `S<N>-producer-g<k>` per guarantee); seam consumer →
>   `S<N>-consumer`; regression → `REG-<n>`. Never reuse an id.
> - **kind** — one of `contract | seam-producer | seam-consumer | regression`
>   (matches the FINDING schema enum; `doc-coverage` is added by topology-verify
>   itself, not authored here).
> - **claim** — the single assertion to prove, phrased so a binary Pass/Fail is
>   possible. Not "works correctly" — "the TRACK stage is the only writer to
>   data store X".
> - **verification-criteria** — the human-read spec for the claim: the file/line
>   evidence that would constitute a Pass, or the precise out-of-session check.
>   This is prose for a human; the `proof` column is what the machine runs.
> - **proof** — the executable fact that backs the claim (see PRINCIPLES → "Facts
>   over prose"). One of:
>   - `test:<path>::<name>` / `property:<path>::<name>` / `lockdown:<path>::<name>`
>     — an executable assertion verify will RUN; exit 0 = Pass. `lockdown:` is the
>     right kind for negative-space/uniqueness invariants (source-scanning tests).
>   - `manual-evidence` — needs live traffic / real database / an uninstalled CLI;
>     routes to evidence-deferral (a DL), never a fabricated Pass.
>   - `none-yet` — no executable proof exists; Pass stays provisional (code-read +
>     refutation panel) and the row is logged as a coverage gap. Avoid where the
>     claim is machine-checkable — name a real test instead.
> - **likely-files** — best-guess paths the finder should read first (it may
>   discover others). Optional but high-leverage — it shrinks the finder's search.
>
> Every contract/seam/regression item in the checklist above MUST appear here as
> exactly one row, and vice versa. The checklist is for humans; this table is for
> the workflow.

| id | kind | claim | verification-criteria | proof | likely-files |
|----|------|-------|----------------------|-------|--------------|
| C<N> | contract | <the invariant restated as a provable claim> | <file/line evidence that = Pass, or precise manual check> | `test:<path>::<name>` \| `lockdown:…` \| `manual-evidence` \| `none-yet` | `<path>`, `<path>` |
| S<N>-producer | seam-producer | <producer guarantee restated as a provable claim> | <evidence the code emits the guaranteed type/structure + failure behavior> | `test:<path>::<name>` | `<path>` |
| S<N>-consumer | seam-consumer | <consumer depends only on the guaranteed set> | <evidence the dependency is within S<N>'s guarantees> | `test:<path>::<name>` | `<path>` |
| REG-<n> | regression | <a Pass behavior from CURRENT-STATE that must still hold> | <evidence the behavior is preserved> | `test:<path>::<name>` | `<path>` |

---

## Deferred Items

<Anything discovered during planning that belongs in a future phase or a different
category. Does not affect this category's completion, but should be tracked.>

| Item | Belongs To | Priority | Notes |
|------|-----------|----------|-------|
```

### Step 4: Cross-Check Against Implementation Plan and the Assertion Table

After creating the future state document, do a quick cross-check:

- For every exit criteria item in every phase of the implementation plan, is there a corresponding verification check in the Future State Verification Checklist?
- For every contract listed in the plan's "Contracts This Plan Satisfies" table, is there a Contract Compliance section in this document?
- For every seam in the plan's "Seams This Plan Advances" table, is there a Seam Compliance section?
- **Assertion-table parity:** every item in the Future State Verification Checklist has exactly one row in the `Verification Assertions` table with a matching id, and every assertion row has a checklist item. No checklist item without an assertion; no assertion without a checklist item. Ids are unique. Every assertion row has a non-empty `claim` and `verification-criteria`.
- **Proof coverage:** every assertion row has a `proof`. Count the `none-yet` rows — each is a coverage gap. A contract or seam-producer assertion whose claim is plainly machine-checkable should NOT be `none-yet`; name the test the implementation phase will produce (or add writing it to the phase plan). `manual-evidence` is acceptable only where the claim truly needs out-of-session evidence. If more than a couple of contract/seam assertions are `none-yet`, that is a signal the phase plan is under-specifying tests — surface it.

If any are missing, add them. The future state document, its assertion table, and the implementation plan's exit criteria must be consistent.

### Step 5: Update TOPOLOGY-CLAUDE.md

Update the categories table:

```
| N | <Category Name> | `categories/<slug>/` | Future State Documented |
```

### Step 6: Report Completion

```
## topology-future-state Complete

**Category:** <title>
**Project:** <project-name>
**Output:** {PROJECTS_ACTIVE_DIR}/<project-name>/categories/<slug>/FUTURE-STATE.md

### Verification Assertions (the work-list topology-verify will consume)
- contract: <N>
- seam-producer: <N>
- seam-consumer: <N>
- regression: <N>
- Total assertions: <N>

### Proof coverage (fact-first)
- Fact-backed (`test`/`property`/`lockdown`): <N>/<N>
- `manual-evidence` (out-of-session, deferral-bound): <N>
- `none-yet` (COVERAGE GAP — documented but not yet enforceable): <N>
  <list the none-yet ids; flag any contract/seam-producer rows here as candidates to convert before implementation>

### Cross-Check Result
- Plan exit criteria covered: <N>/<N>
- Contracts covered: <N>/<N>
- Seams covered: <N>/<N>
- Checklist ↔ assertion-table parity: OK | <N> mismatches fixed

### Deferred Items: <N>
<List any deferred items that other categories should know about>

### Next Steps
Begin implementation: /topology-implement <project-name> <category-slug>
```

---

## Important Notes

- **Written before implementation — always** — this document's value is that it was written before the code was changed. If it is written after implementation, it becomes a rationalization document, not a specification document. The date matters.
- **The Verification Assertions section is the topology-verify contract** — `topology-verify` Step 1 reads this table as its assertion set and runs one finder per row, then an N-skeptic refutation panel per Pass. If a row is vague, the finder cannot return a clean `FINDING` and the panel has nothing crisp to refute. Treat each row as the spec for one finder. Keep the list flat and enumerable — no nesting, no prose paragraphs in cells.
- **Assertions must be verifiable** — every item in the verification checklist and every assertion row must be checkable with a binary yes/no, with `verification-criteria` naming the file/line evidence that constitutes a Pass. "Works correctly" is not verifiable. "Component X is the only writer to data store Y" is verifiable.
- **A verifiable claim deserves a `proof`, not just a `verification-criteria`** — the prose criteria is a prediction about how a verifier will read the code; the `proof` (a named test/property/lockdown) is the fact a machine runs. They are not redundant: keep the prose for humans, name the test for the machine. The honest end state is `none-yet` count → 0 for all contract/seam-producer assertions whose claims are machine-checkable. Treat a high `none-yet` count as a backlog, not a pass.
- **Match the FINDING schema vocabulary** — `kind` must be one of `contract | seam-producer | seam-consumer | regression` (the workflow adds `doc-coverage` itself). Using off-schema kinds breaks the lift into `args.assertions`.
- **Removals are as important as additions** — documenting what this category no longer does prevents the old behavior from being treated as a regression during verify. Where a removal must be *proven* gone, add a regression-style assertion that asserts its absence.
- **No implementation surprises should change this document silently** — if implementation discovers that a future state assertion is incorrect, a Decision Log entry must be written explaining why, and this document (and its assertion table) is then amended. Silently changing it defeats its purpose.
- **This is design synthesis, not orchestration** — the optional per-seam drafting fan-out is a convenience only. The deliverable that matters is a correct, enumerable assertion table. Do not force a Workflow where a focused design pass is the right tool.

$ARGUMENTS
