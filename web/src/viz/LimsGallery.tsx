// "A real LIMS screen": a reference gallery of a published LIMS training document's figures.
// The images live only on the presenter's machine (web/public/local-ref/, gitignored), so the
// gallery renders nothing unless the manifest loads. The public build looks normal without it.
import { useCallback, useEffect, useState } from "react";
import "../limsGallery.css";

export type LimsFigure = { file: string; title: string };

export const LIMS_GALLERY_BASE = "/local-ref/winpath/";
export const LIMS_GALLERY_CAPTION =
  "Example: WinPath (CliniSys), a widely used NHS LIMS — public NHS training document, 2018 (blood sciences). Shown for reference only; not affiliated.";

const SAFE_FILE = /^[A-Za-z0-9][A-Za-z0-9._-]*\.(png|jpe?g|webp)$/i;

/** Validates the manifest. Anything other than a non-empty list of {file, title} image entries returns null. */
export function parseManifest(json: unknown): LimsFigure[] | null {
  if (!Array.isArray(json) || json.length === 0) return null;
  const out: LimsFigure[] = [];
  for (const item of json) {
    if (!item || typeof item !== "object") return null;
    const { file, title } = item as Record<string, unknown>;
    if (typeof file !== "string" || typeof title !== "string") return null;
    if (!SAFE_FILE.test(file) || file.includes("..") || title.trim() === "") return null;
    out.push({ file, title: title.trim() });
  }
  return out;
}

/** Fetches and validates the manifest; a 404, a network error or a non-JSON body (e.g. an SPA fallback page) gives null. */
export async function loadManifest(
  fetchFn: (url: string) => Promise<{ ok: boolean; json: () => Promise<unknown> }> = (u) => fetch(u),
  base: string = LIMS_GALLERY_BASE,
): Promise<LimsFigure[] | null> {
  try {
    const res = await fetchFn(`${base}index.json`);
    if (!res.ok) return null;
    return parseManifest(await res.json());
  } catch {
    return null;
  }
}

export function LimsGallery({ compact = false }: { compact?: boolean }) {
  const [figs, setFigs] = useState<LimsFigure[] | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    let live = true;
    loadManifest().then((f) => live && setFigs(f));
    return () => {
      live = false;
    };
  }, []);

  const close = useCallback(() => setOpen(null), []);
  useEffect(() => {
    if (open === null || !figs) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") setOpen((i) => (i === null ? i : (i + 1) % figs.length));
      else if (e.key === "ArrowLeft") setOpen((i) => (i === null ? i : (i - 1 + figs.length) % figs.length));
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, figs, close]);

  if (!figs) return null;
  const current = open === null ? null : figs[open];

  return (
    <section className={`lims-gallery${compact ? " compact" : ""}`} aria-label="A real LIMS screen">
      <h2 className="lg-title">A real LIMS screen</h2>
      <ul className="lg-grid">
        {figs.map((f, i) => (
          <li key={f.file}>
            <button type="button" className="lg-thumb" onClick={() => setOpen(i)} aria-label={`Enlarge ${f.title}`}>
              <img src={LIMS_GALLERY_BASE + f.file} alt={f.title} loading="lazy" />
              <span className="lg-name">{f.title}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="lg-caption">{LIMS_GALLERY_CAPTION}</p>
      {current && (
        <div className="lg-overlay" role="dialog" aria-modal="true" aria-label={current.title} onClick={close}>
          <figure className="lg-figure" onClick={(e) => e.stopPropagation()}>
            <img src={LIMS_GALLERY_BASE + current.file} alt={current.title} />
            <figcaption>
              <span className="lg-name">{current.title}</span>
              <span className="lg-hint">Esc to close · arrow keys for next</span>
              <button type="button" className="lg-close" onClick={close} autoFocus>
                Close
              </button>
            </figcaption>
            <p className="lg-caption">{LIMS_GALLERY_CAPTION}</p>
          </figure>
        </div>
      )}
    </section>
  );
}
