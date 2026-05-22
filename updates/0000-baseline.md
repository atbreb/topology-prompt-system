---
id: 0000-baseline
title: Baseline (v1.0.0 initial release)
type: template-sync
targets: [all]
min_system_version: "1.0.0"
---

## What changes

Nothing to apply. This is the baseline marker for the v1.0.0 release — the state every fresh
install starts from. It exists so the update queue has a well-defined floor and so
`/topology-update --check` on a brand-new install reports a clean, non-empty history rather than
an empty directory.

Real updates begin at `0001`.
