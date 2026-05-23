#!/usr/bin/env bash
#
# install.sh — vendor the Topology + Compass prompt system into a target project, and place the
# bootstrap slash-commands so the operator can run /topology-install there.
#
# Idempotent: safe to re-run to pull updates. It refreshes .topology/system/ and the bootstrap
# commands, and NEVER touches your .topology/profile.yml or your compiled .claude/commands/*.
# (Those are owned by the /topology-install and /topology-update prompts, not by this script.)
#
# Usage:
#   ./install.sh [TARGET_PROJECT_DIR]      # defaults to the current directory
#
# After running, open TARGET in Claude Code and run:  /topology-install
#
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="${1:-$PWD}"

if [[ ! -d "$TARGET" ]]; then
  echo "error: target directory does not exist: $TARGET" >&2
  exit 1
fi
TARGET="$(cd "$TARGET" && pwd)"

if [[ "$TARGET" == "$SRC" ]]; then
  echo "error: target is the system repo itself. Run install.sh from / against your project." >&2
  exit 1
fi

SYS="$TARGET/.topology/system"
CMD="$TARGET/.claude/commands"

echo "Topology Prompt System → installing into: $TARGET"

# --- 1. Vendor the abstract system (overwrite; this is the updatable payload) ----------------
rm -rf "$SYS"
mkdir -p "$SYS/templates" "$SYS/compass/templates" "$SYS/skeletons" \
         "$SYS/updates" "$SYS/compass/updates" "$SYS/profile"

cp -R "$SRC/templates/." "$SYS/templates/"                       # topology commands + protocols
cp -R "$SRC/templates/skeletons/." "$SYS/skeletons/"            # global + foundation skeletons
rm -rf "$SYS/templates/skeletons"                               # (skeletons live one level up)
cp -R "$SRC/compass-prompt-system/templates/." "$SYS/compass/templates/"
cp -R "$SRC/updates/." "$SYS/updates/" 2>/dev/null || true
cp -R "$SRC/compass-prompt-system/updates/." "$SYS/compass/updates/" 2>/dev/null || true
cp "$SRC/ABSTRACTION-SPEC.md" "$SYS/ABSTRACTION-SPEC.md"
cp "$SRC/profile/profile.schema.md" "$SYS/profile/profile.schema.md"
cp "$SRC/profile/profile.example.yml" "$SYS/profile/profile.example.yml"
cp "$SRC/VERSION" "$SYS/VERSION"

# --- 2. Place the bootstrap slash-commands (overwrite; they are version-managed meta-commands) -
mkdir -p "$CMD"
cp "$SRC/bootstrap/topology-install.md" "$CMD/topology-install.md"
cp "$SRC/bootstrap/topology-update.md"  "$CMD/topology-update.md"
if [[ -f "$SRC/compass-prompt-system/bootstrap/compass-install.md" ]]; then
  cp "$SRC/compass-prompt-system/bootstrap/compass-install.md" "$CMD/compass-install.md"
fi
# NOTE: there is intentionally no bootstrap `compass-update`. `compass-update` is the weekly
# STATE-OF-THE-UNION cadence command, compiled into commands_dir by /topology-install or
# /compass-install. Recompiling/updating the compass layer is done by /topology-update (umbrella,
# covers both queues) or /compass-install --recompile. Vendoring a bootstrap compass-update here
# would collide with the workflow command — see ABSTRACTION-SPEC §7.

VER="$(cat "$SRC/VERSION" 2>/dev/null || echo '?')"
echo
if [[ -f "$TARGET/.topology/profile.yml" ]]; then
  echo "✓ System refreshed to v$VER. Existing profile preserved."
  echo "  Next: open $TARGET in Claude Code and run  /topology-update"
else
  echo "✓ System v$VER vendored. No profile yet."
  echo "  Next: open $TARGET in Claude Code and run  /topology-install"
fi
