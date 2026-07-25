# Topology Prompt System

**A battle-tested, project-agnostic prompt system for AI-driven system rebuilds — that molds
itself to *your* codebase on first run, and stays up to date as the system evolves.**

Most "AI coding workflow" prompt packs are generic by necessity, so they stay generic in use:
you read `<your test command here>` forever and the agent guesses at your conventions. This system
takes the opposite stance. It ships **abstract**, then **compiles** itself into concrete,
project-native commands — every `/topology-*` and `/compass-*` command rewritten to speak your
real paths, your real test/build commands, your real module names, your real examples. The
generic placeholders disappear at install time. What's left reads as if the prompts were authored
for your repo specifically.

It was extracted from a large multi-app platform where it drove dozens of production rebuilds. The
*methodology* is the product; this repo makes that methodology portable.

---

## The two layers

| Layer | Question it answers | Lives in |
|-------|---------------------|----------|
| **Topology** | *How do we rebuild a system correctly, phase by phase, without an agent losing the thread?* | this repo (root) |
| **Compass** | *Why are we building this, where are we going, and what does "done" look like?* | [`compass-prompt-system/`](./compass-prompt-system) |

Topology is the execution engine. Compass is the strategic layer that sits above it. You can
install both, or Topology alone, or add Compass later.

---

## Why it works: the discipline

Topology rebuilds a system by producing four kinds of durable artifact:

- **Contracts** — always-true facts about the system (invariants), never goals.
- **Seams** — producer→consumer boundaries with *explicit, bilateral* guarantees.
- **Decisions** — a permanent, append-only record of every choice and its rationale.
- **Categories** — responsibility slices, each the sole owner of exactly one thing.

Implementation then runs phase by phase, each phase scoped tightly enough that an agent picking up
the work cold can load the right artifacts in the right order, write code against firm contracts,
and verify against pre-written assertions — without re-deriving anything already settled.

Every command in the system is engineered against **five failure modes** that derail AI
implementers:

1. **Context overload** — the agent loads everything and makes generic choices. → Each category
   carries a *filtered* view of only the decisions that constrain it.
2. **Scattered cross-cutting concerns** — the agent edits X and silently breaks Y. → Each category
   names its seam touchpoints and the adjacent category to consult first.
3. **Producer breaks consumer** — silent contract violations. → Every seam is bilateral; verify
   cross-checks both sides.
4. **Phase-context loss** — the agent loads a category but doesn't know what's in scope *this*
   phase. → A non-skippable pre-flight context loadout.
5. **Decision relitigation** — the agent reopens a settled fork. → Decisions are append-only;
   reopening requires an explicit annotation.

If a change to any command would weaken one of these mitigations, that change is wrong. The full
articulation lives in the compiled `topology-PRINCIPLES` command.

---

## How the molding works

This is the part that makes the system portable. Three ideas:

### 1. Two states: template and compiled

```
templates/commands/topology-implement.md     ← abstract: {PLACEHOLDERS} + {{#if}} blocks
        +  .topology/profile.yml              ← your project's answers
        =  .claude/commands/topology-implement.md   ← concrete: zero placeholders, native
```

The compiled command is a **build artifact**. It's always regenerable from `template + profile`.
You never hand-edit it; all your tailoring lives in the profile.

### 2. The profile is the only place your tailoring lives

`/topology-install` scans your repo, interviews you about the handful of things a scan can't infer
(delegation, autonomy posture, cadence, milestones…), and writes one file: `.topology/profile.yml`.
Every compile reads it. Want to change how a command reads? Edit the profile, recompile. That's it.

### 3. Updates can't clobber you — because there's nothing of yours to clobber

Since the compiled output is a build artifact and your molding is data in the profile, shipping an
improvement is safe by construction. Two channels (the **hybrid** model):

- **Template-sync** — a maintainer edits a template; you `git pull` + re-vendor + `/topology-update`
  recompiles against your *unchanged* profile. New settings an update introduces trigger a
  one-or-two-question mini-interview, never a full re-interview.
- **Semantic updates** — genuinely new paradigms that a recompile can't carry ship as one-time
  directives in [`updates/`](./updates), keyed on stable command names, applied exactly once per
  install and recorded in your profile. A fresh install gets the paradigm from the template; an
  existing install gets it woven in by the update — both converge on the same end state.

The whole contract is specified in [`ABSTRACTION-SPEC.md`](./ABSTRACTION-SPEC.md).

---

## Quick start

