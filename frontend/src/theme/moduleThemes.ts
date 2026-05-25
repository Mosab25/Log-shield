import type { CSSProperties } from "react";

export type ModuleThemeKey =
  | "home"
  | "intro"
  | "dashboard"
  | "logs"
  | "alerts"
  | "incidents"
  | "threatIntelligence"
  | "cveSearch"
  | "urlScanner"
  | "socToolkit"
  | "awareness"
  | "reports"
  | "rules"
  | "ipBlocking"
  | "securityCenter"
  | "users"
  | "audit"
  | "settings"
  | "assets"
  | "vulnerabilities"
  | "hunting"
  | "iocs"
  | "playbooks";

export interface ModuleTheme {
  key: ModuleThemeKey;
  label: string;
  accent: string;
  accent2: string;
  accentSoft: string;
  accent2Soft: string;
  gradient: string;
  icon: string;
  description: string;
  pattern: string;
}

const BRAND = "#00D8FF";
const BRAND_2 = "#33E6FF";
const BRAND_SOFT = "rgba(0, 216, 255, 0.12)";
const BRAND_2_SOFT = "rgba(51, 230, 255, 0.10)";
const STATUS_CRITICAL = "#FF3B3B";
const STATUS_WARNING = "#F59E0B";
const STATUS_SAFE = "#7CFF6B";
const STATUS_NEUTRAL = "#8FA3B8";

function moduleTheme(
  key: ModuleThemeKey,
  label: string,
  icon: string,
  description: string,
  pattern: string,
  accent2 = BRAND_2,
  accent2Soft = BRAND_2_SOFT,
): ModuleTheme {
  return {
    key,
    label,
    accent: BRAND,
    accent2,
    accentSoft: BRAND_SOFT,
    accent2Soft,
    gradient: `linear-gradient(135deg, ${BRAND_SOFT}, rgba(51, 230, 255, 0.045))`,
    icon,
    description,
    pattern,
  };
}

export const moduleThemes: Record<ModuleThemeKey, ModuleTheme> = {
  home: moduleTheme("home", "Home", "Home", "Product identity, platform introduction, and guided entry points.", "brand grid"),
  intro: moduleTheme("intro", "Intro", "ShieldCheck", "Cinematic cyber defense sequence with threat and protection states.", "defense mesh"),
  dashboard: moduleTheme("dashboard", "Dashboard", "LayoutDashboard", "Unified security visibility and monitoring overview.", "visibility radar"),
  logs: moduleTheme("logs", "Logs", "ScrollText", "Structured event streams and raw security evidence.", "log stream"),
  alerts: moduleTheme("alerts", "Alerts", "TriangleAlert", "Warning, detection, and triage signals.", "alert pulse", STATUS_CRITICAL, "rgba(255, 59, 59, 0.08)"),
  incidents: moduleTheme("incidents", "Incidents", "Briefcase", "Case management, evidence tracking, and attack timelines.", "case timeline", STATUS_CRITICAL, "rgba(255, 59, 59, 0.08)"),
  threatIntelligence: moduleTheme("threatIntelligence", "Threat Intelligence", "Radar", "External intelligence, CVE research, and knowledge context.", "intelligence grid"),
  cveSearch: moduleTheme("cveSearch", "CVE Search", "Bug", "Vulnerability research and severity analysis.", "research grid"),
  urlScanner: moduleTheme("urlScanner", "URL Scanner", "Search", "Reputation verdicts and suspicious URL analysis.", "scanner sweep", STATUS_SAFE, "rgba(124, 255, 107, 0.08)"),
  socToolkit: moduleTheme("socToolkit", "SOC Toolkit", "Wrench", "Technical utilities and analyst artifact tools.", "terminal utilities"),
  awareness: moduleTheme("awareness", "Security Awareness", "BookOpen", "Learning, improvement, quiz progress, and evaluation.", "learning progress", STATUS_SAFE, "rgba(124, 255, 107, 0.08)"),
  reports: moduleTheme("reports", "Reports", "FileText", "Documentation, export, and executive-ready summaries.", "document planes"),
  rules: moduleTheme("rules", "Detection Rules", "ListChecks", "Detection logic, conditions, and response tuning.", "logic graph"),
  ipBlocking: moduleTheme("ipBlocking", "IP Blocking", "Ban", "Containment, blocking, and firewall-style response.", "containment barrier", STATUS_CRITICAL, "rgba(255, 59, 59, 0.08)"),
  securityCenter: moduleTheme("securityCenter", "Security Center", "ShieldCheck", "Protection status, hardening, and platform controls.", "shield posture", STATUS_SAFE, "rgba(124, 255, 107, 0.08)"),
  users: moduleTheme("users", "Users", "Users", "Identity, access, users, roles, and permissions.", "identity matrix"),
  audit: moduleTheme("audit", "Audit Logs", "Activity", "Accountability, action trails, and traceability.", "audit trail", STATUS_WARNING, "rgba(245, 158, 11, 0.08)"),
  settings: moduleTheme("settings", "Settings", "Settings", "Configuration, preferences, and system profile controls.", "configuration mesh", STATUS_NEUTRAL, "rgba(143, 163, 184, 0.10)"),
  assets: moduleTheme("assets", "Assets", "Server", "Infrastructure, inventory, systems, and asset risk.", "asset nodes"),
  vulnerabilities: moduleTheme("vulnerabilities", "Vulnerabilities", "Bug", "Weaknesses, remediation, and vulnerability priority.", "exposure list", STATUS_WARNING, "rgba(245, 158, 11, 0.08)"),
  hunting: moduleTheme("hunting", "Threat Hunting", "Crosshair", "Proactive search, queries, and investigation leads.", "hunt sweep"),
  iocs: moduleTheme("iocs", "IOC Management", "Fingerprint", "Indicators, suspicious artifacts, and evidence tracking.", "indicator field"),
  playbooks: moduleTheme("playbooks", "Response Playbooks", "ClipboardList", "Guided response, structured actions, and checklists.", "workflow steps"),
};

