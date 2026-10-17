// Reads the workbook's Timing Rules tab into numbers. Anything that cannot be read
// stays null, and estimates that need it return "unknown" instead of guessing.
import type { TimingRule } from "../../../shared/types";

export interface Window {
  start: number; // minutes after midnight
  end: number;
}

export interface Rules {
  staffed: Window | null;
  cutoff: number | null;
  processorOutput: Record<string, { display: string; minutes: number }>;
  embedding: { window: Window; minutes: number; display: string } | null;
  microtomyPerBlock: number | null;
  microtomyPerExtraLevel: number | null;
  stainRun: number | null;
  repeatStain: number | null;
  scanPerSlide: number | null;
  iqcPerSlide: number | null;
  completion: number | null;
  physicalHandoff: number | null;
  digitalSend: number | null;
  decalcification: number | null;
}

const RANGE = /(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/;
const TIME = /(\d{1,2}):(\d{2})/;
const hm = (h: string, m: string) => Number(h) * 60 + Number(m);
const pad = (n: number) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

function windowOf(text: string | undefined): Window | null {
  const m = text ? RANGE.exec(text) : null;
  return m ? { start: hm(m[1], m[2]), end: hm(m[3], m[4]) } : null;
}

function minutesOf(text: string | undefined): number | null {
  const m = text ? /(\d+)\s*minutes?\b/i.exec(text) : null;
  return m ? Number(m[1]) : null;
}

export function parseRules(rules: TimingRule[]): Rules {
  const get = (name: string) => rules.find((r) => r.rule === name);
  const value = (name: string) => get(name)?.value;

  const processorOutput: Rules["processorOutput"] = {};
  for (const r of rules) {
    if (!/output/i.test(r.value)) continue;
    const range = RANGE.exec(r.value);
    const single = TIME.exec(r.value);
    if (range) {
      const [a, b] = [hm(range[1], range[2]), hm(range[3], range[4])];
      processorOutput[r.rule] = { display: `${pad(a)}–${pad(b)}`, minutes: b }; // later bound: conservative
    } else if (single) {
      const t = hm(single[1], single[2]);
      processorOutput[r.rule] = { display: pad(t), minutes: t };
    }
  }

  const emb = get("Embedding");
  const embWindow = windowOf(emb?.description);
  const embHours = emb ? /(\d+)\s*[-–]\s*(\d+)\s*hours?/i.exec(emb.value) ?? /(\d+)\s*hours?/i.exec(emb.value) : null;
  const embedding =
    embWindow && embHours
      ? {
          window: embWindow,
          minutes: Number(embHours[2] ?? embHours[1]) * 60, // upper bound: conservative
          display: embHours[2] ? `${embHours[1]}–${embHours[2]} h` : `${embHours[1]} h`,
        }
      : null;

  const cut = TIME.exec(value("Processor loading cutoff") ?? "");
  const decalHours = /(\d+)\s*hours?/i.exec(value("Decalcification") ?? "");

  return {
    staffed: windowOf(value("Daily receipt and cut-up")),
    cutoff: cut ? hm(cut[1], cut[2]) : null,
    processorOutput,
    embedding,
    microtomyPerBlock: minutesOf(value("Microtomy routine cut")),
    microtomyPerExtraLevel: minutesOf(value("Microtomy extra level / recut")),
    stainRun: minutesOf(value("Prisma H&E run")),
    repeatStain: minutesOf(value("Prisma repeat stain")),
    scanPerSlide: minutesOf(value("Digital scanners")),
    iqcPerSlide: minutesOf(value("IQC slide review")),
    completion: minutesOf(value("Case completion / emit")),
    physicalHandoff: minutesOf(value("Physical case handoff")),
    digitalSend: minutesOf(value("Digital image send")),
    decalcification: decalHours ? Number(decalHours[1]) * 60 : null,
  };
}
