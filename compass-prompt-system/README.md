# Compass Prompt System

**The strategic operating layer that sits above Topology.** Where Topology answers *how do we
rebuild this correctly*, Compass answers the questions code and architecture docs don't:

- **Why** are we building this?
- **Where** are we going?
- **What does "done" look like?**
- **How do we get there together?**

Compass is a sub-system of the [Topology Prompt System](../README.md). It shares the same
abstraction engine — abstract templates molded into concrete, project-native commands via your
`.topology/profile.yml` (see [`../ABSTRACTION-SPEC.md`](../ABSTRACTION-SPEC.md)). It can be
installed alongside Topology, or on its own for teams that want the planning rhythm without (or
before) the rebuild execution engine.

---

## The documents

Compass maintains a small set of living strategy docs in your `{docs_root}/compass/`. The install
seeds them as skeletons; you fill them in.

| Document | Purpose | Update cadence |
|----------|---------|----------------|
| `NORTH-STAR.md` | Vision, philosophy, founding principles | Rarely |
| `MILESTONES.md` | Target dates and "done" definitions | When milestones change |
| `PRIORITY-MAP.md` | Sequenced work across the project with dependencies | Weekly |
| `RISK-REGISTER.md` | Risks, likelihood, impact, mitigations | Ongoing (append-and-update) |
| `STATE-OF-THE-UNION.md` | Point-in-time snapshot of where everything stands | Weekly |
| `CADENCE.md` | The weekly operating rhythm | When the rhythm evolves |
| `TEAM-PLAYBOOK.md` | Roles, working agreements, how we work | When the team/process changes |

## The commands

| Command | When | Purpose |
|---------|------|---------|
| `/compass-weekly-brief` | start of week | Set the week's plan — must-do vs like-to-do |
| `/compass-check` | mid-week | Daily focus + reconcile the plan against shipped work |
| `/compass-update` | end of week | Refresh the state-of-the-union with current reality |
| `/compass-risk` | weekly | Review and update the risk register |
| `/compass-onboard <role>` | onboarding | A role-tailored onboarding guide |

The exact days are molded from your profile's cadence settings, so the commands name *your*
rhythm, not a hardcoded one.

---

## Install / update

If you ran `/topology-install` and enabled Compass, it's already installed. To add or manage it
on its own:

```bash
# from the system repo, vendor into your project (also done by the top-level install.sh)
./install.sh /path/to/your-project
```
```
# in Claude Code, in your project:
/compass-install      # mold the Compass layer + seed the strategy docs
/compass-update       # recompile + apply one-time Compass updates
```

`/compass-install` writes only the `compass:` section of `.topology/profile.yml` (preserving any
Topology settings already there), compiles the Compass commands, and seeds the strategy-doc
skeletons into `{docs_root}/compass/`.

---

## The load-bearing discipline: closure

The one rule that keeps the planning loop honest: **when a unit of work ships, its plan row closes
in the same pass.** A shipped-but-still-open row makes every future plan lie. The compiled
`compass-check` reconciles the priority map against verified work, and (when Topology is present)
`topology-promote` closes the corresponding row at promotion. The full operating rules are in the
compiled `OPERATING-RULES` doc and `compass-check`.

Authoring Compass improvements works exactly like Topology — see
[`../updates/README.md`](../updates/README.md); the Compass update queue lives in
[`updates/`](./updates).
