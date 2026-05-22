# topology-decide

Record a human-in-the-loop decision on a proposal raised during a sprint or autopilot pause. Writes to `DECISION-LOG.md` on approve; updates checkpoint status to enable `/topology-resume`.

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
- `--reject` — reject the proposal; no DL entry; agent must rework its approach
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
- Scan `{PROJECTS_ACTIVE_DIR}/<project>/` for all `CHECKPOINT.md` files
- Collect `proposed_decisions[]` from each that has `status: paused-hitl`
- Output a table:

```
Pending proposals for <project-name>:

Proposal ID            Sprint/Autopilot      Title                                  Affects
DL-proposal-001        sprint-<id>-...       Extend Contract 4 with field X         C4, Seam 7
DL-proposal-002        sprint-<id>-...       Add DL for provider swap               {EXAMPLE_PROJECT_SLUG}
```

Then exit.

For a specific `<proposal-id>`:
- Find the CHECKPOINT.md containing this proposal ID
- Read the proposal's full `proposed_body`, `affects`, `rationale`, `remediation_options`
- If proposal ID not found: exit with error listing valid pending proposals

### Step 2: Validate the decision

- Exactly one of `--approve`, `--reject`, `--defer` must be provided
- Proposal must be in `pending` state (not already decided)
- If proposal affects CONTRACT-SHEET or SYSTEM-TOPOLOGY (foundation docs) and `--approve`: require `--rationale`. Foundation amendments must have a documented reason.
- If `--reject` on a security-sensitive proposal: require `--rationale`. Rejecting security-related proposals should have a recorded reason.

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

   Approved via /topology-decide during sprint <sprint-id>.
   <rationale>

   Co-Authored-By: Claude <noreply@anthropic.com>"
   ```

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
   **Sprint:** <sprint-id>
   **Rationale for deferral:** <user rationale>
   **Next review:** consider during <next-logical-sprint>
   **Proposal body:**

   <original body>
   ```

### Step 4: Report

```
## topology-decide Complete

**Proposal:** <proposal-id>
**Decision:** approved | rejected | deferred
**DL entry:** DL-<NNN> (if approved) | null
**Checkpoint status:** <status>

### Resumption
<If all blockers resolved:>
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

- **Approve is load-bearing.** Once written, a DL entry is permanent. To reverse, write a NEW DL entry that supersedes the prior one.
- **Reject is not the same as defer.** Reject means "the approach is wrong"; agent must find another path. Defer means "the approach might be right but we're not doing it now."
- **Rationale is not optional for foundation amendments.** Approving a CONTRACT-SHEET or SYSTEM-TOPOLOGY amendment without rationale is refused.
- **CHECKPOINT.md updates are commits.** Status changes to the checkpoint are tracked in git for audit.
- **One proposal at a time.** If a sprint paused with multiple proposals, resolve them one at a time (loop `/topology-decide`). They may have dependencies on each other.

---

## Placeholders in This File

| Placeholder | Replace With |
|-------------|-------------|
| `<project-name>` | Project slug |
| `<proposal-id>` | e.g., `DL-proposal-001` |
| `<sprint-id>` | Originating sprint identifier |
| `<NNN>` | Assigned DL entry number after approval |
