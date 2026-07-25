# freeplay

Lightweight topology-aware task execution. For work that doesn't warrant a full topology project — bug fixes, small enhancements, explorations, cross-project touch-ups, seam repairs, audits, refactors, and research. Gives structure to casual requests by loading the relevant topology context, following ecosystem grammar, and recording a lightweight trail.

> **See `.claude/commands/topology-PRINCIPLES.md`** for the design discipline and shared schema library. Freeplay is topology's "light mode": it reads contracts, seams, and decisions from active projects to inform the work, but it doesn't create categories, verification tables, or integration checkpoints. Its trail (FREEPLAY-LOG.md) is append-only and lightweight.

## Usage

```
/freeplay <task description>
/freeplay --type <fix|enhance|explore|refactor|audit|repair|research> <description>
```

### Arguments

- `<task description>` — natural-language description of what to do. The command classifies the task type from the description; `--type` overrides the classification.
- `--type` — explicit task type override. Valid types:
  - `fix` — bug fix, defect repair
  - `enhance` — small feature addition or improvement
  - `explore` — investigation, code archaeology, "how does X work?"
  - `refactor` — code restructuring without behavioral change
  - `audit` — systematic review of an area against contracts/seams
  - `repair` — fix a broken seam or contract violation
  - `research` — open-ended investigation, typically read-only

---

## Instructions

### Step 1: Classify the task

If `--type` is provided, use it. Otherwise, classify from the description:

| Signal words | → Type |
|-------------|--------|
| "fix", "bug", "broken", "defect", "wrong", "issue", "error" | `fix` |
| "add", "enhance", "improve", "small feature", "tweak" | `enhance` |
| "explore", "how does", "what is", "understand", "trace", "map out" | `explore` |
| "refactor", "clean up", "reorganize", "extract", "simplify" | `refactor` |
| "audit", "review", "check against", "verify compliance" | `audit` |
| "repair", "reconnect", "seam break", "contract violation", "drift" | `repair` |
| "research", "investigate", "survey", "what are the options" | `research` |

Emit the classification before proceeding:

```
### Freeplay: <type> — <one-line summary>
```

### Step 2: Load topology context

Scan active projects for topology artifacts relevant to the task. This is a **read-only context load** — understand what contracts, seams, and decisions constrain or inform the work.

**2a. Identify relevant projects:**

Based on the task description, identify which active projects (under `{PROJECTS_ACTIVE_DIR}`) the work may touch. Heuristics:
- If the task mentions a specific system/feature/area → find projects whose CONTRACT-SHEET or TOPOLOGY-CLAUDE names that area
- If the task mentions a specific file or directory → find projects whose scope_files or category directories contain that path
- If the task is general → load the most recently touched project (per git log)

**2b. Load the topology lens for each relevant project (read-only):**

1. `CONTRACT-SHEET.md` — contracts that govern the area
2. `SYSTEM-TOPOLOGY.md` — seams where the area appears as producer or consumer
3. `DECISION-LOG.md` — decisions that constrain the approach
4. `VERIFICATION-TABLE.md` — current verification state (verified areas = regression risk)

**2c. Emit the topology lens summary:**

```
### Topology Context
**Projects in scope:** <project slugs, or "none">
**Contracts constraining this work:** <C-IDs, or "—">
**Seams this work may affect:** <S-IDs with producer/consumer role, or "—">
**Decisions this work must honor:** <DL-IDs, or "—">
**Verified areas touched:** <categories that are ✓ — regression risk, or "none">
```

If no relevant topology artifacts are found: "No topology projects constrain this task — proceeding as a standalone freeplay task."

### Step 3: Surface guard rails

Before executing, surface any guard rails from the topology context:

1. **Verified area warning:** If the task touches a verified category: "⚠️ This touches `<category>` (✓ verified). Changes here are potential regressions — verify the category's VERIFICATION-REPORT.md assertions after completing the work."

2. **Seam bilateral check:** If the task touches a seam: "This seam (`<S-ID>`) connects `<producer>` → `<consumer>`. Changes to either side must preserve the other's expectations (see SYSTEM-TOPOLOGY.md)."

