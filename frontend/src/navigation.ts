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
  Settings,
  Shield,
  ShieldAlert,
  Trophy,
  Users,
  Wrench,
  Globe,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { UserRole } from "./auth/AuthContext";

export type NavigationSection =
  | "USER PORTAL"
  | "OVERVIEW"
  | "MONITORING"
  | "ASSET & RISK"
  | "INVESTIGATION"
  | "TOOLS & REPORTING"
  | "DETECTION & RESPONSE"
  | "TRAINING"
  | "ADMINISTRATION"
  | "ACCOUNT";

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
  "USER PORTAL",
  "OVERVIEW",
  "MONITORING",
  "ASSET & RISK",
  "INVESTIGATION",
  "TOOLS & REPORTING",
  "DETECTION & RESPONSE",
  "TRAINING",
  "ADMINISTRATION",
  "ACCOUNT",
];

export const navigationItems: NavigationItem[] = [
  {
    label: "My Security",
    path: "/my-security",
    icon: Shield,
    section: "USER PORTAL",
    roles: ["viewer"],
    keywords: ["my security", "website owner", "overview"],
    description: "User-friendly website security overview for owners.",
  },
  {
    label: "Scan History",
    path: "/scan-history",
    icon: ScrollText,
    section: "USER PORTAL",
    roles: ["viewer"],
    keywords: ["scan history", "previous scans", "website history"],
    description: "Track previous website scans and compare progress.",
  },
  {
    label: "Recommendations",
    path: "/recommendations",
    icon: ListChecks,
    section: "USER PORTAL",
    roles: ["viewer"],
    keywords: ["recommendations", "fix actions", "how to fix"],
    description: "Prioritized action list generated from scan findings.",
  },
  {
    label: "My Reports",
    path: "/my-reports",
    icon: FileText,
    section: "USER PORTAL",
    roles: ["viewer"],
    keywords: ["my reports", "security report", "export"],
    description: "View and export website security reports.",
  },
  {
    label: "Connect Website",
    path: "/connect-website",
    icon: Globe,
    section: "USER PORTAL",
    roles: ["viewer"],
    keywords: ["connect website", "integration", "connector"],
    description: "Integration roadmap and onboarding guide for website owners.",
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
    label: "Home",
    path: "/home",
    icon: Home,
    section: "OVERVIEW",
    roles: ["admin", "analyst", "viewer"],
    keywords: ["home", "start", "landing"],
    description: "Start page for LogShield modules and security operations workflow.",
  },
  {
    label: "Cinematic Demo",
    path: "/demo",
    icon: Activity,
    section: "OVERVIEW",
    roles: ["admin", "analyst"],
    keywords: ["demo", "cinematic", "simulation"],
    description: "Run the split-screen simulated defense demo.",
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
    label: "Logs",
    path: "/logs",
    icon: ScrollText,
    section: "MONITORING",
    roles: ["admin", "analyst"],
    keywords: ["logs", "events", "raw", "normalized", "evidence"],
    description: "Search, ingest, and analyze normalized security events.",
  },
  {
    label: "Research Hub",
    path: "/research-hub",
    icon: ShieldAlert,
    section: "MONITORING",
    roles: ["admin", "analyst"],
    keywords: ["research", "intel", "cve", "nvd", "vulnerability"],
    description: "Explore CVEs and curated security research context.",
  },
  {
    label: "Asset Inventory",
    path: "/assets",
    icon: Boxes,
    section: "ASSET & RISK",
    roles: ["admin", "analyst"],
    keywords: ["asset", "inventory", "host", "risk"],
    description: "Track systems, users, and services impacted by security activity.",
  },
  {
    label: "IOC Management",
    path: "/iocs",
    icon: Fingerprint,
    section: "ASSET & RISK",
    roles: ["admin", "analyst"],
    keywords: ["ioc", "indicator", "domain", "hash", "ip"],
    description: "Track indicators observed across alerts and investigations.",
  },
  {
    label: "Incidents",
    path: "/incidents",
    icon: Briefcase,
    section: "INVESTIGATION",
    roles: ["admin", "analyst"],
    keywords: ["incident", "case", "timeline", "evidence"],
    description: "Manage investigation cases, evidence, and timeline.",
  },
  {
    label: "Threat Hunting",
    path: "/hunting",
    icon: Crosshair,
    section: "INVESTIGATION",
    roles: ["admin", "analyst"],
    keywords: ["hunt", "query", "suspicious", "findings"],
    description: "Run guided hunts across logs and alerts.",
  },
  {
    label: "Response Playbooks",
    path: "/playbooks",
    icon: BookMarked,
    section: "INVESTIGATION",
    roles: ["admin", "analyst"],
    keywords: ["playbook", "response", "checklist"],
    description: "Use structured investigation and response checklists.",
  },
  {
    label: "Security Tools",
    path: "/tools",
    icon: Wrench,
    section: "TOOLS & REPORTING",
    roles: ["admin", "analyst", "viewer"],
    keywords: ["tools", "website analyzer", "url", "ioc", "jwt", "base64"],
    description: "Run safe security checks and analysis utilities.",
  },
  {
    label: "Reports",
    path: "/reports",
    icon: FileText,
    section: "TOOLS & REPORTING",
    roles: ["admin", "analyst"],
    keywords: ["reports", "summary", "export"],
    description: "Review operational summaries and reporting views.",
  },
  {
    label: "Detection Rules",
    path: "/rules",
    icon: ListChecks,
    section: "DETECTION & RESPONSE",
    roles: ["admin", "analyst"],
    keywords: ["rules", "detection", "enabled"],
    description: "Manage detection rules and response logic.",
  },
  {
    label: "IP Blocks",
    path: "/blocks",
    icon: Ban,
    section: "DETECTION & RESPONSE",
    roles: ["admin"],
    keywords: ["blocks", "ip", "deny", "blocklist"],
    description: "Block or unblock suspicious source IP addresses.",
  },
  {
    label: "Awareness Hub",
    path: "/awareness",
    icon: BookOpen,
    section: "TRAINING",
    roles: ["admin", "analyst", "viewer"],
    keywords: ["awareness", "quiz", "training"],
    description: "Learn cybersecurity concepts and take quizzes.",
  },
  {
    label: "My Scores",
    path: "/awareness/my-scores",
    icon: GraduationCap,
    section: "TRAINING",
    roles: ["admin", "analyst", "viewer"],
    keywords: ["my scores", "progress", "results"],
    description: "Review your quiz attempts and progress.",
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
    keywords: ["awareness scores", "all scores", "analytics"],
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
    keywords: ["security center", "2fa", "audit", "controls"],
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
    section: "ACCOUNT",
    roles: ["admin", "analyst", "viewer"],
    keywords: ["settings", "profile", "preferences"],
    description: "Manage profile details and account preferences.",
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
