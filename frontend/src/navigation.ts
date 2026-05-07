import {
  Activity,
  AlertTriangle,
  Ban,
  BookMarked,
  BookOpen,
  Boxes,
  Briefcase,
  Crosshair,
  FileText,
  Fingerprint,
  Gauge,
  GraduationCap,
  Home,
  LayoutDashboard,
  ListChecks,
  ScrollText,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  Trophy,
  Users,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { UserRole } from "./auth/AuthContext";

export type NavigationSection =
  | "OVERVIEW"
  | "MONITORING"
  | "ASSET & RISK"
  | "INVESTIGATION"
  | "DETECTION & RESPONSE"
  | "TRAINING"
  | "ADMINISTRATION";

export interface NavigationItem {
  label: string;
  path: string;
  icon: LucideIcon;
  section: NavigationSection;
  roles: UserRole[];
  keywords: string[];
  description: string;
}

export const NAVIGATION_SECTIONS: NavigationSection[] = [
  "OVERVIEW",
  "MONITORING",
  "ASSET & RISK",
  "INVESTIGATION",
  "DETECTION & RESPONSE",
  "TRAINING",
  "ADMINISTRATION",
];

export const navigationItems: NavigationItem[] = [
  {
    label: "Home",
    path: "/home",
    icon: Home,
    section: "OVERVIEW",
    roles: ["admin", "analyst", "viewer"],
    keywords: ["home", "start", "landing"],
    description: "Start page for LogShield modules and SOC workflow.",
  },
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    section: "OVERVIEW",
    roles: ["admin", "analyst"],
    keywords: ["dashboard", "overview", "metrics", "risk", "alerts"],
    description: "Overview of alerts, risk, logs, incidents, and activity.",
  },
  {
    label: "Logs",
    path: "/logs",
    icon: ScrollText,
    section: "MONITORING",
    roles: ["admin", "analyst"],
    keywords: ["logs", "events", "raw", "normalized", "evidence"],
    description: "Search, ingest, and analyze normalized security events.",
  },
  {
    label: "Alerts",
    path: "/alerts",
    icon: AlertTriangle,
    section: "MONITORING",
    roles: ["admin", "analyst"],
    keywords: ["alerts", "triage", "detections", "risk"],
    description: "Triage suspicious activities and security alerts.",
  },
  {
    label: "Threat Intelligence",
    path: "/threat-intelligence",
    icon: ShieldAlert,
    section: "MONITORING",
    roles: ["admin", "analyst", "viewer"],
    keywords: ["threat", "intel", "intelligence", "ioc", "knowledge", "cve", "nvd", "vulnerability", "cvss", "search"],
    description: "Review curated threat knowledge and search CVEs from local and NVD sources.",
  },
  {
    label: "URL Reputation Scanner",
    path: "/url-scanner",
    icon: Search,
    section: "MONITORING",
    roles: ["admin", "analyst", "viewer"],
    keywords: ["url", "scanner", "reputation", "virustotal", "link"],
    description: "Analyze suspicious URLs with reputation intelligence.",
  },
  {
    label: "Asset Inventory",
    path: "/assets",
    icon: Boxes,
    section: "ASSET & RISK",
    roles: ["admin", "analyst"],
    keywords: ["asset", "inventory", "host", "server", "user", "risk"],
    description: "Track systems, users, and services affected by SOC activity.",
  },
  {
    label: "IOC Management",
    path: "/iocs",
    icon: Fingerprint,
    section: "ASSET & RISK",
    roles: ["admin", "analyst"],
    keywords: ["ioc", "indicator", "ip", "domain", "hash", "email", "reputation"],
    description: "Track indicators observed across alerts, logs, scans, and incidents.",
  },
  {
    label: "Incidents",
    path: "/incidents",
    icon: Briefcase,
    section: "INVESTIGATION",
    roles: ["admin", "analyst"],
    keywords: ["incident", "case", "timeline", "evidence", "notes"],
    description: "Manage investigation cases, evidence, notes, and timeline.",
  },
  {
    label: "Threat Hunting",
    path: "/hunting",
    icon: Crosshair,
    section: "INVESTIGATION",
    roles: ["admin", "analyst"],
    keywords: ["hunt", "threat hunting", "query", "findings", "suspicious"],
    description: "Run guided hunts across logs and alerts for investigation leads.",
  },
  {
    label: "Response Playbooks",
    path: "/playbooks",
    icon: BookMarked,
    section: "INVESTIGATION",
    roles: ["admin", "analyst", "viewer"],
    keywords: ["playbook", "response", "checklist", "mitre", "containment"],
    description: "Use structured investigation and response checklists.",
  },
  {
    label: "SOC Tools",
    path: "/tools",
    icon: Wrench,
    section: "INVESTIGATION",
    roles: ["admin", "analyst", "viewer"],
    keywords: ["tools", "cyberchef", "ioc", "jwt", "base64", "hash", "defang"],
    description: "Decode, transform, and inspect security artifacts locally.",
  },
  {
    label: "Reports",
    path: "/reports",
    icon: FileText,
    section: "INVESTIGATION",
    roles: ["admin", "analyst"],
    keywords: ["reports", "summary", "export", "charts"],
    description: "Review operational summaries and reporting views.",
  },
  {
    label: "Detection Rules",
    path: "/rules",
    icon: ListChecks,
    section: "DETECTION & RESPONSE",
    roles: ["admin", "analyst"],
    keywords: ["rules", "detection", "mitre", "enabled"],
    description: "Manage detection rules and response logic.",
  },
  {
    label: "IP Blocks",
    path: "/blocks",
    icon: Ban,
    section: "DETECTION & RESPONSE",
    roles: ["admin"],
    keywords: ["blocks", "ip", "deny", "blocklist", "response"],
    description: "Block or unblock suspicious source IP addresses.",
  },
  {
    label: "Awareness Hub",
    path: "/awareness",
    icon: BookOpen,
    section: "TRAINING",
    roles: ["admin", "analyst", "viewer"],
    keywords: ["awareness", "quiz", "training", "learning"],
    description: "Learn cybersecurity concepts and take quizzes.",
  },
  {
    label: "My Scores",
    path: "/awareness/my-scores",
    icon: GraduationCap,
    section: "TRAINING",
    roles: ["admin", "analyst", "viewer"],
    keywords: ["my scores", "scores", "progress", "learning results"],
    description: "Review your quiz attempts and improvement areas.",
  },
  {
    label: "Quiz Management",
    path: "/awareness/manage",
    icon: Gauge,
    section: "TRAINING",
    roles: ["admin", "analyst"],
    keywords: ["manage quizzes", "create quiz", "training admin"],
    description: "Create and manage awareness quizzes.",
  },
  {
    label: "Student Scores",
    path: "/awareness/scores",
    icon: Activity,
    section: "TRAINING",
    roles: ["admin"],
    keywords: ["awareness scores", "all scores", "training analytics"],
    description: "Review all learner scores and training performance.",
  },
  {
    label: "Leaderboard",
    path: "/awareness/leaderboard",
    icon: Trophy,
    section: "TRAINING",
    roles: ["admin"],
    keywords: ["leaderboard", "rankings", "top users"],
    description: "Review top awareness performers.",
  },
  {
    label: "Security Center",
    path: "/security-center",
    icon: Shield,
    section: "ADMINISTRATION",
    roles: ["admin"],
    keywords: ["security center", "2fa", "audit", "rate limit", "controls"],
    description: "Understand platform security controls and posture.",
  },
  {
    label: "User Management",
    path: "/users",
    icon: Users,
    section: "ADMINISTRATION",
    roles: ["admin"],
    keywords: ["users", "roles", "accounts", "admin"],
    description: "Manage users and role assignments.",
  },
  {
    label: "Audit Logs",
    path: "/audit",
    icon: Activity,
    section: "ADMINISTRATION",
    roles: ["admin"],
    keywords: ["audit", "activity", "history", "accountability"],
    description: "Review administrative and security-relevant activity.",
  },
  {
    label: "Settings",
    path: "/settings",
    icon: Settings,
    section: "ADMINISTRATION",
    roles: ["admin"],
    keywords: ["settings", "profile", "preferences"],
    description: "Manage profile details and local console preferences.",
  },
];

export function navigationForRole(role: UserRole | null): NavigationItem[] {
  if (!role) return [];
  return navigationItems.filter(item => item.roles.includes(role));
}

export function pageTitleForPath(pathname: string, role: UserRole | null): string {
  const available = navigationForRole(role);
  const exact = available.find(item => item.path === pathname);
  if (exact) return exact.label;
  const byPrefix = available
    .filter(item => pathname === item.path || pathname.startsWith(`${item.path}/`))
    .sort((a, b) => b.path.length - a.path.length)[0];
  return byPrefix?.label ?? "LogShield Console";
}