const routeThemeMatchers: Array<[RegExp, ModuleThemeKey]> = [
  [/^\/intro(?:\/|$)/, "intro"],
  [/^\/home(?:\/|$)/, "home"],
  [/^\/dashboard(?:\/|$)/, "dashboard"],
  [/^\/logs(?:\/|$)/, "logs"],
  [/^\/alerts(?:\/|$)/, "alerts"],
  [/^\/incidents(?:\/|$)/, "incidents"],
  [/^\/threat-intelligence(?:\/|$)|^\/threat-intel(?:\/|$)|^\/threats(?:\/|$)/, "threatIntelligence"],
  [/^\/cve-search(?:\/|$)/, "cveSearch"],
  [/^\/url-scanner(?:\/|$)/, "urlScanner"],
  [/^\/tools(?:\/|$)/, "socToolkit"],
  [/^\/awareness(?:\/|$)/, "awareness"],
  [/^\/reports(?:\/|$)/, "reports"],
  [/^\/rules(?:\/|$)/, "rules"],
  [/^\/blocks(?:\/|$)|^\/ip-blocking(?:\/|$)/, "ipBlocking"],
  [/^\/security-center(?:\/|$)/, "securityCenter"],
  [/^\/users(?:\/|$)/, "users"],
  [/^\/audit(?:\/|$)|^\/audit-logs(?:\/|$)/, "audit"],
  [/^\/settings(?:\/|$)/, "settings"],
  [/^\/assets(?:\/|$)/, "assets"],
  [/^\/vulnerabilities(?:\/|$)/, "vulnerabilities"],
  [/^\/hunting(?:\/|$)|^\/threat-hunting(?:\/|$)/, "hunting"],
  [/^\/iocs(?:\/|$)|^\/ioc(?:\/|$)/, "iocs"],
  [/^\/playbooks(?:\/|$)/, "playbooks"],
];

export function moduleThemeKeyForPath(pathname: string): ModuleThemeKey {
  return routeThemeMatchers.find(([pattern]) => pattern.test(pathname))?.[1] ?? "dashboard";
}

export function moduleThemeForPath(pathname: string): ModuleTheme {
  return moduleThemes[moduleThemeKeyForPath(pathname)];
}

export function moduleThemeStyle(theme: ModuleTheme): CSSProperties {
  return {
    "--module-accent": theme.accent,
    "--module-accent-2": theme.accent2,
    "--module-accent-soft": theme.accentSoft,
    "--module-accent-2-soft": theme.accent2Soft,
    "--module-gradient": theme.gradient,
  } as CSSProperties;
}
