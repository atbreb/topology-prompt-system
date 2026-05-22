# topology-PRINCIPLES

> Single source of truth for the design discipline behind every `topology-*` command. Each `topology-*` skill references this doc near the top. When you invoke any topology skill, you may load this once and treat its rules as in-force.

The five core skills that consume these principles directly are: `topology-discovery`, `topology-init`, `topology-phase-plan`, `topology-implement`, `topology-verify`. Support skills (`topology-status`, `topology-decide`, `topology-patch`, `topology-merge`, etc.) honor the same discipline.

---

## The discipline in one paragraph

Topology projects rebuild systems by producing **contracts** (always-true facts), **seams** (producer→consumer boundaries with explicit guarantees), **decisions** (permanent records of choices), and **categories** (responsibility slices each owned by exactly one accountable area). Implementation runs phase-by-phase, each phase scoped tightly enough that an implementing agent — picking up the work cold — can load the right artifacts in the right order, write code against firm contracts, and verify against pre-written assertions without re-deriving any decision that is already firm.

---

## Categories are responsibility slices, not phase slices

A category answers exactly one question: **what is this slice the sole owner of?** Categories cross-cut phases — a single phase may touch several categories, and a single category may ship across several phases. Two categories that share a responsibility should merge; one category with two responsibilities should split.

Phases run in dependency order; categories run in responsibility order. Don't conflate them. The phase axis answers *when*; the category axis answers *who owns*.

The right number of categories for most rebuilds is 5–10. Fewer than 5 means responsibilities are blurred together; more than 10 means the system has been over-sliced and the agent will spend too much load on cross-category navigation.

---

## The five failure modes (and the smallest fix for each)

These are the patterns that derail implementing agents. Every topology skill is engineered to mitigate at least one of these failure modes; if a skill change weakens any of them, that change is wrong.

### 1. Context overload — agent loads everything, makes generic choices

Every category has a **Decisions in scope** section in its `categories/<slug>/CLAUDE.md` listing only the DL-IDs that constrain THIS category. Project-wide DECISION-LOG.md is the canonical register; per-category CLAUDE.md is the *filtered view* the implementer loads first.

### 2. Cross-cutting concerns scattered — agent edits X, breaks Y

Every category's `categories/<slug>/CLAUDE.md` has a **Cross-category touchpoints** section naming each seam this category participates in + the adjacent category to consult before changing the producer side. The agent doesn't have to read every other category's docs — only the ones at touchpoints they're modifying.

### 3. Producer breaks consumer — silent contract violations

Every seam in `SYSTEM-TOPOLOGY.md` has both a **Producer Guarantees** section and a **Consumer Expectations** section. Before changing a producer, the implementer reads consumer expectations. `topology-verify` Step 4 cross-checks both sides. The CONSUMER side of a seam is as load-bearing as the PRODUCER side — half-bilateral seam definitions are anti-pattern.

### 4. Phase-context loss — agent loads category but doesn't know what's in scope this phase

`topology-implement` Step 2.7 (context loadout) is a structured pre-load checklist. Before plan-mode, the implementer has explicitly loaded: the umbrella TOPOLOGY-CLAUDE, the category CLAUDE.md, the DLs cited in this phase's row, adjacent-category CLAUDEs at touchpoints, the VERIFICATION-TABLE row, the phase session prompt + runbook. The checklist is the leadership signal — it tells the agent exactly which docs to load and in what order.

### 5. Decision relitigation — agent reaches a fork that's already been settled

`DECISION-LOG.md` is loaded into every implementer's context at phase boundary. Reopening a firm decision requires explicit `**Reopened YYYY-MM-DD:**` annotation + status flip + re-ratification. Implementer's pre-flight (Step 2.7): "Have I checked decisions for this seam, this category, this phase?"

---

## The implementer's pre-flight context loadout

This is the canonical checklist `topology-implement` Step 2.7 enforces. Every phase boundary loads this in order; nothing else gets loaded by default until plan-mode requires it.

```
1. {PROJECTS_ACTIVE_DIR}/<project>/TOPOLOGY-CLAUDE.md
   (umbrella: which categories exist, current state, parallel groups)

2. {PROJECTS_ACTIVE_DIR}/<project>/categories/<slug>/CLAUDE.md
   (responsibility + decisions in scope + cross-category touchpoints)

3. {PROJECTS_ACTIVE_DIR}/<project>/DECISION-LOG.md
   — entries cited in this phase's "Decisions" column only
   (skip the rest of the register; the category CLAUDE narrowed it)

4. Adjacent categories' CLAUDE.md
   — only those at seams this phase touches

5. {PROJECTS_ACTIVE_DIR}/<project>/VERIFICATION-TABLE.md
   — this category's row + the seam columns this phase advances

6. {PROJECTS_ACTIVE_DIR}/<project>/categories/<slug>/implementation/
   phase-N/PHASE-N-SESSION-PROMPT.md
   {PROJECTS_ACTIVE_DIR}/<project>/categories/<slug>/implementation/
   phase-N/PHASE-N-RUNBOOK.md
```

