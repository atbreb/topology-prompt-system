# topology-verify

Post-implementation verification for one category. Checks every assertion in the Future State document against the actual codebase. Verifies all seam contracts this category participates in — both sides. Updates the Verification Table with confirmed results. A category is not complete until every cell in its row is green.

> **See `{COMMANDS_DIR}/topology-PRINCIPLES.md` for the design discipline behind this skill.** In particular: producer/consumer bilateral discipline (failure mode #3 — producer breaks consumer); the "Consumer Expectations" check in Step 4; the evidence-deferral DL pattern (named exception, not a discipline-skip); and the **"Facts over prose"** doctrine: a spec is a prediction about a model — only an executable assertion survives a model upgrade, so a ✓ must be backed by an exit code, not an LLM vote.

## Usage

```
/topology-verify <project-name> <category-slug>
/topology-verify <project-name> <category-slug> --skeptics <N>     # override refutation panel size (default 3)
/topology-verify <project-name> <category-slug> --resume <runId>   # resume after a deferral/HITL was resolved
```

### Arguments

- `<project-name>` — the project directory name under `{PROJECTS_ACTIVE_DIR}/`
- `<category-slug>` — the category to verify

### Flags

- `--skeptics <N>` — refutation panel size per Pass finding (default 3; minority-refute survives). Budget-scaled: if the user set a token target, the default rises.
- `--resume <runId>` — re-invoke the verification workflow from a prior run; completed finders/skeptics return cached, only newly-unblocked work re-runs.

---

## Prerequisites

- [ ] All implementation phases are Complete (check runbook statuses)
- [ ] `categories/<category-slug>/FUTURE-STATE.md` exists
- [ ] `categories/<category-slug>/CURRENT-STATE.md` exists (baseline for regression check)
- [ ] `CONTRACT-SHEET.md` exists
- [ ] `SYSTEM-TOPOLOGY.md` exists

If implementation phases are not all Complete, stop and report:

> Not all implementation phases are complete. Run `/topology-implement <project-name> <category-slug>` to advance.

---

## Instructions

### Step 1: Assemble the Assertion Set

Read `FUTURE-STATE.md`, `CONTRACT-SHEET.md`, `SYSTEM-TOPOLOGY.md`, and all phase runbooks in `implementation/phase-N/PHASE-N-RUNBOOK.md`. Build the flat list of things to verify. **Carry each assertion's `proof` column through** — it determines whether verification is fact-first (executable) or prose-read (fallback).

Each work-list item has the shape `{id, kind, claim, criteria, proof, files}` where `proof = {kind: 'test'|'property'|'lockdown'|'manual-evidence'|'none-yet', ref}`, parsed from the FUTURE-STATE `proof` cell (e.g. `test:path/to/foo_test.go::TestBar`).

- **Contract assertions** — one per verification criterion of every contract this category governs (from `CONTRACT-SHEET.md`).
- **Seam-producer assertions** — one per producer guarantee for every seam this category produces (from `SYSTEM-TOPOLOGY.md`).
- **Seam-consumer assertions** — one per consumer dependency + the documented **Consumer Expectations** for every seam this category consumes. If a seam predates the Consumer-Expectations field, flag it as legacy — producer-only check + a recommended Decision Log entry to backfill.
- **Regression assertions** — one per Pass behavior in `CURRENT-STATE.md` that this rebuild must preserve.
- **Doc-coverage assertion** — one soft check that `APP-DOC-IMPACT.md` covers user-facing changes (non-blocking; `proof: none-yet` by nature).

If FUTURE-STATE predates the `proof` column, default every assertion to `{kind:'none-yet'}` — verification degrades gracefully to the prose-read path, and the coverage-gap backlog then lists every assertion (which is the honest state: nothing is fact-backed yet).

Emit the count: `Verifying <category>: <C> contract, <P> producer, <K> consumer, <R> regression assertions — <F> fact-backed, <M> manual-evidence, <U> none-yet (coverage gaps).`

---

### Step 2: Verify Each Assertion (Prose-Mode Path and Workflow-Mode Path)

#### 2a — Prose-mode path (default, no Workflow tool required)

For each assertion in the work-list, work through the steps below in sequence.

**Fact-first determination by proof kind:**

- **`test` / `property` / `lockdown`** — Run the named proof (e.g. `{TEST_COMMAND} -- -t "TestName"` or the language-equivalent). The **exit code is the verdict**: 0 → Pass, non-zero → Fail. Set `proof.ran=true` and `proof.exitCode`. Then open the test body and confirm it actually asserts the claim — if the named test does not exist, does not run, or asserts nothing relevant, return Fail with a note that the proof is missing or vacuous. Do NOT treat a missing test as Pass.
- **`manual-evidence`** — Do not run or fabricate anything. Return `Uncertain` with a precise description of the out-of-session check required; it routes to evidence-deferral (Step 4).
- **`none-yet`** — No executable proof exists. Read the code and judge by `file:line`. A Pass here is **provisional** — it will face the refutation panel and be logged as a coverage gap.

**Adversarial refutation for Pass findings:**

- **Fact-backed Pass** (exit code 0): one narrow coverage check — does the proof actually exercise the claim, or is it vacuous / asserting the wrong thing? Read the test body. Reject the Pass only if the test does not cover the claim.
- **Prose-only Pass** (`none-yet`): full N-skeptic refutation panel. Each skeptic reads the code independently with a distinct lens (`correctness`, `seam-bilateral`, `regression`, `edge-case`). A Pass survives if fewer than half the skeptics refute it (minority-refute rule). A downgraded prose-only Pass is logged in the coverage-gap backlog.
- **Fail / Uncertain**: pass through untouched.

**Binary verdicts:**

For each assertion type:
- Contract criterion: **Pass** or **Fail**. Evidence required for both.
- Seam producer guarantee: **Honored** or **Violated**. Evidence required.
- Seam consumer dependency: **Safe** or **Over-reliant**. Evidence required.
- Regression: **No regression** or **Regressed**. Evidence required.

If a criterion cannot be verified programmatically, document it as requiring manual verification with precise instructions.

#### 2b — Workflow-mode path (opt-in when Workflow tool is available)

If the Workflow tool is available and you are running `/topology-verify`, invoking the command is the explicit opt-in. Author the script below (filling the assertion set into `args`) and call the Workflow tool. The workflow runs finders and skeptics in parallel via `pipeline()`, returns schema-validated `FINDING[]`, and performs no git mutation or document writes — all document updates and commits happen in the main loop (Steps 3–8) where the full picture is visible.

```js
export const meta = {
  name: 'topology-verify',
  description: 'Verify one category: find evidence per assertion, then adversarially refute every Pass',
  phases: [
    { title: 'Find',   detail: 'one agent gathers evidence per assertion' },
    { title: 'Refute', detail: 'N skeptics try to refute each Pass finding' },
  ],
}

// --- schema library (copy from topology-PRINCIPLES Part II) ---
const FINDING = { type:'object', required:['id','kind','claim','verdict','evidence','proof'], properties:{
  id:{type:'string'}, kind:{enum:['contract','seam-producer','seam-consumer','regression','doc-coverage']},
  claim:{type:'string'}, verdict:{enum:['Pass','Fail','Uncertain']}, evidence:{type:'string'},
  proof:{ type:'object', required:['kind'], properties:{
    kind:{enum:['test','property','lockdown','manual-evidence','none-yet']},
    ref:{type:'string'}, ran:{type:'boolean'}, exitCode:{type:'integer'} }},
  severity:{enum:['critical','high','medium','low','none']}, notes:{type:'string'} }}
const VERDICT = { type:'object', required:['refuted','reasoning'], properties:{
  refuted:{type:'boolean'}, reasoning:{type:'string'}, counterEvidence:{type:'string'}, lens:{type:'string'} }}

const { project, category, assertions, skeptics } = args
// assertions: [{id, kind, claim, criteria, proof:{kind,ref}, files}]
const LENSES = ['correctness', 'seam-bilateral', 'regression', 'edge-case']
const EXECUTABLE = new Set(['test', 'property', 'lockdown'])

phase('Find')
const results = await pipeline(
  assertions,
  // Stage 1 — establish the verdict.
  // FACT-FIRST: if the assertion names an executable proof, RUN it and let the exit code decide.
  // Only `none-yet` falls back to code-reading. `manual-evidence` defers.
  a => agent(
    `You are verifying ONE assertion for topology category "${category}" (project ${project}).\n` +
    `Assertion ${a.id} (${a.kind}): ${a.claim}\n` +
    `Verification criteria (human spec): ${a.criteria}\n` +
    `Proof: kind=${a.proof?.kind || 'none-yet'} ref=${a.proof?.ref || '(none)'}\n` +
    `Likely files: ${(a.files||[]).join(', ') || 'discover them'}\n\n` +
    `Decide the verdict by proof kind:\n` +
    `• test | property | lockdown: RUN the named proof. Set proof.ran=true and proof.exitCode. ` +
      `EXIT CODE is the verdict: 0 → Pass, non-zero → Fail. evidence = exact command + pass/fail summary. ` +
      `Then open the test body and confirm it asserts the claim — if the test does not exist, ` +
      `does not run, or asserts nothing relevant, return Fail (proof.ran=false). ` +
      `Do NOT silently treat a missing test as Pass.\n` +
    `• manual-evidence: do NOT run or fabricate. Return verdict=Uncertain, proof.ran=false; ` +
      `evidence = exactly which out-of-session check is required.\n` +
    `• none-yet: read the code and judge by file:line. Return Pass/Fail with file:line evidence. ` +
      `A Pass here is PROVISIONAL — it will face the refutation panel and be logged as a coverage gap.\n`,
    { label: `find:${a.id}`, phase: 'Find', schema: FINDING, agentType: 'Explore' }
  ),
  // Stage 2 — challenge the Pass.
  // A green executable fact gets ONE narrow coverage check.
  // A prose-only (none-yet) Pass gets the full N-skeptic refutation panel.
  // Fails / Uncertain pass through untouched.
  (finding, a) => {
    if (!finding || finding.verdict !== 'Pass') return finding
    const factBacked = finding.proof && EXECUTABLE.has(finding.proof.kind)
                       && finding.proof.ran && finding.proof.exitCode === 0
    if (factBacked) {
      return agent(
        `A claim is backed by a GREEN executable proof. Do NOT re-judge code correctness — the exit code settled that.\n` +
        `Your ONLY job: does the proof actually EXERCISE this claim, or is it vacuous / asserting the wrong thing?\n` +
        `Claim (${finding.id}): ${finding.claim}\nProof: ${finding.proof.ref}\nEvidence: ${finding.evidence}\n` +
        `Read the test body. Return VERDICT — refuted=true ONLY if the test does not cover the claim.`,
        { label: `cover:${finding.id}`, phase: 'Refute', schema: VERDICT, agentType: 'Explore' }
      ).then(v => ({
        ...finding,
        verdict: (v && v.refuted) ? 'Fail' : 'Pass',
        notes: (v && v.refuted)
          ? `FACT REJECTED: green proof does not cover the claim — ${v.reasoning}`
          : `Fact-backed (green ${finding.proof.kind}: ${finding.proof.ref}, exit 0); coverage confirmed.`,
        panel: v ? [v] : [],
      }))
    }
    // Prose-only Pass — full adversarial panel.
    const panel = Array.from({ length: skeptics }, (_, i) => () =>
      agent(
        `Adversarially REFUTE this verification claim. It is backed ONLY by code-reading, NOT an executable test — be especially skeptical.\n` +
        `Claim (${finding.id}): ${finding.claim}\n` +
        `Evidence offered: ${finding.evidence}\n` +
        `Apply the "${LENSES[i % LENSES.length]}" lens. For seam claims, check BOTH producer guarantee and consumer expectation.\n` +
        `Read the code yourself — do not trust the offered evidence. Return a VERDICT.`,
        { label: `refute:${finding.id}#${i}`, phase: 'Refute', schema: VERDICT, agentType: 'Explore' }
      )
    )
    return parallel(panel).then(votes => {
      const valid = votes.filter(Boolean)
      const refuteCount = valid.filter(v => v.refuted).length
      const survives = refuteCount < Math.ceil(valid.length / 2)
      return {
        ...finding,
        verdict: survives ? 'Pass' : 'Fail',
        notes: survives
          ? `Survived ${valid.length}-skeptic panel (${refuteCount} refuted) — PROSE-ONLY. COVERAGE GAP: write a fact for ${finding.id}.`
          : `DOWNGRADED by panel: ${refuteCount}/${valid.length} refuted. ${valid.filter(v=>v.refuted).map(v=>v.lens+': '+v.reasoning).join(' | ')}`,
        panel: valid,
      }
    })
  }
)

