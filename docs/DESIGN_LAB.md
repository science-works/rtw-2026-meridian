# Design Lab: colour grading and depth for Meridian

Experiment only. Nothing here is the default until it is approved. Try a look with `?look=A`, `?look=B` or `?look=C`; `?look=default` returns to the current look.

Sources were read, not copied. They are the cloned references in `external/` (read-only) and the measurements in `docs/reference/REFERENCE_PATTERNS.md`. Where sources disagree, the brief and Victoria's rules win.

Each look keeps Victoria's rules:
- bold red only for urgent;
- warm orange only for the incident "!";
- purple for BCSP and green for CSP;
- text 14 px or larger;
- motion safe under reduced motion.

## Techniques

| # | Technique | Source | How it applies to Meridian | Looks |
|---|---|---|---|---|
| T1 | **Tonal surface elevation.** Depth comes from a step in surface tone, not from lines. | `external/pbakaus__impeccable/.claude/skills/impeccable/reference/android.md` ("Tonal elevation"); `…/colorize.md` ("canvas and elevated surfaces", "design surface elevation … do not invert"); `external/leonxlnx__taste-skill/skills/taste-skill/SKILL.md` ("Surfaces are separated by a small step in tone"); REFERENCE_PATTERNS §A (surface0–3) | Page, then bars, then cards, then hovered cards, each one tone step lighter | A, B, C |
| T2 | **Key light and top-edge highlight.** One light source, top left, gives a 1 px inner highlight on the top edge. | `external/leonxlnx__taste-skill/skills/soft-skill/SKILL.md` (inner core `inset 0 1px 1px rgba(255,255,255,.15)`); `…/taste-skill-v1/SKILL.md` ("Liquid Glass": 1 px inner border + inset highlight); `external/nextlevelbuilder__ui-ux-pro-max-skill/src/ui-ux-pro-max/data/styles.csv` (Neumorphism and Glassmorphism "light source") | `inset 0 1px 0 rgba(255,255,255,.09)` on cards; the page lit from the top left | A, B (C barely) |
| T3 | **Tinted shadows, never black.** Shadows take the background's hue. | `external/leonxlnx__taste-skill/skills/redesign-skill/SKILL.md` ("Tint shadows to match the background hue"); `…/taste-skill-v2-experimental/SKILL.md` ("tint it to the background hue"); `…/soft-skill/SKILL.md` (bans harsh black shadows) | Navy shadows `rgba(4,12,48,.7)` under cards and under the 3D clock | A, B |
| T4 | **Shadows have offset and soft blur; a zero-offset coloured halo is decoration.** | `external/pbakaus__impeccable/.claude/skills/impeccable/reference/craft-floor.md` ("Depth: shadows carry an offset and a soft blur") | Card shadows sit below the card (`0 14px 30px -10px`). Halos are kept only where they carry meaning: the incident "!" and the clock arc. | A, B, C |
| T5 | **Gradient face.** A slight diagonal gradient on a surface reads as a lit plane. | REFERENCE_PATTERNS §1 (deck.gl: "a dark base that steps back"); `ui-ux-pro-max …/styles.csv` (Soft UI Evolution "subtle depth") | Cards go `#1a2e66 → #122251 → #0e1c46` at 160° | A |
| T6 | **Vignette and a quiet base.** The base carries no information; the edges fall off. | REFERENCE_PATTERNS §1.1 (deck.gl dark base), §3.1 (force-graph dark field); `external/leonxlnx__taste-skill/skills/minimalist-skill/SKILL.md` ("soft radial light spots … opacity 0.03") | Radial falloff to `rgba(2,5,16,.75)` at the corners, on the page background only, so text never sits under it | A |
| T7 | **Glass panels used sparingly.** Backdrop blur 10–20 px, hairline `white/10–20`, an inner highlight, on a vibrant background. | `ui-ux-pro-max …/styles.csv` (Glassmorphism: "Backdrop blur (10-20px), subtle border (1px solid rgba white 0.2)"); `external/leonxlnx__taste-skill/skills/taste-skill-v1/SKILL.md` (Liquid Glass); `…/soft-skill/SKILL.md` (blur only where it is cheap) | Panels `rgba(26,42,92,.6)` + `blur(14px)`; topbar and footer glass. Contrast is measured against the composited card colour. | B |
| T8 | **Lab texture.** A fine, fixed, pointer-events-free texture so glass has something to frost. | `external/leonxlnx__taste-skill/skills/soft-skill/SKILL.md` and `…/taste-skill-v1/SKILL.md` (grain only on fixed layers); REFERENCE_PATTERNS §2.1 (React Flow dot grid, ~38 px) | A 22 px slide-grid of dots plus two soft colour washes (green top left, periwinkle bottom right), fixed to the page | B |
| T9 | **Accent saturation per mode.** Dark modes use lighter, adjusted tonal variants; chroma is lowered near the extremes. | `ui-ux-pro-max …/references/quick-reference.md` (`color-dark-mode`: "desaturated / lighter tonal variants"); `…/colorize.md` (OKLCH: "reduce chroma near white and black") | B raises the accent to `#8ff0bd` for a brighter data glow; C saturates it to `#5ef0a4` on near-black | B, C |
| T10 | **Contrast curve.** Body text well above 4.5:1; secondary text tinted from the surface, never washed-out grey. | `…/colorize.md` ("derive secondary text from the foreground or surface hue"); `…/craft-floor.md` (contrast floor); `ui-ux-pro-max …/data/ux-guidelines.csv` #36 (4.5:1) | Muted text is a blue-tinted grey at 8.4–11.5:1; ink 14–18.7:1 | A, B, C |
| T11 | **Glow only on meaning.** No glows by default; light only where the data is. | `external/leonxlnx__taste-skill/skills/taste-skill-v1/SKILL.md` ("NO Neon/Outer Glows" by default); REFERENCE_PATTERNS "Not adopted" (multicolour glows); `ui-ux-pro-max …/styles.csv` (Dark Mode OLED "minimal glow") | Glow on the incident "!", the clock arc and the headline count only | B (data), C (incident + clock) |
| T12 | **Minimal borders in a high-contrast dark.** Lines are replaced by tone steps. | `external/leonxlnx__taste-skill/skills/taste-skill/SKILL.md` ("No thin rules … A step in background tone"); `…/minimalist-skill/SKILL.md` | C removes card borders; separation comes from `#04060d → #0c1222` | C |
| T13 | **Bound the expensive effects.** Blur and filters only on bounded or fixed elements. | `…/impeccable/reference/animate.md` ("Bound blur, filter, shadow … to isolated regions"); `…/soft-skill/SKILL.md` ("Blur Constraints") | Glass only on cards and bars (no blur on the scrolling page itself); textures and vignette on the fixed page background | B, A |