3. **Decision constraint:** If a decision constrains the approach: "DL-<NNN> (`<title>`) constrains this: `<relevant excerpt>`. The freeplay task must honor this decision or propose a new decision that supersedes it."

4. **Contract invariant:** If a contract governs the area: "C<N> (`<title>`) declares: `<invariant>`. The freeplay task must preserve this invariant."

### Step 4: Execute the work

Execute the task. The execution pattern differs by type:

| Type | Execution pattern |
|------|------------------|
| `fix` | Root-cause → implement fix → verify against contract assertions → if verified area, re-run relevant VERIFICATION-REPORT checks |
| `enhance` | Scope to minimum viable change → implement → verify against contracts → if touching a seam, check both sides |
| `explore` | Multi-modal sweep (read-only) → structured findings → surface anything that warrants a follow-up |
| `refactor` | Identify extraction boundary → execute → verify behavioral equivalence → if verified area, re-run assertions |
| `audit` | Systematic check against named contracts/seams → FINDING[] output → surface regressions or violations |
| `repair` | Identify break point → implement fix → verify seam contract bilaterally → suggest re-verification of both sides |
| `research` | Read-only sweep → structured summary → optionally propose a follow-up project or freeplay task |

Throughout execution:
- Follow the ecosystem grammar (topology-PRINCIPLES.md vocabulary, anti-patterns, foundation-document mutation discipline)
- If the task would benefit from a decision record, flag it for the trail (Step 5)
- If the task reveals something that warrants a full topology project, surface it: "This work could benefit from a full topology project — consider `/freeplay-promote` after completion, or `/topology-discovery` for a fresh start."

### Step 5: Record the trail

Append an entry to `{DOCS_ROOT}/FREEPLAY-LOG.md`. Create the file if it doesn't exist (seed it with a header).

**Entry format:**

```markdown
## FP-<NNN> — <one-line summary>

- **Date:** <YYYY-MM-DD>
- **Type:** <fix|enhance|explore|refactor|audit|repair|research>
- **Projects in scope:** <project slugs, or "none">
- **Touched contracts:** <C-IDs, or "—">
- **Touched seams:** <S-IDs, or "—">
- **Honored decisions:** <DL-IDs, or "—">
- **Resolution:** <what happened>
- **New decisions proposed:** <DL-FP-XXX IDs, or "—">
- **Follow-up:** <any recommended follow-up, or "—">
- **Graduated to project:** <topology project slug, or "—">

### Summary
<2-5 sentence summary of what was done, what was found, what changed.>

### Decision trail
<If any new decisions were made during this task, record them here. Use DL-FP-<YYYYMMDD>-<N> IDs. These live in the freeplay log, not the project DECISION-LOG, but follow the same format: title, date, decision, rationale, alternatives, affects, status. If the task is promoted to a project, these become seed decisions.>

---
```

**FP-ID assignment:** Read the existing log. If entries exist, increment the counter (FP-001, FP-002, …). If the file is new, start at FP-001.

**If the task was purely exploratory and found nothing actionable:** still log it. The trail is how we know an area was checked and found clean.

---

## Important Notes

- **Freeplay is not a topology project.** It doesn't create categories, verification tables, or integration checkpoints. It reads topology artifacts to inform the work, but its only output artifact is the FREEPLAY-LOG.md entry.
- **Freeplay honors topology grammar.** The same vocabulary, anti-patterns, and foundation-document mutation discipline apply. Freeplay is a lighter mode of topology-aware work, not a license to ignore the system.
- **Freeplay can touch verified areas.** The guard rails (Step 3) surface the risk. If a freeplay task changes a verified category, the operator should re-verify or consciously accept the regression risk.
- **Freeplay decisions are lightweight but real.** DL-FP entries live in the freeplay log, not the project DECISION-LOG. They're seed material if the task graduates to a project, and traceable context if a future task touches the same area.
- **The trail is append-only.** Each freeplay session appends one entry to FREEPLAY-LOG.md. Never edit or remove prior entries — they're the audit trail of what was touched and why.
- **Freeplay can propose project initiation.** If a task reveals work that warrants a full topology project, surface it. The operator can use `/freeplay-promote <FP-ID>` to graduate it, or `/topology-discovery` for a fresh start.

$ARGUMENTS
