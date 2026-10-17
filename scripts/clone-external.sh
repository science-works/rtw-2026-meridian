#!/usr/bin/env bash
# Clone third-party repos into external/ for REFERENCE ONLY and log them in external/REGISTRY.md.
# Usage:  ./scripts/clone-external.sh            (clones the default list)
#         ./scripts/clone-external.sh owner/repo "why we want it"
set -euo pipefail
cd "$(dirname "$0")/.."
REG=external/REGISTRY.md
clone() {
  local slug="$1" why="$2" dir="external/${1/\//__}"
  if [ -d "$dir" ]; then echo "skip $slug (exists)"; return; fi
  git clone --depth 1 --filter=blob:none "https://github.com/$slug.git" "$dir"
  local sha lic
  sha=$(git -C "$dir" rev-parse --short HEAD)
  lic=$(head -n 3 "$dir"/LICEN[CS]E* 2>/dev/null | tr '\n' ' ' | cut -c1-40 || echo "check")
  echo "| $slug | https://github.com/$slug | ${lic:-check} | $sha | $(date +%F) | $why | evaluating |" >> "$REG"
  echo "cloned $slug @ $sha"
}
if [ $# -ge 1 ]; then clone "$1" "${2:-manual}"; exit 0; fi
# Default list: see docs/STACK_REPOS.md (Tier S/A). Adopt via npm; these clones are for reading examples.
clone mattpocock/skills                 "Agent skills (/tdd, /diagnosing-bugs, /code-review) - read how they work"
clone magicuidesign/magicui             "Animated components + magic-ui agent skill (V3/V4/V8 effects)"
clone modelcontextprotocol/typescript-sdk "Official MCP SDK examples for mcp/"
clone modelcontextprotocol/inspector    "MCP Inspector - testing + stage backup"
clone xyflow/xyflow                     "React Flow examples for the optional station map"
echo "Done. Review external/REGISTRY.md. Remember: adopt via npm, never import from external/."
