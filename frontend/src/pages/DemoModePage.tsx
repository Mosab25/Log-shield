import { useEffect, useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";

import { AiDetectionPanel } from "../components/demo/AiDetectionPanel";
import { AlertDemoPanel } from "../components/demo/AlertDemoPanel";
import { AssetRiskDemoPanel } from "../components/demo/AssetRiskDemoPanel";
import { AttackerTerminalPanel } from "../components/demo/AttackerTerminalPanel";
import { DefenseDemoPanel } from "../components/demo/DefenseDemoPanel";
import { DemoControlBar } from "../components/demo/DemoControlBar";
import { DemoReportPanel } from "../components/demo/DemoReportPanel";
import { DemoTimeline } from "../components/demo/DemoTimeline";
import { FinalContainmentPanel } from "../components/demo/FinalContainmentPanel";
import { IncidentDemoPanel } from "../components/demo/IncidentDemoPanel";
import { IocDemoPanel } from "../components/demo/IocDemoPanel";
import { LiveLogsPanel } from "../components/demo/LiveLogsPanel";
import { MitreAttackPanel } from "../components/demo/MitreAttackPanel";
import { ModuleStatusGrid } from "../components/demo/ModuleStatusGrid";
import { PlaybookDemoPanel } from "../components/demo/PlaybookDemoPanel";
import { ThreatIntelDemoPanel } from "../components/demo/ThreatIntelDemoPanel";
import {
  DEMO_DISCLAIMER,
  FocusMode,
  INCIDENT_SUMMARY,
  LIVE_LOG_LINES,
  PLAYBOOK_STEPS,
  STAGES,
  TERMINAL_LINES,
  getRiskScoreForStage,
} from "../data/demoScenario";
import { PageHeader } from "../components/ui/PageHeader";

type DemoState = {
  currentStageIndex: number;
  isRunning: boolean;
  isPaused: boolean;
  terminalLinesVisible: string[];
  logsVisible: string[];
  riskScore: number;
  defenseStatus: string;
  incidentStatus: string;
  alertStatus: string;
  blocked: boolean;
  iocExtracted: boolean;
  mitreMapped: boolean;
  playbookStepIndex: number;
  reportGenerated: boolean;
  focusMode: FocusMode;
};

const STAGE_INTERVAL_MS = 1500;

const initialDemoState: DemoState = {
  currentStageIndex: 0,
  isRunning: false,
  isPaused: false,
  terminalLinesVisible: [],
  logsVisible: [],
  riskScore: 0,
  defenseStatus: "Waiting for recommendation",
  incidentStatus: "Not opened",
  alertStatus: "None",
  blocked: false,
  iocExtracted: false,
  mitreMapped: false,
  playbookStepIndex: 0,
  reportGenerated: false,
  focusMode: "split",
};

const terminalLineCountByStage = [0, 1, 2, 4, 7, 9, 9, 9, 9, 9, 9, 9, 9, 10, 11, 12, 12, 12, 12, 12, 12];
const logLineCountByStage = [0, 1, 2, 4, 7, 9, 9, 9, 9, 9, 10, 10, 10, 10, 11, 12, 12, 12, 12, 12, 12];

function getReportText() {
  return `Website Attack Investigation Report

Executive Summary
- Simulated website attack activity was detected and contained by LogShield.

Technical Timeline
- Reconnaissance against sensitive endpoints
- Authentication abuse against admin
- Suspicious web request patterns
- Source IP blocked and denied

Affected Asset
- Public Web Application

Detected Attack Type
- web_attack

Risk Score
- 94

Extracted IOCs
- 203.0.113.77 (defanged: 203[.]0[.]113[.]77)

MITRE ATT&CK Mapping
- T1595 Active Scanning
- T1110 Brute Force
- T1190 Exploit Public-Facing Application
- T1078 Valid Accounts

Alert Details
- ALT-DEMO-001 / Critical / In Progress

Defense Actions
- Blocked source IP 203.0.113.77
- Denied post-block requests

Response Playbook Steps
- Review logs, extract IOC, check intel, create alert, block source IP, open incident, generate report

Recommendations
- Continue monitoring for replay attempts
- Keep temporary block and review surrounding IPs

Final Status: THREAT CONTAINED`;
}

function downloadTxtReport() {
  const blob = new Blob([getReportText()], { type: "text/plain;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "logshield-cinematic-demo-report.txt";
  a.click();
  window.URL.revokeObjectURL(url);
}

export function DemoModePage() {
  const [state, setState] = useState<DemoState>(initialDemoState);
  const [typedLine, setTypedLine] = useState("");
  const [riskDisplay, setRiskDisplay] = useState(0);

  const currentStageLabel = STAGES[state.currentStageIndex] ?? STAGES[0];
  const targetTerminalCount = terminalLineCountByStage[state.currentStageIndex] ?? TERMINAL_LINES.length;
  const targetLogCount = logLineCountByStage[state.currentStageIndex] ?? LIVE_LOG_LINES.length;

  function applyStage(index: number) {
    const capped = Math.max(0, Math.min(20, index));
    setState(prev => ({
      ...prev,
      currentStageIndex: capped,
      riskScore: getRiskScoreForStage(capped),
      defenseStatus: capped >= 14 ? "Source IP 203.0.113.77 blocked successfully" : capped >= 13 ? "Recommended Action: Block Source IP" : "Waiting for recommendation",
      incidentStatus: capped >= 20 ? "Contained" : capped >= 16 ? "Opened" : "Not opened",
      alertStatus: capped >= 12 ? "In Progress" : capped >= 11 ? "Open" : "None",
      blocked: capped >= 14,
      iocExtracted: capped >= 9,
      mitreMapped: capped >= 8,
      reportGenerated: capped >= 19,
      focusMode: capped >= 14 ? "soc" : "split",
      playbookStepIndex: capped < 17 ? 0 : prev.playbookStepIndex,
    }));
  }

  function startDemo() {
    setState(prev => ({ ...prev, isRunning: true, isPaused: false }));
    if (state.currentStageIndex === 0) applyStage(1);
  }

  function pauseDemo() {
    setState(prev => ({ ...prev, isPaused: true }));
  }

  function resumeDemo() {
    setState(prev => ({ ...prev, isPaused: false, isRunning: true }));
  }

  function resetDemo() {
    setState(initialDemoState);
    setTypedLine("");
    setRiskDisplay(0);
  }

  function replayDemo() {
    setState(initialDemoState);
    setTypedLine("");
    setRiskDisplay(0);
    setTimeout(() => {
      setState(prev => ({ ...prev, isRunning: true }));
      applyStage(1);
    }, 50);
  }

  function skipToFinal() {
    setState(prev => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      terminalLinesVisible: [...TERMINAL_LINES],
      logsVisible: [...LIVE_LOG_LINES],
      playbookStepIndex: PLAYBOOK_STEPS.length,
    }));
    applyStage(20);
  }

  useEffect(() => {
    if (!state.isRunning || state.isPaused) return;
    if (state.currentStageIndex >= 20) return;
    const id = window.setInterval(() => {
      applyStage(state.currentStageIndex + 1);
    }, STAGE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [state.currentStageIndex, state.isPaused, state.isRunning]);

  useEffect(() => {
    if (state.currentStageIndex >= 20) {
      setState(prev => ({ ...prev, isRunning: false, isPaused: false }));
    }
  }, [state.currentStageIndex]);

  useEffect(() => {
    if (state.riskScore === riskDisplay) return;
    const direction = state.riskScore > riskDisplay ? 1 : -1;
    const id = window.setInterval(() => {
      setRiskDisplay(prev => {
        if (prev === state.riskScore) return prev;
        const next = prev + direction;
        if ((direction > 0 && next >= state.riskScore) || (direction < 0 && next <= state.riskScore)) {
          return state.riskScore;
        }
        return next;
      });
    }, 18);
    return () => window.clearInterval(id);
  }, [riskDisplay, state.riskScore]);

  useEffect(() => {
    if (state.terminalLinesVisible.length >= targetTerminalCount) {
      setTypedLine("");
      return;
    }
    if (state.isPaused) return;
    const nextLine = TERMINAL_LINES[state.terminalLinesVisible.length];
    let index = 0;
    const id = window.setInterval(() => {
      index += 1;
      setTypedLine(nextLine.slice(0, index));
      if (index >= nextLine.length) {
        window.clearInterval(id);
        setState(prev => ({
          ...prev,
          terminalLinesVisible: [...prev.terminalLinesVisible, nextLine],
        }));
        setTypedLine("");
      }
    }, 16);
    return () => window.clearInterval(id);
  }, [state.isPaused, state.terminalLinesVisible, targetTerminalCount]);

  useEffect(() => {
    if (state.logsVisible.length >= targetLogCount || state.isPaused) return;
    const nextLog = LIVE_LOG_LINES[state.logsVisible.length];
    const id = window.setTimeout(() => {
      setState(prev => ({ ...prev, logsVisible: [...prev.logsVisible, nextLog] }));
    }, 140);
    return () => window.clearTimeout(id);
  }, [state.isPaused, state.logsVisible, targetLogCount]);

  useEffect(() => {
    if (state.currentStageIndex < 17 || state.isPaused) return;
    if (state.playbookStepIndex >= PLAYBOOK_STEPS.length) return;
    const id = window.setInterval(() => {
      setState(prev => {
        if (prev.playbookStepIndex >= PLAYBOOK_STEPS.length) return prev;
        return { ...prev, playbookStepIndex: prev.playbookStepIndex + 1 };
      });
    }, 420);
    return () => window.clearInterval(id);
  }, [state.currentStageIndex, state.isPaused, state.playbookStepIndex]);

  const splitToSocMessageVisible = state.focusMode === "soc" && state.currentStageIndex >= 14;

  const renderSocPanels = useMemo(
    () => (
      <div className="grid gap-4 xl:grid-cols-2">
        {state.currentStageIndex >= 7 ? <AiDetectionPanel /> : null}
        {state.currentStageIndex >= 8 ? <MitreAttackPanel /> : null}
        {state.currentStageIndex >= 9 ? <IocDemoPanel /> : null}
        {state.currentStageIndex >= 10 ? <ThreatIntelDemoPanel /> : null}
        {state.currentStageIndex >= 11 ? <AlertDemoPanel stage={state.currentStageIndex} /> : null}
        {state.currentStageIndex >= 12 ? <AssetRiskDemoPanel /> : null}
        {state.currentStageIndex >= 13 ? <DefenseDemoPanel blocked={state.blocked} /> : null}
        {state.currentStageIndex >= 16 ? <IncidentDemoPanel /> : null}
        {state.currentStageIndex >= 17 ? <PlaybookDemoPanel stepIndex={state.playbookStepIndex} /> : null}
        {state.currentStageIndex >= 18 ? (
          <section className="soc-panel p-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">AI Incident Summary</h3>
            <p className="mt-1 text-[11px] text-[var(--text-faint)]">Simulated Demo Data</p>
            <p className="mt-3 text-xs leading-6 text-[var(--text-muted)]">{INCIDENT_SUMMARY}</p>
          </section>
        ) : null}
        {state.currentStageIndex >= 19 ? <DemoReportPanel /> : null}
      </div>
    ),
    [state.blocked, state.currentStageIndex, state.playbookStepIndex],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="SIMULATED DEMO DATA"
        title="Cinematic Website Attack Demo"
        description={DEMO_DISCLAIMER}
        actions={<p className="chip chip-warning">Display-Only Scenario</p>}
      />

      <DemoControlBar
        isRunning={state.isRunning}
        isPaused={state.isPaused}
        onStart={startDemo}
        onPause={pauseDemo}
        onResume={resumeDemo}
        onReset={resetDemo}
        onReplay={replayDemo}
        onSkipToFinal={skipToFinal}
        onExportReport={downloadTxtReport}
      />

      <section
        className={`grid gap-4 transition-all duration-500 ${
          state.focusMode === "split" ? "xl:grid-cols-2" : "grid-cols-1"
        }`}
      >
        {state.focusMode === "split" ? (
          <AttackerTerminalPanel lines={state.terminalLinesVisible} typedLine={typedLine} />
        ) : null}
        <LiveLogsPanel lines={state.logsVisible} riskScore={riskDisplay} stageLabel={currentStageLabel} />
      </section>

      {splitToSocMessageVisible ? (
        <section className="soc-panel border-[color:color-mix(in_srgb,var(--status-safe)_32%,transparent)] bg-[color:color-mix(in_srgb,var(--status-safe)_10%,transparent)] p-4 text-sm text-[var(--status-safe)]">
          <p className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-4 w-4" />
            LogShield has detected and contained the simulated attack.
          </p>
        </section>
      ) : null}

      <DemoTimeline currentStageIndex={state.currentStageIndex} />
      <ModuleStatusGrid currentStageIndex={state.currentStageIndex} />

      {state.focusMode === "soc" ? renderSocPanels : null}

      {state.currentStageIndex >= 20 ? (
        <FinalContainmentPanel onReplay={replayDemo} onExportReport={downloadTxtReport} />
      ) : null}
    </div>
  );
}

