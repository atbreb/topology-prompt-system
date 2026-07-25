# topology-discovery

Conduct a structured discovery interview to produce a context document ready for `topology-init`. Targets the interview at what the topology system actually needs — system boundaries, category responsibilities, known seams, problem areas, and decisions already made. When source material already exists, reads it first and interviews only against the gaps.

In **Workflow mode** (opt-in, invoked by passing `--sweep` or by setting `USE_SUBAGENTS=true`), the interview is followed by an **exhaustive multi-modal enumeration sweep**: parallel finder agents search the codebase along independent modalities and loop until a completeness critic finds nothing new. This directly targets the recurring miss where a single-pass code search overlooked operational methods and scope expanded late into a build.

> **See `{COMMANDS_DIR}/topology-PRINCIPLES.md` for the design discipline behind this skill.** In particular: categories are responsibility slices (not phase slices); the five failure modes inform the per-category and per-seam interview fields below.

## Usage

```
/topology-discovery <project-name>
/topology-discovery <project-name> --from-file <path>
/topology-discovery <project-name> --from-dir <path>
/topology-discovery <project-name> --from-file <path> --from-dir <path>
/topology-discovery <project-name> --target <service-or-package>   # focuses the sweep on a specific surface
/topology-discovery <project-name> --sweep                         # opt-in to Workflow enumeration sweep
```

### Arguments

- `<project-name>` — slug for the output file and eventual project directory
- `--from-file <path>` — a single existing document (architecture doc, scratch notes, prior plan) to read before interviewing
- `--from-dir <path>` — a directory of existing documents to read before interviewing
- `--target <name>` — optional sweep focus: a service, package, or API surface whose scope must be enumerated exhaustively (the kill/decommission case); implies `--sweep`
- `--sweep` — opt-in to the Workflow-based multi-modal enumeration sweep after the interview
- No flags — interview-only mode (no Workflow invocation)

---

## Output

```
{SCRATCH_DIR}/topology-discovery-<project-name>.md
```

This file is structured specifically for `topology-init` consumption. Hand it directly to:

```
/topology-init <project-name> --from-doc {SCRATCH_DIR}/topology-discovery-<project-name>.md
```

---

## Instructions

### Step 0: Check E2E Projects for Overlap

Before reading source material or starting the interview, scan `{PROJECTS_E2E_DIR}/` for semantically related projects. E2E projects contain verified architectural work (contracts, seams, decisions, topology docs) that will be promoted to canonical topology docs upon completion. They represent the most current understanding of their covered systems.

1. List all directories in `{PROJECTS_E2E_DIR}/`
2. For each, read `TOPOLOGY-CLAUDE.md` (summary + category list) to check for semantic overlap with `<project-name>`
3. If overlap exists:
   - Read the relevant category docs (CURRENT-STATE, FUTURE-STATE, VERIFICATION-REPORT) from the e2e project
   - Treat verified findings as established context — do not re-interview what's already been analyzed and verified
   - Note the overlap in the discovery output so `topology-init` inherits it
   - Flag any areas where the new project extends or diverges from the e2e project's scope

If no e2e projects overlap, proceed normally.

---

### Step 1: Read Any Provided Source Material

If `--from-file` or `--from-dir` is provided, read all files before asking a single question.

For each file, extract and note:
- System or component names that appear
- Any explicit responsibilities or boundaries described
- Any integrations or data flows between components
- Any known problems, drift, or technical debt called out
- Any architectural decisions documented
- Anything ambiguous, contradictory, or notably absent

Build a gap map: what `topology-init` needs that is NOT present or clear in the source material AND is not covered by overlapping e2e projects. The interview targets those gaps. Do not ask about things the source material or e2e projects already answer clearly.

If no source material is provided, all sections of the interview are in scope (minus any e2e overlap).

---

### Step 2: Open the Interview

Introduce what you're doing and why:

> I'm going to ask you a series of questions about the system we're about to rebuild. The goal is to produce a context document that `topology-init` can use to derive the contracts, seams, and categories for the project. The better this document is, the less correction the foundation documents will need after init.
>
> [If source material was provided:] I've read the files you pointed me to. I have a clear picture of [summarize what was covered]. I'll focus my questions on [summarize the gaps].
>
> I'll let you know when I have enough to write the document. Ready when you are.

