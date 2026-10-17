#!/usr/bin/env bash
# Clone third-party repos into external/ for REFERENCE ONLY, logged in external/REGISTRY.md.
# They are gitignored: never imported, never published. See docs/playbooks/06_EXTERNAL_SKILLS.md
# Usage: ./scripts/clone-external.sh          (default list)
#        ./scripts/clone-external.sh owner/repo "why"
set -euo pipefail
cd "$(dirname "$0")/.."
REG=external/REGISTRY.md
clone() {
  local slug="$1" why="$2" dir="external/${1/\//__}"
  if [ -d "$dir" ]; then echo "skip $slug (exists)"; return; fi
  if ! git clone --depth 1 --filter=blob:none "https://github.com/$slug.git" "$dir"; then echo "!! could not clone $slug (check the slug)"; return; fi
  local sha lic; sha=$(git -C "$dir" rev-parse --short HEAD)
  lic=$(head -n 3 "$dir"/LICEN[CS]E* 2>/dev/null | tr '\n' ' ' | cut -c1-40 || true)
  echo "| $slug | https://github.com/$slug | ${lic:-CHECK LICENCE} | $sha | $(date +%F) | $why | evaluating |" >> "$REG"
  echo "cloned $slug @ $sha"
}
if [ $# -ge 1 ]; then clone "$1" "${2:-manual}"; exit 0; fi

# --- From the "Top 11 skill repos" list (ranked by GitHub stars), filtered to what helps Meridian ---
clone mattpocock/skills                    "#1 - /tdd, /diagnosing-bugs, /code-review, /handoff, /grill-me"
clone nextlevelbuilder/ui-ux-pro-max-skill "#3 - UI/UX design intelligence (pick ONE design skill to install)"
clone leonxlnx/taste-skill                 "#7 - anti-generic visual taste (reference)"
clone tt-a1i/archify                       "#10 - architecture diagrams for README and slide 4"
clone pbakaus/impeccable                   "#11 - design language (pick ONE design skill to install)"
# --- Libraries whose examples we read (adopted via npm, never copied) ---
clone magicuidesign/magicui                "Animated List / Beam / Ripple components + magic-ui skill"
clone modelcontextprotocol/typescript-sdk  "MCP SDK examples (prompts, resources)"
clone modelcontextprotocol/inspector       "MCP Inspector - stage backup"
# --- Skipped on purpose (see playbook 06): #2 Ponytail, #4 Graphify, #5 Caveman, #6 Addy Osmani, #8 Understand Anything, #9 Awesome Claude Skills
#     To add one anyway: ./scripts/clone-external.sh <owner/repo> "why"   (copy the exact slug from its GitHub page)
echo "Done. Now run docs/playbooks/06_EXTERNAL_SKILLS.md to generate a master playbook per repo."
