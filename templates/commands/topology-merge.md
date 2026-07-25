# topology-merge

Land completed category worktree branches **via GitHub PR** off a fresh `origin/main`. This command handles the sequential landing of one or more topology worktree branches, running build and test verification on each branch, then pushing it and opening a PR. It **never** `git merge`s a feature branch into local `main` — PRs merge on the remote host in a safe order.

> **See `{COMMANDS_DIR}/topology-PRINCIPLES.md` § Git & PR coordination (MANDATORY).** Topology work is branch-per-feature off fresh `origin/main`, landed via PR; feature work is never committed or merged into local `main`. This command is the canonical "land" step that enforces that doctrine.

This is a git/PR mechanics command — it carries **no agent fan-out and needs no Workflow script**. It is invoked by `topology-verify` (auto-merge on Full Pass), `topology-sprint`, `topology-dispatch`, and `topology-autopilot` to land worktree branches after they complete their verification gates.

## Usage

```
/topology-merge <project-name> [<category-slug>]
```

### Arguments

- `<project-name>` — the project directory name under `{PROJECTS_ACTIVE_DIR}/`
- `<category-slug>` — (optional) merge only this category's branch. If omitted, merges all completed worktree branches in dependency order.

---

## Prerequisites

- [ ] Must be on a synced local `main` (not inside a worktree). Local `main` MUST equal `origin/main` — `git fetch origin && git rev-list --count origin/main..main` must be `0`. If not, STOP and reconcile per PRINCIPLES § Git & PR coordination (rule 3) before landing.
- [ ] `gh` CLI available and authenticated (`gh auth status`) — landing is via `gh pr create`
- [ ] `TOPOLOGY-CLAUDE.md` exists and has a `Parallel Groups` section
- [ ] At least one topology worktree branch exists with commits ahead of `origin/main`

If inside a worktree, stop and report:

> You are currently inside a worktree. Exit the worktree first with ExitWorktree,
> then run topology-merge from the main branch.

