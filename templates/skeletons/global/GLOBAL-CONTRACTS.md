<!-- Seeded skeleton. topology-global-init populates this from your project's verified work. -->

# Global Contracts

Platform-wide invariants that must hold across all systems, all tenants, and all projects in {PROJECT_NAME}. Every entry here has been verified by at least one completed topology project. New projects read this document before discovery begins — these are not up for debate.

**This document is append-only.** Contracts are never deleted. If a contract is superseded, it is marked Superseded with a reference to the contract that replaces it and the Global Decision that authorized the change.

---

## How to Read This Document

Each contract has a global ID (`GC-NNN`), a status, and a list of projects that verified it. The **governing categories** field names the platform categories this contract applies to — any project that touches those categories must satisfy this contract.

| Status | Meaning |
|--------|---------|
| Active | Verified and enforced |
| Proposed | Derived from a project but not yet verified platform-wide |
| Superseded | Replaced by a newer contract — see reference |
| Retired | No longer applicable — system it governed no longer exists |

---

## Contract Index

| ID     | Title     | Status   | Scope     | Verified By     |
| ------ | --------- | -------- | --------- | --------------- |
| GC-001 | {Title}   | Proposed | {Scope}   | {Source}        |

<One row per contract. Repeat for GC-002, GC-003, … as topology-global-init and topology-promote add entries.>

---

## Contracts

### GC-001 — {Title}

**Status:** Proposed
**Scope:** {Scope}
**Governing categories:** <the platform categories this contract applies to>
**First verified by:** <project name, date — or empty if not yet verified>
**Source:** {Source}
<Source is one of: "Verified by project <name>" | "Interview-confirmed, not formally verified"{{#if TIER_ENABLED}} | "Seeded from tier docs — not interview-confirmed"{{/if}}>

**Invariant:** <The always-true statement. Written as a fact, platform-wide, no hedging. If it has exceptions it is a goal, not a contract — keep it Proposed with a note.>

**Verification criteria:**
- <Binary check 1 — must be true on every code path this contract governs>
- <Binary check 2>

---

<Repeat the entry block above for each contract. Superseded / Retired contracts keep their entry and add a reference line:>

<!--
### GC-NNN — {Title}

**Status:** Superseded by GC-MMM (see GD-NNN)
... full original entry preserved verbatim ...
-->