---

### Step 3: Conduct the Interview

Work through the sections below. Skip any section that was fully covered by source material. Within each section, ask follow-up questions until you have enough to write a contract-quality statement — specific, unambiguous, and verifiable.

**Do not ask all questions at once.** Ask 1–2 at a time. Let the conversation breathe. Follow the thread before moving to the next section.

This is pure main-loop conversation — never run it inside a workflow. The interview's job is to capture intent the codebase can't tell you.

---

#### Section A — System Overview

*Goal: understand what the system does and what the rebuild is trying to fix.*

- What is this system responsible for? What does it own end-to-end?
- What is broken, drifting, or not working the way it should right now?
- What triggered the decision to do a rebuild rather than patch?
- Are there parts of the system that are working well and should be preserved exactly?

---

#### Section B — Categories

*Goal: identify the discrete, coherent **responsibility slices** of the system.*

> **Categories are responsibility slices, not phase slices.** Each category answers: *what is this slice the sole owner of?* Phases cross-cut categories — a single phase may touch multiple categories, and a category may ship across multiple phases. Two categories that share a responsibility should merge; one category with two responsibilities should split. Aim for 5–10 categories; fewer means responsibilities are blurred, more means the system has been over-sliced.

- If you had to divide this system into 5–10 areas of **single-responsibility ownership**, what would they be?
- For each area: what does it own? What does it produce? What does it consume? **What is explicitly out of scope for it (what does NOT belong here)?**
- Are there any areas that are currently doing things they shouldn't be? (Responsibilities that have leaked from one area to another?)
- Are there any areas that overlap in ways that are causing problems?

For each category the person identifies, confirm:
- Its name (ask for a slug if they use a long description)
- Its single clearest responsibility in one sentence
- What is **out of scope** for this category — at least one explicit "don't try to solve X here; that lives in Y" statement
- Whether it's upstream, downstream, or peer to other categories

---

#### Section C — Seams

*Goal: identify the boundaries where categories hand things to each other.*

- Where does data or control cross from one area to another?
- For each crossing: what is passed? What does the producer commit to? What does the consumer depend on?
- Are there any boundaries that are currently implicit — where both sides just assume things work a certain way without a formal contract?
- Which of those implicit boundaries is causing the most problems right now?

