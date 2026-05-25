import { FastForward, Pause, Play, RotateCcw, SkipForward } from "lucide-react";

export function DemoControlBar({
  isRunning,
  isPaused,
  onStart,
  onPause,
  onResume,
  onReset,
  onReplay,
  onSkipToFinal,
  onExportReport,
}: {
  isRunning: boolean;
  isPaused: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onReplay: () => void;
  onSkipToFinal: () => void;
  onExportReport: () => void;
}) {
  return (
    <div className="soc-panel flex flex-wrap items-center gap-2 p-3">
      {!isRunning ? (
        <button type="button" className="row-action primary" onClick={onStart}>
          <Play className="h-3.5 w-3.5" />
          Start
        </button>
      ) : null}
      {isRunning && !isPaused ? (
        <button type="button" className="row-action" onClick={onPause}>
          <Pause className="h-3.5 w-3.5" />
          Pause
        </button>
      ) : null}
      {isRunning && isPaused ? (
        <button type="button" className="row-action primary" onClick={onResume}>
          <Play className="h-3.5 w-3.5" />
          Resume
        </button>
      ) : null}
      <button type="button" className="row-action" onClick={onReset}>
        <RotateCcw className="h-3.5 w-3.5" />
        Reset
      </button>
      <button type="button" className="row-action" onClick={onReplay}>
        <FastForward className="h-3.5 w-3.5" />
        Replay
      </button>
      <button type="button" className="row-action warning" onClick={onSkipToFinal}>
        <SkipForward className="h-3.5 w-3.5" />
        Skip to Final
      </button>
      <button type="button" className="row-action success" onClick={onExportReport}>
        Export Report
      </button>
    </div>
  );
}