return results.filter(Boolean)
```

Pass `args: { project, category, assertions, skeptics: (--skeptics || 3) }`.

**Resume after HITL or deferral resolution:** re-invoke with the same script and `resumeFromRunId: <runId>`. Completed finders/skeptics return cached; only newly-unblocked work re-runs. Record the `runId` from every workflow invocation in the completion report.

> **Why fact-first:** a verification criterion re-read by an LLM is a *sampled interpretation* — re-run it under a newer model and the verdict can change. Running the named proof makes the verdict a deterministic exit code that survives model upgrades. The panel is no longer the primary evidence; it is the safety net for the two cases an exit code can't cover — a prose-only (`none-yet`) Pass (full refutation) and a green-but-vacuous test (one coverage skeptic). The metric that matters is the **coverage-gap count trending to zero**.

---

### Step 3: Determine Verification Outcome

Compute the outcome from the findings:

**Full Pass** — Every contract criterion is Pass, every seam guarantee is Honored, every consumer dependency is Safe, no regressions found.

**Partial Pass** — Some items pass, some fail. Document precisely which items pass and which fail.

**Fail** — Critical items failing. Category is not complete.

---

### Step 4: Handle Uncertain Findings (Evidence-Deferral)

Every `manual-evidence` proof produces an `Uncertain` finding by design. For each `Uncertain` finding, apply the **evidence-deferral via DL** pattern from PRINCIPLES:

- If the criterion genuinely requires out-of-session tooling (a CLI not installed, live infrastructure, a multi-minute observation window, a real running process), draft a DL with completion criteria: (1) what criterion is deferred and why it's out-of-session; (2) where the functional property is or isn't independently knowable; (3) exact completion criteria for lifting the deferral (install command, run command, expected output, evidence file path); (4) affects + no-blockers list confirming downstream categories aren't gated on this housekeeping.
- Do not block the category's Verified ✓ on evidence housekeeping. When flipping a cell to ✓ under a deferral, the VERIFICATION-REPORT must cross-reference the DL and TOPOLOGY-CLAUDE must note `Verified ✓ (with DL-XXX — <criterion> deferred)`.
- If it is just under-investigated, re-run that finder (with `--resume` if in Workflow mode) after pointing it at the right files. Do not mark Uncertain as Pass.

---

### Step 5: Create VERIFICATION-REPORT.md

```markdown
# <Category Title> — Verification Report