For each seam identified, confirm:
- Producer category and consumer category
- What type or structure crosses the boundary (even if informal right now)
- Whether the current crossing is reliable or the source of known bugs/drift
- **What does the consumer break if the producer changes?** (consumer expectations — surfacing this now prevents producer-side changes that violate consumer assumptions later, the #3 failure mode in `topology-PRINCIPLES.md`)

---

#### Section D — Known Problems

*Goal: surface violations and drift so they become explicit gaps rather than surprises.*

- Where is the system currently violating its own intended design?
- Are there any features that work sometimes but not always?
- Are there parallel implementations of the same thing — two code paths that should be one?
- Are there any places where a failure is silently swallowed instead of surfaced?
- Are there billing, security, or data integrity concerns that exist today?

---

#### Section E — Decisions Already Made

*Goal: capture decisions that should not be reopened during the rebuild.*

- Are there architectural choices that are non-negotiable for this rebuild? (Technology choices, infrastructure constraints, external contracts)
- Are there things that were tried before and failed — that the rebuild should not repeat?
- Are there things that are explicitly out of scope for this project?

---

#### Section F — Completion Signal

When you have enough to populate every section of the output document without guessing, say:

> I have what I need to write the context document. Before I do — is there anything else about the system, the rebuild goals, or the constraints that you want captured that we haven't covered?

Wait for the response, incorporate anything new, then proceed to Step 4.

---

### Step 4: Run the Enumeration Sweep (Workflow — opt-in)

*Skip this step if `--sweep` was not passed and `--target` was not provided. Go directly to Step 5.*

After the interview gives you the conceptual map, verify and complete it against the actual codebase using a deterministic Workflow script. The interview captures intent; the sweep confirms and completes what the codebase actually contains.

**Why the sweep matters:** The recurring failure pattern is a single-pass code search that misses operational methods, background workers, event-bus subscriptions, or consumer callers — causing scope to expand late in the build when those omissions surface. Searching along multiple independent modalities and then asking a critic "what is still missing?" surfaces the long tail a single search cannot.

**Modalities:** Adapt these to your project's tech stack. Common modalities include:

| Tag | What to search |
|-----|---------------|
| `by-api-method` | Enumerate every method/endpoint on the target service's public interface (e.g., RPC definitions, REST routes, exported functions). Miss none — operational/admin/health methods count. |
| `by-handler` | Find every handler/controller/implementation that registers or responds to the above methods; map each to the responsibility it serves. |
| `by-consumer` | Find every caller/consumer of the target surface (other services, workers, frontend actions, scripts). For each, note what it depends on (consumer expectations). |
| `by-event` | Enumerate every event/message subject published or subscribed to in scope; each is a seam candidate. |
| `by-doc` | Scan inline docs, architecture notes, and schema migrations in scope for responsibilities and decisions not visible in code alone. |

Author a Workflow script and invoke it via the Workflow tool:

```js
export const meta = {
  name: 'topology-discovery-sweep',
  description: 'Exhaustively enumerate categories/seams/API methods/problems via multi-modal search until a critic finds nothing new',
  phases: [
    { title: 'Sweep',  detail: 'parallel finders, one per search modality' },
    { title: 'Critic', detail: 'completeness critic names what is still missing' },
  ],
}

// Shared schemas — copy verbatim; scripts are self-contained (no import)
const DISCOVERY_ITEM = {
  type: 'object', required: ['kind', 'name'], properties: {
    kind: { enum: ['category', 'seam', 'api-method', 'problem', 'decision', 'consumer-expectation'] },
    name: { type: 'string' },
    detail: { type: 'string' },
    foundVia: { type: 'string' },
    confidence: { enum: ['high', 'medium', 'low'] },
  },
}
const FINDINGS = {
  type: 'object', required: ['items'], properties: {
    items: { type: 'array', items: DISCOVERY_ITEM },
  },
}
const COMPLETENESS = {
  type: 'object', required: ['done', 'missing'], properties: {
    done: { type: 'boolean' },
    missing: { type: 'array', items: { type: 'string' } },
    rationale: { type: 'string' },
  },
}

// args.interviewMap: compact summary of categories/seams the human described in the interview
const { project, target, interviewMap } = args

// Define modalities — adapt tags and hints to the project's stack
const MODALITIES = [
  { tag: 'by-api-method', hint: 'Enumerate EVERY method/endpoint on the target service interface. Miss none — operational/admin/health methods count.' },
  { tag: 'by-handler',    hint: 'Find every handler/controller that implements or registers the above methods; map each to the responsibility it serves.' },
  { tag: 'by-consumer',   hint: 'Find every caller/consumer of the target surface (other services, workers, clients). For each, note what it depends on.' },
  { tag: 'by-event',      hint: 'Enumerate every event/message subject published/subscribed in scope; each is a seam candidate.' },
  { tag: 'by-doc',        hint: 'Scan inline docs, architecture notes, and schema migrations in scope for responsibilities/decisions not visible in code alone.' },
]

const seen = new Set()
const items = []
let dryRounds = 0, round = 0

// Budget guard: !budget.total covers the no-target case (remaining() is Infinity without a budget set)
const budgetOk = () => !budget.total || budget.remaining() > 60_000

while (dryRounds < 2 && budgetOk() && round < 6) {
  round++
  const known = items.map(i => `${i.kind}:${i.name}`).join('; ') || '(none yet)'

  phase('Sweep')
  const rounds = await parallel(MODALITIES.map(m => () =>
    agent(
      `Discovery sweep round ${round}, modality "${m.tag}", project ${project}` +
      `${target ? `, target surface: ${target}` : ''}.\n` +
      `${m.hint}\n` +
      `Already-known items (do NOT re-report these): ${known}\n` +
      `Interview map for context: ${interviewMap}\n` +
      `Return FINDINGS: only NEW items this modality surfaces, each with foundVia="${m.tag}" and a confidence.`,
      { label: `sweep:${m.tag}#${round}`, phase: 'Sweep', schema: FINDINGS, agentType: 'Explore' }
    )
  ))
  const fresh = rounds
    .filter(Boolean)
    .flatMap(r => r.items)
    .filter(i => {
      const k = `${i.kind}:${i.name}`
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })

  if (!fresh.length) { dryRounds++; log(`Round ${round}: dry (${dryRounds}/2).`); continue }
  dryRounds = 0
  items.push(...fresh)
  log(`Round ${round}: +${fresh.length} new (total ${items.length}).`)

  phase('Critic')
  const critique = await agent(
    `Completeness critic for project ${project}${target ? ` (target: ${target})` : ''}.\n` +
    `Enumerated so far:\n${items.map(i => `- ${i.kind}: ${i.name} (${i.foundVia})`).join('\n')}\n\n` +
    `What is MISSING? Name specific angles not yet covered: a method not mapped to a handler, a seam with no documented consumer expectation, a category in the interview map with no code evidence, a consumer not traced. ` +
    `Set done=true ONLY if you are confident the surface is fully enumerated.`,
    { label: `critic#${round}`, phase: 'Critic', schema: COMPLETENESS }
  )
  if (critique.done) { log(`Critic: complete after round ${round}.`); break }
  // critique.missing feeds next round implicitly as the known list grows; finders also see interviewMap
}

