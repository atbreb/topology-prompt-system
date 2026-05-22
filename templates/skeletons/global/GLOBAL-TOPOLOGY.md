<!-- Seeded skeleton. topology-global-init populates this from your project's verified work. -->

# Global Topology

The living map of every active seam across {PROJECT_NAME}. Not one project's seams — all of them. This is the authoritative record of how the system actually connects: what crosses each boundary, what the producer commits to, and what the consumer is allowed to depend on.

**New projects read this before `topology-discovery` begins.** Known seams do not need to be re-derived. New seams discovered during a project are proposed here and promoted to Active after verification.

**Archived seams are never deleted.** When a seam is removed or replaced, it is marked Archived with a reference to what replaced it and the project that made the change.

---

## How to Read This Document

Each seam has a global ID (`GS-NNN`), a status, and the project that last verified it.

| Status | Meaning |
|--------|---------|
| Active | Verified and in force |
| Proposed | Identified by a project, not yet verified |
| Regressed | Was Active, currently broken — see open patch |
| Archived | No longer exists — superseded or removed |

**Seam ownership** belongs to the producer category. If the producer changes, the seam contract must be reviewed.

---

## Seam Index

| ID | Title | Producer | Consumer | Status | Scope | Verified By |
|----|-------|----------|----------|--------|-------|-------------|
| GS-001 | {Title} | {Producer} | {Consumer} | Proposed | {Scope} | {Source} |

<One row per seam. Repeat for GS-002, GS-003, … as topology-global-init and topology-promote add entries.>

---

## Active Seams

### GS-001 — {Producer} → {Consumer}

**Status:** Proposed
**Scope:** {Scope}
**Producer:** {Producer}
**Consumer:** {Consumer}
**Crossing mechanism:** <how it crosses — function return, gRPC call, NATS event, DB trigger, …>
**First verified by:** <project name, date — or empty if not yet verified>
**Last verified by:** <project name, date — or empty>
**Governs:** <the GC-NNN contracts this seam enforces, if any>

**What Crosses:**
```
<TypeName> { field1, field2, ... }
```

**Producer Guarantees:**
- <Explicit commitment 1 — what the producer always does>
- <Explicit commitment 2>

**Consumer Can Depend On:**
- <What is safe to rely on>

**Consumer Cannot Assume:**
- <What must not be relied upon>

---

<Repeat the entry block above for each Active or Proposed seam.>

## Archived Seams

<Archived seams keep their full entry below this heading and add a reference line:>

<!--
### GS-NNN — {Producer} → {Consumer}

**Status:** Archived — superseded by GS-MMM (see project <name>)
... full original entry preserved verbatim ...
-->
