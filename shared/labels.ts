// Display labels for equipment (spec §3, playbook 07): the raw workbook strings are
// inconsistent, so they are normalised for display only; data keeps the raw values.
// Equipment set: Processor A–D, Embedding station 1–2, Microtomy station 1–6,
// H&E auto-stainer 1, Digital scanner 1–2, IQC workstation 1.
const RULES: [RegExp, string][] = [
  [/\bMicrotome(?: station)? (\d)\b/g, "Microtomy station $1"],
  [/\bIQC (?:desk|station)\b/g, "IQC workstation 1"],
  [/\bH&E auto-stainer(?: 1)?(?: \/ Box \d+ \/ Basket \d+| basket H&E-BASKET-\d+| \/ repeat run)?|\bH&E stainer\b|\bPriority H&E run\b/g, "H&E auto-stainer 1"],
  [/\bDigital scan(?:ner| queue)\b(?! \d)/g, "Scanner queue"],
  [/(?<!Digital )\bScanner (\d)\b/g, "Digital scanner $1"],
];

export function generic(text: string): string;
export function generic(text: string | null): string | null;
export function generic(text: string | null): string | null {
  if (text == null) return null;
  return RULES.reduce((s, [re, to]) => s.replace(re, to), text);
}

/** Stainer box/basket held in a raw station string, e.g. "H&E auto-stainer 1 / Box 1 / Basket 1". */
export function stationParts(raw: string | null): { box?: string; basket?: string } {
  if (!raw) return {};
  const box = /Box (\d+)/.exec(raw)?.[1];
  const basket = /(H&E-BASKET-\d+|URGENT-H&E-RUN-\d+)/.exec(raw)?.[1] ?? /Basket (\d+)/.exec(raw)?.[1];
  return { ...(box ? { box: `Box ${box}` } : {}), ...(basket ? { basket: /^\d+$/.test(basket) ? `Basket ${basket}` : basket } : {}) };
}

// Workbook authoring notes addressed to the app or presenter ("Show ...", "Do not ...",
// "Trigger this event ...", scope notes such as "... out of scope") are not lab events, so they are dropped from display text.
const DIRECTIVE = /^(show|do not|don't|trigger this event|keep visible)\b|out of scope|editable rule|\bsheet\b/i;

/** Event or status text as shown to people: generic labels, no authoring notes. */
export function displayText(text: string): string {
  const body = generic(text)
    .replace(/^PENDING LIVE DEMO TRIGGER:\s*/i, "")
    .replace(/\.{2,}/g, ".");
  const sentences = body.match(/[^.;]+[.;]?/g) ?? [body];
  return sentences
    .map((s) => s.trim())
    .filter((s) => s && !DIRECTIVE.test(s))
    .join(" ")
    .replace(/[;:]\s*$/, ".")
    .trim();
}
