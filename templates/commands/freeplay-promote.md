# freeplay-promote

Graduate a freeplay task into a full topology project. Uses the freeplay trail as seed discovery material — the task description, topology context, and any DL-FP decisions become the foundation for `/topology-discovery`.

> **See `.claude/commands/topology-PRINCIPLES.md`** for the design discipline. This command bridges freeplay's lightweight mode into the full topology pipeline. It is the only mutation path from freeplay → project.

## Usage

```
/freeplay-promote <FP-ID>
/freeplay-promote <FP-ID> --project-name <name>
```

### Arguments

- `<FP-ID>` — the freeplay entry to graduate (e.g., `FP-003`).
- `--project-name <name>` — optional project directory name. If omitted, derived from the FP entry's summary.

---

## Instructions

### Step 1: Load the freeplay entry

Read `{DOCS_ROOT}/FREEPLAY-LOG.md` and extract the entry for `<FP-ID>`. If the entry doesn't exist, stop: "FP-<ID> not found in FREEPLAY-LOG.md."

If the entry's `Graduated to project` field is already set, stop: "FP-<ID> was already promoted to `<project>` — cannot promote twice."

### Step 2: Extract seed discovery material

From the freeplay entry, extract:

1. **Task description** → becomes the discovery session's starting prompt
2. **Touched contracts** → these contracts' invariants are verified or amended by the project
3. **Touched seams** → these seams become the initial seam set
4. **Honored decisions** → these decisions constrain the project from day one
5. **DL-FP decisions** → these become seed entries in the new project's DECISION-LOG
6. **Summary** → provides context for the project's scope

### Step 3: Present the promotion plan

```
### Freeplay Promote: FP-<ID> → topology/<project-name>

**Seed discovery material:**
- Original task: <one-line summary>
- Type: <fix|enhance|...>
- Contracts to carry forward: <C-IDs>
- Seams to carry forward: <S-IDs>
- Decisions to carry forward: <DL-IDs>
- New decisions to seed: <DL-FP-IDs> → will become DL-001, DL-002, ... in the new project

**The new project will be created at:**
`{PROJECTS_ACTIVE_DIR}<project-name>/`

**This will invoke `/topology-discovery`** with the seed material above as the
initial prompt. The discovery session will produce a DISCOVERY.md, which
`/topology-init` will scaffold into a full project.

Proceed?
```

Wait for operator confirmation before proceeding.

### Step 4: Invoke topology-discovery

If confirmed, invoke `/topology-discovery` with the seed material:

```
/topology-discovery <project-name>
```

The discovery prompt should include:
- The freeplay task's original description and summary
- The topology context (contracts, seams, decisions)
- The DL-FP decisions as seed decision proposals
- A note that this originated from freeplay entry FP-<ID>

### Step 5: Annotate the freeplay entry

After `/topology-discovery` completes and `/topology-init` scaffolds the project, update the freeplay entry's `Graduated to project` field:

```markdown
- **Graduated to project:** `<project-name>` (2026-07-26)
```

Also append a note to the entry's Summary section:

```markdown
**Promoted to topology project on <YYYY-MM-DD>.** See `{PROJECTS_ACTIVE_DIR}<project-name>/`.
The project's DECISION-LOG seeds from this entry's decision trail. This freeplay entry is now
frozen — further work on this area should go through the topology project.
```

Do NOT remove the freeplay entry — it's the provenance record.

---

## Important Notes

- **Promotion is one-way.** Once a freeplay task is promoted to a project, the freeplay entry is frozen. Further work on that area goes through the project's topology pipeline.
- **DL-FP decisions become project decisions.** The lightweight DL-FP entries are promoted to full DECISION-LOG entries in the new project. They're re-numbered (DL-001, DL-002, …) and carry a "Promoted from DL-FP-<ID>" provenance note.
- **The freeplay trail is the provenance record.** The promoted entry stays in FREEPLAY-LOG.md — it's how we know where the project came from.
- **Not every freeplay task should be promoted.** Promotion is for tasks that revealed work warranting a full project. Most freeplay tasks stay as freeplay entries — they're the lightweight trail, not project seeds.

$ARGUMENTS