## The three looks

- **A · Deep Lab** (T1–T6, T10, T13): cinematic navy with a cool key light from the top left, gradient card faces, a top-edge highlight, navy-tinted shadows and a gentle vignette.
- **B · Clinical Glass** (T1, T2, T3, T7, T8, T9, T10, T11, T13): frosted translucent panels over a dotted lab texture, crisp hairline borders, and a brighter accent glow on the clock arc and headline counts.
- **C · Night Shift** (T1, T4, T9, T10, T11, T12): a near-black base, higher contrast, a richer accent, no card borders, and a stronger glow on the incident "!" and the clock.

Every look re-asserts the urgent ring, the BCSP and CSP tile edges and the incident border last in `web/src/looks.css`, so no look can drop a colour cue (tested in `tests/design/looks.test.ts`).

## Contrast (minimum of page and card)

| Look | Ink | Muted | Accent | Urgent | Incident | BCSP | CSP |
|---|---|---|---|---|---|---|---|
| Current | 14.3 | 7.3 | 9.4 | 5.1 | 8.8 | 8.1 | 9.9 |
| A · Deep Lab | 14.1 | 8.4 | 9.3 | 5.5 | 8.7 | 8.0 | 9.7 |
| B · Clinical Glass | 14.1 | 8.7 | 11.0 | 5.4 | 8.5 | 8.4 | 10.1 |
| C · Night Shift | 18.7 | 11.5 | 12.9 | 6.2 | 10.6 | 9.4 | 13.2 |

Body text (ink and muted) is 7:1 or higher in every look. The urgent red is under 7:1 in every look, including the current one. It is bold, used on short IDs, and above the 4.5:1 floor. Lifting it to 7:1 would turn it pink.

Screenshots: `docs/screenshots/lab-<look>-<page>.png` and `docs/screenshots/lab-contact-sheet.png`.

## Preview: "Stain spectrum" (`?look=spectrum`)

The idea: one hue per workflow stage, in lab order, echoing H&E. Haematoxylin's blue-violet marks microtomy and eosin's pink marks staining. It sits on top of the default look (C), and colour appears only in lines, edges, arcs and dots.

- **Simulation:** a dark board, station edges in their stage colour, lines graded from source stage to target stage, and moving samples coloured by the station they are heading to. Urgent samples stay red.
- **Detailed simulator:** each station card's top edge takes its stage colour.
- **Clock:** the completed arc runs through the spectrum by position around the ring, with a white head dot.
- **Case journey:** passed stations take their stage colour.
- **Pages:** case, station and incident pages give their cards a 2 px top edge in their stage colour.
- **Header:** an aurora behind it at 8% opacity or less.

Text colours are unchanged, so contrast is the same as look C. The urgent, incident, BCSP and CSP cues are untouched, which is tested. Side-by-side comparisons: `docs/screenshots/spectrum-side-<page>.png`.

## Preview: "Midnight Blue" (`?look=midnight`)

Look C graded to black and blue:
- a `#05070D` base, with a deep-blue light from the top centre and a faint blue pool low on the left;
- cards with a gradient face (`#0A1020 → #0D1530`), a `#1B2C55` hairline, a top highlight and blue-tinted shadows;
- a black header with an electric-blue hairline and glow;
- a soft blue halo behind each ring; the arcs keep their colours;
- blue hover and focus (`#60A5FA`, 2 px focus ring);
- headings and numbers in white, body text `#E6ECF8`, secondary text `#9FB0D0`.

Contrast (lowest of page and card): ink 18.6 · muted 8.5 · accent 12.8 · urgent 6.1 · incident 10.6 · BCSP 9.3 · CSP 13.1. The urgent ring, BCSP/CSP edges and incident border are re-asserted after the card rule, which is tested. The simulation board keeps its own light surface.

To combine it with the spectrum: `?look=midnight&spectrum=1`. Side-by-side comparisons: `docs/screenshots/midnight-side-<page>.png`.