**Project:** <project-name>
**Category:** <category-slug>
**Verified:** <date>
**Outcome:** Full Pass | Partial Pass | Fail

---

## Summary

**Contract compliance:** <N>/<N> criteria passing
**Seam compliance (producer):** <N>/<N> guarantees honored
**Seam compliance (consumer):** <N>/<N> dependencies safe
**Regressions found:** <N>

**Proof basis (fact-first signal):**
- Fact-backed Passes (green executable proof, reproducible): <N>/<N>
- Prose-only Passes (no executable proof — coverage gaps): <N>
- Deferred (manual-evidence → DL): <N>

**Overall: VERIFIED | PARTIAL | FAILED**

---

## Contract Compliance Results

### Contract <N> — <Title>

**Result:** Pass | Fail

| Criterion | Result | Evidence | Proof basis |
|-----------|--------|----------|-------------|
| <criterion text> | Pass/Fail | `file:line` — <what was found> | fact-backed / prose-only / deferred |

---

## Seam Compliance Results

### Seam <N> — Producer Side

**Result:** Fully Honored | Partially Honored | Violated

| Guarantee | Result | Evidence | Proof basis |
|-----------|--------|----------|-------------|
| <guarantee text> | Honored/Violated | `file:line` — <what was found> | fact-backed / prose-only / deferred |

