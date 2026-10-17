# Playbook `!meridian-3d`: the interactive 3D "Lab Floor" (optional hero view)

## Overview
Add one interactive 3D scene, the **Lab Floor**: a calm, isometric, low-poly lab where each station is a simple shape and each case is a glowing dot moving through the workflow. When the stainer fails, a crimson shockwave spreads from Stainer 1 and the 20 affected slides lift and glow, so the room *feels* how one failure spreads. Clicking a station or dot flies the camera there and opens the normal case drawer.

**This is presentation polish, not core.** Build it only after Checkpoint 4. Time-box it to 2 hours. Ship it behind `VITE_3D=on` with an automatic 2D fallback. Serves FR-16 and the Presentation score.

## Approved 3D stack (licences checked against npm, 17 October 2026)

| Package | Licence | Role | Note |
|---|---|---|---|
| `three` | MIT | WebGL engine | Pin a recent 0.18x version |
| `@react-three/fiber` (R3F) v9 | MIT | React renderer for three | **Requires React 19 (≥19, <19.4)**; check `web/package.json` first |
| `@react-three/drei` v10 | MIT | Helpers: `OrbitControls`, `Html` labels, `Instances`, `RoundedBox`, `Text`, `PerformanceMonitor`, `AdaptiveDpr` | — |
| `@react-three/postprocessing` v3 | MIT | Subtle bloom on alerts | Optional; drop it first if FPS dips |
| `motion` (already approved) | MIT | 2D overlays and timing | — |

**Avoid:**
- **Spline** (`@splinetool/*`): no open-source licence declared, and it needs a proprietary editor.
- **Theatre.js:** a heavy choreography tool; overkill for tonight.
- **Any downloaded 3D models or textures:** licence risk, and they add load time. Use primitives only.
- **deck.gl / globe libraries:** wrong shape for a lab.

## What's Needed From User
- Confirmation that Checkpoint 4 has passed (2D motion and Story mode working).
- Approval to add `three`, `@react-three/fiber`, `@react-three/drei` and (optionally) `@react-three/postprocessing`.
- A **test on the actual presentation laptop and an external display** before deciding to show it on stage.

## Procedure

### Phase A: guardrails first (web/src/three/)
1. Check the React version in `web/package.json`. If it's React 18, stop and ask (R3F v9 needs React 19; R3F v8 works with 18). Pick the matching versions.
2. Install the packages; log them as adopted in `external/REGISTRY.md`; add them to the README's "Built with".
3. Create a `web/src/three/` folder and **lazy-load** it (`React.lazy` + `Suspense`), so the 3D code never loads unless enabled.
4. Add feature detection: render 3D only if `VITE_3D=on`, WebGL2 is available, and `prefers-reduced-motion` isn't set; otherwise render the existing 2D lab map. Add a visible toggle: "3D view / 2D view".
5. Add an error boundary around the canvas: any 3D error → fall back to 2D silently and log it to the console.

### Phase B: the scene (primitives only, data-driven)
6. Set up a fixed isometric-ish camera (orthographic or a narrow FOV) with limited OrbitControls (small rotation range, zoom clamps, no panning off the floor).
7. Lay out **11 stations** left to right along the workflow, each a `RoundedBox` with a short `Html` label:
   Reception → Cut-up → Decalc → Processor A–D (a cluster) → Embedding → Microtomy → Stainer 1 → Scanners 1–4 (a cluster) → IQC → Handoff.
   Station positions come from a static layout map; their **counts come from `/api/overview`**.
8. Draw **case dots as one `InstancedMesh`** (one draw call for 450 dots), positioned at each case's current station with a small jitter. Colours:
   - teal: on track;
   - periwinkle: in progress;
   - amber: hold;
   - crimson: alert;
   - backlog: a slightly larger dot.
9. Label each station with its live count (rolling numbers) as an `Html` overlay, readable at 16px or larger.
10. Add soft lighting (one hemisphere and one directional light), the cream floor colour from the palette, and no shadows by default (performance).

### Phase C: live behaviour (driven by SSE)
11. Subscribe to the same SSE stream as the 2D dashboard. On `state-changed`, re-fetch and **tween** dots to their new stations (≤900 ms, eased).
12. **Failure moment:** on an alert of kind `basket_failure`:
    - expand a crimson ring outward from Stainer 1 (≤900 ms);
    - lift the 20 affected slide dots slightly and pulse them once;
    - roll the affected cases' estimates in the 2D overlay.
    Bloom only on crimson elements, and only if postprocessing is enabled.
13. **Hold spotlight:** when 26H1003 is selected, dim everything else to 30% and give F1's dot an amber pulse at Cut-up, while A1–E1 glow teal inside Processor D.
14. **Click a station** → the camera eases to it and the 2D panel lists its cases. **Click a dot** → open the normal case drawer (reuse the component; no new data paths).
15. **Story mode hook:** expose `focusStation(id)`, `focusCase(id)` and `playFailure()` so E1 can drive the 3D view when it's on.

### Phase D: performance and proof
16. Add `PerformanceMonitor` + `AdaptiveDpr`; clamp DPR to [1, 1.5]; set `frameloop="demand"` and invalidate only during tweens. If the average drops below 30 fps, auto-switch to 2D.
17. Test on the presentation laptop: Chrome, external display at 1440×900, power adapter in. Record the FPS during the failure moment.
18. ⏸ **Checkpoint 3D:** a demo video of the Lab Floor, before and after the trigger, with an FPS reading, plus proof that the 2D fallback works (WebGL off / `VITE_3D=off`). The user decides whether 3D goes on stage.
19. Commit `3D: lab floor (flagged)`. Push.

## Specifications
- With `VITE_3D` unset or `off`, the app behaves exactly as before; the bundle doesn't load the three code (check the network tab).
- With it on, the station counts equal `/api/overview`; dot colours match the alert and estimate state; the failure ripple plays exactly once per trigger, and reset restores the scene.
- At least 30 fps (target 60) on the presentation laptop during the failure moment; no console errors; the error boundary falls back to 2D.
- Every label is readable from the back of the room; "SIMULATED DATA" is still visible.
- Every visual is derived from API data; there are no hard-coded counts.

## Advice and Pointers
- **The 3D view is a stage, not the instrument.** The 2D dashboard stays the source of detail. If a judge wants to click around, switch to 2D.
- Use instancing for the dots, merge static station geometry where you can, and skip shadows and post-processing unless the FPS allows them.
- An isometric camera plus soft colours reads as "clinical and calm"; spinning cameras read as "gimmick". Keep the motion purposeful.
- Build the static scene first (B6–B10), then the live tween, then the failure moment. Stop after the failure moment if time is short.
- **Kill switch:** if it isn't rock-solid by **23:00 Saturday**, leave `VITE_3D=off` for the pitch and mention it as "also available" only if asked.

## Forbidden Actions
- Don't block or slow the 2D path; don't make 3D the default view on stage without a rehearsal on the real projector.
- Don't import models, textures or HDRIs from the internet; primitives only.
- Don't add Spline, Theatre.js or any library without an open-source licence.
- Don't fake data in 3D (no decorative dots that aren't real cases; no counts that don't come from the API).
- Don't start this playbook before Checkpoint 4 passes, and don't let it delay submission.
