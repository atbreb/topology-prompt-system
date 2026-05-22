# topology-global-init

Stand up the three global topology documents for the first time. Reads existing source material — archived projects, tier docs, or both — to build a draft, then conducts a structured verification interview to challenge every derived entry, surface missing knowledge, and confirm what is actually true before anything is written. The docs are a starting point. The interview is what makes the global layer trustworthy.

Run once. After this, `topology-promote` maintains the global layer automatically on every project completion.

## Usage

```
/topology-global-init
/topology-global-init --from-projects
{{#if TIER_ENABLED}}/topology-global-init --from-tiers
/topology-global-init --from-projects --from-tiers   (recommended){{/if}}
```

### Arguments

- No flags — interview only, no pre-reading. Builds from conversation.
- `--from-projects` — read all archived project topology docs before interviewing
{{#if TIER_ENABLED}}- `--from-tiers` — read all tier docs before interviewing
- Both flags together — read everything available, then interview against the gaps and ambiguities found{{/if}}

---

## Output

Three documents created at `{DOCS_ROOT}/`:

```
{DOCS_ROOT}/
├── GLOBAL-CONTRACTS.md
├── GLOBAL-TOPOLOGY.md
└── GLOBAL-DECISIONS.md
```

---

## Prerequisites

- [ ] `{DOCS_ROOT}/` exists
- [ ] `{DOCS_ROOT}/README.md` exists

If `GLOBAL-CONTRACTS.md`, `GLOBAL-TOPOLOGY.md`, or `GLOBAL-DECISIONS.md` already exist, stop:

> Global topology documents already exist. Re-running this command would overwrite
> accumulated platform history.
>
> To update the global docs from a completed project, use:
>   /topology-promote <project-name> --execute
>
> To inspect current global state, read the three global docs directly.

---

## Instructions

### Step 1: Read All Source Material

If `--from-projects` is provided, read every project in `{PROJECTS_ARCHIVE_DIR}/`:
- `CONTRACT-SHEET.md` — contracts and their verification status
- `SYSTEM-TOPOLOGY.md` — seam contracts
- `DECISION-LOG.md` — project decisions
- All `VERIFICATION-REPORT.md` files — what actually passed vs. what was proposed

{{#if TIER_ENABLED}}If `--from-tiers` is provided, read every file in `{TIER_1_DIR}/`, `{TIER_2_DIR}/`, `{TIER_3_DIR}/`.

{{/if}}If no flags, skip to Step 2 with an empty draft.

While reading, build three draft lists — do not finalize anything yet:

**Draft contracts:** Every invariant that appears to hold platform-wide, with source and confidence level (Explicit / Implied / Uncertain).

**Draft seams:** Every boundary between categories that appears to exist, with source, crossing mechanism, and confidence level.

**Draft decisions:** Every architectural decision with apparent platform-wide implications, with source and confidence level.

Also note:
- Anything contradictory between sources
- Anything that appears in docs but feels aspirational rather than real
- Anything conspicuously absent — categories with no seams, seams with no contracts, large areas of the system with no documentation at all

---

### Step 2: Open the Interview

Introduce the session:

> I've finished reading the source material. Before writing anything, I want to verify
> what I found and fill in what the docs don't cover — because the global layer needs
> to reflect what's actually true, not just what was written down.
>
> [If source material was provided:]
> I found [N] contract candidates, [N] seam candidates, and [N] decision candidates.
> I also found some gaps and things I'm not confident about. I'll work through each
> area with you.
>
> [If no source material:]
> We'll build the full picture from scratch. I'll ask about each area in turn.
>
> This has four rounds: contracts, seams, decisions, and then open gaps. Ready?

---

### Step 3: Round 1 — Contract Verification

**Goal:** Confirm which invariants are actually true platform-wide, add anything missing, and mark anything that's aspirational or partially true as such.

**If draft contracts exist from source material:**

Present each candidate. Ask 1–2 questions at a time, not all at once:

> The docs suggest this invariant holds platform-wide:
> "[contract candidate text]"
>
> Is that actually true today — always, without exceptions? Or is there a code path
> where it doesn't hold?

For each candidate, probe:
- **Always-true or usually-true?** If there are exceptions, it isn't a contract — it's a goal. Mark it Proposed with a note about the exceptions.
- **Platform-wide or project-scoped?** If it only applies to one subsystem, it doesn't belong at the global level.
- **Still active?** Some documented invariants were the intent when written but have since been violated and never fixed. Confirm it's currently enforced, not just currently documented.

After working through existing candidates, ask:

> Are there invariants you'd stake the platform on that aren't in anything I read?
> Things everyone on the team knows must be true but nobody wrote down?

**If no draft contracts exist:**

> What are the rules this platform must never break — the things where if they stopped
> being true, something serious would go wrong? Start with whatever comes to mind first.

Follow up on each until you can write it as a specific, always-true fact.

---

### Step 4: Round 2 — Seam Verification

**Goal:** Confirm which boundaries are real and accurately described, surface undocumented seams, and retire documented seams that no longer exist.

**If draft seams exist:**

Present each candidate:

> The docs describe a boundary between [Producer] and [Consumer]:
> "[seam description]"
>
> Is this boundary real and currently operating the way it's described?
> What actually crosses it — is the type or structure accurate?

For each candidate, probe:
- **Real or theoretical?** Some documented integrations were planned but not built. Confirm the code path actually exists.
- **Producer guarantees — honored or aspirational?** "The producer always sends a typed error on failure" sounds good. Does the code actually do that? Every time?
- **Consumer behavior — safe or over-reliant?** What does the consumer actually depend on? Is it within the producer's stated guarantees?
- **Still alive?** Seams from prior architectures sometimes get documented but quietly removed. Confirm it still exists.

After working through existing candidates:

> Are there places where two parts of the system hand things to each other that I
> haven't covered? Doesn't have to be formal — any place where one component depends
> on what another produces?

Surface undocumented seams. For each new one identified, ask enough to populate the seam template — producer, consumer, what crosses, what the producer commits to, what the consumer depends on.

---

### Step 5: Round 3 — Decision Verification

**Goal:** Confirm which architectural decisions are still active, surface ones that were made but never recorded, and retire ones that have been quietly reversed.

**If draft decisions exist:**

Present each candidate:

> There's a recorded decision: "[decision title]"
> "[decision summary]"
>
> Is this still the active choice? Or has it been quietly reversed or superseded
> by something that wasn't documented?

For each candidate:
- **Still active?** Decisions get reversed informally all the time. Confirm.
- **Platform-wide or project-specific?** If it only affected one project's implementation, it may not belong at the global level.
- **Complete rationale?** If the why is missing or wrong, fill it in now. Future projects need the real reason to avoid relitigating it.

After working through existing candidates:

> What architectural choices has this platform made that would surprise someone
> coming in new — things that seem unusual but were decided deliberately?
> And are there choices that were made verbally, in a meeting or a conversation,
> that everyone on the team knows but nobody ever wrote down?

---

### Step 6: Round 4 — Open Gaps

**Goal:** Surface platform knowledge that didn't appear anywhere in the docs or the prior three rounds.

Ask:

> We've covered contracts, seams, and decisions. What do you know about how this
> platform works that we haven't talked about yet?

Then:

> If a new engineer sat down to build a new system that needs to integrate with
> this platform, what would you tell them on day one that they wouldn't figure out
> from reading the docs?

Then, if anything suspicious came up during source material reading:

> [Present each gap or contradiction found in Step 1.]
> I noticed [description of gap or contradiction]. What's the real story there?

Capture everything surfaced in this round. Some will become new contracts or seams. Some will become decisions. Some will become notes in the global docs about known unknowns. None of it gets discarded.

---

### Step 7: Completion Signal

When all four rounds are complete and nothing meaningful is still unresolved:

> I have what I need to write the three global documents. Before I do —
> is there anything else about the platform's architecture, its invariants,
> or its history that should be captured and hasn't been?

Wait for the response. Incorporate anything new.

---

### Step 8: Reconcile and Finalize Entry List

Merge the draft from source material with everything learned in the interview. For each entry, assign a final status:

**Contracts:**
- `Active` — confirmed true today by the interview, formally verified by at least one completed project
- `Proposed` — confirmed true by the interview but not yet formally verified by a topology project, OR derived from docs but not interview-confirmed
- `Unverified` — mentioned in docs but interview raised doubts — flag for future topology work, do not include as Active or Proposed

**Seams:**
- `Active` — confirmed real and accurately described by the interview, formally verified by a project
- `Proposed` — confirmed real by interview but not formally verified
- `Archived` — appeared in docs but interview confirmed it no longer exists

**Decisions:**
- `Active` — confirmed still in force
- `Superseded` — interview revealed it was replaced by something else (create the replacement entry too)
- `Retired` — the system it governed no longer exists

Assign global IDs: `GC-001`, `GC-002`... / `GS-001`, `GS-002`... / `GD-001`, `GD-002`...

---

### Step 9: Write the Three Global Documents

Write `GLOBAL-CONTRACTS.md`, `GLOBAL-TOPOLOGY.md`, and `GLOBAL-DECISIONS.md` using their templates. Populate every index table. Add all verified and proposed entries. Add all archived/retired entries to their respective sections.

For every entry, include a `Source` field noting where it came from:
- `Verified by project <name>` — came from a completed topology project
- `Interview-confirmed, not formally verified` — confirmed true in interview but no topology project has checked it
{{#if TIER_ENABLED}}- `Seeded from tier docs — not interview-confirmed` — in docs but not discussed in interview (lowest confidence){{/if}}

---

### Step 10: Update {DOCS_ROOT}/README.md

Add the global topology section:

```markdown
## Global Topology Layer

Platform-wide contracts, seams, and decisions that span all projects and workstreams.
New projects and topology-discovery sessions read these before beginning.
topology-promote feeds them automatically after every project completes.

| Document | Purpose |
|----------|---------|
| `GLOBAL-CONTRACTS.md` | All verified platform-wide invariants |
| `GLOBAL-TOPOLOGY.md` | All active seams across the platform |
| `GLOBAL-DECISIONS.md` | Permanent platform-wide decision record |
```

---

### Step 11: Report Completion

```
## topology-global-init Complete

### Documents Created
- {DOCS_ROOT}/GLOBAL-CONTRACTS.md
- {DOCS_ROOT}/GLOBAL-TOPOLOGY.md
- {DOCS_ROOT}/GLOBAL-DECISIONS.md

### Source Material Read
- Archived projects: <N>
{{#if TIER_ENABLED}}- Tier doc files: <N>
{{/if}}- Interview rounds: 4

### Entries Written
- Contracts: <N> Active, <N> Proposed, <N> flagged Unverified
- Seams: <N> Active, <N> Proposed, <N> Archived
- Decisions: <N> Active, <N> Superseded/Retired

### Interview Findings Not in Any Doc
<List anything surfaced in the interview that had no prior documentation.
These are the most valuable entries — they represent knowledge that would
have been lost without the interview.>

### Confidence Gaps (Unverified Entries)
<List any entries flagged Unverified — things the docs mentioned but the
interview raised doubts about. These are candidates for future topology projects.>

### Recommended Next Step
Read all three global documents and verify they look right before running
any new topology projects.

topology-discovery will now read the global docs automatically before
beginning any new project interview.
```

---

## Important Notes

- **The interview is not optional.** Docs lie — not intentionally, but inevitably. They describe what was true when written. The interview confirms what is true now. Skipping it produces a global layer that formalizes drift instead of correcting it.
- **Confidence levels matter.** An `Active` entry with no interview confirmation is not the same as one that was verified in person. The `Source` field preserves this distinction permanently.
- **Unverified entries are still valuable.** Flagging something as unverified is not a failure — it is a finding. It marks the boundary of what is known and creates a target for future topology work.
- **Round 4 is where the most important knowledge surfaces.** The first three rounds work from what exists. Round 4 surfaces what nobody wrote down. Don't skip it or rush it.
- **Run once.** After this, `topology-promote --execute` maintains all three documents. Do not re-run `topology-global-init`.

$ARGUMENTS