**Failure behavior verified:**
- [ ] Serialization failure produces typed ERROR event (not silent drop): Pass | Fail | N/A

### Seam <N> — Consumer Side

**Result:** Safe | Over-reliant

| Dependency | Result | Evidence | Proof basis |
|------------|--------|----------|-------------|
| <dependency> | Safe/Over-reliant | `file:line` — <what was found> | fact-backed / prose-only / deferred |

---

## Regression Check Results

**Baseline behaviors verified:** <N>/<N>

| Behavior | Result | Notes |
|----------|--------|-------|
| <behavior from CURRENT-STATE.md> | No regression / Regressed | <details> |

---

## Failing Items

<Only if outcome is Partial Pass or Fail>

| Item | Type | Contract/Seam | Description | Recommended Fix |
|------|------|--------------|-------------|----------------|
| <ID> | Contract/Seam/Regression | <ref> | <what's wrong> | <how to fix> |

---

## Items Requiring Manual Verification

<Any items that could not be checked programmatically>

| Item | Type | Manual Check Instructions |
|------|------|--------------------------|
| <item> | <type> | <precise instructions for human reviewer> |

---

## Coverage-Gap Backlog

<Every none-yet assertion — the actionable "facts to write" list>

| Assertion ID | Claim | Suggested proof kind | Likely test path |
|---|---|---|---|
| <id> | <claim> | test / property / lockdown | <suggested path> |

