import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LIMS_GALLERY_BASE, LIMS_GALLERY_CAPTION, loadManifest, parseManifest } from "../../web/src/viz/LimsGallery";

const res = (ok: boolean, body: () => Promise<unknown>) => async () => ({ ok, json: body });

describe("LIMS reference gallery (local-only files)", () => {
  it("parseManifest accepts a valid list of figures", () => {
    expect(parseManifest([{ file: "fig1-request-entry.png", title: "Figure 1. Request entry" }])).toEqual([
      { file: "fig1-request-entry.png", title: "Figure 1. Request entry" },
    ]);
  });

  it("parseManifest returns null for missing or invalid input", () => {
    for (const bad of [
      undefined,
      null,
      "",
      "<!doctype html>",
      {},
      [],
      [{ file: "a.png" }],
      [{ title: "x" }],
      [{ file: 3, title: "x" }],
      [{ file: "../secret.png", title: "x" }],
      [{ file: "/abs.png", title: "x" }],
      [{ file: "notes.txt", title: "x" }],
      [{ file: "a.png", title: "  " }],
      [{ file: "a.png", title: "ok" }, null],
    ]) {
      expect(parseManifest(bad), JSON.stringify(bad)).toBeNull();
    }
  });

  it("loadManifest gives null on 404, network error and a non-JSON (SPA fallback) body, so nothing renders", async () => {
    expect(await loadManifest(res(false, async () => ({})))).toBeNull();
    expect(await loadManifest(async () => Promise.reject(new Error("offline")))).toBeNull();
    expect(await loadManifest(res(true, async () => JSON.parse("<!doctype html>")))).toBeNull();
    expect(await loadManifest(res(true, async () => []))).toBeNull();
  });

  it("loadManifest reads the manifest from the local-ref folder", async () => {
    let asked = "";
    const figs = await loadManifest(async (u) => {
      asked = u;
      return { ok: true, json: async () => [{ file: "fig2-new-entry.png", title: "Figure 2. New entry form" }] };
    });
    expect(asked).toBe(`${LIMS_GALLERY_BASE}index.json`);
    expect(figs).toHaveLength(1);
  });

  it("the component returns null until the manifest loads, and LimsView keeps its existing parts", () => {
    const src = readFileSync("web/src/viz/LimsGallery.tsx", "utf8");
    expect(src).toMatch(/if \(!figs\) return null;/);
    expect(LIMS_GALLERY_CAPTION).toBe(
      "Example: WinPath (CliniSys), a widely used NHS LIMS — public NHS training document, 2018 (blood sciences). Shown for reference only; not affiliated.",
    );
    const view = readFileSync("web/src/pages/LimsView.tsx", "utf8");
    expect(view).toContain("<LimsGallery />");
    expect(view).toContain('vizOn(1) && <BiopsyStrip tone="lims" />');
    expect(view).toContain("The same kind of record, from our simulated lab");
    expect(view).toContain('navigate("/compare")');
  });

  it("styles: text at least 14px, no alarm red", () => {
    const css = readFileSync("web/src/limsGallery.css", "utf8");
    const sizes = [...css.matchAll(/font-size:\s*(\d+)px/g)].map((m) => Number(m[1]));
    expect(sizes.filter((s) => s < 14)).toEqual([]);
    expect(css.toLowerCase()).not.toContain("#ff5c5c");
  });
});
