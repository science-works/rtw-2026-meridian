# Data provenance: how Meridian's dataset was made, and why it's credible

> **Meridian runs on synthetic data.** No real patient, specimen or laboratory data is used anywhere in this repository.

## 1. Why the data is synthetic
Real histology workflow data (case, block and slide events from a laboratory information system) is patient-linked and governed by information-governance rules. As far as we could find, **no public dataset exists** of histology *workflow events*. Public pathology datasets, including those on Hugging Face, are overwhelmingly **slide images** for diagnostic AI, not operational lab events. So we built the data the way clinical-informatics teams prototype safely: **expert-elicited synthetic data.**

## 2. How it was built (expert-elicited simulation)
1. **The domain expert.** Victoria, a senior histology / cellular pathology lab lead, specified the workflow stages, equipment types, timing rules, protocols (e.g. levels per block) and realistic failure modes from working practice.
2. **Generation.** A fictional workbook (`data/CellPath_Mock_Data.xlsx`) was generated and iterated through **six versions**. Each version was checked by script (`scripts/check_workbook.py`, `scripts/check_event_order.py`) for:
   - referential integrity (case → block → slide → event);
   - stage counts reconciling (450 = 104 previous-day backlog + 346 current-day);
   - event ordering (embedding before levels, staining before scanning, scanning before IQC);
   - no events after the shared clock (Tuesday, Day 1, 11:30);
   - exactly one staged "live trigger" event (EV-01215, a failed stain basket).
3. **Scenario design.** 22 demo cases carry detailed stories (an outstanding block, a protocol mismatch, a failed stain basket, a missing scan, an urgent case, decalcification, ready for handoff). 428 background cases give a realistic one-day workload.
4. **Timing rules** (`Timing Rules` sheet) are **illustrative**: processor cutoff, overnight outputs, embedding window, minutes per block, stain run, scan and IQC times. Values that were unknown (decalcification duration, re-fix time, thresholds) are kept as **unknown**, and Meridian says "unknown" rather than inventing them.

| | |
|---|---|
| **Volumes** | 450 cases · 712 blocks · 423 slides · 1,230 events |
| **Identifiers** | All fictional (e.g. `26H1003`); no names, dates of birth or real accession numbers |

## 3. Why the shape is authentic: standard event-log formats
Meridian's event model follows the same shape as **real, published hospital process logs**:
- **IEEE XES** (*case id, activity, timestamp, attributes*): the standard for process-mining event logs.
- **OCEL 2.0** (Object-Centric Event Logs, [arXiv:2403.01975](https://arxiv.org/abs/2403.01975)): each event relates to several objects. Our events naturally link **case, block, slide, basket and station** objects.
- **Real hospital logs with this shape** (used as structural references only; none of their data is used here):
  - *BPIC 2011 Hospital log*, a real-life event log from a Dutch academic hospital (4TU.ResearchData, DOI 10.4121/uuid:d9769f3d-0ab0-4fb8-803b-0d1120ffcf54; 4TU General Terms of Use).
  - *Sepsis Cases* event log, real patient pathways through a hospital (4TU.ResearchData).

Because the shape is standard, a lab's real export, if approved, maps onto Meridian through the `FeedAdapter` (see `docs/EVENT_MODEL.md`) without changing the rules engine.

## 4. Context benchmarks (not used as Meridian targets)
- Royal College of Pathologists **KPI 6.4: 90% of histopathology cases *reported* within 10 calendar days**, as cited publicly by NHS laboratories (e.g. Exeter Clinical Laboratory International). This measures *reporting*, which is **out of Meridian's scope**. Meridian estimates **lab preparation and handoff to the pathologist only**.
- The handoff targets in `config/targets.json` are **illustrative values set by the domain expert**, not a local service-level agreement.

## 5. Evidence base (peer-reviewed; found via the Paperclip literature search)
Each Meridian design choice maps to published findings:

| Meridian feature | Evidence |
|---|---|
| **Problem: errors are under-detected** | Katsma et al., *BMJ Open Quality* (2026), a systematic review and meta-analysis of 31 studies (≈2.79 million surgical pathology cases). Errors *actively identified* in the laboratory: **40.17 per 1,000 cases** (95% CI 7.04–97.61), versus *reported* specimen errors at **4.94 per 1,000** (95% CI 1.33–10.80). The authors conclude that technical errors are more prevalent than reported, and they call for **"structured and automated error-tracking systems."** (PMC12887483) |
| **Alert types** (levels / recuts, decalcification, staining, block identification) | Morelli et al. (2013), root-cause analysis of histology errors, lists "error in identification of block to be cut", "specimen was not decalcified" and staining errors (PMC4718384). Turnaround-time audits identify **re-cuts / deeper sections and decalcification** as main causes of delay (PMC7715650 abstracts; PMC11258951). |
| **Live workflow view ("status board")** | Seifert et al., *JAMIA Open* (2020): LIS built-in functions "do not address all the needs of a modern histology laboratory"; custom dashboards and a histology **"status board"** improved slide logistics, staffing and task tracking (PMC7886543). Tuthill (Henry Ford): traditional tracking offers "minimal to no real-time workflow monitoring" (*Virchows Archiv* abstracts, 2016). |
| **Bottlenecks at handoffs between steps** | Hassell et al. (2010): significant wait times between steps; bottlenecks at gross dissection, case assembly and the microtome (PMC2830185). |
| **Event-log / process-mining approach** | Tsai et al., *Applied Clinical Informatics* (2023): transforming laboratory event logs for process mining to measure turnaround time, workload, work-in-process and **machine downtime** effects (PMC9946784). |
| **Synthetic data is an accepted method** | Synthetic health records (Synthea) and synthetic event-log generators are standard in process-mining research (e.g. arXiv 2512.03787; arXiv 2309.14092). |

## 6. Limitations (stated plainly)
- Synthetic data can't capture every real-world variation (staffing, equipment faults, specimen mix differ between sites).
- The background cases have limited event history; their estimates are labelled **"illustrative, stage-based"**.
- Queues and parallel capacity are **not modelled** yet.
- Meridian has **not** been validated on real laboratory data. That would require a lab-approved, read-only interface, information-governance review and a shadow pilot.

## 7. Open dataset
The synthetic dataset is published openly (see the dataset card) so others can test lab-workflow tools without touching patient data: **Hugging Face: `<hf-username>/meridian-synthetic-histology-workflow`** *(link added on publication)*.