A Full Pass category with all-prose-only Passes has documented its contracts but not enforced them.
This backlog is the per-category migration path toward enforced (fact-backed) verification.

---

## Deferred Items

<Anything discovered during verification that was not part of this category's scope>
```

**Tag every Pass by how it was proven** — this is the fact-first signal:
- **Fact-backed** — a green `test`/`property`/`lockdown` (cite `proof.ref` + `exit 0`). Reproducible across model upgrades.
- **Prose-only** — a `none-yet` Pass that survived the panel. Real today, unenforced. Appears in Coverage-Gap Backlog.
- **Deferred** — a `manual-evidence`/Uncertain finding bound to a DL.

For downgraded findings, include the panel's refutation reasoning in the Failing Items table — that reasoning is the remediation hint.

---

### Step 6: Update VERIFICATION-TABLE.md

Update every cell in this category's row:

- **Full Pass:** All applicable cells → `✓`
- **Partial Pass:** Passing cells → `✓`, failing cells → `✗ (see report)`
- **Fail:** All cells → `✗ (see report)`

For seam cells: only mark `✓` if BOTH the producer guarantee AND consumer dependency checks passed for that seam. If only one side was verified (neighboring category not yet implemented), mark `⏳ (one side verified)`.

**Annotate the proof basis in the cell note:** a fact-backed Pass → `✓` (note: `fact: <proof.ref>`); a prose-only Pass → `✓` with note `prose — no executable proof (coverage gap)`. The glyph is the same `✓` (the assertion holds today), but the note preserves whether the ✓ is reproducible or sampled — so a later reader or promote step can tell enforced contracts from merely-documented ones.

---

### Step 7: Update Contract Sheet Verification Summary

For each contract that achieved Full Pass compliance in this category, update the Verification Summary table in `CONTRACT-SHEET.md`:

```
| C<N> — <title> | <categories> | Verified (in <category>) |
```

Note: A contract is fully verified only when ALL categories that govern it have passed. Update to "Verified" only when all governing categories have passing verification reports.

---

### Step 8: Update TOPOLOGY-CLAUDE.md

```
| N | <Category Name> | `categories/<slug>/` | Verified ✓ | (or) Failed — see report |
```

---

### Step 9: Commit Verified Category (Full Pass Only) — MANDATORY

**This step is not optional.** If the outcome is **Full Pass**, you MUST create a git commit before reporting completion. The completion report requires a commit hash — you cannot produce the report without it.

**Commit scope:** Stage only files that belong to this category's implementation:
- Modified source files (backend handlers, DB layer, frontend components, server actions)
- Topology documents for this category (`categories/<slug>/` directory)
- Updated foundation documents (`VERIFICATION-TABLE.md`, `TOPOLOGY-CLAUDE.md`, `CONTRACT-SHEET.md`)

**Commit message format:**
```
refactor(<scope>): <description of what the category achieved>

