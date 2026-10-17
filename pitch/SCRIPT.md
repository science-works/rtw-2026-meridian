# Meridian: 3-minute pitch (Victoria + Manthan)
Lines marked ✂️ are the first to cut if a timed run goes over 3:00.

1 · THE PROBLEM (0:00–0:25) · Victoria   [Dashboard, no clicks]
"I run a histology lab. Every biopsy taken in a hospital, a suspected bowel cancer, a cervical screening sample, comes to a lab like mine. Before a doctor can diagnose it, the tissue goes through about ten steps: cut, processed overnight, set in wax, sliced, stained, scanned and checked.
If one step goes wrong, a patient waits longer for their result.
And today, we usually find out at the very end."

2 · THE OLD WAY (0:25–0:45) · Victoria   [LIMS view: grey rows]
"Every lab tracks this in a system called a LIMS. This is what it gives us: rows of what already happened. It's built to remember, not to watch.
So to find a case, I check several screens, ask each bench, walk the lab.
✂️ And it's closed: no other tool, and no AI, can look inside."

3 · THE REINVENTION (0:45–2:45)
Manthan   [Dashboard]
"So we reinvented what a LIMS shows. Not another record of the past: a live view of the present. This is Meridian.
The whole lab at a glance: 450 cases, 104 carried over from yesterday, how many have reached the pathologist, and urgent cases in red."
[types 26H2345 → case page]
"One search, any case: every station it passed, with times. This urgent biopsy was ready for the pathologist at 9:30."

Victoria   [Simulation → Play]
"This is my lab's morning, replayed from the recorded events. Every dot is a patient's sample, moving station to station.
✂️ You can see the queue building at the microtomes: that's yesterday's backlog."
[playback ends at 11:30; back to the Dashboard: an incident flag is bouncing]
"And now, at 11:30…"

Manthan   [double-clicks the bouncing "Incident · Microtomy station 4" flag]
"Microtomy station 4. This biopsy needs three levels cut; only one was recorded. Meridian caught it the moment it was logged, not at the final check."
Victoria   [presses Acknowledge]
"I acknowledge it. It leaves the dashboard, but it stays open in our incident list until someone checks it. Acknowledging isn't fixing."

Manthan   [Incidents → stainer incident]
"Earlier this morning, a stainer basket failed: twenty slides, ten patients' cases. Acknowledged in two minutes, troubleshot, now re-staining, done by 11:35. Every step recorded."
Victoria   "The failure is the same. What changes is when we find out."

Manthan   [Claude Desktop left, Meridian right]
"And it's open. Any lab system's events can plug in, and any AI agent can read the lab through an open standard. I ask: what does the next shift need to know?"
[the agent console lights up, ~8 s, say nothing]
"It reads everything. It can change nothing. Rules decide, AI explains, scientists act."

CLOSE (2:45–3:00) · Victoria
"We built this with the person who walks the lab every day: me.
A LIMS records what happened. Meridian shows what's happening, and what's about to go wrong."

Never say: production-ready, connected to a real lab, diagnoses, predicts deadlines, "LIMS can't do this".
