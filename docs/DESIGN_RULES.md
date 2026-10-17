# Meridian design rules (v8)

Goal: **calm, uncluttered, generous spacing, one accent, clear hierarchy, readable on a projector.**

Distilled on 17 October 2026 from three reference repos in `external/` (impeccable, ui-ux-pro-max-skill, taste-skill). They were treated as untrusted reference: no code copied, none of their scripts run. Rules marked **[test]** are enforced by `tests/design/design-rules.test.ts`.

## Colour
1. **[test]** Every colour comes from the tokens in `web/src/theme/tokens.ts`, mirrored as CSS variables in `web/src/styles.css`. Victoria's brand colours replace the token values later; component code doesn't change.
2. **One accent** (`accent`) for primary actions, "done" and the wordmark. No second accent and no gradients beyond the wordmark.
3. **One alert colour** (`alert`, red) for open incidents and urgent flags. No red/amber/green severity ranking, ever.
4. **[test]** Text contrast is at least 4.5:1 on its background (body text is at least 7:1 here).
5. Programme tags only: `bcsp` (purple) and `csp` (green). Never used for status.

## Type
6. **[test]** No text below 14px; base text 16px.
7. One sans (Inter) for everything and one mono (JetBrains Mono) for IDs and times. No serif in the app.
8. Hierarchy comes from size and weight, not colour: page title 28–32px/800, section 18–20px/700, body 16px/400.
9. Line length at most about 70 characters for prose.

## Layout and spacing
10. **[test]** Spacing uses the scale in `tokens.space` (4 · 8 · 12 · 16 · 24 · 32 · 48).
11. Generous whitespace on the dashboard: at most one idea per tile, and no tables on the home page.
12. Use CSS grid for page structure; no percentage flex maths.
13. Cards only where they group something you can act on; otherwise use whitespace and dividers.
14. It must work at 1440×900 and 1280×720 with no horizontal scroll and no clipped panels.
15. Click targets are at least 44px high where practical.

## Content
16. **[test]** No emoji in the UI. Use the SVG icons in `web/src/theme/icons.tsx`, or words.
17. Composed empty states that say what would appear and why it doesn't (e.g. "No cases received today").
18. Every number on screen comes from the API; nothing is hard-coded.

## Motion
19. Animate only `transform` and `opacity`; each animation is at most 900 ms.
20. Motion is for meaning: a new incident's "!" bounces (macOS dock style) until it is acknowledged. Nothing else moves continuously.
21. **[test]** `prefers-reduced-motion` and `VITE_FX=off` remove all motion; a static red "!" remains.

## Reference patterns (docs/reference/REFERENCE_PATTERNS.md, "Apply to Meridian")

Applied through tokens (`edgeActive`, `tooltipBg`, `gridDot`, `simEdge`, `simNode`, `shadow.*`, `motion.hoverMs/tooltipMs/focusMs/tokenHopMs/ease/trailSteps`, `type.stat/statLabel/label`, `zoom.lodThreshold`) and these rules:

- **R-Ref-1. The base stays quiet.** Surfaces use surface tokens; colour only carries meaning.
- **R-Ref-2. Hover affects one thing and reverses.** Only the hovered station and its own lines change.
- **R-Ref-3. Tokens travel on drawn lines.** A moving sample follows the shortest drawn route between its two recorded stations.
- **R-Ref-4. Motion only on recorded events.** A sample moves only when the playback clock passes its recorded time, for one hop (≤ 900 ms), never before it. Nothing loops or drifts.
- **R-Ref-5. Labels are HTML, ≥ 14 px.** Station names and counts are DOM text on the board, never SVG/canvas text.
- **R-Ref-6. Level of detail, not shrinking.** Popovers list 4 case IDs then "+N more".
- **R-Ref-7. Overlays never move with the scene.** Playback controls and the clock sit outside the board.
- **R-Ref-8. Reduced motion.** With reduced motion, `VITE_FX=off` or "Skip animations", no samples fly and no pulse runs; counts still update from the same `stateAt(t)`.