return { items, rounds: round, converged: dryRounds >= 2 || round < 6 }
```

Pass `args: { project, target, interviewMap }` (where `interviewMap` is a compact summary of the categories and seams the human described in the interview). Capture the structured result.

> **Budget-scaled:** if the user set a token target, `budget.remaining()` decreases and the loop gains more rounds before the budget guard fires. Without a target, `budget.total` is null and `remaining()` is Infinity — the `!budget.total` guard prevents an unbounded loop in that case. The `< 6` round cap and the dry-round counter are the no-silent-truncation guard: if it stops on the cap rather than convergence, `log()` says so and the completion report flags it.

> **`--target` makes the sweep authoritative for a kill/decommission.** For decommission projects, the enumerated API-method/consumer inventory IS the scope; the completeness critic is the guard against shipping a half-kill. Every method and every consumer must appear in the output doc.

---

### Step 5: Reconcile Sweep Against Interview (if sweep ran)

*Skip this step if the sweep was not run.*

Merge the sweep's `items` with the interview findings. The reconciliation is where the primary value lands:

- **Sweep found, interview didn't** → a category/seam/method the human didn't mention. Surface it explicitly: "the sweep found `<X>` — is this in scope, or explicitly out of scope?" This is where late scope blowup gets caught at discovery instead of mid-build.
- **Interview claimed, sweep didn't confirm** → flag as low-confidence or greenfield; note in the doc.
- **Both agree** → high confidence.

Confirm any sweep-vs-interview deltas with the user before proceeding to write the document.

---

### Step 6: Write the Context Document

Create `{SCRATCH_DIR}/topology-discovery-<project-name>.md`:

```markdown
# <Project Name> — Topology Discovery Context

**Generated by:** topology-discovery
**Date:** <date>
**Source material used:** <list files read, or "None — interview only">
**Enumeration sweep:** <ran N rounds, converged=true|false> or "Not run (interview-only mode)"

---

## System Overview

<2–4 sentences: what the system does, what it owns, why the rebuild is happening.>

## Rebuild Goals

<What success looks like. What problems must be solved. What must be preserved.>

## Out of Scope

<Explicit exclusions from this rebuild.>

---

## Categories

### <Category Name> (`<slug>`)

**Responsibility:** <one sentence; sole-ownership claim>
**Owns:** <what it owns>
**Produces:** <what it emits or returns>
**Consumes:** <what it depends on from others>
**Out of scope:** <at least one explicit "don't solve X here; lives in Y" statement>
**Current health:** <Working well / Has known problems / Source of drift / Greenfield (no current state)>
**Confidence:** <High (both interview + sweep) / Medium (one source) / Low (interview only, unconfirmed)>
**Notes:** <anything important from the interview>

[repeat for each category]

---

## Seams

### <Producer Category> → <Consumer Category>

**What crosses:** <type, structure, or description of what is passed>
**Producer currently commits to:** <what the producer actually guarantees today, even informally>
**Consumer currently depends on:** <what the consumer assumes today>
**Consumer breakage if producer changes:** <what specifically breaks on the consumer side if the producer alters the contract — drives the bilateral discipline in `topology-verify` Step 4>
**Is this boundary explicit today?** Yes / No
**Known problems at this boundary:** <description or "None">

