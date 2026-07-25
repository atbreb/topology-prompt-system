# /topology-self-audit

Reports on whether the project's own tooling gates are actually wired — the meta-instrument that tells us if the rest of the harness is healthy. Run it in the recurring review cadence, or any time after changing harness tooling (scripts, commands, hooks).

> **Principle: the script is the source of truth.** You may not invent, re-weight, or LLM-grade the dimensions. You run the audit script and report what it prints. If you believe a dimension is mis-measured, propose a rubric change (bump `RUBRIC_VERSION` in the script) — never override the number in prose.

## Steps

1. Run the audit script and capture JSON:

   ```bash
   node <harness-scripts-dir>/topology-self-audit.js --json
   ```

   The harness scripts directory is the `scripts/` subdirectory adjacent to `{COMMANDS_DIR}` (e.g. `.claude/scripts/` when `{COMMANDS_DIR}` is `.claude/commands/`). For a human-readable bar chart, run the script without `--json`.

2. Present the result to the operator:
   - The **overall** score and the per-dimension table (score/10 + detail).
   - The **top_actions** list verbatim (lowest-scoring dimensions first), each with the exact remediation.
   - Do **not** add dimensions, change scores, or soften the script's findings. If a dimension appears mis-measured, propose a rubric change (bump `RUBRIC_VERSION` in the script) — do not override the number in prose.

3. If the operator wants it recorded, write a dated scorecard to `{COMPASS_DIR}/harness-scorecard-<YYYY-MM-DD>.md` containing the JSON output plus a one-line trend vs the previous scorecard if one exists.

## Dimensions (rubric v1.0.0)

| Dimension | Measures |
|---|---|
| `lockdown-coverage` | Test files guarding post-rebuild contracts (post-state lockdown tests) |
| `write-time-guards` | Write-time safety checks present, wired, and active |
| `eval-coverage` | Eval definitions in `{DOCS_ROOT}/evals/` for release-gating skills |
| `memory-health` | Persistent memory file size vs its configured budget |
| `decision-ledger` | DL-* entries and global ledger references (GC/GS/GD) present |
| `cost-knobs` | Subagent model and token-limit knobs pinned in harness settings |
| `doc-tier-presence` | Canonical tier doc directories present (when `{TIER_ENABLED}`) |

## Notes

- The script **fails soft** per dimension — a missing path scores low or skips, never crashes. A partial result is always returned.
- **`memory-health`** looks for the project's persistent memory file at the path derived from the repo slug. Override with the environment variable the script documents if it cannot find the file automatically.
- **`write-time-guards`** checks for a write-safety mechanism (e.g. a gate env var or a hook). The script documents which env var to set when the repo is quiet enough to activate it.
- **`eval-coverage`** counts eval definition files under `{DOCS_ROOT}/evals/`. A score of zero means no release-gating skill has a pinned eval harness yet — the top_action will name the first skill to cover.
- **`doc-tier-presence`** is a no-op when `{TIER_ENABLED}` is false. The script detects this and skips the dimension automatically.
- This command is **read-only**. It changes nothing unless you explicitly ask to write the dated scorecard.

{{#if COMPASS_ENABLED}}
Wire `/topology-self-audit` into the Compass weekly cadence and run it after any change to harness tooling.
{{/if}}

$ARGUMENTS
