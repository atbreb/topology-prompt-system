# freeplay-log

View freeplay session history. Shows what was done, what topology artifacts were touched, and any decisions made. Read-only — never modifies the log.

> **See `.claude/commands/topology-PRINCIPLES.md`** for the design discipline. This command is a read-only viewer for the FREEPLAY-LOG.md trail.

## Usage

```
/freeplay-log                    # list all entries (compact)
/freeplay-log <FP-ID>            # show full entry
/freeplay-log --since <date>     # filter by date (YYYY-MM-DD)
/freeplay-log --type <type>      # filter by task type
/freeplay-log --touches <ID>     # find entries that touched a contract/seam/decision
```

### Arguments

- `<FP-ID>` — a specific freeplay entry (e.g., `FP-003`). Shows the full entry including summary and decision trail.
- `--since <date>` — only show entries from this date onward.
- `--type <type>` — filter by task type (`fix`, `enhance`, `explore`, `refactor`, `audit`, `repair`, `research`).
- `--touches <ID>` — find entries that reference a specific contract (`C<N>`), seam (`S<N>`), or decision (`DL-<NNN>`). Useful for tracing what freeplay work has touched a given topology artifact.

---

## Instructions

### Step 1: Read the log

Read `{DOCS_ROOT}/FREEPLAY-LOG.md`. If it doesn't exist, report: "No freeplay sessions yet. Use `/freeplay <description>` to start one."

### Step 2: Filter

Apply any filters (`--since`, `--type`, `--touches`, or a specific FP-ID).

### Step 3: Render

**If `<FP-ID>` is specified:** render the full entry (summary + decision trail).

**Otherwise:** render a compact table:

```
## Freeplay Log — <N> entries

| FP-ID | Date | Type | Summary | Touched | Follow-up |
|-------|------|------|---------|---------|-----------|
| FP-003 | 2026-07-26 | fix | Fixed billing edge case | C3, S3 | — |
| FP-002 | 2026-07-25 | explore | Mapped Odoo error handling | — | FP-003 |
| FP-001 | 2026-07-25 | audit | Verified seam S4 integrity | S4 | — |
```

**If `--touches <ID>` is specified:** add a line above the table: "Entries touching `<ID>`:" and render only matching entries.

**If `--since <date>` is specified:** render only entries on or after that date.

---

## Important Notes

- **Read-only.** This command never modifies FREEPLAY-LOG.md. Any edits to the log are done via `/freeplay` (which appends) or manually by the operator.
- **The log is the authority.** If an entry says it touched S4, it touched S4. The log is the trail — trust it, and if it's wrong, correct it directly in the file.
- **Cross-reference with topology-status.** Freeplay entries that touch verified areas are potential regression sources. Use `/freeplay-log --touches <seam>` before re-verifying a seam to check for relevant freeplay work.

$ARGUMENTS
