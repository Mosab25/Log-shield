import { useEffect, useMemo, useRef } from "react";

import type { IntroSceneConfig } from "./introData";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  phase: number;
  opacity: number;
};

type IntroCanvasProps = {
  scene: IntroSceneConfig;
  sceneIndex: number;
  sceneProgress: number;
  frameMs: number;
  transitionMs: number;
  reducedMotion: boolean;
};

const THREAT_CARDS = [
  { label: "185.44.21.9", type: "IP", angle: -2.74, delay: 0.08 },
  { label: "Brute Force", type: "ATK", angle: -2.18, delay: 0.13 },
  { label: "POST /login", type: "REQ", angle: -0.66, delay: 0.18 },
  { label: "SQLi Pattern", type: "ATK", angle: 0.12, delay: 0.22 },
  { label: "91.203.15.44", type: "IP", angle: 1.02, delay: 0.25 },
  { label: "payload.exe", type: "FILE", angle: 2.35, delay: 0.28 },
];

const IOC_NODES = [
  { label: "45.88.10.25", type: "MAL", angle: -2.55, delay: 0 },
  { label: "malware-cdn.io", type: "DOM", angle: -0.7, delay: 0.12 },
  { label: "payload.js", type: "FILE", angle: 0.62, delay: 0.24 },
  { label: "91.203.15.44", type: "SUS", angle: 2.35, delay: 0.36 },
];

const READY_ITEMS = [
  "Detection Rules Active",
  "IOC Tracking Enabled",
  "Playbooks Loaded",
  "Awareness Hub Ready",
  "Admin 2FA Active",
];

function rgb(color: [number, number, number], alpha = 1) {
  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
}

function mix(a: [number, number, number], b: [number, number, number], amount: number): [number, number, number] {
  return [
    Math.round(a[0] + (b[0] - a[0]) * amount),
    Math.round(a[1] + (b[1] - a[1]) * amount),
    Math.round(a[2] + (b[2] - a[2]) * amount),
  ];
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - Math.max(0, Math.min(1, value)), 3);
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function createParticles(width: number, height: number): Particle[] {
  return Array.from({ length: 60 }, (_, index) => {
    const seed = index + 1;
    return {
      x: ((seed * 97) % Math.max(width, 1)),
      y: ((seed * 53) % Math.max(height, 1)),
      vx: (((seed * 29) % 60) - 30) / 120,
      vy: (((seed * 41) % 60) - 30) / 120,
      r: 0.5 + ((seed * 17) % 12) / 10,
      phase: seed * 0.61,
      opacity: 0.04 + ((seed * 13) % 5) / 100,
    };
  });
}

function drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number, accent: [number, number, number]) {
  ctx.fillStyle = "rgb(2, 4, 10)";
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(width * 0.24, height * 0.52, 0, width * 0.24, height * 0.52, width * 0.66);
  glow.addColorStop(0, rgb(accent, 0.16));
  glow.addColorStop(0.45, rgb(accent, 0.045));
  glow.addColorStop(1, rgb(accent, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  const vignette = ctx.createRadialGradient(width * 0.52, height * 0.5, width * 0.14, width * 0.52, height * 0.5, width * 0.72);
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.68)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number, accent: [number, number, number], t: number) {
  const size = 48;
  const offset = (t * 8) % size;
  ctx.save();
  ctx.strokeStyle = rgb(accent, 0.045);
  ctx.lineWidth = 1;
  for (let x = -size + offset; x <= width + size; x += size) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = -size + offset; y <= height + size; y += size) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[], width: number, height: number, accent: [number, number, number], t: number, reducedMotion: boolean) {
  ctx.save();
  particles.forEach(particle => {
    if (!reducedMotion) {
      particle.x += particle.vx;
      particle.y += particle.vy;
      if (particle.x < 0) particle.x = width;
      if (particle.x > width) particle.x = 0;
      if (particle.y < 0) particle.y = height;
      if (particle.y > height) particle.y = 0;
    }
    const pulse = reducedMotion ? 0.5 : (Math.sin(t * 1.8 + particle.phase) + 1) / 2;
    ctx.globalAlpha = particle.opacity + pulse * 0.04;
    ctx.fillStyle = rgb(accent, 1);
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawDataStreams(ctx: CanvasRenderingContext2D, cx: number, cy: number, accent: [number, number, number], t: number, visible: boolean, reducedMotion: boolean) {
  if (!visible) return;
  const lines = 6;
  const radius = 184;
  ctx.save();
  for (let index = 0; index < lines; index += 1) {
    const angle = (Math.PI * 2 * index) / lines + 0.22;
    const sx = cx + Math.cos(angle) * radius;
    const sy = cy + Math.sin(angle) * radius * 0.7;
    ctx.strokeStyle = rgb(accent, 0.025);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(cx, cy);
    ctx.stroke();

    const phase = reducedMotion ? 0.6 : ((t * 0.18 + index * 0.17) % 1);
    const x = sx + (cx - sx) * phase;
    const y = sy + (cy - sy) * phase;
    const dot = ctx.createRadialGradient(x, y, 0, x, y, 8);
    dot.addColorStop(0, rgb(accent, 0.45));
    dot.addColorStop(1, rgb(accent, 0));
    ctx.fillStyle = dot;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawCoreSystem(ctx: CanvasRenderingContext2D, cx: number, cy: number, accent: [number, number, number], t: number, reducedMotion: boolean) {
  const time = reducedMotion ? 0 : t;
  ctx.save();
  const rings = [
    { r: 95, speed: 0.12, dashed: true, alpha: 0.045, width: 0.7 },
    { r: 72, speed: -0.18, dashed: false, alpha: 0.055, width: 0.7 },
    { r: 52, speed: 0.22, dashed: false, alpha: 0.07, width: 0.8 },
    { r: 34, speed: -0.28, dashed: false, alpha: 0.08, width: 0.8 },
  ];
  rings.forEach(ring => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(time * ring.speed);
    ctx.strokeStyle = rgb(accent, ring.alpha);
    ctx.lineWidth = ring.width;
    ctx.setLineDash(ring.dashed ? [14, 10] : []);
    ctx.beginPath();
    ctx.ellipse(0, 0, ring.r, ring.r * 0.78, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });

  const orbiterLayers = [
    { count: 6, rx: 75, ry: 58, speed: 0.36, size: 2.4 },
    { count: 4, rx: 105, ry: 80, speed: -0.24, size: 2.8 },
    { count: 8, rx: 50, ry: 40, speed: 0.6, size: 1.8 },
  ];
  orbiterLayers.forEach((layer, layerIndex) => {
    for (let index = 0; index < layer.count; index += 1) {
      const base = (Math.PI * 2 * index) / layer.count + layerIndex * 0.4;
      const angle = base + time * layer.speed;
      const x = cx + Math.cos(angle) * layer.rx;
      const y = cy + Math.sin(angle) * layer.ry;

      if (!reducedMotion) {
        for (let trail = 1; trail <= 14; trail += 1) {
          const trailAngle = angle - trail * 0.045 * Math.sign(layer.speed || 1);
          const tx = cx + Math.cos(trailAngle) * layer.rx;
          const ty = cy + Math.sin(trailAngle) * layer.ry;
          ctx.fillStyle = rgb(accent, 0.055 * (1 - trail / 15));
          ctx.beginPath();
          ctx.arc(tx, ty, Math.max(0.7, layer.size * (1 - trail / 18)), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const glow = ctx.createRadialGradient(x, y, 0, x, y, layer.size * 4);
      glow.addColorStop(0, rgb(accent, 0.34));
      glow.addColorStop(1, rgb(accent, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, layer.size * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgb(accent, 0.88);
      ctx.beginPath();
      ctx.arc(x, y, layer.size, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  const center = ctx.createRadialGradient(cx, cy, 0, cx, cy, 42);
  center.addColorStop(0, rgb(accent, 0.28));
  center.addColorStop(1, rgb(accent, 0));
  ctx.fillStyle = center;
  ctx.beginPath();
  ctx.arc(cx, cy, 42, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = rgb(accent, 0.65);
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.arc(cx, cy, 18, 0, Math.PI * 2);
  ctx.stroke();

  for (let index = 0; index < 2; index += 1) {
    const pulse = reducedMotion ? 0.35 : (Math.sin(time * 2 + index * Math.PI) + 1) / 2;
    ctx.strokeStyle = rgb(accent, 0.18 * (1 - pulse));
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(cx, cy, 24 + pulse * 32 + index * 9, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawThreatCard(ctx: CanvasRenderingContext2D, x: number, y: number, label: string, type: string, color: [number, number, number]) {
  const width = label.length * 6 + 18;
  const height = 20;
  drawRoundedRect(ctx, x - width / 2, y - height / 2, width, height, 5);
  ctx.fillStyle = rgb(color, 0.1);
  ctx.fill();
  ctx.strokeStyle = rgb(color, 0.45);
  ctx.lineWidth = 0.8;
  ctx.stroke();

  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  ctx.font = "9px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x, y - 1);
  ctx.fillStyle = rgb(color, 0.7);
  ctx.font = "7.5px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText(type, x, y + 14);
}

function drawThreatCards(ctx: CanvasRenderingContext2D, width: number, cx: number, cy: number, accent: [number, number, number], progress: number, mobile: boolean) {
  if (mobile) return;
  const blockedColor: [number, number, number] = [124, 255, 107];
  THREAT_CARDS.forEach(card => {
    const local = easeOutCubic((progress - card.delay) / (1 - card.delay));
    if (local <= 0) return;
    const start = width * 0.38;
    const end = width * 0.1;
    const dist = start + (end - start) * local;
    const x = cx + Math.cos(card.angle) * dist;
    const y = cy + Math.sin(card.angle) * dist * 0.58;
    const color = progress >= 0.65 ? blockedColor : accent;
    const type = progress >= 0.65 ? "✓ BLOCKED" : card.type;
    drawThreatCard(ctx, x, y, card.label, type, color);
  });
}

function drawInvestigationGraph(ctx: CanvasRenderingContext2D, cx: number, cy: number, accent: [number, number, number], t: number, progress: number) {
  const nodes = [
    { label: "Alert", x: -118, y: -88 },
    { label: "IOC", x: 112, y: -76 },
    { label: "Evidence", x: 142, y: 70 },
    { label: "MITRE", x: -20, y: 124 },
    { label: "Report", x: -148, y: 46 },
  ];
  ctx.save();
  ctx.strokeStyle = rgb(accent, 0.14);
  ctx.lineWidth = 0.7;
  nodes.forEach((node, index) => {
    if (progress < 0.12 + index * 0.08) return;
    const x = cx + node.x;
    const y = cy + node.y;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.stroke();
    drawThreatCard(ctx, x, y + Math.sin(t * 1.2 + index) * 4, node.label, "CASE", accent);
  });
  ctx.restore();
}

function drawIocNetwork(ctx: CanvasRenderingContext2D, cx: number, cy: number, accent: [number, number, number], progress: number) {
  ctx.save();
  IOC_NODES.forEach(node => {
    const local = easeOutCubic((progress - node.delay) / 0.32);
    if (local <= 0) return;
    const dist = 172;
    const x = cx + Math.cos(node.angle) * dist * local;
    const y = cy + Math.sin(node.angle) * dist * 0.68 * local;
    ctx.strokeStyle = rgb(accent, 0.12 * local);
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.stroke();
    drawThreatCard(ctx, x, y, node.label, node.type, accent);
  });
  ctx.restore();
}

function drawReadyChecklist(ctx: CanvasRenderingContext2D, cx: number, cy: number, progress: number) {
  const green: [number, number, number] = [124, 255, 107];
  ctx.save();
  ctx.font = "9.5px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textBaseline = "middle";
  READY_ITEMS.forEach((item, index) => {
    const visible = progress * 12000 >= index * 600;
    if (!visible) return;
    const y = cy - 90 + index * 26;
    const x = cx + 132;
    ctx.fillStyle = rgb(green, 0.94);
    ctx.fillText("✓", x, y);
    ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
    ctx.fillText(item, x + 16, y);
  });
  ctx.restore();
}

function drawSignalScan(ctx: CanvasRenderingContext2D, width: number, height: number, accent: [number, number, number], transitionMs: number) {
  if (transitionMs > 700) return;
  const flashAlpha = Math.max(0, 0.06 * (1 - transitionMs / 700));
  ctx.fillStyle = rgb(accent, flashAlpha);
  ctx.fillRect(0, 0, width, height);

  if (transitionMs <= 600) {
    const y = (transitionMs / 600) * height;
    const gradient = ctx.createLinearGradient(0, y, width, y);
    gradient.addColorStop(0, rgb(accent, 0));
    gradient.addColorStop(0.5, rgb(accent, 0.82));
    gradient.addColorStop(1, rgb(accent, 0));
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();

    const band = ctx.createLinearGradient(0, y - 28, 0, y + 28);
    band.addColorStop(0, rgb(accent, 0));
    band.addColorStop(0.5, rgb(accent, 0.08));
    band.addColorStop(1, rgb(accent, 0));
    ctx.fillStyle = band;
    ctx.fillRect(0, y - 28, width, 56);
  }
}

export function IntroCanvas({ scene, sceneIndex, sceneProgress, frameMs, transitionMs, reducedMotion }: IntroCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const sizeRef = useRef({ width: 0, height: 0, ratio: 1 });
  const accent = scene.accentRgb;
  const t = reducedMotion ? 0 : frameMs / 1000;

  const mobile = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 768;
  }, [frameMs]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const targetCanvas = canvas;

    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = window.innerWidth;
      const height = window.innerHeight;
      targetCanvas.width = Math.floor(width * ratio);
      targetCanvas.height = Math.floor(height * ratio);
      targetCanvas.style.width = `${width}px`;
      targetCanvas.style.height = `${height}px`;
      sizeRef.current = { width, height, ratio };
      particlesRef.current = createParticles(width, height);
    }

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const { width, height, ratio } = sizeRef.current;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const cx = width * 0.62;
    const cy = height * 0.5;
    drawBackground(ctx, width, height, accent);
    drawGrid(ctx, width, height, accent, t);
    drawParticles(ctx, particlesRef.current, width, height, accent, t, reducedMotion);
    drawDataStreams(ctx, cx, cy, accent, t, sceneIndex >= 1, reducedMotion);

    if (!reducedMotion) {
      if (sceneIndex === 1) {
        drawThreatCards(ctx, width, cx, cy, accent, sceneProgress, mobile);
      }
      if (sceneIndex === 2) {
        drawInvestigationGraph(ctx, cx, cy, accent, t, sceneProgress);
      }
      if (sceneIndex === 3) {
        drawIocNetwork(ctx, cx, cy, accent, sceneProgress);
      }
      if (sceneIndex === 4) {
        drawReadyChecklist(ctx, cx, cy, sceneProgress);
      }
    }

    drawCoreSystem(ctx, cx, cy, accent, t, reducedMotion);
    if (!reducedMotion) {
      drawSignalScan(ctx, width, height, accent, transitionMs);
    }
  }, [accent, frameMs, mobile, reducedMotion, sceneIndex, sceneProgress, t, transitionMs]);

  return <canvas ref={canvasRef} className="premium-intro-canvas" aria-hidden="true" />;
}
