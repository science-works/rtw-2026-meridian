// MERIDIAN logo: the "M" badge and wordmark. logoStyle "3d" (tokens.ts) gives a tile with thickness,
// a pointer-following tilt and sheen, a one-time intro on load and a light sweep across the wordmark;
// "flat" restores the plain badge. Victoria's own logo can be passed as `mark` (any SVG/ReactNode):
// it sits on the tile's face and gets the same 3D treatment.
import { animate, motion, useSpring } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import { useFx } from "../fx";
import { Link, paths } from "../router";
import { logoStyle as defaultStyle, type LogoStyle } from "../theme/tokens";

const WORD = "MERIDIAN";
const REST = { x: 10, y: -16 }; // resting pose, degrees: shows the tile's thickness
const RANGE = 12; // hover tilt toward the pointer, degrees

export function Logo({ mark, style = defaultStyle }: { mark?: ReactNode; style?: LogoStyle }) {
  return style === "3d" ? <Logo3D mark={mark} /> : <LogoFlat mark={mark} />;
}

function LogoFlat({ mark }: { mark?: ReactNode }) {
  return (
    <Link to={paths.dashboard} className="brand" aria-label="Meridian dashboard">
      <span className="logo-mark" aria-hidden>
        {mark ?? "M"}
      </span>
      <span className="brand-text">
        <span className="wordmark">{WORD}</span>
        <span className="sublabel">CellPath lab workflow assistant</span>
      </span>
    </Link>
  );
}

function Logo3D({ mark }: { mark?: ReactNode }) {
  const fx = useFx();
  const tile = useRef<HTMLSpanElement>(null);
  const rx = useSpring(REST.x, { stiffness: 260, damping: 18 });
  const ry = useSpring(REST.y, { stiffness: 260, damping: 18 });
  const scale = useSpring(1, { stiffness: 500, damping: 30 });
  const sweep = useRef<HTMLSpanElement>(null);
  const sweeping = useRef<ReturnType<typeof animate> | null>(null);

  // One light sweep across the wordmark per hover. Driven per frame because Chrome does not
  // repaint text-clipped backgrounds during a CSS transition.
  const onEnter = () => {
    const el = sweep.current;
    if (!fx.on || !el) return;
    sweeping.current?.stop();
    sweeping.current = animate(130, -30, { duration: 0.8, ease: "easeInOut", onUpdate: (v) => (el.style.backgroundPosition = `${v}% 0`) });
  };

  // Intro, once on load: the tile turns in from about -25° and springs to rest (≈ 700 ms).
  useEffect(() => {
    if (!fx.on) return;
    rx.jump(REST.x + 10);
    ry.jump(REST.y - 25);
    const id = requestAnimationFrame(() => {
      rx.set(REST.x);
      ry.set(REST.y);
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onMove = (e: React.PointerEvent) => {
    if (!fx.on || !tile.current) return;
    const b = tile.current.getBoundingClientRect();
    const px = Math.max(0, Math.min(1, (e.clientX - b.left) / b.width));
    const py = Math.max(0, Math.min(1, (e.clientY - b.top) / b.height));
    ry.set(REST.y + (px - 0.5) * 2 * RANGE);
    rx.set(REST.x - (py - 0.5) * 2 * RANGE);
    tile.current.style.setProperty("--sx", `${px * 100}%`);
    tile.current.style.setProperty("--sy", `${py * 100}%`);
  };
  const onLeave = () => {
    sweeping.current?.stop();
    if (sweep.current) sweep.current.style.backgroundPosition = "";
    rx.set(REST.x);
    ry.set(REST.y);
    scale.set(1);
  };

  return (
    <Link
      to={paths.dashboard}
      className={`brand brand3d${fx.on ? " live" : ""}`}
      aria-label="Meridian dashboard"
      onPointerEnter={onEnter}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onPointerDown={() => fx.on && scale.set(0.96)}
      onPointerUp={() => scale.set(1)}
    >
      <span className="lg-stage" aria-hidden>
        <span className="lg-shadow" />
        <motion.span
          ref={tile}
          className="lg-tile"
          style={{ rotateX: rx, rotateY: ry, scale }}
          initial={fx.on ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <span className="lg-layer l3" />
          <span className="lg-layer l2" />
          <span className="lg-layer l1" />
          <span className="lg-face">
            <span className="lg-gloss" />
            <span className="lg-sheen" />
            <span className="lg-mark">{mark ?? "M"}</span>
          </span>
        </motion.span>
      </span>
      <span className="brand-text">
        <span className="wordmark lg-word">
          <span className="sr-only">{WORD}</span>
          {WORD.split("").map((ch, i) => (
            <motion.span
              key={i}
              aria-hidden
              className="lg-letter"
              style={{ color: `color-mix(in srgb, var(--accent), #ffffff ${Math.round((i / (WORD.length - 1)) * 85)}%)` }}
              initial={fx.on ? { opacity: 0, y: 6 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 + i * 0.04, ease: [0.2, 0.8, 0.2, 1] }}
            >
              {ch}
            </motion.span>
          ))}
          <span ref={sweep} className="lg-sweep" aria-hidden>
            {WORD}
          </span>
        </span>
        <span className="sublabel">CellPath lab workflow assistant</span>
      </span>
    </Link>
  );
}
