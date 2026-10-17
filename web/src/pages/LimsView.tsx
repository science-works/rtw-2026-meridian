import { useEffect, useState } from "react";
import type { EventsPage, FeedEvent } from "../../../shared/types";

/** The pitch's "old way": what a LIMS shows. Plain events up to 11:30, newest last; no colour, alerts or estimates. */
export function LimsView({ version }: { version: number }) {
  const [rows, setRows] = useState<FeedEvent[] | null>(null);
  useEffect(() => {
    let live = true;
    (async () => {
      const all: FeedEvent[] = [];
      let offset: number | null = 0;
      while (offset !== null) {
        const page: EventsPage = await (await fetch(`/api/events?limit=500&offset=${offset}`)).json();
        all.push(...page.events);
        offset = page.nextOffset;
      }
      if (live) setRows(all);
    })();
    return () => {
      live = false;
    };
  }, [version]);
  return (
    <section className="lims">
      <h1>What a LIMS shows: what already happened</h1>
      <p className="lims-sub">{rows ? `${rows.length} events up to Day 1 11:30, oldest first.` : "Loading…"}</p>
      <div className="lims-scroll">
        <table className="lims-table">
          <thead>
            <tr>
              <th>Event ID</th>
              <th>Time</th>
              <th>Case</th>
              <th>Block / slide</th>
              <th>Station</th>
              <th>Event type</th>
            </tr>
          </thead>
          <tbody>
            {rows?.map((e) => (
              <tr key={e.eventId}>
                <td>{e.eventId}</td>
                <td>{e.at}</td>
                <td>{e.caseId}</td>
                <td>{[e.blockId, e.slideId].filter(Boolean).join(" / ") || "—"}</td>
                <td>{e.station ?? "—"}</td>
                <td>{e.type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
