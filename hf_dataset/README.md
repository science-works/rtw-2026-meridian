---
license: cc-by-4.0
pretty_name: Meridian Synthetic Histology Lab Workflow (one simulated day)
language:
- en
tags:
- synthetic
- healthcare
- pathology
- histology
- laboratory
- workflow
- process-mining
- event-log
- lims
size_categories:
- 1K<n<10K
task_categories:
- tabular-classification
- time-series-forecasting
---

# Meridian synthetic histology lab workflow dataset

**A fully synthetic, expert-elicited event log of one simulated day in a histology laboratory**, built to develop and test lab-workflow and AI-agent tools **without any patient data**. It was created for *Meridian* (Science Works "Reinvent the Wheel" hackathon, London, October 2026) by team Block Party.

> ⚠️ **Synthetic data only.** All identifiers are fictional. No real patients, specimens, staff or laboratories are represented. Not for clinical use.

## Why this exists
Public pathology datasets are almost all slide **images**. As far as we could find, there's no public dataset of **histology workflow events** (how cases, blocks and slides move through a lab), because the real data is patient-linked. This dataset fills that gap for tool builders.

## How it was made
- **Expert-elicited:** stages, timings, protocols and failure modes were specified by a senior histology lab lead from working practice.
- **Validated by script** across six iterations:
  - referential integrity;
  - stage counts reconcile (450 = 104 backlog + 346 current-day);
  - plausible event order;
  - no events after the shared clock (Tuesday, Day 1, 11:30);
  - one recorded H&E incident (EV-01215 basket failure at 10:45 → acknowledged 10:47 → reloaded 11:04 → 30-minute repeat run started 11:05; Activation state carries its status).
- **Standard event-log shape:** compatible with IEEE XES and OCEL 2.0 (object-centric: case, block, slide, basket, station).

## Contents
| File | Rows | Columns |
|---|---|---|
| `cases.csv` | 450 | Case ID, Cohort, Sample type, Priority, Programme tag, Stage snapshot, Stage entered (simulated), Blocks expected / complete, Levels required / recorded, Processor, Stainer basket, Slides in case, Alert category, Demo case? |
| `blocks.csv` | 712 | Case ID, Block ID, Sample type, Current location, Block status, Levels required / recorded, Case-level effect |
| `slides.csv` | 426 | Case ID, Block ID, Slide ID, Level, Stainer basket, Slide status, Scan status |
| `events.csv` | 1,253 | Event ID, Simulated time ("Day N HH:MM"; Day 0 = Monday), Case / Block / Slide ID, Stage, Station / equipment, Event type, Event details, Activation state, Fictional staff initials (AA/BB, embedding only) |
| `timing_rules.csv` | 36 | Rule / stage, Description, Starting value, Unit, Status (illustrative / unknown), Notes |

Equipment names are generic and normalised: Processor A–D, Embedding station 1–2, Microtomy station 1–6, H&E auto-stainer 1, Digital scanner 1–2, IQC workstation 1. Authoring notes used only for the hackathon demo have been removed.

**Demo scenarios (22 cases):** outstanding block (26H1003), protocol/level mismatch (26H1004), failed H&E basket `H&E-BASKET-01` affecting 20 slides across 10 cases (26H1005–26H1014), missing scan event (26H1015), decalcification (26H1016), urgent priority, ready for handoff at 09:30 (26H2345), ready for handoff (26H1018), and more.

## Intended uses
- Prototyping lab-operations dashboards, alert rules and handoff estimators.
- Testing AI agents and MCP tools on laboratory workflow, with no patient-data risk.
- Process-mining teaching (object-centric event logs).

## Out-of-scope uses
- Any clinical decision, diagnosis, reporting or performance assessment of real staff or labs.
- Benchmarking real turnaround times; the timings are illustrative.

## Limitations
One simulated day. Background cases have limited event history. Queues and parallel capacity aren't represented. Not validated against real laboratory data.

## Licence and citation
CC BY 4.0. Please cite: *Block Party (2026). Meridian synthetic histology lab workflow dataset. Science Works "Reinvent the Wheel" hackathon.* Code: https://github.com/Manthanbhanushali010/meridian-lab (MIT).
