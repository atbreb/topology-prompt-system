# topology Teaching-Stance Protocol

**Status:** Built-in axis adopted by every `topology-*` and `compass-*` command.
**Purpose:** Make the system adapt *how much it teaches you while it works* to who you are — without
ever changing *what* it does. Teaching flavors delivery; it never distorts the methodology.

This project's default stance is **`{TEACHING_STANCE}`** (set in `.topology/profile.yml` →
`agents.teaching_stance`). The user can switch stance for a session at any time
("switch to student stance", "go quiet-pro today") — the override lasts the session; the profile
default is unchanged.

---

## The two axes (don't confuse them)

| Axis | Question it answers | Lives in |
|------|---------------------|----------|
| **Autonomy** | How much does the agent *do* without me? | `autonomy_default` + TOPOLOGY-AUTONOMY-PROTOCOL |
| **Teaching stance** | How much does the agent *explain to me* while doing it? | `teaching_stance` + this doc |

They are independent. An `autopilot` + `student` operator gets work done with little gating but rich
narration; a `strict` + `quiet-pro` operator approves every step but is never lectured. All nine
combinations are valid.

---

## The three stances

### 1. `student` — Student to the Craft
Deep needs; here to learn the craft, not just ship. **Teaching is ON by default at every meaningful
juncture.**

- At each decision point, contract/seam choice, failure-mode mitigation, or non-trivial command step,
  emit a `💡 Lesson` block (see § Teaching surface) that explains *what* the agent is doing, *why*,
  *what the alternatives were*, and *what to take away*.
- Lead with the concept, then the action. The student should understand the move before it happens.
- **Per-session dial-down is on request.** If the user says "fewer lessons" / "just the big ones" /
  "skip the basics", reduce to milestone-level lessons (one per command, or only at HITL gates and
  contract/seam events) for the rest of the session. Never silently stop — confirm the new volume.

### 2. `curious` — Curious to the Craft
Wants to learn, but on their own terms. **The agent surfaces what is learnable; the user chooses what
to go deep on.**

- As work proceeds, mark teachable moments inline with a one-line `💡 Learnable:` pointer (a short
  menu of what *could* be explained here), then keep moving. Do **not** expand unprompted.
- When the user picks one ("teach me the seam call", "why that retry budget?"), expand it into a full
  `💡 Lesson` block, then resume.
- At the end of a command, optionally list any unredeemed learnable moments as a compact recap the
  user can pull on later.

### 3. `quiet-pro` — Quiet Pro Learner
Works uninterrupted. **No lessons, no menus, by default.** The agent only offers teaching when it
*infers* the user has hit a genuine snag where a lesson would help.

- Run silent on the teaching axis during normal flow.
- Offer a lesson **only** when an inferred-friction trigger fires (see below), and even then just
  *ask* in one line — never launch in: `💡 Looks like <X> tripped here — want the why? (y/n)`.
- If declined (or ignored), drop it and continue. Don't re-offer the same lesson twice in a session.

#### Inferred-friction triggers (quiet-pro only)
Offer a lesson when one of these is detected — these are the moments a pro most often wants the *why*:
- An `implementation-retry-exhausted` HITL, or a second failed attempt on the same unit.
- A proposed contract/seam **amendment** (the methodology's highest-stakes event).
- Repeated user reversals on the same decision within a session (signals a mental-model gap).
- A drift-triggered full re-analysis (`drift-detected-reanalysis-triggered`).
- A command refusing an anti-pattern the user explicitly asked for (refusal + offered lesson reads as
  collaboration, not obstruction).

---

## Teaching surface (consistent, separable, skippable)

All teaching renders in a visually distinct block, the same way the autonomy result footer is
separable from prose — so a reader can ignore it entirely and the work still reads clean:

```
💡 Lesson — <one-line title>
<2–5 sentences. Concept first, then how it applied here, then the takeaway.>
(stance: {TEACHING_STANCE} · say "fewer lessons" to dial down · "explain more" to go deeper)
```

`💡 Learnable:` pointers (curious stance) are a single line, no block:

```
💡 Learnable: why this category owns the seam · the 2-attempt retry budget · append-only DL discipline
```

Rules for every stance:
- **Never block the work for a lesson.** Teaching is additive output, never a gate. (Gating is the
  autonomy axis's job, and only the methodology's real HITL triggers gate.)
- **Never distort the methodology to teach.** `Proposed` vs `Active`, append-only DECISION-LOG,
  bilateral seam contracts, and every HITL trigger stay literally true under every stance. A lesson
  may explain *why* a thing is Proposed; it may never call it Active to simplify the story.
- **Teach from the real artifact in front of you** — the actual contract, the actual failing test,
  the actual DL entry — not a generic example.

---

## How commands apply this

Every command already loads `topology-PRINCIPLES.md` in its pre-flight. PRINCIPLES carries the
stance-aware loadout line, so the behavior is active everywhere without bloating each command:

1. Read the active stance: session override if set, else `{TEACHING_STANCE}` from the profile.
2. Pick the teaching surface for that stance (`student`: lessons on; `curious`: learnable pointers +
   on-demand; `quiet-pro`: silent + offer-on-friction).
3. Emit teaching in the separable block; keep the command's prose and result footer unchanged.

Orchestrators (`topology-sprint`, `topology-autopilot`) inherit the stance and propagate it to every
sub-command they invoke, exactly as they propagate autonomy. A session override set before an
orchestrator run applies to the whole run.

`compass-onboard` is the one command that may *raise* the stance: onboarding a brand-new contributor,
it defaults its session to `student` regardless of profile, then hands off at the profile default.

---

## Placeholders in This File

| Placeholder | Replace With |
|-------------|-------------|
| `{TEACHING_STANCE}` | The project's default stance from the profile (`student` \| `curious` \| `quiet-pro`) |
| `<X>`, `<one-line title>`, etc. | Real, in-context content at runtime |
