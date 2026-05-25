import { ArrowRight } from "lucide-react";

import type { IntroSceneConfig } from "./introData";

function typedText(text: string, elapsedMs: number, speedMs: number, delayMs = 0, instant = false) {
  if (instant) {
    return { text, done: true };
  }

  if (elapsedMs < delayMs) {
    return { text: "", done: false };
  }

  const count = Math.min(text.length, Math.floor((elapsedMs - delayMs) / speedMs));
  return { text: text.slice(0, count), done: count >= text.length };
}

export function IntroScene({
  scene,
  sceneElapsedMs,
  reducedMotion,
  onCta,
}: {
  scene: IntroSceneConfig;
  sceneElapsedMs: number;
  reducedMotion: boolean;
  onCta: () => void;
}) {
  const eyebrow = typedText(scene.eyebrow, sceneElapsedMs, 35, 0, reducedMotion);
  const description = typedText(scene.description, sceneElapsedMs, 20, 650, reducedMotion);

  return (
    <section className="premium-intro-content" key={scene.id}>
      <div id="main" className="premium-intro-copy intro-text">
        <div className="premium-intro-eyebrow" aria-label={scene.eyebrow}>
          <span>{eyebrow.text}</span>
          {!eyebrow.done ? <i aria-hidden="true">|</i> : null}
        </div>

        <h1 className="premium-intro-headline">
          <span>{scene.headlineLine1}</span>
          <span>{scene.headlineLine2}</span>
        </h1>

        <p className="premium-intro-description" aria-label={scene.description}>
          <span>{description.text}</span>
          {!description.done ? <i aria-hidden="true">|</i> : null}
        </p>

        <button type="button" className="premium-intro-cta" onClick={onCta}>
          <span>{scene.cta}</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <aside id="SR" className="premium-intro-stats stats-row" aria-label={`${scene.name} statistics`}>
        {scene.stats.map((stat, index) => (
          <article
            key={stat.label}
            className="premium-intro-stat"
            style={{ ["--stat-delay" as string]: `${150 + index * 130}ms` }}
          >
            <div className="premium-intro-stat-code">{stat.code}</div>
            <div>
              <div className="premium-intro-stat-label">{stat.label}</div>
              <div className="premium-intro-stat-value">{stat.value}</div>
              <div className="premium-intro-stat-sub">{stat.sub}</div>
            </div>
          </article>
        ))}
      </aside>
    </section>
  );
}
