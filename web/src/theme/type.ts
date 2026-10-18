// Typography previews: ?type=editorial | instrument | clinical (default: the current type, unchanged).
// Fonts are self-hosted from @fontsource packages (OFL-1.1) so they work offline. Each set changes only
// the display face (titles, big numbers) and the data face (case IDs, times, codes); Inter stays the UI face.
// Each set lives in web/src/type/<set>.css plus one line below, so it can be reverted on its own.
import "../type.css";
import "../type/editorial.css";
import frauncesUrl from "@fontsource-variable/fraunces/files/fraunces-latin-full-normal.woff2?url";
import "../type/instrument.css";
import soraUrl from "@fontsource-variable/sora/files/sora-latin-wght-normal.woff2?url";
import "../type/clinical.css";
import instrumentUrl from "@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2?url";

export type TypeId = "editorial" | "instrument" | "clinical";

export const TYPE_SETS: Record<TypeId, { display: string; mono: string; licence: string; preload: string }> = {
  editorial: { display: "Fraunces Variable", mono: "IBM Plex Mono", licence: "OFL-1.1", preload: frauncesUrl },
  instrument: { display: "Sora Variable", mono: "Martian Mono Variable", licence: "OFL-1.1", preload: soraUrl },
  clinical: { display: "Instrument Serif", mono: "JetBrains Mono Variable", licence: "OFL-1.1", preload: instrumentUrl },
};

/** Approved type set: clinical. ?type=default shows the original type (Inter + JetBrains Mono). */
export const DEFAULT_TYPE: TypeId | null = "clinical";
const KEY = "meridian.type";

/** Reads ?type= (kept for this tab; ?type=default shows the original type), sets html[data-type] and preloads the display font. */
export function applyTypeFromUrl() {
  let pick: string | null = null;
  try {
    const q = new URLSearchParams(window.location.search).get("type");
    if (q !== null) {
      if (q in TYPE_SETS || q === "default") sessionStorage.setItem(KEY, q);
      else sessionStorage.removeItem(KEY);
    }
    pick = sessionStorage.getItem(KEY);
  } catch {
    pick = new URLSearchParams(window.location.search).get("type");
  }
  const id = (pick === "default" ? null : pick && pick in TYPE_SETS ? pick : DEFAULT_TYPE) as TypeId | null;
  const root = document.documentElement;
  if (!id) return void delete root.dataset.type;
  root.dataset.type = id;
  const link = document.createElement("link");
  Object.assign(link, { rel: "preload", as: "font", type: "font/woff2", href: TYPE_SETS[id].preload, crossOrigin: "anonymous" });
  document.head.appendChild(link);
}