Topology: <project-name>/<category-slug> — Verified ✓
Contracts satisfied: C<N>, C<N>
Seams advanced: S<N>, S<N>
```

{{! example }}
```
refactor({EXAMPLE_CATEGORY_SLUG}): <description of what the category achieved>

Topology: {EXAMPLE_PROJECT_SLUG}/{EXAMPLE_CATEGORY_SLUG} — Verified ✓
Contracts satisfied: {EXAMPLE_CONTRACT}, C2
Seams advanced: {EXAMPLE_SEAM} (consumer), S7 (producer)
```

**Record the commit hash** — it is required in the completion report (Step 11).

This step is skipped for Partial Pass or Fail outcomes — unverified code should not be committed as a topology milestone.

---

### Step 10: Auto-Merge Verified Worktree (Full Pass Only)

If the outcome is **Full Pass** and the category was implemented in a worktree branch:

1. Check if a worktree branch exists: `git branch --list "{BRANCH_PREFIX}<project-name>/<category-slug>"`
2. If it exists and has commits ahead of the main branch, run `/topology-merge <project-name> <category-slug>` to merge it back
3. If the merge succeeds, report it in the completion output
4. If the merge has conflicts, report the conflicts but do NOT block verification — the category is still VERIFIED, the merge just needs manual conflict resolution

This step is skipped for Partial Pass or Fail outcomes (unverified code should not be merged).

---

### Step 11: Report Completion

**SELF-CHECK before reporting:** If outcome is Full Pass, confirm that Step 9 produced a commit. If no commit was made, STOP and go back to Step 9. Do not report completion without a commit hash for Full Pass outcomes.

```
## topology-verify Complete

**Category:** <title>
**Outcome:** VERIFIED | PARTIAL PASS | FAILED
**Commit:** <hash>   (Full Pass only — REQUIRED, not optional)
**Workflow runId:** <runId>   (if Workflow mode was used — for --resume)

### Results Summary
- Contracts: <N> Pass / <N> Fail / <N> Uncertain(deferred)
- Seam producer: <N> Honored / <N> Violated
- Seam consumer: <N> Safe / <N> Over-reliant
- Regressions: <N>
- Pass findings downgraded by refutation panel: <N>
- Fact-backed Passes rejected for vacuous coverage: <N>

### Proof basis (fact-first signal)
- Fact-backed Passes (green executable proof, reproducible): <N>/<N>
- Prose-only Passes (no executable proof — coverage gaps): <N>
- Deferred (manual-evidence → DL): <N>
- **Coverage-Gap Backlog: <N> facts to write** — see VERIFICATION-REPORT.md

### Verification Table Updated
<Show the updated row for this category>

<If Full Pass:>
### Category Complete ✓
<category> is fully verified. All contract and seam checks pass.

Run: /topology-integrate <project-name>
(if 2-3 categories have now verified since the last integration checkpoint)

<If Full Pass but coverage gaps > 0:>
Verified, but <N> contracts are prose-only — consider writing the backlog facts before promote
so the ✓ survives the next model upgrade.

<If Partial Pass or Fail:>
### Remediation Required
<N> items require fixes before this category can be marked complete.

Options:
1. Fix the failing items and re-run: /topology-verify <project-name> <category-slug>
2. If a fix requires amending a contract or seam: add a Decision Log entry first,
   then update CONTRACT-SHEET.md or SYSTEM-TOPOLOGY.md, then fix and re-run.

