# Q&A card (2 minutes of judge questions)

One or two sentences each. **V** = Victoria answers, **M** = Manthan answers. If unsure, say so: "We haven't tested that yet" beats a guess.

## Likely, by judge

| Judge | Question | Answer | Owner |
|---|---|---|---|
| Alexander Hasson (Apheris) | "How would real patient data be protected?" | It runs on the lab's own network and the AI is read-only. A live version would need lab-approved interfaces, access control, information-governance review and audit. Today it uses only synthetic data with fictional IDs. | M |
| Maxim Tsenkov (PDBe) | "How does it connect to different labs' systems?" | Through an open event model and a `FeedAdapter`: map a LIMS export to our schema and the rules, dashboard and MCP tools work unchanged. The events also map to IEEE XES and OCEL 2.0, the open process-mining standards. | M |
| Cyril Schröder (Ellison Institute) | "What's the real-world impact?" | Errors caught at the bench instead of at final QC, so no downstream work is wasted. Cleaner shift handovers. Later, equipment and error trends across the lab. | V |
| Austin Mroz (CuspAI) | "What does the AI actually do?" | Code computes every count, alert and estimate. The agent calls our read-only tools, follows the evidence across cases and explains it; it cannot change anything. You saw each tool call appear on the dashboard. | M |
| Ed Hughes (Inherent) | "Does it solve what it claims?" | Yes: 149 automated tests pass, including the trigger flagging exactly 20 slides and 10 cases three times in a row, and every "unknown" case. And you just watched it work live. | M |
| Joanne Sheppard (UCL) | "Who would use this day to day?" | Bench scientists ("what needs me now?"), shift leads ("what does the next team need to know?") and quality leads. | V |

## Anyone

| Question | Answer | Owner |
|---|---|---|
| "Is this monitoring staff?" | No. Every histology step is already signed by the scientist who did it; we'd use that to see where an error started and how far it travelled, for training, not blame. | V |
| "Why not just build it into the LIMS?" | Capabilities vary and vendors are slow to open up to agents. An open layer works alongside whichever LIMS a lab already has. | M |
| "Is this real data?" | No. It's synthetic, built from real lab timings by Victoria and checked by script across six versions. It's packaged as an open dataset in the repo (`hf_dataset/`) so others can test without patient data. | V |
| "Why should we trust the estimates?" | They're deterministic: remaining steps × the lab's configured timings, with every component shown. Where data is missing, such as decalcification, Meridian says "unknown" and why. | M |
| "Does it predict when the pathologist reports, or screening deadlines?" | No, deliberately. It predicts readiness for pathologist handoff only; reporting and programme deadlines are out of scope. | V |
| "What happens when the AI is wrong?" | It can't change anything, and it answers from tool results with case and event IDs you can check on the dashboard. Rules decide, the AI explains, scientists act. | M |
| "How long would a real pilot take?" | A read-only shadow pilot on one lab's export is the next step: map the export, configure the timings, compare with what staff see. We haven't done one yet. | V |
| "What's next?" | Shift handover across 24-hour labs; lab-wide trends for staffing, training and equipment; station sign-in and live mismatch checks. All future work, not built. | V |

## Never say

Production-ready · connected to a real lab · diagnoses · predicts deadlines or reporting times · "LIMS can't do this".
