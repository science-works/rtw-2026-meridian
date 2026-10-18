// A tiny router on the History API: real URLs, and the browser's back button works.
import { useEffect, useState, type AnchorHTMLAttributes, type MouseEvent } from "react";
import { flushSync } from "react-dom";
import { fxActive } from "./fxFlags";

const EVENT = "meridian:navigate";

type ViewTransitionDoc = Document & { startViewTransition?: (update: () => void) => { finished: Promise<void> } };

/**
 * Go to a path. With Motion Pack effect 6 (page transitions) or 1 (`morph`: the clicked element
 * grows into the next page's header) the swap runs inside a View Transition where the browser
 * supports it; otherwise it is instant.
 */
export function navigate(path: string, opts: { morph?: HTMLElement | null } = {}) {
  if (path === window.location.pathname) return;
  const go = () => {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new Event(EVENT));
    window.scrollTo(0, 0);
  };
  const doc = document as ViewTransitionDoc;
  const morph = opts.morph && fxActive(1) ? opts.morph : null;
  const page = fxActive(6);
  if (!doc.startViewTransition || (!morph && !page)) return go();
  const root = document.documentElement;
  root.dataset.vt = morph ? (page ? "morph page" : "morph") : "page";
  if (morph) morph.style.viewTransitionName = "incident-hero";
  const t = doc.startViewTransition(() => flushSync(go));
  t.finished.finally(() => {
    delete root.dataset.vt;
    if (morph) morph.style.viewTransitionName = "";
  });
}

export function usePath(): string {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const on = () => setPath(window.location.pathname);
    window.addEventListener("popstate", on);
    window.addEventListener(EVENT, on);
    return () => {
      window.removeEventListener("popstate", on);
      window.removeEventListener(EVENT, on);
    };
  }, []);
  return path;
}

/** Matches "/case/:id"-style patterns; returns decoded params or null. */
export function match(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split("/").filter(Boolean);
  const s = path.split("/").filter(Boolean);
  if (p.length !== s.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(":")) params[p[i].slice(1)] = decodeURIComponent(s[i]);
    else if (p[i] !== s[i]) return null;
  }
  return params;
}

export const paths = {
  dashboard: "/",
  case: (id: string) => `/case/${encodeURIComponent(id)}`,
  incidents: "/incidents",
  incident: (id: string) => `/incident/${encodeURIComponent(id)}`,
  simulation: "/simulation",
  simulator: "/simulator",
  station: (id: string) => `/station/${encodeURIComponent(id)}`,
  section: (name: string) => `/section/${name}`,
  compare: (id?: string) => (id ? `/compare/${encodeURIComponent(id)}` : "/compare"),
};

export function Link({ to, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) {
  return (
    <a
      href={to}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        navigate(to);
      }}
      {...rest}
    />
  );
}
