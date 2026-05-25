import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Database, EyeOff, Lock, PlayCircle, Server, Shield, X } from "lucide-react";

import { AppModal } from "../ui/AppModal";
import type { ToolDemoConfig, ToolDemoSafetyBadge } from "../../data/socToolDemos";

type BadgeMeta = { label: string; icon: JSX.Element };

const BADGE_MAP: Record<ToolDemoSafetyBadge, BadgeMeta> = {
  "local-only": { label: "Local Only", icon: <Shield className="h-3.5 w-3.5" /> },
  "no-execution": { label: "No Execution", icon: <EyeOff className="h-3.5 w-3.5" /> },
  "passive-only": { label: "Passive Only", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  "no-credentials": { label: "No Credentials", icon: <Lock className="h-3.5 w-3.5" /> },
  "backend-api": { label: "Backend API", icon: <Server className="h-3.5 w-3.5" /> },
  "static-analysis": { label: "Static Analysis", icon: <Database className="h-3.5 w-3.5" /> },
  "reference-only": { label: "Reference Only", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  "no-crawling": { label: "No Crawling", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
};

export function ToolDemoModal({
  isOpen,
  demo,
  onClose,
  onOpenTool,
}: {
  isOpen: boolean;
  demo: ToolDemoConfig | null;
  onClose: () => void;
  onOpenTool: () => void;
}) {
  const [activeStep, setActiveStep] = useState(0);
  const [typedText, setTypedText] = useState("");
  const stepTimerRef = useRef<number | null>(null);
  const typeTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const steps = demo?.steps ?? [];
  const activeSample = useMemo(() => {
    if (!steps.length) return "";
    return steps[activeStep]?.sample ?? "";
  }, [activeStep, steps]);

  const clearStepTimer = () => {
    if (stepTimerRef.current !== null) {
      window.clearInterval(stepTimerRef.current);
      stepTimerRef.current = null;
    }
  };

  const clearTypeTimer = () => {
    if (typeTimerRef.current !== null) {
      window.clearTimeout(typeTimerRef.current);
      typeTimerRef.current = null;
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearStepTimer();
      clearTypeTimer();
    };
  }, []);

  useEffect(() => {
    if (!isOpen || !demo) return;
    clearStepTimer();
    clearTypeTimer();
    setActiveStep(0);
    setTypedText("");
    return () => {
      clearStepTimer();
      clearTypeTimer();
    };
  }, [demo, isOpen]);

  useEffect(() => {
    clearStepTimer();
    if (!isOpen || !demo) return;
    if (steps.length <= 1) return;
    stepTimerRef.current = window.setInterval(() => {
      if (!mountedRef.current || !isOpen) return;
      setActiveStep((current) => (current + 1) % steps.length);
    }, 5000);
    return clearStepTimer;
  }, [demo, isOpen, steps.length]);

  useEffect(() => {
    if (!isOpen || !demo) return;
    clearTypeTimer();
    setTypedText("");
  }, [activeStep, demo, isOpen]);

  useEffect(() => {
    clearTypeTimer();
    if (!isOpen || !demo) return;
    if (!activeSample) {
      setTypedText("No preview available for this step.");
      return;
    }
    if (activeSample.length > 120) {
      setTypedText(activeSample);
      return;
    }
    if (typedText.length >= activeSample.length) return;

    typeTimerRef.current = window.setTimeout(() => {
      if (!mountedRef.current || !isOpen) return;
      setTypedText(activeSample.slice(0, typedText.length + 1));
    }, 10);

    return clearTypeTimer;
  }, [activeSample, demo, isOpen, typedText]);

  if (!demo) return null;

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title={`${demo.title} Demo`}
      size="xl"
      closeOnOverlayClick
      overlayClassName="demo-modal-overlay"
      panelClassName="soc-panel demo-modal-panel p-4 sm:p-5"
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-300">How It Works</p>
            <h3 className="text-lg font-bold text-white">{demo.title}</h3>
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className="rounded border border-slate-700 bg-slate-900/60 px-2 py-0.5 text-slate-300">{demo.category}</span>
              {demo.safetyBadges.map((badgeId) => (
                <span key={badgeId} className="inline-flex items-center gap-1 rounded border border-cyan-400/20 bg-cyan-500/10 px-2 py-0.5 text-cyan-200">
                  {BADGE_MAP[badgeId].icon}
                  {BADGE_MAP[badgeId].label}
                </span>
              ))}
            </div>
            <p className="text-sm text-slate-400">{demo.description}</p>
          </div>
          <button
            type="button"
            aria-label="Close demo modal"
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-900/70 px-2 py-1 text-xs text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Animated Flow</p>
          <div className="grid gap-2 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">
            {steps.map((step, index) => {
              const isActive = index === activeStep;
              const showArrow = index < steps.length - 1;
              const nextActive = activeStep === index + 1 || (activeStep === 0 && index === steps.length - 1);
              return (
                <div key={`${step.label}-${index}`} className="contents">
                  <div
                    className={`demo-step-card rounded-xl border bg-slate-900/30 p-3 transition-all duration-300 ${
                      isActive
                        ? "demo-step-card active border-cyan-300/40 bg-cyan-500/5 -translate-y-0.5"
                        : "border-slate-800"
                    }`}
                  >
                    <p className="text-[10px] uppercase tracking-[0.08em] text-slate-400">{step.label}</p>
                    <p className="mt-1 text-sm font-semibold text-white">{step.title}</p>
                    <p className="mt-1 text-xs text-slate-400">{step.description}</p>
                  </div>
                  {showArrow ? (
                    <div className="hidden items-center justify-center md:flex">
                      <span className={`text-sm transition-colors ${nextActive ? "text-cyan-300" : "text-slate-600"}`}>→</span>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-cyan-400/15 bg-black/40 p-3">
            <p className="text-[10px] uppercase tracking-[0.08em] text-slate-500">Step Preview</p>
            <pre className="mt-2 min-h-[66px] whitespace-pre-wrap break-words font-mono text-xs text-cyan-200">
              {typedText}
              {activeSample && activeSample.length <= 120 && typedText.length < activeSample.length ? <span className="animate-pulse">▋</span> : null}
            </pre>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-3 space-y-3">
          <div>
            <p className="text-xs font-semibold text-cyan-300">1. What it does:</p>
            <p className="text-sm text-slate-300">{demo.whatItDoes}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-cyan-300">2. What you enter:</p>
            <p className="text-sm text-slate-300">{demo.whatYouEnter}</p>
            <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs text-slate-200">{demo.sampleInput}</pre>
          </div>
          <div>
            <p className="text-xs font-semibold text-cyan-300">3. What LogShield checks:</p>
            <p className="text-sm text-slate-300">{demo.whatLogShieldChecks}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-cyan-300">4. What you get:</p>
            <p className="text-sm text-slate-300">{demo.whatYouGet}</p>
            <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs text-emerald-200">{demo.sampleOutput}</pre>
          </div>
          <div>
            <p className="text-xs font-semibold text-cyan-300">5. Why it matters:</p>
            <p className="text-sm text-slate-300">{demo.whyItMatters}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-cyan-300">6. Safety note:</p>
            <p className="text-sm text-amber-200">{demo.safetyNote}</p>
          </div>
          <div className="grid gap-2 pt-1 md:grid-cols-3">
            <div className="rounded-lg border border-slate-800 bg-black/30 p-2">
              <p className="text-[11px] font-semibold text-slate-200">Best used when:</p>
              <p className="mt-1 text-xs text-slate-400">{demo.bestUsedWhen}</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-black/30 p-2">
              <p className="text-[11px] font-semibold text-slate-200">Common mistake:</p>
              <p className="mt-1 text-xs text-slate-400">{demo.commonMistake}</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-black/30 p-2">
              <p className="text-[11px] font-semibold text-slate-200">Recommended next step:</p>
              <p className="mt-1 text-xs text-slate-400">{demo.recommendedNextStep}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-800 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-200"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onOpenTool}
            className="inline-flex items-center gap-1 rounded-lg border border-cyan-300/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition hover:border-cyan-200/70 hover:bg-cyan-500/20"
          >
            <PlayCircle className="h-3.5 w-3.5" />
            Open Tool
          </button>
        </div>
      </div>
    </AppModal>
  );
}
