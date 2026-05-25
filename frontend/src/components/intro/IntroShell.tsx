import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { IntroCanvas } from "./IntroCanvas";
import { IntroProgress } from "./IntroProgress";
import { IntroScene } from "./IntroScene";
import { INTRO_SCENES, REDUCED_MOTION_QUERY } from "./introData";
import "./intro.css";

function setIntroSeen() {
  try {
    localStorage.setItem("logshield.intro.seen", "true");
  } catch {
    // Keep navigation available if storage access is blocked.
  }
}

function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(REDUCED_MOTION_QUERY).matches;
  });

  useEffect(() => {
    const query = window.matchMedia(REDUCED_MOTION_QUERY);
    const onChange = () => setReducedMotion(query.matches);
    onChange();
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reducedMotion;
}

export function IntroShell() {
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const [sceneIndex, setSceneIndex] = useState(0);
  const [frameMs, setFrameMs] = useState(() => (typeof performance === "undefined" ? 0 : performance.now()));
  const sceneStartedAtRef = useRef(frameMs);
  const rafRef = useRef<number | null>(null);

  const scene = INTRO_SCENES[sceneIndex] ?? INTRO_SCENES[0];
  const sceneElapsedMs = Math.max(0, frameMs - sceneStartedAtRef.current);
  const sceneProgress = reducedMotion ? 1 : Math.min(1, sceneElapsedMs / scene.durationMs);
  const transitionMs = Math.max(0, sceneElapsedMs);
  const [r, g, b] = scene.accentRgb;

  const rootStyle = useMemo(
    () => ({
      ["--intro-accent-rgb" as string]: `${r}, ${g}, ${b}`,
    }),
    [b, g, r],
  );

  const navigateHome = useCallback(() => {
    setIntroSeen();
    navigate("/home");
  }, [navigate]);

  const navigateDashboard = useCallback(() => {
    setIntroSeen();
    navigate("/dashboard");
  }, [navigate]);

  const jumpToScene = useCallback((index: number) => {
    const nextIndex = Math.max(0, Math.min(INTRO_SCENES.length - 1, index));
    sceneStartedAtRef.current = performance.now();
    setFrameMs(sceneStartedAtRef.current);
    setSceneIndex(nextIndex);
  }, []);

  const advanceScene = useCallback(() => {
    if (sceneIndex >= INTRO_SCENES.length - 1) {
      navigateDashboard();
      return;
    }
    jumpToScene(sceneIndex + 1);
  }, [jumpToScene, navigateDashboard, sceneIndex]);

  useEffect(() => {
    function tick(now: number) {
      setFrameMs(now);
      rafRef.current = window.requestAnimationFrame(tick);
    }

    rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    if (sceneElapsedMs < scene.durationMs) return;

    if (sceneIndex < INTRO_SCENES.length - 1) {
      jumpToScene(sceneIndex + 1);
      return;
    }

    navigateHome();
  }, [jumpToScene, navigateHome, reducedMotion, scene.durationMs, sceneElapsedMs, sceneIndex]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        navigateHome();
      }

      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        advanceScene();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [advanceScene, navigateHome]);

  return (
    <main className="premium-intro" style={rootStyle}>
      <IntroCanvas
        scene={scene}
        sceneIndex={sceneIndex}
        sceneProgress={sceneProgress}
        frameMs={frameMs}
        transitionMs={transitionMs}
        reducedMotion={reducedMotion}
      />

      <div className="premium-intro-vignette" aria-hidden="true" />

      <button type="button" className="premium-intro-skip" onClick={navigateHome}>
        SKIP ›
      </button>

      <div className="premium-intro-tag">
        <span>{scene.badge}</span>
        <b>LOGSHIELD INTRO</b>
      </div>

      <IntroScene scene={scene} sceneElapsedMs={sceneElapsedMs} reducedMotion={reducedMotion} onCta={advanceScene} />

      <IntroProgress scenes={INTRO_SCENES} activeIndex={sceneIndex} sceneProgress={sceneProgress} onJump={jumpToScene} />
    </main>
  );
}