```bash
# 1. Clone this system
git clone <this-repo> ~/Projects/topology-prompt-system

# 2. Vendor it into your project + place the bootstrap commands
cd ~/Projects/topology-prompt-system
./install.sh /path/to/your-project

# 3. Open your project in Claude Code and mold the system to it
/topology-install
```

`/topology-install` will:
1. **Scan** your project (languages, package manager, test/build/lint/codegen commands, monorepo
   layout, doc root, git conventions, existing `CLAUDE.md`, agent setup).
2. **Interview** you about what it can't detect — in short rounds, leading with what it found.
3. **Write** `.topology/profile.yml`.
4. **Compile** every command into `.claude/commands/`, dropping anything irrelevant to your setup
   (e.g. delegation blocks vanish entirely for a solo-Claude profile).
5. **Optionally surface gaps** in how your codebase is set up to get the most out of the system
   and *propose* additions (it won't write anything without your approval).

Pulling updates later:

```bash
cd ~/Projects/topology-prompt-system && git pull
./install.sh /path/to/your-project        # re-vendors the latest system
# then, in Claude Code:
/topology-update                          # recompiles + applies one-time updates
```

### NL Routing Layer (optional, ~55-60 min)

After `/topology-install` completes, you can set up natural-language routing so you never need to memorize command names. The system learns how YOU talk about your work and routes your casual language to the right command.

```
# Phase A — already done by /topology-install (technical scan)
# Phase B — NL interview (~35-40 min)
node .claude/scripts/interview/nl-interview.js --phase 1   # automated domain scan
node .claude/scripts/interview/nl-interview.js --phase 2   # command coverage scenarios
node .claude/scripts/interview/nl-interview.js --phase 3   # frustration ladder
node .claude/scripts/interview/nl-interview.js --phase 4   # edge cases
node .claude/scripts/interview/nl-interview.js --phase 5   # correction sweep

# Phase C — compile your intent map
node .claude/scripts/intent-map/compile-intent-map.js --input <interview-output.json>

# Activation — add to .claude/settings.local.json:
# "hooks": { "UserPromptSubmit": [{ "matcher": "*", "hooks": [{
#   "type": "command", "command": "node <project>/.claude/scripts/hooks/nl-router.js",
#   "timeout": 5 }] }] }
```

After activation, typing "what does the HIL queue look like" routes to `/topology-gates`. Typing "audit everything" routes to a 7-step chain. Commands like `topology-promote` and `topology-autopilot` are denylisted — they require explicit invocation.

The interview captures YOUR vocabulary. It's personal data — the intent map is stored at `~/.claude/topology/`, outside version control.

---

## The commands

After install, these are live as `/`-commands in your project, molded to it.

### Topology — lifecycle

```
topology-global-init   Stand up the platform-wide contracts/seams/decisions layer (run once)
topology-discovery     Interview-driven discovery of a system area before a rebuild
topology-init          Initialize a rebuild project: derive categories + foundation docs
topology-current-state Per category: map what exists today
topology-gap           Per category: gap between current and contract-true state
topology-phase-plan    Per category: sequence the work into verifiable phases
topology-future-state  Per category: define the target state + assertions
topology-implement     Per category: implement a phase against firm contracts
topology-verify        Per category: verify against pre-written, bilateral assertions
topology-integrate     After a few categories: integration checkpoint
topology-e2e           Extract runtime test cases; graduate verified work to the e2e stage
topology-promote       Synthesize to platform docs, close the strategic row, archive
```

### Topology — autonomy & support

```
topology-sprint-plan / topology-sprint / topology-autopilot   Plan and run sprints across groups
topology-resume / topology-decide                              Pause/resume on human decisions
topology-status / topology-trace / topology-diagnose          Inspect, trace seams, diagnose
topology-patch / topology-merge / topology-dispatch           Surgical fixes, worktree merges, dispatch
topology-doc-walk / topology-next                             Batch-walk docs, pick the next move
topology-eval                                                  Eval-gate skill changes (pass@k / pass^k)
topology-self-audit                                            Maturity scorecard for the harness itself
```

The system molds itself along two **independent** axes:

- **Autonomy** — how much the agent *does* without you. Strict by default: every proposed decision
  pauses for you, and contract/seam amendments always pause regardless of posture. (`strict` /
  `balanced` / `autopilot`.)
- **Teaching stance** — how much the agent *explains* while it works. Always on; orthogonal to
  autonomy. `student` (lessons by default, dial down on request) / `curious` (flags learnable
  moments, you pick what to go deep on) / `quiet-pro` (silent unless it infers you've hit a snag).
  Spec: `templates/protocols/TEACHING-STANCE-PROTOCOL.md`.

Every command also carries a **Workflow-orchestration substrate** (v1.2.0+). When the Workflow
tool is available, prose loops become deterministic, resumable Workflow scripts with typed
structured output. Five patterns: pipeline-over-categories, worktree-isolated parallel fan-out,
find→adversarial-refutation, multi-modal sweep→completeness-critic, and Workflow-per-group with
main-loop HITL adjudication. Paused runs resume from a cached `runId` — completed stages are
free. The prose-mode path is fully preserved for environments without the Workflow tool.

Delegation to a secondary agent is *optional* — install solo and all of that prose compiles out
cleanly. Parallel **subagent dispatch is auto-adopted**: if your project already defines
`.claude/agents/*.md`, the installer wires them in with no question (ask-by-exception only).

### Topology — implementation helpers

The execution layer that `topology-implement` and `topology-phase-plan` delegate to. You rarely
invoke these directly, but the lifecycle depends on them.

```
project-prep-scaffolding   Scaffold a phase's implementation directory (session prompts + runbooks)
project-next-phase         Execute the next implementation phase against the scaffolded plan
project-verify             Formal per-phase verification (advisory checks → Proposed findings)
project-promote            Promote a completed implementation's findings to the doc layer
```

### Compass — strategic cadence

```
compass-weekly-brief   Set the week's plan — must-do vs like-to-do
compass-check          Daily focus + mid-week reconciliation against shipped work
compass-update         Refresh the state-of-the-union with current reality
compass-risk           Review and update the risk register
compass-onboard <role> Generate a role-tailored onboarding guide
```

See [`compass-prompt-system/`](./compass-prompt-system) for the strategic layer in full.

---

## Repository structure

```
topology-prompt-system/
├── README.md                      ← you are here
├── ABSTRACTION-SPEC.md            ← the contract: token registry, template syntax, compile rules
├── VERSION                        ← system version (drives updates)
├── install.sh                     ← vendor the system into a project + place bootstrap commands
├── bootstrap/
│   ├── topology-install.md        ← the initiation prompt (scan + interview + compile)
│   └── topology-update.md         ← the update engine (recompile + one-time semantic updates)
├── templates/
│   ├── commands/                  ← 28 topology commands + 4 project-* execution helpers (+ topology-PRINCIPLES)
│   ├── protocols/                 ← autonomy + dispatch protocol templates
│   └── skeletons/                 ← empty seeded global + project-foundation doc templates
├── profile/
│   ├── profile.schema.md          ← the profile schema
│   └── profile.example.yml        ← a worked example profile
├── updates/                       ← one-time semantic updates + the authoring guide
└── compass-prompt-system/         ← the Compass sub-system (its own templates, bootstrap, updates)
```

---

## Authoring improvements

Maintainers ship changes that reach **every existing install** — even ones molded long ago —
without breaking anyone's tailoring. Most changes are a template edit + a `VERSION` bump (users
recompile and get them automatically). New paradigms ship as one-time semantic updates. The full
authoring guide is in [`updates/README.md`](./updates/README.md), governed by `ABSTRACTION-SPEC.md`
§6–§7 (the naming-stability contract is what makes updates land reliably).

---

## Design tenets (for contributors)

- **The methodology is sacred; only the bindings are abstract.** Tokenize paths, stack, names,
  cadence, and the delegation roster — never the discipline. If removing a sentence would weaken a
  failure-mode mitigation, it's methodology: keep it verbatim.
- **Closed vocabulary.** Only registered tokens are substituted; every other `{...}` (types, JSON,
  doc templates) is left literal. Adding a token means editing `ABSTRACTION-SPEC.md` §4.
- **Names are frozen.** Command basenames, profile keys, foundation/global doc filenames, and
  token names don't change without a migration. This is what lets updates target an install years
  later.
- **Compiled output is disposable; the profile is precious.** Never put project-specific content
  anywhere but the profile.

---

## Provenance

Extracted and generalized from the topology + compass prompt systems that drove rebuilds on a
production multi-app platform. The methodology — contracts/seams/decisions/categories, the five
failure modes, append-only foundation docs, bilateral seams, the implementer pre-flight loadout —
is preserved here verbatim; only the environment bindings were made portable.
