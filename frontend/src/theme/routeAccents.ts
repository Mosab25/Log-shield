export type RouteAccent = {
  name: string;
  path: string | string[];
  accent: string;
  secondary: string;
  soft: string;
  secondarySoft: string;
  category: "cyber";
  description: string;
};

const BRAND_ACCENT = "#00D8FF";
const BRAND_SECONDARY = "#33E6FF";
const BRAND_SOFT = "rgba(0, 216, 255, 0.12)";
const BRAND_SECONDARY_SOFT = "rgba(51, 230, 255, 0.10)";

const STATUS = {
  critical: "#FF3B3B",
  warning: "#F59E0B",
  safe: "#7CFF6B",
  info: BRAND_ACCENT,
  neutral: "#8FA3B8",
} as const;

export const SECURITY_STATES = {
  safe: { color: STATUS.safe, label: "Safe / Success" },
  warning: { color: STATUS.warning, label: "Warning / Medium" },
  critical: { color: STATUS.critical, label: "Critical / Malicious" },
  info: { color: STATUS.info, label: "Info / Low" },
  neutral: { color: STATUS.neutral, label: "Neutral" },
} as const;

const DEFAULT_ROUTE_ACCENT = {
  accent: BRAND_ACCENT,
  secondary: BRAND_SECONDARY,
  soft: BRAND_SOFT,
  secondarySoft: BRAND_SECONDARY_SOFT,
  category: "cyber",
} satisfies Omit<RouteAccent, "name" | "path" | "description">;

function routeAccent(
  name: string,
  path: string | string[],
  description: string,
  secondary: string = BRAND_SECONDARY,
  secondarySoft: string = BRAND_SECONDARY_SOFT,
): RouteAccent {
  return {
    ...DEFAULT_ROUTE_ACCENT,
    name,
    path,
    description,
    secondary,
    secondarySoft,
  };
}

export const ROUTE_ACCENTS: RouteAccent[] = [
  routeAccent("Intro", "/intro", "Cinematic intro aligned to the LogShield brand"),
  routeAccent("Login", "/login", "Authentication entry point"),
  routeAccent("Register", "/register", "New account creation"),
  routeAccent("Settings", "/settings", "User and system preferences", STATUS.neutral, "rgba(143, 163, 184, 0.10)"),
  routeAccent("Home", "/home", "Platform landing and overview"),
  routeAccent("My Security", "/my-security", "User-facing website security overview"),
  routeAccent("Scan History", "/scan-history", "Historical website scan tracking"),
  routeAccent("Recommendations", "/recommendations", "Actionable fix recommendations from scans"),
  routeAccent("My Reports", "/my-reports", "User security report library"),
  routeAccent("Connect Website", "/connect-website", "Website integration onboarding guide"),
  routeAccent("Dashboard", "/dashboard", "Unified SOC visibility hub"),
  routeAccent("SOC Toolkit", "/tools", "Analyst utility belt"),
  routeAccent("Automation", "/automation", "Automated response workflows"),
  routeAccent("Top Targeted Assets", "/top-assets", "Most exposed asset overview"),
  routeAccent("Logs", "/logs", "Structured log monitoring"),
  routeAccent("Reports", "/reports", "Security reports and exports"),
  routeAccent("Audit Logs", ["/audit-logs", "/audit"], "Platform action traceability", STATUS.warning, "rgba(245, 158, 11, 0.08)"),
  routeAccent("Response Playbooks", "/playbooks", "Structured incident response guides"),
  routeAccent("Alerts", ["/alerts", "/alerts/:id"], "Smart threat detection alerts", STATUS.critical, "rgba(255, 59, 59, 0.08)"),
  routeAccent("IOC Management", ["/ioc", "/iocs"], "Indicators of compromise tracking"),
  routeAccent("Leaderboard", ["/leaderboard", "/awareness/leaderboard"], "Training performance rankings", STATUS.safe, "rgba(124, 255, 107, 0.08)"),
  routeAccent("IP Blocking", ["/ip-blocking", "/blocks"], "Active threat blocking and firewall", STATUS.critical, "rgba(255, 59, 59, 0.08)"),
  routeAccent("Risk Scoring", "/risk", "Organizational risk quantification", STATUS.warning, "rgba(245, 158, 11, 0.08)"),
  routeAccent("Threat Hunting", ["/threat-hunting", "/hunting"], "Proactive adversary hunting"),
  routeAccent("Incidents", ["/incidents", "/incidents/:id"], "Incident investigation and case management", STATUS.critical, "rgba(255, 59, 59, 0.08)"),
  routeAccent("Threat Intelligence", ["/threat-intelligence", "/threat-intel", "/threats", "/threats/:id"], "CVE research and threat feeds"),
  routeAccent("CVE Search", "/cve-search", "Vulnerability database search"),
  routeAccent("Detection Rules", ["/detection-rules", "/rules"], "SIEM detection logic management"),
  routeAccent("MITRE ATT&CK", "/mitre", "Adversary tactics and techniques matrix"),
  routeAccent("URL Scanner", ["/url-scanner", "/url-scanner/:id"], "URL reputation and malware check", STATUS.safe, "rgba(124, 255, 107, 0.08)"),
  routeAccent("Awareness Hub", ["/awareness", "/awareness/quiz/:slug"], "Security awareness training center", STATUS.safe, "rgba(124, 255, 107, 0.08)"),
  routeAccent("Quiz Management", ["/quizzes", "/awareness/manage"], "Training quiz creation and management", STATUS.safe, "rgba(124, 255, 107, 0.08)"),
  routeAccent("My Scores", ["/my-scores", "/awareness/my-scores"], "Personal training performance", STATUS.safe, "rgba(124, 255, 107, 0.08)"),
  routeAccent("Student Scores", ["/student-scores", "/awareness/scores"], "Team training score overview", STATUS.safe, "rgba(124, 255, 107, 0.08)"),
  routeAccent("Asset Inventory", "/assets", "Organizational asset registry"),
  routeAccent("Vulnerability Management", "/vulnerabilities", "Known vulnerability tracking and patching", STATUS.warning, "rgba(245, 158, 11, 0.08)"),
  routeAccent("Security Center", "/security-center", "Platform-wide security administration", STATUS.safe, "rgba(124, 255, 107, 0.08)"),
  routeAccent("User Management", "/users", "User roles and access control"),
];

const fallbackAccent = routeAccent("Unknown", "", "Unregistered route");

function routePatterns(route: RouteAccent): string[] {
  return Array.isArray(route.path) ? route.path : [route.path];
}

function routeSpecificity(path: string): number {
  return path.replace(/:[^/]+/g, "").length;
}

function pathMatches(pattern: string, pathname: string): boolean {
  if (pattern.includes(":")) {
    const base = pattern.split("/:")[0];
    return pathname === base || pathname.startsWith(`${base}/`);
  }

  return pathname === pattern || pathname.startsWith(`${pattern}/`);
}

export function getRouteAccent(pathname: string): RouteAccent {
  const candidates = ROUTE_ACCENTS.flatMap(route => routePatterns(route).map(path => ({ route, path })))
    .sort((a, b) => routeSpecificity(b.path) - routeSpecificity(a.path));

  return candidates.find(({ path }) => pathMatches(path, pathname))?.route ?? {
    ...fallbackAccent,
    path: pathname,
  };
}
