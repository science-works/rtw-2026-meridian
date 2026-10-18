# Approved changes

These changes were approved by the team (Manthan, with Victoria reviewing on localhost) and are in `main`. Later work must build on top of them and must not remove or alter them without a new approval. Each one is a separate commit or a one-line token, so it can be reverted on its own.

Dates are the commit dates (simulated hackathon calendar). Tags mark the pushed checkpoints.

| # | Date | Change | How to switch it off or revert | Commit(s) | Tag |
|---|---|---|---|---|---|
| 1 | 2026-10-18 00:12 | **v8 P1**: dashboard, case, incidents, incident and LIMS-view pages; full workbook at 11:30; New / Check needed / Acknowledged states | — | `7029b86`, `0b578c2` and earlier | `demo-safe-v8-p3` |
| 2 | 2026-10-18 00:37 | **v8 P2**: light simulation from recorded events (pure `stateAt`), station pages with work recorded there | — | `e5e18cf` | `demo-safe-v8-p3` |
| 3 | 2026-10-18 00:58 | **v8 P3**: section pages, Ask Meridian chat, `/presenter`, Story mode, reference styling | — | `2ee81ea`, `6859a5f`, `8063408` | `demo-safe-v8-p3` |
| 4 | 2026-10-18 01:15 | **Demo bar** kept to two lines | revert `55547a3` | `55547a3` | flat fallback `victoria-look-v1` |
| 5 | 2026-10-18 01:26 | **3D lab-clock donuts**; the static 20° tilt stays under reduced motion | `ringStyle` in `web/src/theme/tokens.ts` → `"flat"`, or revert | `e4faf6c` | |
| 6 | 2026-10-18 01:26 | **Ignore the Playwright CLI workspace** | — | `f48c9ef` | |
| 7 | 2026-10-18 01:29 | **README and screenshots** for v8 | — | `b1dc2e6` | `demo-safe-v8-p3` |
| 8 | 2026-10-18 01:41 | **3D interactive logo**; Victoria's SVG can be passed as `mark` | `logoStyle` → `"flat"`, or revert | `011e0ff` | |
| 9 | 2026-10-18 01:51 | **Explicit time labels**: incident "Stain run completes ~11:35"; case rows "Ready ~HH:MM" / "Ready since HH:MM" / "ETA unknown — full reason" | revert | `05985aa` | |
| 10 | 2026-10-18 02:04 | **Simulation clarity**: captions, last-3-events ticker, slower final hour, arrival highlight, Processor D counted like the simulator | revert | `753b642` | |
| 11 | 2026-10-18 02:07 | **`/compare`**: a LIMS today vs Meridian (26H1004), presenter card, demo-walk beat 9 | revert | `65ca485` | |
| 12 | 2026-10-18 02:11 | **Dashboard fixes**: no duplicate badge, urgent rows wrap (3 shown), agent console in the footer | revert | `36df5fd` | |
| 13 | 2026-10-18 02:37 | **Motion Pack effects 1–7, on by default**: 1 flag→incident morph · 2 Acknowledge flies to Incidents with New count · 3 case journey draw-on · 4 simulation 10:45 shockwave, slide flash, load glow · 5 dashboard wake-up · 6 page transitions · 7 agent beam. Effect 8 (cursor spotlight) was not built. | `DEFAULT_ON` in `web/src/fxFlags.ts`; `?fx=none` for a tab. Reduced motion, `VITE_FX=off` and "Skip animations" always win | `f9b0121` … `44f0d31`, `fb65fd2`, default `8b1d53d` | `demo-safe-v8-p5` |
| 14 | 2026-10-18 02:37 | **Look C · Night Shift** was the default look from p5 to p6; now selectable with `?look=C` | `?look=C` | `690799d`, `d23e7af` | `demo-safe-v8-p5` |
| 15 | 2026-10-18 03:05 | **Insight visuals 1–5, on by default**: 1 Life of a biopsy strip · 2 `/how-it-works` (test badge reads the real count, written by the test run) · 3 Where this case sits · 4 Lab pulse heatmap · 5 incident blast radius. Their animations are static under reduced motion, `VITE_FX=off` and "Skip animations". | `DEFAULT_ON` in `web/src/vizFlags.ts`; `?viz=none` for a tab | `704edd9` … `3dce131`, `54cec35`, default (p6 commit) | `demo-safe-v8-p6` |
| 16 | 2026-10-18 03:17 | **Default look: Midnight Blue with the Stain spectrum on top** | `DEFAULT_LOOK` / `DEFAULT_SPECTRUM` in `web/src/theme/looks.ts`; per tab `?look=C`, `?look=A`, `?look=B`, `?look=classic`, `?spectrum=0` | `6872098`, `48dd396`, default (p6 commit) | `demo-safe-v8-p6` |
| 17 | 2026-10-18 04:02 | **Pitch Q&A card and technical questions**, verbatim | — | `b0a19d9` | `submission-candidate` |
| 18 | 2026-10-18 04:08 | **Demo runbook v8**, `npm run demo:start`, `npm run demo:serve` (fixed build) | — | `360d8d2` | `submission-candidate` |
| 19 | 2026-10-18 04:30 | **LIMS reference gallery** on `/lims-view` and the presenter's old-way card, figures 1–4 only, from local-only files (gitignored; renders nothing without them) | revert `e4920ff`, `1293cbc` | `e4920ff`, `1293cbc`, figures 1–4 (submission commit) | `submission-candidate` |
| 20 | 2026-10-18 04:20 | **Magic UI extras (effects 8–11)**, built and pushed but **off by default** (preview `?fx=8,9,10,11`) | revert `29ecedf` | `29ecedf` | `submission-candidate` |
| 21 | 2026-10-18 04:40 | **Default type: clinical** (Instrument Serif display, JetBrains Mono data, Inter body), self-hosted OFL fonts; `?type=default` (original), `?type=editorial`, `?type=instrument` still work | `DEFAULT_TYPE` in `web/src/theme/type.ts` | `72f9256`, `2da7ce5`, `e696920`, default (submission commit) | `submission-candidate` |
| 22 | 2026-10-18 | Corner instruments (Lab pulse, Next handoffs, Stainer, Handed off) — default on — switch off with ?corners=0 | `?corners=0`; `DEFAULT_ON` in `web/src/corners/CornerLayer.tsx` | `1c32621`, default (this commit) | `demo-safe-v9-corners` |


## Standing decisions

- **Urgent red stays as it is** (`#ff5c5c`, about 5–6:1). It is not lifted to 7:1, which would turn it pink. Body text is 7:1 or higher in every look.
- **Colour rules:** bold red is only for urgent; warm orange is only for the incident "!"; purple is BCSP and green is CSP. Stage hues (spectrum) are only for lines, edges, arcs and dots.
- **Before every push:** `npm run demo:walk`, `npm run demo:walk:fx` and `npm run demo:walk:viz` must all pass.
