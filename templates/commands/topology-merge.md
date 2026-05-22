# topology-merge

Merge completed category worktree branches back into the main branch. This command handles the sequential merge of one or more topology worktree branches, running build and test verification between each merge to catch integration issues early.

## Usage

```
/topology-merge <project-name> [<category-slug>]
```

### Arguments

- `<project-name>` — the project directory name under `{PROJECTS_ACTIVE_DIR}/`
- `<category-slug>` — (optional) merge only this category's branch. If omitted, merges all completed worktree branches in dependency order.

---

## Prerequisites

- [ ] Must be on the main branch (not inside a worktree)
- [ ] `TOPOLOGY-CLAUDE.md` exists and has a `Parallel Groups` section
- [ ] At least one topology worktree branch exists with commits ahead of main

If inside a worktree, stop and report:

> You are currently inside a worktree. Exit the worktree first with ExitWorktree,
> then run topology-merge from the main branch.

---

## Instructions

### Step 1: Discover Worktree Branches

List all branches matching the pattern `{BRANCH_PREFIX}<project-name>/*`:

```bash
git branch --list "{BRANCH_PREFIX}<project-name>/*"
```

For each branch found:
1. Check if it has commits ahead of main: `git log main..<branch> --oneline`
2. Check if it has a corresponding worktree directory: `git worktree list`

Build a merge candidates table:

| Branch | Category | Commits Ahead | Has Worktree | Status |
|--------|----------|---------------|-------------|--------|
| `{BRANCH_PREFIX}<project>/<cat>` | `<cat>` | N | Yes/No | Ready/Active/Empty |

- **Ready** = commits ahead of main, no active worktree (work is done, worktree was cleaned up or kept)
- **Active** = commits ahead of main, worktree still exists (work may be in progress)
- **Empty** = no commits ahead of main (nothing to merge)

If `<category-slug>` was provided, filter to only that branch.

If no Ready branches exist, report the state and stop.

### Step 2: Determine Merge Order

Read `TOPOLOGY-CLAUDE.md` for the `Parallel Groups` section and `Recommended Category Execution Order`.

Merge branches in dependency order:
1. Phase 1 categories before Phase 2
2. Phase 2 before Phase 3
3. Within a phase/parallel group, merge in the order listed in the execution order

This prevents merge conflicts from dependent changes landing out of order.

### Step 3: Pre-Merge Verification

Before merging each branch, verify the main branch is clean:

```bash
git status --porcelain
```

If there are uncommitted changes, stop and report:

> Main branch has uncommitted changes. Commit or stash them before merging.

### Step 4: Merge Each Branch Sequentially

For each Ready branch (in dependency order):

#### 4a: Preview the merge

```bash
git log main..<branch> --oneline --no-decorate
git diff main...<branch> --stat
```

Report the preview to the user:

```
### Merging: <category-slug>
**Branch:** {BRANCH_PREFIX}<project>/<category>
**Commits:** <N>
**Files changed:** <N>

<commit list>
<diffstat>
```

#### 4b: Attempt the merge

```bash
git merge <branch> --no-ff -m "refactor(<scope>): merge <category-slug> topology worktree

Merges {BRANCH_PREFIX}<project>/<category> branch containing <N> commits
for the <category-slug> category of the <project-name> topology project.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

Use `--no-ff` to preserve the branch history as a merge commit.

If the merge has conflicts:
1. Report the conflicting files
2. Stop and ask the user how to proceed (resolve manually, abort, skip this branch)
3. Do NOT attempt automatic conflict resolution

#### 4c: Post-merge build verification

After each successful merge:

```bash
{BUILD_COMMAND}
```

If build fails:
1. Report the build errors
2. Stop — do not proceed to the next branch
3. Suggest: fix the build error, commit the fix, then re-run topology-merge for remaining branches

#### 4d: Post-merge test verification

```bash
{TEST_COMMAND}
```

If tests fail:
1. Report failing tests
2. Stop — do not proceed to the next branch
3. Suggest: fix the failing tests, commit the fix, then re-run topology-merge

#### 4e: Clean up the branch

After successful merge + build + test, clean up the worktree (if it exists) and delete the branch:

```bash
git worktree remove <worktree-path>  # if worktree exists
git branch -d <branch>
```

The worktree must be removed before the branch can be deleted (git prevents deleting a branch that a worktree references).

### Step 5: Report Results

```
## topology-merge Complete

**Project:** <project-name>
**Branches merged:** <N>
**Branches skipped:** <N> (Active/Empty)
**Build status:** PASS
**Test status:** PASS

### Merged Categories
| Category | Branch | Commits | Result |
|----------|--------|---------|--------|
| <cat> | {BRANCH_PREFIX}<project>/<cat> | N | Merged ✓ |

### Skipped
| Category | Branch | Reason |
|----------|--------|--------|
| <cat> | {BRANCH_PREFIX}<project>/<cat> | Active worktree (in progress) |

### Remaining Worktree Branches
<list any topology branches that still exist, or "None">

### Next Steps
<If all categories merged:>
All topology worktree branches for <project> have been merged.
Run: /topology-integrate <project-name>

<If some branches remain:>
<N> branches remain. Re-run topology-merge after those categories complete.
```

---

## Important Notes

- **Sequential merges are intentional** — merging one at a time with build+test between each catches integration issues at the earliest possible point. Do not batch merges.
- **Never merge Active worktrees** — if a worktree still exists and has commits, the agent may still be working. Skip it and report.
- **Conflict resolution is manual** — topology-merge does not attempt automatic conflict resolution. Conflicts in a topology project likely indicate a seam contract violation that needs human judgment.
- **Branch naming convention** — all topology worktree branches use the pattern `{BRANCH_PREFIX}<project-name>/<category-slug>`. This convention is set by topology-implement when creating worktrees.
- **No force operations** — topology-merge never force-deletes branches or discards changes. It only deletes branches that have been fully merged.

$ARGUMENTS
