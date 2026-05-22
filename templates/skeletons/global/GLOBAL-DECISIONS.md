<!-- Seeded skeleton. topology-global-init populates this from your project's verified work. -->

# Global Decisions

The permanent, platform-wide architectural decision record for {PROJECT_NAME}. Spans every project that has ever run. Individual project Decision Logs are scoped to their project and archive with it — this document never archives.

When a decision has platform-wide implications — it changes a global contract, retires a seam, establishes a new cross-cutting pattern, or overrides a prior decision — it belongs here as well as in the project log.

**Append-only. Entries are never deleted or modified.** If a decision is reversed, a new entry is added that supersedes it. The full history of why the platform is the way it is lives in this file.

---

## How to Read This Document

Each decision has a global ID (`GD-NNN`), a status, and a list of what it affects.

| Status | Meaning |
|--------|---------|
| Active | In force |
| Superseded | Replaced by a newer decision — see reference |
| Retired | The system it governed no longer exists |

---

## Decision Index

| ID | Title | Status | Scope | Affects | Date | Source |
|----|-------|--------|-------|---------|------|--------|
| GD-001 | {Title} | Active | {Scope} | <GC-/GS-/category it touches> | <date> | {Source} |

<One row per decision. Repeat for GD-002, GD-003, … as topology-global-init and topology-promote add entries.>

---

## Platform-Level Decisions

### GD-001 — {Title}

**Date:** <date>
**Status:** Active
**Decided by:** {Source}
**Scope:** {Scope}
**Affects:** <the contracts, seams, categories, or workflow this decision governs>

**Decision:** <What was decided. One clear statement.>

**Rationale:** <Why this choice over the alternatives. Future projects need the real reason to avoid relitigating it.>

**Alternatives Considered:**
- <What else was considered> — <why it was rejected>

**Consequences:** <What this implies for future work.>

**Supersedes:** None
**Superseded by:** None

---

<Repeat the entry block above for each decision. A reversal adds a NEW entry that names the prior one in "Supersedes:" and edits only the prior entry's "Superseded by:" line.>