### Failing Items
<List from VERIFICATION-REPORT.md failing items table>
```

---

## Important Notes

- **topology-verify owns all seam validation** — this is the only command that marks seam cells in the Verification Table. `topology-implement` and `project-next-phase` track implementation progress, not verification.
- **The exit code is the verdict, not the LLM** — for any assertion with an executable proof (`test`/`property`/`lockdown`), the finder RUNS it and reports `proof.exitCode`; it does not vote on correctness. A ✓ minted from a green test is reproducible across model upgrades; a ✓ minted from an LLM reading prose is a sampled prediction. Never let a finder return Pass for an executable assertion without `proof.ran=true` and `proof.exitCode=0` — a missing or unrun test is a Fail, not a Pass.
- **Evidence is required for Pass, not just Fail** — for fact-backed assertions, the evidence *is* the command output + exit code; for prose-only assertions, it is enforced by the refutation panel. Saying something passes without pointing to the code is not verification.
- **A Pass that the panel downgrades is still valuable signal** — surface the downgrade count, but it applies only to prose-only (`none-yet`) Passes and vacuous-green-test rejections. If most assertions are fact-backed, the panel does little work — that is the goal. The metric that matters is the **coverage-gap count trending to zero**.
- **The coverage-gap backlog is an output, not a nuisance** — a Full-Pass category that is all prose-only has documented its contracts but enforced none of them. Converting the backlog (writing the test, then re-running verify so the same assertion becomes fact-backed) is how a project migrates from spec-heavy to facts-first.
- **One-sided seam verification** — if a seam's consumer category hasn't been implemented yet, you can verify the producer side only. Mark the cell `⏳ (producer verified)`. The cell only goes to `✓` when `topology-integrate` or the consumer category's `topology-verify` confirms the consumer side.
- **Contract amendments require a Decision Log entry first** — if a failing item reveals that a contract or seam was incorrectly specified, the fix path is: Decision Log entry → update foundation document → fix code → re-run topology-verify. Do not silently relax a constraint to make a check pass.
- **Failed categories block integration checkpoints** — `topology-integrate` will flag any seam where one endpoint is Verified and the other is Failed. Fix failures before running integration.
- **Evidence-deferral via DL pattern** — when a verification criterion requires out-of-session tooling (a CLI not installed, live production traffic, a real database instance with specific extensions, a multi-minute observation window, a running process against live infrastructure, etc.), defer the evidence capture via an explicit DL with **completion criteria**. Do not block the category's Verified ✓ on evidence housekeeping. The pattern is well-established: e.g. a cache-hit-rate metric deferred to a downstream integration verify; a process-kill/resume + persistence check deferred because it requires a real running process; a zero-retention guarantee deferred because it requires a vendor CLI not installed in this session. DL body template: (1) what criterion is deferred and why it's out-of-session; (2) where the functional property is or isn't independently knowable; (3) exact completion criteria for lifting the deferral (install command, run command, expected output, evidence file path); (4) affects + no-blockers list confirming downstream categories aren't gated on this housekeeping. When flipping a cell to ✓ under an evidence deferral, the VERIFICATION-REPORT must cross-reference the DL and TOPOLOGY-CLAUDE must note `Verified ✓ (with DL-XXX — <criterion> deferred)`.
- **The workflow does no git mutation and no doc writes** — it only returns findings. All commits, table updates, and report writing happen in the main loop (Steps 3–11) where the full picture is visible. This keeps the HITL boundary clean: the workflow surfaces, the main loop decides.
- **Resume over re-run** — after resolving a deferral or fixing one Fail, prefer `--resume <runId>` over a full re-verify; the unaffected findings return cached.
- **The reviewer runs before the ✓ (reviewer ≠ author)** — if the preceding `topology-implement` ran an independent read-only reviewer pass (Pre-Report Gate: Approve / Warning / Block), a reviewer Block must be resolved before verify runs. Fold the reviewer verdict into the VERIFICATION-REPORT context — it is the anti-self-review check one step earlier than the refutation panel.
- **Changing this skill is eval-gated** — `topology-verify` is a release-gating skill: any change to its prompt must hold `/topology-eval topology-verify` at GO (pass@k ≥ 0.90, pass^k = 1.00) before merging. Deterministic graders gate; model graders advise. The exit-code-is-the-verdict behavior described here is what the eval fixtures pin. Do not mutate the verification skill on vibes (see `topology-PRINCIPLES.md` § Eval-gating).

$ARGUMENTS
