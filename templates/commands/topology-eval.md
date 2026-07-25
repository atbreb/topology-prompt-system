# topology-eval

Reliability bar for a change to one of your own skills. Runs the skill `k` times per task in
isolation against pinned fixtures, grades deterministically, and returns a GO/NO-GO verdict.
Run BEFORE merging a change to a **release-gating skill** (`topology-verify`, `topology-e2e`,
`topology-promote`) — or any skill that has an eval definition.

> **Principle:** the deterministic engine `{COMMANDS_DIR}/scripts/topology-eval.js` is the
> **source of truth** for scoring and the GO/NO-GO verdict. You orchestrate the runs and capture
> their output; you do **not** grade by judgment, and you do **not** override the script's verdict
> in prose. This mirrors the fact-first doctrine used throughout the harness: the script's exit
> code is the verdict, not an LLM vote.

## Usage

```
/topology-eval <skill>
```

### Arguments

- `<skill>` — the skill under test (e.g. `topology-verify`, `topology-promote`). Its eval
  definition lives at `{DOCS_ROOT}/evals/<skill>.md` (prose + one fenced `json` spec block).

---

## Inputs

- `<skill>` — the skill under test. Its eval def lives at `{DOCS_ROOT}/evals/<skill>.md` (prose +
  one fenced ```json spec). If none exists, scaffold one and stop for the operator to fill it in:
  ```bash
  node {COMMANDS_DIR}/scripts/topology-eval.js template <skill>
  ```

---

## Steps

### Step 1: Validate the definition (fail fast on a malformed spec)

```bash
node {COMMANDS_DIR}/scripts/topology-eval.js spec <skill>
```

Read the tasks, their `fixture`, `prompt`, and `graders`. Note `bar.k` (runs per task) and which
tasks are `releaseGating`.

If the definition does not exist, scaffold it and stop:

```bash
node {COMMANDS_DIR}/scripts/topology-eval.js template <skill>
```

Report: "No eval definition found for `<skill>`. A scaffold has been written to
`{DOCS_ROOT}/evals/<skill>.md`. Fill in the tasks, fixtures, and graders, then re-run
`/topology-eval <skill>`."

Do not proceed past this step until the operator confirms the definition is complete.

---

### Step 2: Run each task `k` times in isolation

For each task, launch `k` independent runs. Each run is a **fresh subagent with clean context**
(use the foreground specialist that matches the skill's domain), given ONLY the task's `fixture` +
`prompt`. Runs must not see each other's output — that is what makes `pass^k` meaningful.

- If a task's `fixture` requires mutating the working tree, give each run its **own throwaway
  worktree** off a fresh `origin/main`. Remove the worktree after the run completes. Read-only
  tasks need no worktree.
- Capture each run's **final output verbatim** to a file:
  `"$TMPDIR/topology-eval/<skill>/<task>/<run>.out"`. If the run executed a proof command, also
  record its `exitCode`.
- Respect the resource posture: run **≤2–3 concurrent runs** (write/build-class operations), then
  `wait` between batches. A setting of `k=3` across a few tasks means small batches.

---

### Step 3: Assemble the results file `results.json`

```json
{
  "runs": [
    { "taskId": "<id>", "run": 1, "outputPath": "<abs .out path>", "exitCode": 0 }
  ]
}
```

One entry per `(task, run)`. Every task must have exactly `k` entries — fewer forces NO-GO.

---

### Step 4: Grade deterministically (the script decides; its exit code is the verdict)

```bash
node {COMMANDS_DIR}/scripts/topology-eval.js grade <skill> --results results.json
# exit 0 = GO   |   exit 1 = NO-GO   |   appends a line to {DOCS_ROOT}/evals/<skill>.log
```

Use `--json` for the machine-readable verdict. Use `--no-log` to grade without recording.

---

### Step 5: Report

Report the scorecard verbatim (capability, regression, per-task `pass@k` / `pass^k` table) and the
GO/NO-GO verdict.

- **On NO-GO:** do not merge the skill change. Surface the failing tasks and the exact runs that
  failed. State which bar was not met (`pass@k < 0.90` or `pass^k < 1.00`).
- **On GO:** state which bar was met and note the log entry appended to
  `{DOCS_ROOT}/evals/<skill>.log`.

---

## Evaluating a proposed skill change

To gate a change: run the eval with the **proposed** skill prompt in place (e.g. on the change's
branch or worktree), then compare the `.log` against the prior GO baseline.

- A change that turns a GO into a NO-GO is a **regression** — it must not merge.
- A change that lifts a previously NO-GO task to GO is the win you were trying to achieve.
- Never merge a release-gating skill change that does not hold its eval at GO.

---

## Notes

- **Deterministic graders gate; model graders advise.** Every task needs ≥1 deterministic grader
  (`grep` / `exit-code` / `script`); a `model` grader (if present) is recorded in results but
  never decides GO/NO-GO. This mirrors the fact-first "exit code is the verdict" doctrine used
  throughout the harness.
- **Keep eval suites small and high-signal.** Aim for 3–5 tasks on release-gating skills. A flaky
  grader in a release gate is worse than no gate — prefer `exit-code` / `script` graders over
  fragile `grep`.
- **Eval definitions live in `{DOCS_ROOT}/evals/`.** See `{DOCS_ROOT}/evals/_SCHEMA.md` for the
  definition format and metric definitions. If a worked example exists (e.g.
  `{DOCS_ROOT}/evals/topology-verify.md`), read it before authoring a new definition.
- **Changing a release-gating skill requires a passing eval.** A change to `topology-verify`,
  `topology-e2e`, or `topology-promote` that does not first hold its eval bar at GO must not be
  merged. The eval is the unit test for the harness itself.

$ARGUMENTS