[repeat for each seam]

---

## Known Problems and Drift

### <Problem Title>

**Affected categories:** <list>
**Description:** <what is wrong>
**Impact:** <what breaks or degrades because of this>
**Likely root cause:** <if known>

[repeat for each problem]

---

## Decisions Already Made

### <Decision Title>

**Decision:** <what was decided>
**Rationale:** <why — even if brief>
**Constraint this creates:** <what the rebuild must work within>

[repeat for each decision]

---

## Interview Notes

<Anything raised during the interview that doesn't fit cleanly into the above sections but should be visible to topology-init — ambiguities, open questions, areas flagged for human review after init.>

---

## Enumeration Sweep Appendix

{{! Include this section only if the sweep ran (--sweep or --target was passed) }}

**Sweep summary:** <N> rounds, converged=<true|false>, total items found: <N>

### Full Inventory (foundVia provenance)

| Kind | Name | foundVia | Confidence | Notes |
|------|------|----------|------------|-------|
| <kind> | <name> | <modality tag> | high/medium/low | <detail> |

### Sweep-vs-Interview Deltas (review before topology-init)

**Found by sweep, not mentioned in interview:**
- <item> — confirm in scope / explicitly out of scope

**Claimed in interview, not confirmed by sweep:**
- <item> — flagged low-confidence / greenfield
```

---

### Step 7: Report Completion

```
## topology-discovery Complete

**Output:** {SCRATCH_DIR}/topology-discovery-<project-name>.md

### Document Summary
- Categories identified: <N>
- Seams identified: <N>
- Known problems: <N>
- Decisions captured: <N>
- Open questions for human review: <N>

### Sweep (if run)
- Rounds: <N>, converged: <true|false>
- API methods / surface items enumerated: <N>
- Sweep-vs-interview deltas: <N found by sweep only> / <N claimed in interview, unconfirmed>
  ← Review these deltas before running topology-init

### Confidence Assessment
- Categories: High / Medium / Low — <reason if not High>
- Seams: High / Medium / Low — <reason if not High>
- Problem areas: High / Medium / Low

### Recommended Review Before topology-init
<List anything that felt ambiguous or where the interview answer was uncertain,
plus any unresolved sweep-vs-interview deltas.
These are the places to re-read in the output document before handing it to topology-init.>

Ready for:
  /topology-init <project-name> --from-doc {SCRATCH_DIR}/topology-discovery-<project-name>.md
```

---

## Important Notes

- **Interview targets gaps, not everything.** If source material covers a section well, skip it. The interview adds what's missing, not what's already there.
- **One conversation thread at a time.** Don't ask 5 questions at once. Ask, listen, follow the thread, then move on.
- **Seam quality is the priority.** Contracts can be refined after init. Seam definitions that are wrong at discovery will produce wrong seam contracts, and wrong seam contracts produce wrong gap analyses. Get both sides of every seam clear before moving on.
- **Ambiguity is data.** If the person can't clearly describe what crosses a boundary, that is a finding — it means the boundary is implicit. Note it explicitly in the output document.
- **The document is for topology-init, not for humans.** Write it structured and specific, not narrative. topology-init will parse it for contracts and seams — make that easy.
- **The interview is human, the sweep is the machine — keep them separate.** Never run the interview inside a workflow (it needs the user). Never skip the sweep because the interview "felt complete" — the sweep exists precisely to catch what the interview missed.
- **Loop-until-dry, not fixed passes.** Two consecutive dry rounds (or critic `done`) is the stop signal. A single-pass code search is exactly the failure mode the sweep was built to fix — late scope expansion when overlooked methods surface mid-build.
- **Provenance matters.** Each item carries `foundVia` so the reconciliation step (and init) can see which modality surfaced it and weigh confidence. High-confidence items are confirmed by both interview and sweep.
- **Sweep-vs-interview deltas are the deliverable's most important section** — they are where late scope blowups get caught at discovery instead of mid-build. Always surface them for human confirmation before running topology-init.
- **Budget-scaled thoroughness:** if the user sets a token target, `budget.remaining()` scales the sweep depth automatically. Without a target, the 6-round cap and 2-dry-round convergence signal are the guards. If the sweep stops on the cap rather than convergence, the completion report flags it as a coverage gap.

$ARGUMENTS
