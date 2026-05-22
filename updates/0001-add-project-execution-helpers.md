---
id: 0001-add-project-execution-helpers
title: Add the four project-* execution helper commands
type: template-sync
targets: [project-next-phase, project-prep-scaffolding, project-verify, project-promote]
min_system_version: "1.0.1"
---

## What changes

v1.0.0 shipped the topology lifecycle commands but **not** the four implementation-execution
helpers they delegate to. `topology-implement`, `topology-phase-plan`, `topology-verify`,
`topology-dispatch`, `topology-sprint`, `topology-init`, `topology-doc-walk`, and
`topology-PRINCIPLES` all reference `project-next-phase` and `project-prep-scaffolding`, and those
in turn reference `project-verify` and `project-promote` — so an install before this version had
dangling command references the moment the implement phase ran.

This update adds all four as abstracted templates:

- `project-prep-scaffolding` — scaffolds a phase's implementation directory (session prompts +
  runbooks), optionally topology-aware.
- `project-next-phase` — executes the next implementation phase against the scaffolded plan
  (advisory, non-blocking topology checks).
- `project-verify` — formal per-phase verification; findings land **Proposed**, never Active
  (the lighter sibling of `topology-verify`).
- `project-promote` — promotes a completed implementation's findings to the documentation layer
  (tier docs gated on `{{#if TIER_ENABLED}}`, global layer always).

## How to apply

Template-sync only — nothing imperative to run. Re-vendor the latest system
(`git pull` + `install.sh`) and run `/topology-update`. The recompile compiles the four new
commands into your `{commands_dir}/` using your existing profile (tier/delegation/example tokens
applied just like the rest). No new profile keys are introduced, so there's no mini-interview.

## Idempotency note

A recompile is inherently idempotent — the four commands are simply present after it. Skip if
`{commands_dir}/project-next-phase.md` already exists and matches the current template.
