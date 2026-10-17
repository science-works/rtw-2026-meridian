# STACK_REPOS.md: the open-source repos Meridian builds on

Ranked by **fit to our purpose** (an AI-ready layer over lab workflow events), then by adoption. Licences were checked against the npm registry on 17 October 2026. **Use them as dependencies; never copy their code into our repo.** Credit them all in the README's "Built with" section.

## Tier S: core, use tonight

| Repo / package | Licence | Why it's here | Workstream |
|---|---|---|---|
| **MCP TypeScript SDK** (`@modelcontextprotocol/sdk`) | MIT | The official way to expose `get_case`, `list_alerts` and `cases_delayed` to any AI agent. This *is* our answer to "no end points for agentic control". | C |
| **MCP Inspector** (`@modelcontextprotocol/inspector`) | See its LICENSE | Run `npx @modelcontextprotocol/inspector` to test our tools visually. **It's also the demo backup:** if Claude Desktop misbehaves on stage, show the live tool call and JSON in the Inspector. | C, G |
| **Hono** (`hono`) | MIT | A tiny, fast HTTP server with built-in SSE for the API and simulator. | B |
| **Vitest** (`vitest`) | MIT | Acceptance tests; the green run is evidence for Technical execution. | A, G |
| **Motion** (`motion`) | MIT | All motion: lab river, failure ripple, spotlight, Story mode. | D, E |
| **Magic UI** (magicuidesign/magicui) + its agent skill | MIT | Animated components (Animated List, Ripple, Border Beam, Animated Beam), plus a Claude Code skill to install them correctly. | D, E |
| **shadcn/ui** | MIT | Base components (cards, drawer, badges, tabs) that Magic UI builds on. | D |
| **NumberFlow** (`@number-flow/react`) | MIT | Counts and estimates that roll to their new values when the trigger fires. | D |

## Tier A: high value if time allows

| Repo / package | Licence | Why | When |
|---|---|---|---|
| **React Flow / xyflow** (`@xyflow/react`) | MIT | An interactive **station map**: processor → embedding → microtomy → stainer → scanner → IQC, with live counts on each node and the failing stainer glowing crimson. Our strongest "systems" visual. | After the must-have effects (VISUAL_LAYER V1–V5) |
| **assistant-ui** (`@assistant-ui/react`) | MIT | A polished in-app chat panel, if you add the optional API-key chat (C4). | C4 only |
| **Vercel AI SDK** (`ai`) | Apache-2.0 | Tool-calling chat loop for the in-app chat; works with Anthropic models. | C4 only |
| **Recharts** (`recharts`) or **Tremor** (`@tremor/react`, Apache-2.0) | MIT / Apache-2.0 | Small charts, e.g. stage-load bars or the Story-mode "lab at a glance". Pick one. | Polish |

## Tier B: name them in the pitch and roadmap (not tonight)

| Repo | Licence | Why it matters to the story |
|---|---|---|
| **SENAITE** (open-source LIMS) and **OpenELIS Global** (open-source lab information system) | Open source (check each repo's licence) | Real, open LIMS that Meridian's event model could read from. That proves "sits alongside *any* LIMS" with no vendor permission needed. A strong answer to the PDBe judge's interoperability question. |
| **HAPI FHIR** (Java) / FHIR resources (`Specimen`, `DiagnosticReport`, `Task`) | Apache-2.0 | The healthcare data standard a live version would map its events to; HL7 v2 feeds come through the trust's integration engine. |
| **PM4Py** (process mining) | Open source (check licence) | For the "Lab-wide" vision: discover bottlenecks and error trends from months of event logs. |

## Avoid for this build

- **GSAP:** free, but under its own non-open-source licence; Motion covers everything we need.
- **Aceternity UI:** licence unclear.
- **Remotion and Lottie:** they produce videos or pre-made animations; our demo must be live data.
- **REA (reverse engineering):** no use here, and a security risk on the demo laptop.
- **The `xlsx` package from the npm registry:** SheetJS ships current releases from its own CDN, and the old npm version has known security advisories. Either install SheetJS from its official CDN tarball, or do the one-off conversion with Python (`openpyxl`/`pandas`) into `data/cellpath.json` and commit the JSON. The workbook is our own trusted file, so the risk is low, but the CDN route is cleaner.

## Pitch line that uses this

> "Meridian stands on open standards and open tools. The MCP protocol means any AI agent can query the lab, and its event model could read from open LIMS like SENAITE or OpenELIS, not just one vendor's system."
