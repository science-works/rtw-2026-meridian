# START HERE (for Manthan and Victoria)

## What's in this folder

| Folder / file | What it contains | Goes to GitHub? |
|---|---|---|
| `CLAUDE.md` / `AGENTS.md` | Build rules for Claude Code / Devin (stack, safety, design, build order) | ✅ |
| `docs/MASTER_PLAN.md` | **Judging-first master plan:** criteria → evidence → task cards, parallel-agent folder ownership, API contract, timeline, demo beats, Q&A | ✅ |
| `docs/VISUAL_LAYER.md` | Motion and immersive UI plan (Motion, Magic UI, NumberFlow, shadcn) | ✅ |
| `docs/STACK_REPOS.md` | Ranked open-source repos with licences, plus what to avoid | ✅ |
| `docs/ONE_PAGER.md` | "The tool we're reinventing: sample tracking and LIMS" | ✅ |
| `docs/CELLPATH_HACKATHON_PLAYBOOK.md` | Victoria's implementation playbook (latest) | ✅ |
| `data/CellPath_Mock_Data.xlsx` | The final, checked fictional dataset (never edit it) | ✅ |
| `config/targets.json` | Handoff targets: **Victoria fills these in** | ✅ |
| `scripts/check_*.py` | The data checks used to verify the workbook | ✅ |
| `scripts/clone-external.sh` | Clones add-on repos into `external/` and logs them | ✅ |
| `STATUS.md` | Agents log progress here | ✅ |
| `pitch/` | Script, Q&A and slides (workstream F) | ✅ |
| `external/` | **Add-on zone:** cloned third-party repos, reference only (see its README) | ❌ (only README and REGISTRY) |
| `context/` | Everything private: brief, organiser deck, Victoria's earlier notes, every playbook/SKILLS version, decision log, all data versions, pitch references, research | ❌ |
| `LICENSE`, `README.md`, `.gitignore` | MIT licence, README stub, ignore rules | ✅ |

Still missing: `docs/CELLPATH_MASTER_PRODUCT_VISUAL_SPEC.md` (Victoria to export it from her session).

## Setup (10 minutes)

1. **On GitHub:** create a new **empty, public** repo named `meridian-lab`. Don't add a README or licence; we provide them.
2. **On your Mac (Terminal):**
   ```bash
   mkdir -p ~/Projects && cd ~/Projects
   unzip ~/Downloads/meridian-lab.zip        # creates ~/Projects/meridian-lab
   cd meridian-lab
   git init -b main
   git add . && git status                    # check: no context/ or external/ clones listed
   git commit -m "Project brief, mock data, plans and licence"
   git remote add origin https://github.com/<you>/meridian-lab.git
   git push -u origin main
   ```
3. **In VS Code:** File → Open Folder → `~/Projects/meridian-lab` (open this folder itself, not your home folder).
4. **Optional add-ons:** `./scripts/clone-external.sh` (reference clones go into `external/`, logged in `REGISTRY.md`).
5. **Skills:** in the VS Code terminal, run `claude plugins install mattpocock-skills`, plus one design skill and `npx skills add magicuidesign/magicui --skill magic-ui --agent claude-code`.
6. **Claude Code kickoff prompt:**
   > Read CLAUDE.md, then docs/MASTER_PLAN.md, then context/00_READ_ME_FIRST.md and the files it lists. Summarise the scope, the judging criteria and the build order in ten lines. Then do T0 and P0–P1 only, using /tdd, logging to STATUS.md. Stop when the tests pass.
