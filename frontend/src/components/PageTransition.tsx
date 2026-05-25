import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { getRouteAccent, type RouteAccent } from "../theme/routeAccents";

type ColorBlend = {
  from: RouteAccent;
  to: RouteAccent;
  key: number;
};

type Rgb = {
  red: number;
  green: number;
  blue: number;
};

type Rgba = Rgb & {
  alpha: number;
};

let lastRouteTheme: RouteAccent | null = null;

const SIGNAL_SCAN_DURATION_MS = 850;
const BG_BASE = "#05070D";

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function easeInOutCubic(value: number) {
  const progress = clamp(value);
  return progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
}

function hexToRgb(hex: string): Rgb {
  const normalized = hex.trim().replace("#", "");
  const safe = /^[0-9a-fA-F]{6}$/.test(normalized) ? normalized : "6b7280";

  return {
    red: Number.parseInt(safe.slice(0, 2), 16),
    green: Number.parseInt(safe.slice(2, 4), 16),
    blue: Number.parseInt(safe.slice(4, 6), 16),
  };
}

function parseRgba(color: string): Rgba {
  const match = color.match(/rgba?\(([^)]+)\)/i);
  if (!match) {
    return { ...hexToRgb(color), alpha: 1 };
  }

  const [red = 107, green = 114, blue = 128, alpha = 1] = match[1]
    .split(",")
    .map(part => Number.parseFloat(part.trim()));

  return { red, green, blue, alpha };
}

function rgba(color: Rgb, alpha: number) {
  return `rgba(${color.red}, ${color.green}, ${color.blue}, ${clamp(alpha)})`;
}

function rgbaFromSoft(color: string, opacityMultiplier: number) {
  const parsed = parseRgba(color);
  return rgba(parsed, parsed.alpha * clamp(opacityMultiplier, 0, 4));
}

function transitionStyle(from: RouteAccent, to: RouteAccent): CSSProperties {
  return {
    "--route-accent": to.accent,
    "--route-secondary": to.secondary,
    "--route-accent-soft": to.soft,
    "--route-secondary-soft": to.secondarySoft,
    "--route-from-accent": from.accent,
    "--route-from-secondary": from.secondary,
    "--route-from-soft": from.soft,
    "--route-from-secondary-soft": from.secondarySoft,
    "--route-to-accent": to.accent,
    "--route-to-secondary": to.secondary,
    "--route-to-soft": to.soft,
    "--route-to-secondary-soft": to.secondarySoft,
  } as CSSProperties;
}

function tabStyle(from: RouteAccent, to: RouteAccent): CSSProperties {
  return {
    "--route-accent": to.accent,
    "--route-secondary": to.secondary,
    "--route-accent-soft": to.soft,
    "--tab-from-accent": from.accent,
    "--tab-from-soft": from.soft,
    "--tab-to-accent": to.accent,
    "--tab-to-soft": to.soft,
  } as CSSProperties;
}

function tabAccentForKey(activeKey: string, pathname: string): RouteAccent {
  const routeAccent = getRouteAccent(pathname);

  return {
    ...routeAccent,
    name: activeKey || routeAccent.name,
  };
}

