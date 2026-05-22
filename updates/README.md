# Updates — shipping improvements to already-molded installs

This directory is how a system maintainer ships an improvement that reaches **every existing
install** — even ones that were molded months ago — without clobbering anyone's tailoring. It is
the authoring side of `/topology-update` (see `ABSTRACTION-SPEC.md` §6).

There are two ways to ship a change. Reach for the lightest one that works.

## 1. Template-sync (the default — no file here needed)

If your change can be expressed by editing a template under `templates/`, just do that and bump
`VERSION`. When a user re-vendors (`git pull` + `install.sh`) and runs `/topology-update`, the
recompile carries your change into their molded commands automatically — their profile is
unchanged, so their paths/stack/examples are preserved.

Use template-sync for: wording, a new step, a tightened rule, a new `{{#if}}` branch, even a
**new token** (add it to `ABSTRACTION-SPEC.md` §4 — the update engine will mini-interview users
for just the new value). This covers the large majority of changes.

You *may* drop a `type: template-sync` file here purely for changelog/visibility, but it is not
required — the recompile already did the work.

## 2. Semantic update (for new paradigms a recompile can't carry)

Some changes aren't a template edit a recompile would deliver to an existing install — e.g.
"introduce a whole new paradigm and weave it into two specific commands." Ship those as a
numbered file here. `/topology-update` applies each **once** per install (tracked in the user's
`profile.applied_updates`), molding the new content to that project just like the installer did.

### File format

`updates/NNNN-short-slug.md`, zero-padded sequential id:

```markdown
---
id: 0007-introduce-evidence-ledger
title: Introduce the Evidence Ledger paradigm
type: semantic                 # semantic | template-sync
targets: [topology-implement, topology-verify]   # command basenames, or "all"
min_system_version: "1.2.0"
---

## What changes
<Plain-language description of the new paradigm/pattern.>

## How to apply
<Concrete, basename-addressed instructions the update engine follows against each target's
COMPILED command — e.g. "After the pre-flight loadout step in topology-implement, add a step that
records an evidence-ledger entry per verified assertion." Write it so it molds to the local
project via the profile: reference {TOKEN}s where a real value should appear, and respect the
same {{#if}} gates (don't add delegation prose to a solo profile).>

## Idempotency note
<How the engine can tell the change is already present, so a re-run is a no-op even before the
applied_updates guard — e.g. "skip if a step titled 'Evidence Ledger' already exists.">
```

### Rules for authors

- **Address commands by frozen basename**, never by path. Naming stability (spec §7) is what lets
  an update find the right command in any install.
- **Prefer template-sync.** Only use a semantic update when a recompile genuinely can't deliver
  the change to an *existing* install. When you do ship a semantic update, also make the
  equivalent edit to the template — so fresh installs get the paradigm from the template and
  existing installs get it from the update. The two paths must converge on the same end state.
- **Respect the profile.** Write directives that mold to the local project (tokens + `{{#if}}`
  gates), not CalibraOS-specific or stack-specific instructions.
- **One paradigm per file.** Keep updates small and reversible-in-description.
- **Renames are migrations.** Renaming a command or a profile key is a breaking change: ship it as
  a dedicated migration update and bump the major `VERSION` (spec §7).

Compass ships its own queue at `compass-prompt-system/updates/` with the same rules.
