# Playbooks: index

These are Devin-style playbooks for Meridian. Each has the same sections:
- **Overview**
- **What's Needed From User**
- **Procedure** (macro phases → micro steps, one imperative action per line)
- **Specifications** (what must be true when it's done)
- **Advice and Pointers**
- **Forbidden Actions**

**How to use one with Claude Code:** *"Run docs/playbooks/0X_….md. Follow its Procedure in order, stop at each ⏸ checkpoint, and report against its Specifications."*
**With Devin:** paste the playbook into a Devin playbook, or attach it with its macro.

| Macro | Playbook | When | Judging criterion |
|---|---|---|---|
| `!meridian-core` | `01_CORE_BUILD.md` | Now → Checkpoint 2 (target 19:30 Saturday) | Technical |
| `!meridian-agentic` | `02_OPEN_MODEL_AND_AGENT.md` | After CP2 | Impact, Technical (brief fit) |
| `!meridian-3d` | `03_3D_LAB_FLOOR.md` | Only after CP4; strictly time-boxed | Presentation |
| `!meridian-ship` | `04_DEMO_READY.md` | From 22:00 Saturday until submission | All three |

Global rules for every playbook (from CLAUDE.md; they always apply):
- Tests first.
- After each task: run the tests → add a line to STATUS.md → commit → `git push` (never force).
- Read-only AI. No invented numbers.
- Product name "Meridian".
- Never edit `context/` or `external/`.

Order of authority: CLAUDE.md > docs/PRD.md > docs/MASTER_PLAN.md > these playbooks.
