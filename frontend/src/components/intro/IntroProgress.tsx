import type { IntroSceneConfig } from "./introData";

export function IntroProgress({
  scenes,
  activeIndex,
  sceneProgress,
  onJump,
}: {
  scenes: IntroSceneConfig[];
  activeIndex: number;
  sceneProgress: number;
  onJump: (index: number) => void;
}) {
  return (
    <>
      <div className="premium-intro-dots" aria-label="Intro scene navigation">
        {scenes.map((scene, index) => (
          <button
            type="button"
            key={scene.id}
            className={`premium-intro-dot ${index === activeIndex ? "is-active" : ""} ${index < activeIndex ? "is-done" : ""}`}
            onClick={() => onJump(index)}
            aria-label={`Go to ${scene.name}`}
          />
        ))}
      </div>
      <div className="premium-intro-timer" aria-hidden="true">
        <span style={{ transform: `scaleX(${Math.max(0, Math.min(1, sceneProgress))})` }} />
      </div>
    </>
  );
}
