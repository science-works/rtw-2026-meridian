// Light simulation (Victoria's "Histo main lab" drawing, Simul8-style). Replays the recorded
// events from Day -1 06:30 to Day 1 11:30 with the same pure stateAt(t) the tests check against
// the server. Samples move only along drawn lines and only when the clock passes a recorded time.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { formatSimTime } from "../../../shared/clock";
import { captionAt, EDGES, NODE_TO_CARD, NODES, rateAt, stateAt, timelineFrom, type NodeId, type SimNode, type Timeline } from "../../../shared/simulation";
import type { Alert, SimulationResponse } from "../../../shared/types";
import { useFx } from "../fx";
import { useFxFlag } from "../fxFlags";
import { spectrumOn, stageColor, stageOfNode } from "../theme/looks";
import { Link, navigate, paths } from "../router";
import { motion as motionTokens } from "../theme/tokens";
import { PauseIcon, PlayIcon } from "../theme/icons";

const PLAY_MS = 40_000;
/** Simulated minutes per real millisecond at simulated time m, for a playback of PLAY_MS (rates from rateAt). */
function speedFn(from: number, to: number) {
  let weight = 0;
  for (let m = from; m < to; m++) weight += 1 / rateAt(m, to);
  const base = weight / PLAY_MS;
  return (m: number) => base * rateAt(m, to);
}
const ARRIVE_MS = 350; // station highlight after a sample arrives
const humanType = (t: string) => t.charAt(0) + t.slice(1).toLowerCase().replace(/_/g, " ");
const BY_ID = new Map(NODES.map((n) => [n.id, n]));

/** Shortest drawn route between two nodes, so a sample always travels on visible lines (R-Ref-3). */
function route(from: NodeId, to: NodeId, directed: boolean): NodeId[] | null {
  const next = new Map<NodeId, NodeId[]>();
  for (const [a, b] of EDGES) {
    next.set(a, [...(next.get(a) ?? []), b]);
    if (!directed) next.set(b, [...(next.get(b) ?? []), a]);
  }
  const prev = new Map<NodeId, NodeId>([[from, from]]);
  const queue = [from];
  while (queue.length) {
    const n = queue.shift()!;
    if (n === to) break;
    for (const m of next.get(n) ?? []) if (!prev.has(m)) prev.set(m, n), queue.push(m);
  }
  if (!prev.has(to)) return null;
  const path = [to];
  while (path[0] !== from) path.unshift(prev.get(path[0])!);
  return path;
}
const routes = new Map<string, NodeId[]>();
const routeOf = (a: NodeId, b: NodeId) => {
  const k = `${a}>${b}`;
  if (!routes.has(k)) routes.set(k, route(a, b, true) ?? route(a, b, false) ?? [a, b]);
  return routes.get(k)!;
};

interface Flight {
  caseId: string;
  urgent: boolean;
  path: NodeId[];
  p: number; // 0..1 along the path
}

/** Samples in flight at t: a recorded move is drawn for one hop window after its recorded time (never before it). */
function flightsAt(tl: Timeline, t: number, hopAt: (t: number) => number): Flight[] {
  const out: Flight[] = [];
  for (const [caseId, { waypoints, urgent }] of tl.cases) {
    for (let i = 1; i < waypoints.length; i++) {
      const w = waypoints[i];
      if (w.t > t) break;
      const hop = hopAt(w.t);
      if (t - w.t < hop && waypoints[i - 1].node !== w.node) out.push({ caseId, urgent, path: routeOf(waypoints[i - 1].node, w.node), p: (t - w.t) / hop });
    }
  }
  return out;
}

const easeOut = (p: number) => 1 - (1 - p) ** 3;

