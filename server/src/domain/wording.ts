// Guard for every string Meridian outputs (alerts, estimates, tool results).
// Meridian covers lab preparation up to pathologist handoff only.
const FORBIDDEN: [RegExp, string][] = [
  [/diagnos/i, "diagnosis"],
  [/misplac/i, "asserts a misplaced slide"],
  [/\blost\b/i, "asserts a lost slide"],
  [/report(ing|ed)?\s+(time|date|deadline|due|by)/i, "reporting time"],
  [/(screening|programme)[\s-]+(deadline|target date)/i, "screening deadline"],
  [/\b(malignan\w*|cancer\w*|benign|carcinoma|adenoma|dysplasia|neoplas\w*)\b/i, "tissue interpretation"],
  [/patient management|recall the patient/i, "patient management"],
  [/production[- ]ready|connected to a (real|live) lab/i, "overclaim about the prototype"],
];

/** Returns the reasons a text overclaims; empty when it is safe to show. */
export function findOverclaims(text: string): string[] {
  return FORBIDDEN.filter(([re]) => re.test(text)).map(([, why]) => why);
}
