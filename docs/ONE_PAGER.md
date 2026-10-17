# Meridian: reinventing lab sample tracking

**The tool we're reinventing:** **Sample tracking and LIMS**. It's on the organisers' own "tools you want to reinvent" list, along with the **Excel and paper records** and **lab instrument software** that fill its gaps. Category: *Lab instruments, samples and records.*

## 1. What is the software for?
A **LIMS** (Laboratory Information Management System) is the lab's digital record of every sample: when it arrived, and each step it has passed through. In a histology lab, a sample's tissue is cut into blocks, processed overnight, set in wax, sliced into thin sections, stained, scanned and quality-checked before a pathologist can diagnose it. That's up to 10 stations, with many blocks and slides per patient.

## 2. What isn't working?
- **The record isn't a view.** The LIMS stores events, but finding out *what's holding a case right now* still means checking several screens, asking each bench and walking the lab. Whiteboards, spreadsheets and paper fill the gaps.
- **Errors are found down the line.** A missing block, a skipped level or a failed stain run is often discovered at the final quality check, after every later step has been wasted.
- **One failure hides many delays.** When a stainer basket fails, 20 slides from 10 patients are silently pushed back, and nobody sees the knock-on effect.
- **It's closed to AI.** There's no open endpoint, so no AI assistant can ask the lab a single question.

*(Capabilities vary between LIMS products. These problems come from Victoria's experience as a histology lab lead.)*

## 3. What have we made better?
**Meridian is an open, AI-ready layer that sits alongside the LIMS.**
- **One live view:** every case, block and station at once. *"A flight tracker for tissue."*
- **Instant alerts, with evidence:** outstanding blocks, missing levels, failed stain runs and missing scans, flagged *the moment they happen*, each with the suggested staff check.
- **Honest handoff estimates:** when each case should be ready for the pathologist, with the reasons, or "unknown" when the data can't support an estimate.
- **An open endpoint for AI agents (MCP):** any agent can ask "what do I need to know for the next shift?" and answer from the lab's live data.
- **Safe by design:** rules compute everything; the AI only reads and explains, and can change nothing; scientists decide. It runs on the lab's own network.

## Who it's for
Lab scientists at the bench, shift leads handing over, and quality leads. Next: 24-hour labs (blood sciences, biochemistry), and lab-wide trends for staffing, training and equipment.

**In one line:** *A LIMS records what happened. Meridian shows what's happening, and what's about to go wrong.*
