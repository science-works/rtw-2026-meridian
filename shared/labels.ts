// Generic equipment labels for anything shown to people. The workbook keeps its
// own names in data/; every UI or tool string passes through `generic()`.
const RULES: [RegExp, string][] = [
  [/Prisma basket PRISMA-BASKET-(\d+)/g, "Stainer 1 basket $1"],
  [/PRISMA-BASKET-(\d+)/g, "Stainer 1 basket $1"],
  [/Prisma auto-stainer/g, "Stainer 1"],
  [/\bPrisma\b/g, "Stainer 1"],
  [/Pegasus A/g, "Processor A"],
  [/Pegasus 2/g, "Processor B"],
  [/Logos 1/g, "Processor C"],
  [/Logos Evo/g, "Processor D"],
];

export function generic(text: string): string;
export function generic(text: string | null): string | null;
export function generic(text: string | null): string | null {
  if (text == null) return null;
  return RULES.reduce((s, [re, to]) => s.replace(re, to), text);
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
