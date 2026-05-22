# topology-discovery

Conduct a structured discovery interview to produce a context document ready for `topology-init`. Targets the interview at what the topology system actually needs — system boundaries, category responsibilities, known seams, problem areas, and decisions already made. When source material already exists, reads it first and interviews only against the gaps.

> **See `.claude/commands/topology-PRINCIPLES.md` for the design discipline behind this skill.** In particular: categories are responsibility slices (not phase slices); the five failure modes inform the per-category and per-seam interview fields below.

## Usage

```
/topology-discovery <project-name>
/topology-discovery <project-name> --from-file <path>
/topology-discovery <project-name> --from-dir <path>
/topology-discovery <project-name> --from-file <path> --from-dir <path>
```

### Arguments

- `<project-name>` — slug for the output file and eventual project directory
- `--from-file <path>` — a single existing document (architecture doc, scratch notes, prior plan) to read before interviewing
- `--from-dir <path>` — a directory of existing documents to read before interviewing
- No flags — start the interview from scratch

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

### Step 4: Write the Context Document

Create `{SCRATCH_DIR}/topology-discovery-<project-name>.md`:

```markdown
# <Project Name> — Topology Discovery Context

**Generated by:** topology-discovery
**Date:** <date>
**Source material used:** <list files read, or "None — interview only">

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
```

---

### Step 5: Report Completion

```
## topology-discovery Complete

**Output:** {SCRATCH_DIR}/topology-discovery-<project-name>.md

### Document Summary
- Categories identified: <N>
- Seams identified: <N>
- Known problems: <N>
- Decisions captured: <N>
- Open questions for human review: <N>

### Confidence Assessment
- Categories: High / Medium / Low — <reason if not High>
- Seams: High / Medium / Low — <reason if not High>
- Problem areas: High / Medium / Low

### Recommended Review Before topology-init
<List anything that felt ambiguous or where the interview answer was uncertain.
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

$ARGUMENTS
