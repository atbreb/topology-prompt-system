---
id: 0002-add-teaching-stance
title: Add the adaptive teaching-stance axis (student / curious / quiet-pro)
type: semantic
targets: [topology-PRINCIPLES, topology-implement, compass-onboard]
min_system_version: "1.1.0"
---

## What changes

A new built-in axis, **teaching stance**, orthogonal to autonomy. Autonomy governs how much the agent
*does* without you; teaching stance governs how much it *explains to you* while doing it. Always on,
three modes:

- **`student`** — lessons ON by default at every meaningful juncture; user dials volume down per session.
- **`curious`** — agent flags learnable moments inline (`💡 Learnable:`); user picks what to go deep on.
- **`quiet-pro`** — silent by default; offers a lesson only when it *infers* real friction, as a one-line ask.

Fresh installs get this from the templates (the protocol doc, the PRINCIPLES section, the loadout step).
This update weaves it into installs that compiled before v1.1.0.

## How to apply

1. **New profile key (mini-interview).** Add `agents.teaching_stance` to the profile if absent. Ask the
   operator which of `student` / `curious` / `quiet-pro` is their default (one question; default `curious`).
   Record it. This feeds the new `{TEACHING_STANCE}` token.

2. **Install the protocol doc.** Compile `templates/protocols/TEACHING-STANCE-PROTOCOL.md` and write it
   to the commands_dir parent (alongside `TOPOLOGY-AUTONOMY-PROTOCOL.md`) — same location resolution as
   the other protocols for this install.

3. **`topology-PRINCIPLES`** — if it has no "Teaching stance" section, add one (orthogonal-to-autonomy
   framing + the three-mode one-paragraph summary + the two non-negotiables: teaching is additive output
   never a gate, and never distorts the methodology to simplify a lesson). Add a step **7** to the
   implementer pre-flight loadout that reads the active stance (session override else `{TEACHING_STANCE}`),
   and a row to the "How this doc relates" table noting the stance applies to all commands.

4. **`topology-implement`** — in the Step 2.7 loadout list, add the same step 7 (read active stance) and
   add a `teaching stance: {TEACHING_STANCE}` line to the loadout report block.

5. **`compass-onboard`** — add the note that onboarding runs its session in `student` stance regardless of
   profile default, then hands off at `{TEACHING_STANCE}`.

Respect the profile and the `{{#if}}` gates throughout (e.g. don't add delegation prose to a solo
profile). Mold `{TEACHING_STANCE}` to the project's chosen default everywhere it appears.

## Idempotency note

Skip any step whose result is already present: if `TEACHING-STANCE-PROTOCOL.md` exists in the commands_dir
parent, if `topology-PRINCIPLES` already has a "Teaching stance" section, if the loadout already has a
"teaching stance" step, or if `agents.teaching_stance` is already in the profile. A re-run is then a no-op
even before the `applied_updates` guard.
