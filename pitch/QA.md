# Meridian: judges' Q&A (2 minutes; each answer ≤ 20 seconds)

| Question | Answer | Who |
|---|---|---|
| Isn't this obvious? Why doesn't it exist? | "If it were solved, lab leads wouldn't still walk the lab to find a case. Published studies say built-in LIMS functions don't cover a modern histology lab's needs; labs build their own status boards. The tracking tools that exist are closed and tied to one vendor." | Victoria, then Manthan |
| How is it different from vendor tracking systems? | "Those are good, but closed and single-vendor. Meridian is open source, sits next to any LIMS through an open event model, and, as far as we could find, is the first to let an AI agent investigate the lab, read-only." | Manthan |
| LIMS already track samples and flag them. Isn't this done? | "In blood sciences, yes: one tube through one analyser, and LIMS add-ons show location and flags. Histology is different: one case becomes many blocks and slides across ten manual steps and several people. The LIMS records each step; Meridian shows the whole journey live, catches a mismatch at the bench, and follows an incident to resolution." | Victoria |
| What exactly did you reinvent? | "Sample tracking. A LIMS is a record of the past. We turned the same events into a live view of the present, with deterministic alerts and estimates, and opened it to other tools and AI." | Manthan |
| How big is the problem? | "A 2026 meta-analysis found labs that actively look for errors find about 40 per 1,000 cases, versus about 5 that get reported; the authors call for automated error tracking." (Katsma et al., BMJ Open Quality 2026) | Victoria |
| How big is the market? | "Every hospital with a histology lab: 158 departments in the UK alone, and the same workflow worldwide. We start where it hurts most: labs short of staff with demand rising every year." | Manthan |
| Can I trust the AI? | "The AI never decides. Rules compute every number; the AI only reads and explains, and says 'unknown' when the data can't support an answer." | Manthan |
| Is the data real? | "No. It's synthetic data I designed from real lab practice: 450 cases, 1,253 events, including the two incidents you saw. A real deployment would use the lab's own approved feeds on its own network." | Victoria |
| How would a lab adopt it? | "Read-only, beside the existing LIMS: map its event export, run it locally, start as a shadow pilot on one bench." | Manthan |
| What's next? | "Live alerts at the bench today, clean handovers for 24-hour labs next, then end-of-day insight for staffing and equipment." | Victoria |
| Is it live somewhere? | "It runs locally by design: a lab would run it on its own network so patient data never leaves the hospital. The code is open on GitHub." | Manthan |

## Technical questions

Stance: we deliberately did not train a model. Rules compute every number, and the AI only reads.

**How did you build it?** "Victoria designed the lab: 450 cases, 1,253 timestamped events, equipment and timing rules, from real practice. I built a TypeScript stack around it: a server that turns events into live state, rules that raise alerts and estimates, a React dashboard and simulation, and an MCP endpoint so any AI agent can read it. I built it with Claude Code agents working from written playbooks, checkpoints and tests. Victoria reviewed every screen as the domain expert." Detail: Hono + SSE · React + Vite · official MCP SDK · Vitest · data from Victoria's workbook · open source, MIT.

**How did you calibrate metrics and parameters?** "Every time and capacity comes from Victoria's Timing Rules sheet: processor output windows, minutes per block at microtomy, a 30-minute stain run, 9 baskets of 20 slides, 2 minutes per slide to scan. They're labelled illustrative and editable, not validated standards. Where a number isn't known, like decalcification time, we don't guess: the screen says 'ETA unknown' and why." Estimate = current stage + remaining steps × configured durations, fitted into working hours; queues and parallel capacity not modelled yet, and we say so.

**Benchmarks?** "We haven't benchmarked against a real lab. That needs approved data and a shadow pilot, and we say so. What we did benchmark is internal consistency: every count on every screen reconciles to Victoria's workbook (450 = 104 + 346, stage totals sum to 450), and the simulation replayed to 11:30 lands on exactly the same state as the live server."

**Evals and tests?** "259 automated tests, plus an end-to-end demo test that clicks through every pitch step in a real browser and checks the numbers on screen." They check: data integrity; each alert on exactly the right cases with evidence (26H1004 1 of 3, basket 20 slides/10 cases, 26H1003 outstanding block, 26H1015 scan gap); honest unknowns; safety wording (no diagnosis, reporting time or screening deadline); AI read-only (MCP can't change, acknowledge or reset); design rules (contrast, 14px, red only urgent, reduced motion).

**Guardrails?** "Rules decide, AI explains, scientists act." 1 No AI in the numbers · 2 AI read-only, tested · 3 every AI call visible in the agent console · 4 "unknown" instead of guessing · 5 scope: preparation to handoff, no diagnosis/reporting/screening deadlines · 6 acknowledging isn't fixing; the Acknowledge click is a presenter action, not a lab event · 7 synthetic data only, runs on the lab's own network.

**Where is AI used?** Building it (Claude Code agents under playbooks and tests); reading it (MCP: an agent investigates the lab read-only, e.g. a shift handover citing evidence); explaining it (in-app chat from the same functions as the screens). AI is kept out of the decision path.

**How is it different?** "LIMS like WinPath are built to book samples in and sign results off. Blood-science analysers get some tracking, but histology is manual: one case becomes many blocks and slides across ten steps and several people. Vendor tracking tools exist, but they're closed and tied to one vendor. Meridian is open source, sits next to any LIMS through an open event model, catches mismatches at the bench, follows incidents to resolution, and, as far as we could find, is the first that lets an AI agent investigate the lab read-only."

**"So what's the AI innovation?"** "Making a closed lab readable by AI safely. The agent gets an open, tested, read-only window into live lab state, with every call visible. That's the endpoint the brief asked for, and it's useful because the numbers underneath are deterministic and trustworthy."