export function SimulationPage({ alerts }: { alerts: Alert[] }) {
  const fx = useFx();
  const fx4 = useFxFlag(4);
  const spectrum = spectrumOn();
  const [tl, setTl] = useState<{ timeline: Timeline; from: number; to: number; events: SimulationResponse["events"] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [t, setT] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [phase, setPhase] = useState<"ready" | "playing" | "paused" | "ended">("ready");
  const [hover, setHover] = useState<NodeId | null>(null);
  const [pinned, setPinned] = useState<NodeId | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1200, h: 520 });
  const tRef = useRef<number | null>(null);
  tRef.current = t;
  const speed = useMemo(() => (tl ? speedFn(tl.from, tl.to) : () => 0), [tl]);

  useEffect(() => {
    fetch("/api/simulation")
      .then((r) => (r.ok ? (r.json() as Promise<SimulationResponse>) : Promise.reject(new Error(String(r.status)))))
      .then((r) => {
        setTl({ timeline: timelineFrom(r), from: r.from, to: r.to, events: r.events });
        setT(r.to); // the board opens on the present (11:30)
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  useLayoutEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [tl]);

  // Playback loop: only while playing (R-Ref-4).
  useEffect(() => {
    if (!playing || !tl) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(100, now - last);
      last = now;
      const cur = tRef.current ?? tl.from;
      const nt = Math.min(tl.to, cur + dt * speed(cur));
      tRef.current = nt;
      setT(nt);
      if (nt >= tl.to) {
        setPlaying(false);
        setPhase("ended");
      } else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, tl, speed]);

  const play = useCallback(() => {
    if (!tl) return;
    if (phase === "ready" || phase === "ended" || t === null || t >= tl.to) setT(tl.from);
    setPlaying(true);
    setPhase("playing");
  }, [tl, phase, t]);
  const pause = () => {
    setPlaying(false);
    setPhase("paused");
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPinned(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const now = t ?? 0;
  const state = useMemo(() => (tl ? stateAt(tl.timeline, Math.floor(now)) : null), [tl, Math.floor(now)]);
  const hopAt = useCallback((m: number) => speed(m) * motionTokens.tokenHopMs, [speed]);
  const flights = useMemo(() => (tl && playing && fx.on ? flightsAt(tl.timeline, now, hopAt) : []), [tl, playing, fx.on, now, hopAt]);
  // A station lights briefly when a sample lands on it (after its hop), only while playing.
  const arriving = useMemo(() => {
    const out = new Set<NodeId>();
    if (!tl || !playing || !fx.on) return out;
    for (const { waypoints } of tl.timeline.cases.values())
      for (let i = 1; i < waypoints.length; i++) {
        const w = waypoints[i];
        if (w.t > now) break;
        const since = now - w.t - hopAt(w.t);
        if (since >= 0 && since < speed(w.t) * ARRIVE_MS && waypoints[i - 1].node !== w.node) out.add(w.node);
      }
    return out;
  }, [tl, playing, fx.on, now, hopAt, speed]);
  const recent = useMemo(() => {
    if (!tl) return [];
    let hi = tl.events.length;
    let lo = 0;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (tl.events[mid].t <= now) lo = mid + 1;
      else hi = mid;
    }
    return tl.events.slice(Math.max(0, lo - 3), lo).reverse();
  }, [tl, Math.floor(now)]);

  if (error) return <section className="page"><h1>Simulation</h1><p className="error">Cannot load the recorded events ({error}).</p></section>;
  if (!tl || !state) return <p className="page muted">Loading the recorded events…</p>;

  // Layout units → board pixels.
  const xs = NODES.map((n) => n.x), ys = NODES.map((n) => n.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const padX = 70, padY = 44;
  const px = (n: SimNode) => ({ x: padX + ((n.x - x0) / (x1 - x0)) * (size.w - 2 * padX), y: padY + ((n.y - y0) / (y1 - y0)) * (size.h - 2 * padY) });
  const at = (id: NodeId) => px(BY_ID.get(id)!);
  const along = (path: NodeId[], p: number) => {
    const pts = path.map(at);
    const segs = pts.slice(1).map((b, i) => Math.hypot(b.x - pts[i].x, b.y - pts[i].y));
    let d = easeOut(Math.max(0, Math.min(1, p))) * segs.reduce((a, b) => a + b, 0);
    for (let i = 0; i < segs.length; i++) {
      if (d <= segs[i] || i === segs.length - 1) {
        const f = segs[i] ? Math.min(1, d / segs[i]) : 1;
        return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * f, y: pts[i].y + (pts[i + 1].y - pts[i].y) * f };
      }
      d -= segs[i];
    }
    return pts[pts.length - 1];
  };

  const casesAt = new Map<NodeId, string[]>();
  for (const [c, n] of state.positions) casesAt.set(n, [...(casesAt.get(n) ?? []), c]);
  const urgentIds = new Set([...tl.timeline.cases].filter(([, v]) => v.urgent).map(([k]) => k));
  const lastArrival = (id: NodeId) => {
    let best = -Infinity;
    for (const c of casesAt.get(id) ?? []) {
      const w = tl.timeline.cases.get(c)!.waypoints.filter((x) => x.t <= now).at(-1);
      if (w && w.t > best) best = w.t;
    }
    return Number.isFinite(best) ? formatSimTime(best) : null;
  };

  const activeEdges = new Set<string>();
  for (const f of flights) for (let i = 1; i < f.path.length; i++) activeEdges.add(`${f.path[i - 1]}>${f.path[i]}`), activeEdges.add(`${f.path[i]}>${f.path[i - 1]}`);
  const focus = pinned ?? hover;
  const incidentTimes = new Map(tl.timeline.incidents.map((i) => [i.node, i.t]));
  const pulsing = (id: NodeId) => fx.on && playing && incidentTimes.has(id) && now >= incidentTimes.get(id)! && now - incidentTimes.get(id)! < hopAt(incidentTimes.get(id)!);
  const newIncident = alerts.some((a) => a.state === "new");
  const maxQueue = Math.max(1, ...NODES.filter((n) => n.kind === "queue").map((n) => state.counts.get(n.id) ?? 0));
  // Motion Pack 4: at the recorded stainer failure, a shockwave and the basket's slides flash once;
  // stations glow in proportion to their live load. Only while playing; recorded events only.
  const stainerT = incidentTimes.get("stainer");
  const shock = fx4 && playing && stainerT !== undefined && now >= stainerT && now - stainerT < speed(stainerT) * 900;
  const basketSlides = alerts.find((a) => a.kind === "basket_failure")?.slideIds ?? [];
  const maxLoad = Math.max(1, ...NODES.filter((n) => n.kind === "station").map((n) => state.counts.get(n.id) ?? 0));
  const loadGlow = (id: NodeId, kind: SimNode["kind"]) => {
    if (!fx4 || !playing || kind === "start" || kind === "end") return undefined;
    const c = state.counts.get(id) ?? 0;
    const f = Math.min(1, Math.sqrt(c / (kind === "queue" ? maxQueue : maxLoad)));
    return f > 0.05 ? `0 0 ${Math.round(6 + 18 * f)}px ${Math.round(2 + 6 * f)}px rgba(90, 111, 214, ${(0.12 + 0.33 * f).toFixed(2)})` : undefined;
  };

  const open = (id: NodeId) => navigate(paths.station(NODE_TO_CARD[id]));

  const popNode = focus ? BY_ID.get(focus)! : null;
  const popPos = popNode ? at(popNode.id) : null;
  const popCases = focus ? [...(casesAt.get(focus) ?? [])].sort((a, b) => Number(urgentIds.has(b)) - Number(urgentIds.has(a)) || a.localeCompare(b)) : [];

  return (
    <section className="page sim-page">
      <header className="page-head">
        <div>
          <p className="page-kicker">Light simulation · replayed from recorded events · simulated data</p>
          <h1>Histo main lab</h1>
        </div>
        <p className="sim-legend">
          <span className="sim-dot" aria-hidden /> a sample moving between stations
          <span className="sim-dot urgent" aria-hidden /> urgent
          <span className="sim-flag" aria-hidden>!</span> incident recorded
        </p>
      </header>

      <div className="sim-strip">
        <p className="sim-caption" aria-live="polite" data-testid="sim-caption">
          {captionAt(Math.floor(now), tl.timeline.incidents, tl.to)}
        </p>
        <ol className="sim-ticker" aria-label="Latest recorded events">
          {recent.map((e, i) => (
            <li key={`${e.t}-${e.caseId}-${i}`}>
              <span className="mono">{formatSimTime(e.t).replace(/^Day (-?\d+) /, "D$1 ")}</span> <span className="mono">{e.caseId}</span> {humanType(e.type).toLowerCase()}
              {e.station && <span className="muted"> · {e.station}</span>}
            </li>
          ))}
        </ol>
      </div>

      <div className="sim-board" ref={boardRef} onClick={(e) => e.target === e.currentTarget && setPinned(null)}>
        <svg className="sim-lines" width={size.w} height={size.h} aria-hidden>
          {spectrum && (
            <defs>
              {EDGES.map(([a, b]) => {
                const p = at(a), q = at(b);
                return (
                  <linearGradient key={`g-${a}-${b}`} id={`edge-${a}-${b}`} gradientUnits="userSpaceOnUse" x1={p.x} y1={p.y} x2={q.x} y2={q.y}>
                    <stop offset="0" stopColor={stageColor[stageOfNode(a)]} />
                    <stop offset="1" stopColor={stageColor[stageOfNode(b)]} />
                  </linearGradient>
                );
              })}
            </defs>
          )}
          {EDGES.map(([a, b]) => {
            const p = at(a), q = at(b);
            const mx = (p.x + q.x) / 2;
            const hot = activeEdges.has(`${a}>${b}`) || (focus !== null && (a === focus || b === focus));
            return (
              <path
                key={`${a}>${b}`}
                className={hot ? "sim-edge hot" : "sim-edge"}
                d={`M${p.x},${p.y} C${mx},${p.y} ${mx},${q.y} ${q.x},${q.y}`}
                style={spectrum ? { stroke: `url(#edge-${a}-${b})` } : undefined}
              />
            );
          })}
          {shock && (
            <g key={`shock-${stainerT}`} className="sim-shock-layer">
              <circle className="sim-shock" cx={at("stainer").x} cy={at("stainer").y} r={60} />
              {basketSlides.map((s, i) => (
                <circle key={s} className="sim-slide-flash" cx={at("stainer").x - 34 + (i % 10) * 7.5} cy={at("stainer").y + 34 + Math.floor(i / 10) * 8} r={2.6} style={{ animationDelay: `${i * 12}ms` }} />
              ))}
            </g>
          )}
          {flights.map((f) =>
            [3, 2, 1, 0].map((k) => {
              if (k > motionTokens.trailSteps) return null;
              const pt = along(f.path, f.p - k * 0.05);
              const toward = spectrum && !f.urgent ? { fill: stageColor[stageOfNode(f.path.at(-1)!)] } : undefined; // urgent stays red
              return <circle key={`${f.caseId}-${k}`} cx={pt.x} cy={pt.y} r={k ? 4 : 5} className={f.urgent ? "sim-token urgent" : "sim-token"} opacity={[1, 0.6, 0.35, 0.15][k]} style={toward} />;
            }),
          )}
        </svg>

        {NODES.map((n) => {
          const p = at(n.id);
          const count = state.counts.get(n.id) ?? 0;
          const incident = state.incidents.includes(n.id);
          const queueSize = n.kind === "queue" ? 30 + 40 * Math.sqrt(count / maxQueue) : undefined;
          return (
            <button
              key={n.id}
              type="button"
              className={`sim-node ${n.kind}${focus === n.id ? " focus" : ""}${pulsing(n.id) ? " pulse" : ""}${arriving.has(n.id) ? " arrive" : ""}`}
              style={{ left: p.x, top: p.y, ...(queueSize ? { width: queueSize, height: queueSize } : {}), ...(loadGlow(n.id, n.kind) ? { boxShadow: loadGlow(n.id, n.kind) } : {}) }}
              data-node={n.id}
              data-stage={stageOfNode(n.id)}
              aria-label={`${n.label}: ${count} cases. Double-click or press Enter to open the station page.`}
              onMouseEnter={() => setHover(n.id)}
              onMouseLeave={() => setHover((h) => (h === n.id ? null : h))}
              onFocus={() => setHover(n.id)}
              onBlur={() => setHover((h) => (h === n.id ? null : h))}
              onClick={() => setPinned((v) => (v === n.id ? null : n.id))}
              onDoubleClick={() => open(n.id)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), open(n.id))}
            >
              {n.kind === "queue" ? (
                <>
                  <span className="sim-count mono">{count}</span>
                  <span className="sim-qlabel">{n.label}</span>
                </>
              ) : (
                <>
                  <span className="sim-label">{n.label}</span>
                  <span className="sim-count mono">{count}</span>
                </>
              )}
              {incident && <span className="sim-flag on-node" aria-label="incident recorded here">!</span>}
            </button>
          );
        })}

        {popNode && popPos && (
          <div className={`sim-pop${pinned ? " pinned" : ""}`} role="dialog" aria-label={popNode.label} style={{ left: Math.min(Math.max(popPos.x, 150), size.w - 150), top: popPos.y > size.h / 2 ? popPos.y - 40 : popPos.y + 40, transform: popPos.y > size.h / 2 ? "translate(-50%, -100%)" : "translate(-50%, 0)" }}>
            <p className="sim-pop-title">{popNode.label}</p>
            <p>
              <span className="mono">{state.counts.get(popNode.id) ?? 0}</span> {(state.counts.get(popNode.id) ?? 0) === 1 ? "case" : "cases"} here at <span className="mono">{formatSimTime(Math.floor(now)).slice(-5)}</span>
              {lastArrival(popNode.id) && <span className="muted"> · last arrival <span className="mono">{lastArrival(popNode.id)}</span></span>}
            </p>
            {popCases.length > 0 && (
              <p className="sim-pop-cases">
                {popCases.slice(0, 4).map((c) => (
                  <Link key={c} to={paths.case(c)} className={`mono chip${urgentIds.has(c) ? " chip-urgent-case" : ""}`}>
                    {c}
                  </Link>
                ))}
                {popCases.length > 4 && <span className="muted"> +{popCases.length - 4} more</span>}
              </p>
            )}
            {(state.blocksAt.get(popNode.id) ?? []).length > 0 && (
              <p>
                Blocks here from a split case: <span className="mono">{state.blocksAt.get(popNode.id)!.join(", ")}</span>
              </p>
            )}
            {state.incidents.includes(popNode.id) && (
              <p>
                <span className="sim-flag" aria-hidden>!</span> Incident recorded here · <Link to="/incidents">Incidents</Link>
              </p>
            )}
            {pinned ? (
              <button className="btn-trigger" onClick={() => open(popNode.id)}>
                Open station
              </button>
            ) : (
              <p className="muted">Click to pin · double-click to open the station page</p>
            )}
          </div>
        )}

      </div>

      <div className="sim-controls">
        {playing ? (
          <button className="btn-trigger sim-play" data-testid="sim-play" onClick={pause}>
            <PauseIcon /> Pause
          </button>
        ) : (
          <button className="btn-trigger sim-play" data-testid="sim-play" onClick={play}>
            <PlayIcon /> {phase === "paused" ? "Resume" : "Play the lab's morning"}
          </button>
        )}
        <input
          className="sim-scrub"
          type="range"
          aria-label="Simulated time"
          min={tl.from}
          max={tl.to}
          step={1}
          value={Math.floor(now)}
          onChange={(e) => {
            setPlaying(false);
            setPhase(Number(e.target.value) >= tl.to ? "ended" : "paused");
            setT(Number(e.target.value));
          }}
        />
        <span className="sim-clock mono" data-testid="sim-clock" data-state={phase}>
          {formatSimTime(Math.floor(now))}
        </span>
        {phase === "ended" ? (
          <span className="sim-end" role="status">
            {newIncident ? "11:30 is now: a new incident is waiting." : "This is the lab as recorded at 11:30."}
            <Link to="/" className="btn-trigger">
              Dashboard
            </Link>
          </span>
        ) : (
          <span className="muted sim-range">
            <span className="mono">Day -1 06:30</span> → <span className="mono">Day 1 11:30</span>
          </span>
        )}
      </div>
    </section>
  );
}
