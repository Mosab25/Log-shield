export type IntroAccentName = "cyan" | "red" | "violet" | "amber" | "green";

export type IntroStat = {
  label: string;
  value: string;
  sub: string;
  code: string;
};

export type IntroSceneConfig = {
  id: string;
  name: string;
  badge: string;
  eyebrow: string;
  headlineLine1: string;
  headlineLine2: string;
  description: string;
  cta: string;
  accentName: IntroAccentName;
  accentRgb: [number, number, number];
  durationMs: number;
  stats: IntroStat[];
};

export const INTRO_SCENES: IntroSceneConfig[] = [
  {
    id: "platform",
    name: "PLATFORM",
    badge: "01 / PLATFORM",
    eyebrow: "INTRODUCING LOGSHIELD",
    headlineLine1: "Intelligent",
    headlineLine2: "SOC Platform.",
    description: "One platform to monitor, detect, investigate, and respond - built for real security analysts.",
    cta: "Explore Platform",
    accentName: "cyan",
    accentRgb: [0, 216, 255],
    durationMs: 12000,
    stats: [
      { code: "MOD", label: "MODULES ONLINE", value: "14", sub: "Fully integrated" },
      { code: "DET", label: "DETECTION ENGINE", value: "Active", sub: "Real-time analysis" },
      { code: "OPS", label: "COVERAGE", value: "Security Ops Tier 1", sub: "Enterprise ready" },
    ],
  },
  {
    id: "detection",
    name: "DETECTION",
    badge: "02 / DETECTION",
    eyebrow: "SCENE 02 - THREAT DETECTION",
    headlineLine1: "Threats",
    headlineLine2: "Detected.",
    description: "Incoming suspicious activity is organized, labeled, and analyzed before it reaches the protected core.",
    cta: "See Alerts",
    accentName: "red",
    accentRgb: [255, 59, 59],
    durationMs: 13000,
    stats: [
      { code: "ALT", label: "ALERTS TODAY", value: "47", sub: "23 critical severity" },
      { code: "LOG", label: "LOGS ANALYZED", value: "18.4K", sub: "Events this session" },
      { code: "RSK", label: "RISK SCORE", value: "86 / 100", sub: "Rising - action needed" },
    ],
  },
  {
    id: "investigation",
    name: "INVESTIGATION",
    badge: "03 / INVESTIGATION",
    eyebrow: "SCENE 03 - INCIDENT WORKFLOW",
    headlineLine1: "Investigate",
    headlineLine2: "Every Incident.",
    description: "Structured case management with MITRE ATT&CK mapping, evidence capture, and analyst playbooks.",
    cta: "Open Incidents",
    accentName: "violet",
    accentRgb: [139, 92, 246],
    durationMs: 12000,
    stats: [
      { code: "INC", label: "OPEN INCIDENTS", value: "3", sub: "1 critical priority" },
      { code: "TTP", label: "MITRE MAPPING", value: "T1078 | T1190", sub: "Active TTPs identified" },
      { code: "PLY", label: "PLAYBOOKS", value: "12 Active", sub: "Automated response" },
    ],
  },
  {
    id: "intelligence",
    name: "INTELLIGENCE",
    badge: "04 / INTELLIGENCE",
    eyebrow: "SCENE 04 - THREAT INTELLIGENCE",
    headlineLine1: "Know Your",
    headlineLine2: "Adversary.",
    description: "CVE research, IOC management, URL reputation scanning, and threat hunting in a single workflow.",
    cta: "View Intel",
    accentName: "amber",
    accentRgb: [245, 158, 11],
    durationMs: 13000,
    stats: [
      { code: "IOC", label: "IOCS TRACKED", value: "39", sub: "15 malicious / suspicious" },
      { code: "URL", label: "URL SCANNER", value: "Real-time", sub: "Reputation + malware check" },
      { code: "HNT", label: "THREAT HUNTING", value: "Proactive", sub: "Query-based detection" },
    ],
  },
  {
    id: "ready",
    name: "READY",
    badge: "05 / READY",
    eyebrow: "LOGSHIELD - FULLY OPERATIONAL",
    headlineLine1: "Monitor. Detect.",
    headlineLine2: "Investigate. Learn.",
    description: "The complete SOC platform for explainable threat detection and incident investigation.",
    cta: "Enter LogShield ->",
    accentName: "green",
    accentRgb: [124, 255, 107],
    durationMs: 12000,
    stats: [
      { code: "EDU", label: "AWARENESS HUB", value: "Training", sub: "Quizzes + leaderboard" },
      { code: "IAM", label: "USER MANAGEMENT", value: "RBAC + 2FA", sub: "Admin controls" },
      { code: "AUD", label: "AUDIT LOGS", value: "Full trace", sub: "Every action logged" },
    ],
  },
];

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

