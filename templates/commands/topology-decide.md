# topology-decide

Record a human-in-the-loop decision on a proposal raised during a sprint or autopilot pause. Writes to `DECISION-LOG.md` on approve; updates checkpoint status to enable `/topology-resume`.

> **Workflow-era note:** In the Workflow orchestration model, a running workflow cannot pause mid-flight to wait for human judgment. Instead, any human-in-the-loop condition causes the responsible agent to return a structured `HITL` object and the workflow to exit cleanly, handing the gate back to the main loop. `topology-decide` is where that gate is adjudicated. Once recorded, the user resumes the blocked workflow with `/topology-resume --run <runId>`, which re-invokes the same script with `resumeFromRunId` — completed `agent()` calls return cached, only the unblocked work re-runs. In prose-mode sprints, proposals are raised by the paused agent mid-run; the mechanism differs but the adjudication steps are the same.

## The HITL loop (Workflow-era)

```
topology-sprint / -autopilot / -dispatch / -verify   →  returns { status: 'needs-hitl', hitl, runId }
                                                         (workflow exits cleanly; agents already ran to completion)
   ↓
/topology-decide <project> <proposal-id> --approve|--reject|--defer
                                                         (record the judgment; DL entry + foundation amendments on approve)
   ↓
/topology-resume <project> --run <runId>                 (re-invokes same script with resumeFromRunId; cached stages skip)
```

The workflow's `runId` is the machine-resumable record; the `CHECKPOINT.md` written below is its human-readable mirror. In prose-mode (non-Workflow) runs the `runId` field is omitted and `/topology-resume <project>` is used without a `--run` flag.

## Usage

```
/topology-decide <project-name> <proposal-id> --approve [--rationale "<text>"]
/topology-decide <project-name> <proposal-id> --reject  [--rationale "<text>"]
/topology-decide <project-name> <proposal-id> --defer   [--rationale "<text>"]
/topology-decide <project-name> --list                  # show all pending proposals
```

### Arguments

- `<project-name>` — project slug
- `<proposal-id>` — ID from the paused run's CHECKPOINT.md (e.g., `DL-proposal-001`)
- `--approve` — accept the proposal; DL entry written to DECISION-LOG
- `--reject` — reject the proposal; no DL entry; the blocked stage must rework its approach on resume
- `--defer` — defer the decision; proposal remains in CHECKPOINT but agent should treat as rejected for this sprint (can be revisited in a future sprint)
- `--rationale "<text>"` — optional user rationale, appended to DL entry (approve) or to CHECKPOINT history (reject/defer)
- `--list` — show all pending proposals for the project (no decision taken)

---

