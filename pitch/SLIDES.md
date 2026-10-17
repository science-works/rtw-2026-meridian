# Slides (at most 5): outline

Event palette: cream `#F8F5F2` background, plum `#5C0F35` headings, crimson `#D62E4C` for alerts only, teal `#0E6B63` for done, periwinkle `#5A6FD6` for in progress. Serif headings (Source Serif 4), Inter body. Sparse: the live app is the main slide.

## 1. Title
- **Meridian**: *Every case, every station, mapped live.*
- Block Party · Victoria (histology lab lead) · Manthan (build)
- Small footer: "Synthetic data. Not connected to a real lab."

## 2. The problem (Victoria; teach the room)
- **01 What a LIMS is for:** the lab's digital record of every sample and each step it passes through.
- **02 What isn't working** (her experience): no live view; errors found down the line; one failure silently delays many cases; no AI can ask it anything.
- Visual: the 10-station chain (receipt → cut-up → processing → embedding → microtomy → H&E → scanning → IQC → handoff), with "where is it?" marks.

## 3. Live demo
- One line: "Switch to the app." (Meridian full screen; Claude Desktop ready on the left for the agent beat.)
- Backup: if the app fails, this slide links the backup video.

## 4. How it works
- Architecture (from the README): feed → rules and estimates → API/SSE → dashboard + MCP → agent.
- Three words, large: **Rules decide · AI explains · Scientists act.**
- Proof strip: "149 tests passing" (test-run screenshot) · "open event model (XES / OCEL 2.0)" · "read-only MCP".

## 5. Vision (clearly marked **future work, not built**)
- **Live** (today) → **Shift** (handover in 24-hour labs) → **Lab-wide** (trends for staffing, training, equipment).
- Next steps: station sign-in and digital sign-off; live mismatch checks; error-trend detection; real LIMS interfaces with information-governance approval.
- Closing line: *"A LIMS records what happened. Meridian shows what's happening, and what's about to go wrong."*
