# external/: the add-on zone (third-party repos, reference only)

This folder separates **what we built** from **what we borrowed**.

- **Core** (our code, published): `server/`, `mcp/`, `web/`, `shared/`, `scripts/`, `data/`, `config/`, `docs/`.
- **External** (other people's open-source repos, cloned here to read and learn from, **never published**): `external/<owner>__<repo>/`.

## Rules
1. **Clone only with `scripts/clone-external.sh`.** It records each repo's URL, licence and exact commit in `REGISTRY.md`.
2. **Never import code from `external/` into core.** To adopt a library, install it as a dependency (`npm i ...`) or use its official CLI (e.g. the shadcn/Magic UI registry). Then mark it **adopted** in `REGISTRY.md` and credit it in the README's "Built with" section.
3. **Never copy-paste large chunks.** If a small snippet is truly needed, keep its licence header and credit it, and note it in `REGISTRY.md`.
4. **Agents may read `external/`** for patterns and examples, but must work only in their own core folders (see docs/MASTER_PLAN.md §3).
5. Everything here is gitignored except this README and `REGISTRY.md`, so the public repo stays clean and compliant with the hackathon's "no prior building" rule.

Statuses in REGISTRY.md: `evaluating` → `adopted (via npm/CLI)` | `reference only` | `rejected (reason)`.