Loading more than this on entry is over-eager — wait until plan-mode surfaces the specific files plan-mode needs. Loading less is under-prepared — the agent will guess at constraints that are already settled.

---

## Foundation document mutation discipline

- **CONTRACT-SHEET.md and SYSTEM-TOPOLOGY.md** — append-only after `topology-init`. Amendments go through `DECISION-LOG.md` entries that reference the contract or seam being updated.
- **DECISION-LOG.md** — append-only forever. Reopening a decision requires a new entry with `**Reopened YYYY-MM-DD:**` annotation; the original entry stays.
- **VERIFICATION-TABLE.md** — updated by commands (`topology-implement` flips cells to `⏳`, `topology-verify` flips to `✓` or `✗`). Manual edits are anti-pattern.
- **categories/<slug>/CLAUDE.md** — created by `topology-init` Step 3.5, augmented by subsequent commands. Re-running `topology-init` does not overwrite if the file exists.

---

## When discipline trades against pragmatism

Two well-known carve-outs:

**Evidence-deferral via DL pattern** (`topology-verify` Important Notes): when a verification criterion requires out-of-session tooling (CLI not installed, live production traffic, multi-minute observation window), defer evidence capture via an explicit DL with completion criteria. Do NOT block category Verified ✓ on evidence housekeeping. Cross-reference the DL in the VERIFICATION-REPORT and TOPOLOGY-CLAUDE status.

**Live patch → durable code** (`topology-implement` Important Notes): when diagnosing a runtime gap, a temporary live patch (curl PUT, manual SQL UPDATE) is often the fastest path to "this is the shape that works." But the live patch is fragile — the next sync wipes it. Before declaring the finding verified, land the fix in the code-side path that produces the patch durably, in the same commit as the evidence.

Both patterns trade textbook strictness for end-to-end pragmatism. They are NOT excuses to skip discipline — they are explicit, named exceptions with documented rules.

---

## Anti-patterns to refuse

- **Slim-mirror `implementation/CLAUDE.md`** — substituting a hand-written CLAUDE.md mirror for `project-prep-scaffolding` output. `topology-phase-plan` Step 4 is non-skippable. Halt rather than substitute.
- **Retroactive scaffolding back-fill** — when a category shipped phases under a pre-tightening looser regime, override the gate without back-fill; apply strict rules prospectively only.
- **Skipping topology-verify, marking cells `✓` from implement** — implement marks `⏳`; only verify marks `✓`. The distinction is load-bearing.
- **Half-migrated seams** — if a phase modifies a seam boundary, both producer and consumer ship in the same phase. Half-migrated seams are worse than unmigrated ones.
- **Silent contract relaxation to make a verify pass** — if a failing verify reveals a contract was wrong, fix path is: Decision Log entry → update CONTRACT-SHEET → fix code → re-run verify. Do not relax silently.

---

## How this doc relates to each skill

| Skill | What it consumes from here |
|---|---|
| `topology-discovery` | Responsibility-aligned framing (§ Categories are responsibility slices); five failure modes inform the per-category and per-seam interview fields |
| `topology-init` | Foundation document mutation discipline; category CLAUDE.md template responds to failure modes 1, 2, 4 |
| `topology-phase-plan` | Failure mode 5 informs the Decisions column on phase tables; foundation mutation discipline informs append-only Decision Log |
| `topology-implement` | Implementer pre-flight context loadout (§) is the canonical Step 2.7 checklist; failure modes 4 + 5 are the load-bearing motivations |
| `topology-verify` | Producer/consumer bilateral discipline (§ failure mode 3); consumer-expectations field; evidence-deferral pattern |

When updating any topology skill, check this doc first. If a proposed change weakens any failure-mode mitigation, the change is wrong. If a proposed change strengthens a mitigation but contradicts another principle here, update this doc first to reflect the new principle, then update the skill.

---

## Versioning

- **v1** (2026-05-07) — Initial principles doc. Authored as part of the OpenClaw rework + topology-skill-tightening session. Based on the existing topology-* skills + 5-failure-mode analysis. Replaces no prior doc.