If `gh` is unavailable, stop and report that landing requires the GitHub CLI (push the branch manually and open the PR in the repository's web UI as a fallback — but never `git merge` into local `main`).

---

## Instructions

### Step 1: Discover Worktree Branches

First `git fetch origin` so all comparisons are against fresh `origin/main`. The project's commits must live on a `{BRANCH_PREFIX}<project>/...` branch off `origin/main` — never on local `main`.

List all branches matching the pattern `{BRANCH_PREFIX}<project-name>/*`:

```bash
git branch --list "{BRANCH_PREFIX}<project-name>/*"
```

For each branch found:
1. Check if it has commits ahead of `origin/main`: `git log origin/main..<branch> --oneline`
2. Check if it has a corresponding worktree directory: `git worktree list`

Build a land candidates table:

| Branch | Category | Commits Ahead | Has Worktree | Status |
|--------|----------|---------------|-------------|--------|
| `{BRANCH_PREFIX}<project>/<cat>` | `<cat>` | N | Yes/No | Ready/Active/Empty |

- **Ready** = commits ahead of `origin/main`, no active worktree (work is done, worktree was cleaned up or kept)
- **Active** = commits ahead of `origin/main`, worktree still exists (work may be in progress)
- **Empty** = no commits ahead of `origin/main` (nothing to land)

If `<category-slug>` was provided, filter to only that branch.

If no Ready branches exist, report the state and stop.

### Step 2: Determine Land Order

Read `TOPOLOGY-CLAUDE.md` for the `Parallel Groups` section and `Recommended Category Execution Order`. Also consult the live coordination registry (`{DOCS_ROOT}/coordination/IN-FLIGHT.md` or equivalent) — if any branch claims a shared file also claimed by another in-flight feature, honor that registry's `Merge order` so PRs serialize on shared files.

{{#if MULTI_AGENT}}
Refresh the coordination registry (via your team's status/report command, if any) before landing begins, and update it after each PR merges to unblock waiting branches.
{{/if}}

Land branches (open + merge PRs) in dependency order:
1. Phase 1 categories before Phase 2
2. Phase 2 before Phase 3
3. Within a phase/parallel group, land in the order listed in the execution order

This prevents conflicts from dependent changes landing out of order. Each later PR rebases on `origin/main` after the prior one merges (PRINCIPLES § Git & PR coordination, rule 6).

### Step 3: Pre-Land Verification

Before landing each branch, verify the local working tree is clean and `main` is synced:

```bash
git status --porcelain
git fetch origin && git rev-list --count origin/main..main   # must be 0
```

If there are uncommitted changes, stop and report:

> Working tree has uncommitted changes. Commit or stash them before landing.

If local `main` is ahead of `origin/main` (count > 0), stop and report:

> Local main has drifted from origin/main. Reconcile per PRINCIPLES § Git & PR coordination (rule 3) before landing — feature work must not sit on local main.

### Step 4: Land Each Branch via PR Sequentially

For each Ready branch (in dependency order):

#### 4a: Preview the change

```bash
git log origin/main..<branch> --oneline --no-decorate
git diff origin/main...<branch> --stat
```

Report the preview to the user:

```
### Landing: <category-slug>
**Branch:** {BRANCH_PREFIX}<project>/<category>
**Commits:** <N>
**Files changed:** <N>

<commit list>
<diffstat>
```

#### 4b: Rebase the branch on fresh origin/main + resolve shared-file conflicts

Ensure the branch sits cleanly on the latest `origin/main` before opening the PR:

```bash
git fetch origin
git -C <worktree-path> rebase origin/main   # or: git checkout <branch> && git rebase origin/main
```

If the rebase conflicts:
1. Report the conflicting files.
2. **Shared-file conflicts are expected and resolvable** — for registration/append-style files (shared files declared in the coordination registry such as server registration files, manifest files, or route/navigation barrels), the correct resolution is **keep-both**: retain BOTH this branch's registration AND the one already on `origin/main`. Never drop a sibling feature's registration to make the rebase pass.
3. For semantic conflicts (same line, genuinely divergent logic), stop and ask the user how to proceed. Do NOT silently pick a side.

> **Never resolve a conflict by `git merge`-ing the branch into local `main`.** Conflicts are resolved on the feature branch via rebase; local `main` stays a read-only mirror of `origin/main`.

#### 4c: Build + test verification (on the branch, pre-push)

Run verification on the rebased branch before pushing:

```bash
{BUILD_COMMAND}
{TEST_COMMAND}
```

If build or tests fail:
1. Report the errors.
2. Stop — do not push or open a PR for this branch.
3. Suggest: fix on the branch, commit, then re-run topology-merge for remaining branches.

#### 4d: Push the branch and open a PR

```bash
git push -u origin <branch>
```

Generate the PR body from the project's foundation docs — `CONTRACT-SHEET.md` (contracts honored), `DECISION-LOG.md` (DL entries made in scope), `VERIFICATION-TABLE.md` (verification state for this category) — plus the per-category `VERIFICATION-REPORT.md`. Then:

```bash
gh pr create \
  --base main \
  --head <branch> \
  --title "<type>(<scope>): <category-slug> — <one-line summary>" \
  --body "$(cat <<'EOF'
## <category-slug> (project: <project-name>)

### Scope
<categories/seams advanced — from VERIFICATION-TABLE.md>

### Contracts honored
<from CONTRACT-SHEET.md>

### Decisions made
<DL-<NNN> entries from DECISION-LOG.md added in this scope>

### Verification
<state from VERIFICATION-TABLE.md row + VERIFICATION-REPORT.md summary>

### Shared files touched
<call out any shared-file edits + how conflicts were resolved (keep-both)>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Report the PR URL. PRs merge **on the remote host** in the land order from Step 2 — do not merge them locally.

#### 4e: Clean up the branch (after the PR has merged)

Only after the PR is merged, sync local `main` and clean up the worktree + branch:

```bash
git checkout main && git fetch origin && git reset --hard origin/main
git worktree remove <worktree-path>  # if worktree exists
git branch -d <branch>
```

The worktree must be removed before the branch can be deleted (git prevents deleting a branch that a worktree references). If the PR is still open (not yet merged), leave the worktree and branch in place and note it in the report.

### Step 5: Report Results

```
## topology-merge Complete

**Project:** <project-name>
**PRs opened:** <N>
**Branches skipped:** <N> (Active/Empty)
**Build status:** PASS
**Test status:** PASS

### Landed Categories (PRs)
| Category | Branch | Commits | PR | Result |
|----------|--------|---------|----|--------|
| <cat> | {BRANCH_PREFIX}<project>/<cat> | N | #<N> | PR open / Merged ✓ |

### Skipped
| Category | Branch | Reason |
|----------|--------|--------|
| <cat> | {BRANCH_PREFIX}<project>/<cat> | Active worktree (in progress) |

### Remaining Worktree Branches
<list any topology branches that still exist, or "None">

### Next Steps
<If all PRs opened/merged:>
All topology worktree branches for <project> have been landed via PR.
Merge the PRs in the land order above, then sync local main
(git checkout main && git fetch && git reset --hard origin/main) and run:
  /topology-integrate <project-name>

<If some branches remain:>
<N> branches remain. Re-run topology-merge after those categories complete.
```

---

## Important Notes

- **NEVER `git merge` into local `main`.** Landing is via GitHub PR off fresh `origin/main`. Local `main` is a read-only mirror of `origin/main` — the only thing that reaches it is a PR merged on the remote host, pulled down via `git reset --hard origin/main`. This is PRINCIPLES § Git & PR coordination (rules 2 + 5), authored after a multi-session local-`main` divergence tangle.
- **Sequential landing is intentional** — opening + merging one PR at a time, with build+test on each rebased branch, catches integration issues at the earliest possible point and lets each later PR rebase on the prior merge. Do not batch.
- **Never land Active worktrees** — if a worktree still exists and the agent may still be working, skip it and report.
- **Shared-file conflicts are keep-both** — for append/registration-style shared files declared in the coordination registry, resolve rebase conflicts by retaining BOTH registrations. Genuinely divergent same-line logic is the only case that needs human judgment.
- **Branch naming convention** — all topology worktree branches use the pattern `{BRANCH_PREFIX}<project-name>/<category-slug>`. This convention is set by topology-implement when creating worktrees off `origin/main`.
- **No force operations on `main`** — topology-merge never force-pushes or merges into local `main`. It only force-resets local `main` to match `origin/main` after a PR merges, and deletes branches whose PR has merged.
- **No Workflow script needed** — this command is pure git/PR mechanics. The orchestration commands (`topology-sprint`, `topology-dispatch`, `topology-autopilot`) invoke it as a sub-step after verification gates pass; it does not itself fan out agents.

$ARGUMENTS
