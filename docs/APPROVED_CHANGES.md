# Approved changes

These changes were approved by the team (Manthan, with Victoria reviewing on localhost) and are in `main`. Later work must build on top of them and must not remove or alter them without a new approval. Each one is a separate commit or a one-line token, so it can be reverted on its own.

| # | Change | How to switch or revert | Commit(s) | Tag |
|---|---|---|---|---|
| 1 | **v8 P1**: dashboard, case, incidents, incident and LIMS-view pages; full workbook at 11:30; New / Check needed / Acknowledged states | — | `7029b86`, `0b578c2` and earlier | `demo-safe-v8-p3` |
| 2 | **v8 P2**: light simulation from recorded events (pure `stateAt`), station pages with work recorded there | — | `e5e18cf` | `demo-safe-v8-p3` |
| 3 | **v8 P3**: section pages, Ask Meridian chat, `/presenter`, Story mode, reference styling | — | `2ee81ea`, `6859a5f`, `8063408` | `demo-safe-v8-p3` |
| 4 | **Demo bar** kept to two lines | revert `55547a3` | `55547a3` | flat fallback: `victoria-look-v1` |
| 5 | **3D lab-clock donuts**; the static 20° tilt stays under reduced motion | `ringStyle` in `web/src/theme/tokens.ts` → `"flat"`, or revert | `e4faf6c` | |
| 6 | **Ignore the Playwright CLI workspace** | — | `f48c9ef` | |
| 7 | **README and screenshots** for v8 | — | `b1dc2e6` | `demo-safe-v8-p3` |
| 8 | **3D interactive logo**; Victoria's SVG can be passed as `mark` | `logoStyle` → `"flat"`, or revert | `011e0ff` | |
| 9 | **Explicit time labels**: incident "Stain run completes ~11:35"; case rows "Ready ~HH:MM" / "Ready since HH:MM" / "ETA unknown — full reason" | revert | `05985aa` | |
| 10 | **Simulation clarity**: captions, last-3-events ticker, slower final hour, arrival highlight, Processor D counted like the simulator | revert | `753b642` | |
| 11 | **`/compare`**: a LIMS today vs Meridian (26H1004), presenter card, demo-walk beat 9 | revert | `65ca485` | |
| 12 | **Dashboard fixes**: no duplicate badge, urgent rows wrap (3 shown), agent console in the footer | revert | `36df5fd` | |
| 13 | **Motion Pack effects 1–7, on by default**: 1 flag→incident morph · 2 Acknowledge flies to Incidents with New count · 3 case journey draw-on · 4 simulation 10:45 shockwave, slide flash, load glow · 5 dashboard wake-up · 6 page transitions · 7 agent beam. Effect 8 (cursor spotlight) was not built. | `DEFAULT_ON` in `web/src/fxFlags.ts`; `?fx=none` turns them off for a tab. Reduced motion, `VITE_FX=off` and "Skip animations" always win | `f9b0121` … `44f0d31`, `fb65fd2`, default `8b1d53d` | `demo-safe-v8-p5` |
| 14 | **Look C · Night Shift is the default look.** A and B stay selectable. | `DEFAULT_LOOK` in `web/src/theme/looks.ts`; `?look=A`, `?look=B`, `?look=classic` (original palette) | `690799d`, default `d23e7af` | `demo-safe-v8-p5` |

## Standing decisions

- **Urgent red stays as it is** (`#ff5c5c`, about 5–6:1). It is not lifted to 7:1, which would turn it pink. Body text is 7:1 or higher in every look.
- **Colour rules:** bold red is only for urgent; warm orange is only for the incident "!"; purple is BCSP and green is CSP.
- **Before every push:** `npm run demo:walk` and `npm run demo:walk:fx` must both pass.