{{#if MULTI_AGENT}}
## {DELEGATE_AGENT_NAME} Pair Mode (optional)

`topology-decide` is explicitly a human-in-the-loop command. Its purpose is to record a judgment. {DELEGATE_AGENT_NAME} delegation is inappropriate — every step either takes human input (the `--approve` / `--reject` / `--defer` flag + rationale) or performs a load-bearing write (DECISION-LOG entry, CONTRACT-SHEET amendment, SYSTEM-TOPOLOGY amendment).

If `{DELEGATE_FLAG}` is passed to this command, Claude **acknowledges the flag and proceeds in solo mode**, noting in the checkpoint audit trail that {DELEGATE_AGENT_NAME} was requested but skipped because this command type doesn't delegate. No Handoff Plan is posted.

The rationale: foundation-doc amendments and DECISION-LOG entries are project-load-bearing writes. A pair partner without full conversation context risks phrasing that misrepresents the decision's scope. Claude, with full conversation history and access to all prior foundation docs, is the correct author.

---

{{/if}}
## Instructions

### Step 1: Load the proposal

If `--list`:
- Scan `{PROJECTS_ACTIVE_DIR}/<project>/` (and any sprint subdirectory) for all `CHECKPOINT.md` files
- Collect `proposed_decisions[]` from each that has `status: paused-hitl`
- Output a table:

```
Pending proposals for <project-name>:

Proposal ID            Workflow / runId       hitl_reason                      Title                          Affects
DL-proposal-001        sprint / r-7f3a…       contract-amendment-proposed      Extend Contract 4 with field X C4, Seam 7
DL-proposal-002        autopilot / r-9c1b…    dl-entry-proposed-strict-mode    Add DL for provider swap       {EXAMPLE_PROJECT_SLUG}
```

{{! example — proposal IDs and illustrative project slug above are runtime values, not tokens }}

In prose-mode runs where no `runId` is tracked, omit the Workflow / runId column.

Then exit.

For a specific `<proposal-id>`:
- Find the CHECKPOINT.md containing this proposal ID
- Read the proposal's full `proposed_body`, `affects`, `rationale`, `remediation_options`, the `hitl_reason`, and the workflow `runId` (if present)
- If proposal ID not found: exit with error listing valid pending proposals

> **Workflow-era:** The proposal fields map directly onto the `HITL` schema in the project's PRINCIPLES doc: `hitl_reason` ← `reason`, `hitl_details` ← `details`, `proposed_decisions[]` ← `proposedDecisions[]` (each with `id`/`title`/`rationale`/`affects`/`proposedBody`), `remediation_options[]` ← `remediationOptions[]`. The CHECKPOINT also carries the workflow `runId` so `/topology-resume` can continue from it.

### Step 2: Validate the decision

- Exactly one of `--approve`, `--reject`, `--defer` must be provided
- Proposal must be in `pending` state (not already decided)
- If proposal affects CONTRACT-SHEET or SYSTEM-TOPOLOGY (foundation docs) and `--approve`: require `--rationale`. Foundation amendments must have a documented reason.
- If `--reject` on a security-sensitive proposal (`hitl_reason: security-sensitive-change`): require `--rationale`. Rejecting security-related proposals should have a recorded reason.

### Handling each `hitl_reason` (Workflow-era)

When the proposal came from a Workflow-era command, the `hitl_reason` field tells `topology-decide` exactly what kind of adjudication is needed. The table below maps each reason to the correct `--approve` action. For prose-mode proposals that lack a `hitl_reason`, treat as `dl-entry-proposed-strict-mode` (DL entry only, no foundation amendment unless the proposal body explicitly requests one).

| `hitl_reason` | What `--approve` does | Notes |
|---|---|---|
| `contract-amendment-proposed` | DL entry **and** CONTRACT-SHEET amendment (Step 3 → 2) | `--rationale` mandatory; append-only amend, no verification reset |
| `seam-amendment-proposed` | DL entry **and** SYSTEM-TOPOLOGY seam amendment (Step 3 → 2) | `--rationale` mandatory; amend both producer guarantee + consumer expectation as the body specifies |
| `dl-entry-proposed-strict-mode` | DL entry only | the common `--autonomy strict` gate; no foundation doc touched |
| `implementation-retry-exhausted` | usually `--reject` (rework) or a DL recording an accepted approach change | rarely an approve; if approve, the DL records the new approach |
| `external-dep-unreachable` | DL recording an **evidence-deferral** with completion criteria | do NOT block Verified ✓ on housekeeping; cross-ref the DL |
| `precommit-hook-unknown-failure` | typically `--reject`; or a DL documenting an accepted hook exception | |
| `security-sensitive-change` | DL recording the reviewed-and-accepted change | security review (by the appropriate {SUBAGENT_TYPES} reviewer) is non-blocking; this gate is the explicit exception |
| `verification-architectural-failure` | usually `--reject` (rethink) | approve only if the DL records an accepted design change |
| `cross-project-scope-violation` | main-loop decision; a DL recording the scope call | do not encode cross-project pivots inside a workflow |
| `scaffolding-incomplete` | `--reject` (re-run prep-scaffolding) — scaffolding is mandatory and non-skippable | no DL substitutes for missing scaffolding |
| `commit-boundary-ambiguous` | a DL recording the chosen commit boundary | |
| `material-drift` | a DL recording the reconciliation, often with a CONTRACT-SHEET/SYSTEM-TOPOLOGY amendment | `--rationale` mandatory if a foundation doc is amended |

### Step 3: Apply the decision

**If `--approve`:**

1. Take the proposal's `proposed_body` draft and write it as a new entry in `DECISION-LOG.md`:
   - Assign the next available DL-<NNN> number
   - Use the proposal's title
   - Body: proposal's draft + user's `--rationale` (if provided) appended as a separate "User rationale" paragraph
   - Date: current ISO date
   - Affects: as per proposal
   - Status: Active

2. If the proposal requires amendments to CONTRACT-SHEET or SYSTEM-TOPOLOGY:
   - Apply the amendment as described in the proposal's body
   - Mark the amended contract/seam with a reference to the new DL entry in its body
   - Status of the amended contract/seam remains `Proposed` or `Verified` per its current state; amendments do not reset verification

3. Commit:
   ```bash
   git add DECISION-LOG.md CONTRACT-SHEET.md SYSTEM-TOPOLOGY.md
   git commit -m "chore(topology): DL-<NNN> <title>

   Approved via /topology-decide resolving <hitl_reason> from workflow runId <runId>.
   <rationale>

   Co-Authored-By: Claude <noreply@anthropic.com>"
   ```
   In prose-mode (no `runId`), use: `Approved via /topology-decide during sprint <sprint-id>.`

4. Update the CHECKPOINT.md: mark proposal as `decided: approved`, record decision datetime, reference the new DL-<NNN>
5. If all blockers in the CHECKPOINT are resolved, update status from `paused-hitl` to `ready-to-resume`

**If `--reject`:**

1. Update the CHECKPOINT.md: mark proposal as `decided: rejected`, record datetime + rationale
2. No DL entry written; no foundation docs amended
3. The agent (on `/topology-resume`) reads the rejection and must rework its approach
4. If all blockers are resolved (perhaps via rejection + an alternate path documented), update status to `ready-to-resume`; otherwise keep `paused-hitl`

**If `--defer`:**

1. Update the CHECKPOINT.md: mark proposal as `decided: deferred-to-future-sprint`, record datetime
2. No DL entry written; no foundation docs amended
3. The agent treats this as `rejected` for the current sprint
4. A follow-up note is written to `<project>/DEFERRED-PROPOSALS.md` (created if not exists):

   ```markdown
   ## <ISO> — <proposal-id>

   **Title:** <title>
   **Workflow / runId:** <workflow> / <runId>  (omit if prose-mode run)
   **hitl_reason:** <hitl_reason>  (omit if prose-mode run)
   **Sprint:** <sprint-id>  (prose-mode only)
   **Rationale for deferral:** <user rationale>
   **Next review:** consider during <next-logical-sprint>
   **Proposal body:**

   <original body>
   ```

### Step 4: Report

```
## topology-decide Complete

**Proposal:** <proposal-id>
**hitl_reason:** <reason>  (omit if prose-mode run)
**Decision:** approved | rejected | deferred
**DL entry:** DL-<NNN> (if approved) | null
**Checkpoint status:** <status>
**Workflow runId:** <runId>  (omit if prose-mode run)

### Resumption
<If all blockers resolved — Workflow-era:>
Ready to resume the blocked workflow from its runId:
  /topology-resume <project-name> --run <runId>

<If all blockers resolved — prose-mode:>
Ready to resume:
  /topology-resume <project-name>

<If blockers remaining:>
Other pending proposals still open in this checkpoint:
  - <id>: <title>
Resolve these before resume. Run:
  /topology-decide <project-name> --list
```

---

## Important Notes

- **`topology-decide` is the main loop, never the workflow.** Per topology-PRINCIPLES, approving a DL entry, ratifying a contract/seam amendment, and deciding a cross-project pivot are **main-loop decisions** — they must never be encoded inside a `Workflow` script. The script's job is to do the deterministic work up to the gate, package the gate as an `HITL` object, and stop. This command is where that gate is resolved.
- **Approve is load-bearing.** Once written, a DL entry is permanent (DECISION-LOG is append-only forever). To reverse, write a NEW DL entry that supersedes the prior one and annotate the original with `**Reopened YYYY-MM-DD:**` — the original stays.
- **Reject is not the same as defer.** Reject means "the approach is wrong"; agent must find another path. Defer means "the approach might be right but we're not doing it now."
- **Rationale is not optional for foundation amendments.** Approving a CONTRACT-SHEET or SYSTEM-TOPOLOGY amendment without rationale is refused. Foundation docs are append-only after init; amendments go through DECISION-LOG entries that reference the contract/seam, and they do not reset verification state.
- **CHECKPOINT.md updates are commits.** Status changes to the checkpoint are tracked in git for audit. The checkpoint mirrors the workflow journal — but the `runId` is the machine-resumable record; `/topology-resume` continues from it.
- **One proposal at a time.** If a sprint paused with multiple proposals (or a workflow returned multiple `needs-hitl` gates), resolve them one at a time (loop `/topology-decide`). They may have dependencies on each other. Resume only once all blockers in the checkpoint are resolved.
- **Resume over re-run (Workflow-era).** After recording the decision, always resume via `/topology-resume <project> --run <runId>` — re-running the workflow from scratch re-does already-verified categories. The `runId` makes resume deterministic: completed `agent()` calls return cached.

---

## Placeholders in This File

| Placeholder | Replace With |
|-------------|-------------|
| `<project-name>` | Project slug |
| `<proposal-id>` | e.g., `DL-proposal-001` |
| `<runId>` | The blocked workflow's run identifier (resume key); omit for prose-mode runs |
| `<hitl_reason>` | The `HITL.reason` enum value being adjudicated; omit for prose-mode runs |
| `<sprint-id>` | Originating sprint identifier (prose-mode) |
| `<NNN>` | Assigned DL entry number after approval |

$ARGUMENTS