function RouteTransitionStyles() {
  return (
    <style>
      {`
        .route-transition {
          --route-accent: var(--brand);
          --route-secondary: var(--brand-secondary);
          --route-accent-soft: var(--brand-soft);
          --route-secondary-soft: rgba(51, 230, 255, 0.10);
          --route-from-accent: var(--brand);
          --route-from-secondary: var(--brand-secondary);
          --route-from-soft: var(--brand-soft);
          --route-from-secondary-soft: rgba(51, 230, 255, 0.10);
          --route-to-accent: var(--brand);
          --route-to-secondary: var(--brand-secondary);
          --route-to-soft: var(--brand-soft);
          --route-to-secondary-soft: rgba(51, 230, 255, 0.10);
          position: relative;
          isolation: isolate;
          overflow: hidden;
          background:
            radial-gradient(circle at 50% 26%, rgba(0, 216, 255, 0.06), transparent 38rem),
            transparent;
        }

        .signal-scan-canvas {
          position: absolute;
          inset: 0;
          z-index: 4;
          width: 100%;
          height: 100%;
          opacity: 0;
          pointer-events: none;
          transition: opacity 180ms ease-out;
        }

        .signal-scan-canvas.is-active {
          opacity: 1;
          will-change: transform;
        }

        .route-content {
          position: relative;
          z-index: 1;
          transform-origin: top center;
          animation: contentReveal 300ms ease-out 200ms both;
        }

        @keyframes contentReveal {
          from { opacity: 0; filter: blur(4px); }
          to {
            opacity: 1;
            filter: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .signal-scan-canvas {
            display: none !important;
          }

          .route-content {
            animation: reducedContentReveal 300ms ease-out both !important;
            transform: none !important;
            filter: none !important;
          }
        }

        @keyframes reducedContentReveal {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}
    </style>
  );
}

function fillRouteSoftBackground(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  softColor: string,
  opacity: number,
  clip: { x: number; y: number; width: number; height: number },
) {
  if (opacity <= 0 || clip.width <= 0 || clip.height <= 0) return;

  const cx = width / 2;
  const cy = clip.y + clip.height * 0.34;
  const radius = Math.hypot(width, height) * 0.72;
  const gradient = context.createRadialGradient(cx, cy, 0, cx, cy, radius);

  gradient.addColorStop(0, rgbaFromSoft(softColor, opacity));
  gradient.addColorStop(0.64, rgbaFromSoft(softColor, opacity * 0.42));
  gradient.addColorStop(1, rgbaFromSoft(softColor, 0));

  context.save();
  context.beginPath();
  context.rect(clip.x, clip.y, clip.width, clip.height);
  context.clip();
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  context.restore();
}

function drawSignalScanFrame(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number,
  blend: ColorBlend,
  options: { glowBandHeight: number; shimmerHeight: number; baseColor: string },
) {
  const easedProgress = easeInOutCubic(progress);
  const scanY = easedProgress * height;
  const toAccent = hexToRgb(blend.to.accent);
  const lineOpacity = clamp(1 - Math.abs(progress - 0.5) * 1.8);

  context.clearRect(0, 0, width, height);
  context.fillStyle = options.baseColor;
  context.fillRect(0, 0, width, height);

  fillRouteSoftBackground(context, width, height, blend.from.soft, 1 - progress, {
    x: 0,
    y: scanY,
    width,
    height: Math.max(0, height - scanY),
  });

  fillRouteSoftBackground(context, width, height, blend.to.soft, 1, {
    x: 0,
    y: 0,
    width,
    height: Math.max(0, scanY),
  });

  const previousAlpha = context.globalAlpha;
  context.globalAlpha = lineOpacity;

  const glowTop = scanY - options.glowBandHeight / 2;
  const glowGradient = context.createLinearGradient(0, glowTop, 0, glowTop + options.glowBandHeight);
  glowGradient.addColorStop(0, rgba(toAccent, 0));
  glowGradient.addColorStop(0.5, rgba(toAccent, 0.18));
  glowGradient.addColorStop(1, rgba(toAccent, 0));
  context.fillStyle = glowGradient;
  context.fillRect(0, glowTop, width, options.glowBandHeight);

  const shimmerTop = scanY - options.shimmerHeight;
  const shimmerGradient = context.createLinearGradient(0, shimmerTop, width, shimmerTop);
  shimmerGradient.addColorStop(0, rgba(toAccent, 0));
  shimmerGradient.addColorStop(0.18, rgba(toAccent, 0.12));
  shimmerGradient.addColorStop(0.5, rgba(toAccent, 0.35));
  shimmerGradient.addColorStop(0.82, rgba(toAccent, 0.12));
  shimmerGradient.addColorStop(1, rgba(toAccent, 0));
  context.fillStyle = shimmerGradient;
  context.fillRect(0, shimmerTop, width, options.shimmerHeight);

  const lineGradient = context.createLinearGradient(0, scanY, width, scanY);
  lineGradient.addColorStop(0, rgba(toAccent, 0));
  lineGradient.addColorStop(0.18, rgba(toAccent, 0.18));
  lineGradient.addColorStop(0.5, rgba(toAccent, 0.95));
  lineGradient.addColorStop(0.82, rgba(toAccent, 0.18));
  lineGradient.addColorStop(1, rgba(toAccent, 0));
  context.fillStyle = lineGradient;
  context.fillRect(0, scanY - 0.75, width, 1.5);

  context.globalAlpha = previousAlpha;
}

export function RouteTransition({ children, className = "" }: { children: ReactNode; className?: string }) {
  const location = useLocation();
  const transitionKey = `${location.pathname}${location.search}`;
  const initialTheme = getRouteAccent(location.pathname);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const previousThemeRef = useRef<RouteAccent>(lastRouteTheme ?? initialTheme);
  const handledPathRef = useRef<string | null>(null);
  const [canvasActive, setCanvasActive] = useState(false);
  const [blend, setBlend] = useState<ColorBlend>(() => ({
    from: lastRouteTheme ?? initialTheme,
    to: initialTheme,
    key: 0,
  }));

  useEffect(() => {
    if (handledPathRef.current === location.pathname) return;

    handledPathRef.current = location.pathname;
    const prevTheme = previousThemeRef.current;
    const nextTheme = getRouteAccent(location.pathname);
    const nextBlend = { from: prevTheme, to: nextTheme, key: Date.now() };

    setBlend(nextBlend);
    previousThemeRef.current = nextTheme;
    lastRouteTheme = nextTheme;

    if (import.meta.env.DEV) {
      console.log("[SignalScan]", nextBlend.from.name, "\u2192", nextBlend.to.name);
    }
  }, [location.pathname]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cancelFrame = () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
    const clearCanvas = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
    };

    cancelFrame();

    if (reducedMotion) {
      setCanvasActive(false);
      clearCanvas();
      return cancelFrame;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const options = {
      glowBandHeight: isMobile ? 20 : 32,
      shimmerHeight: isMobile ? 4 : 6,
      baseColor: getComputedStyle(canvas).getPropertyValue("--bg-base").trim() || BG_BASE,
    };

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    setCanvasActive(true);

    const startedAt = performance.now();
    const render = () => {
      const progress = clamp((performance.now() - startedAt) / SIGNAL_SCAN_DURATION_MS);
      drawSignalScanFrame(context, width, height, progress, blend, options);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(render);
        return;
      }

      clearCanvas();
      setCanvasActive(false);
      frameRef.current = null;
    };

    frameRef.current = requestAnimationFrame(render);

    return () => {
      cancelFrame();
      clearCanvas();
    };
  }, [blend]);

  return (
    <div className={`route-transition route-transition-shell ${className}`} style={transitionStyle(blend.from, blend.to)}>
      <RouteTransitionStyles />
      <canvas ref={canvasRef} className={`signal-scan-canvas ${canvasActive ? "is-active" : ""}`} aria-hidden="true" />
      <div key={transitionKey} className="route-content">
        {children}
      </div>
      {import.meta.env.DEV && (
        <div
          style={{
            position: "fixed",
            bottom: 8,
            left: 8,
            zIndex: 9999,
            background: "rgba(0,0,0,.82)",
            color: "white",
            fontSize: "10px",
            padding: "4px 10px",
            borderRadius: 4,
            fontFamily: "monospace",
            pointerEvents: "none",
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
          aria-hidden="true"
        >
          <span style={{ color: blend.from.accent }}>{"\u25AC"}</span>
          {blend.from.name}
          <span style={{ color: "rgba(255,255,255,.25)" }}>{"\u2192"}</span>
          <span style={{ color: blend.to.accent }}>{"\u25AC"}</span>
          {blend.to.name}
        </div>
      )}
    </div>
  );
}

export function OutletTransition({ className = "" }: { className?: string }) {
  return (
    <RouteTransition className={className}>
      <Outlet />
    </RouteTransition>
  );
}

export function TabTransition({ activeKey, children, className = "" }: { activeKey: string; children: ReactNode; className?: string }) {
  const location = useLocation();
  const initialTabTheme = tabAccentForKey(activeKey, location.pathname);
  const previousTabThemeRef = useRef<RouteAccent>(initialTabTheme);
  const [tabBlend, setTabBlend] = useState<ColorBlend>(() => ({
    from: initialTabTheme,
    to: initialTabTheme,
    key: 0,
  }));

  useEffect(() => {
    const previousTabTheme = previousTabThemeRef.current;
    const nextTabTheme = tabAccentForKey(activeKey, location.pathname);

    setTabBlend({
      from: previousTabTheme,
      to: nextTabTheme,
      key: Date.now(),
    });

    previousTabThemeRef.current = nextTabTheme;
  }, [activeKey, location.pathname]);

  return (
    <div className={`tab-transition ${className}`} style={tabStyle(tabBlend.from, tabBlend.to)}>
      <div key={tabBlend.key} className="tab-color-morph" aria-hidden="true" />
      <div key={activeKey} className="tab-transition-content">
        {children}
      </div>
    </div>
  );
}
