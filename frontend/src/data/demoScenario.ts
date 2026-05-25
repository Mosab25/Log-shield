export const DEMO_DISCLAIMER = "Simulated Demo Data — display-only cybersecurity scenario. No real commands or network activity are executed.";

export const TERMINAL_LINES = [
  "attacker@demo:~$ connect target logshield-demo.local",
  "attacker@demo:~$ probe /admin",
  "attacker@demo:~$ probe /login",
  "attacker@demo:~$ probe /api/users",
  "attacker@demo:~$ attempt login user=admin result=failed",
  "attacker@demo:~$ attempt login user=admin result=failed",
  "attacker@demo:~$ attempt login user=admin result=failed",
  "attacker@demo:~$ probe /config",
  "attacker@demo:~$ send suspicious web request pattern",
  "attacker@demo:~$ probe /backup",
  "attacker@demo:~$ connection denied",
  "attacker@demo:~$ blocked by LogShield",
] as const;

export const LIVE_LOG_LINES = [
  "2026-05-24 10:01:02 GET /admin from 203.0.113.77 status=404",
  "2026-05-24 10:01:05 GET /login from 203.0.113.77 status=200",
  "2026-05-24 10:01:07 GET /api/users from 203.0.113.77 status=403",
  "2026-05-24 10:01:10 GET /config from 203.0.113.77 status=403",
  "2026-05-24 10:01:12 GET /backup from 203.0.113.77 status=404",
  "2026-05-24 10:01:15 POST /login failed user=admin from 203.0.113.77",
  "2026-05-24 10:01:17 POST /login failed user=admin result=failed from 203.0.113.77",
  "2026-05-24 10:01:19 POST /login failed user=admin result=failed from 203.0.113.77",
  "2026-05-24 10:01:21 GET /search suspicious-input-pattern from 203.0.113.77 status=400",
  "2026-05-24 10:01:23 POST /api/form validation-failure from 203.0.113.77 status=400",
  "2026-05-24 10:01:25 DENIED request from 203.0.113.77 to /admin reason=ip_blocked",
  "2026-05-24 10:01:27 DENIED request from 203.0.113.77 to /login reason=ip_blocked",
] as const;

export const STAGES = [
  "Idle",
  "Attacker Session Started",
  "Reconnaissance Activity",
  "Sensitive Endpoint Probing",
  "Authentication Abuse",
  "Suspicious Web Pattern",
  "LogShield Detection Triggered",
  "AI Classification Complete",
  "MITRE Mapping Complete",
  "IOC Extracted",
  "Threat Intelligence Checked",
  "Critical Alert Created",
  "Asset Risk Escalated",
  "Defense Recommendation Generated",
  "Source IP Blocked",
  "Post-Block Requests Denied",
  "Incident Opened",
  "Playbook Executed",
  "AI Summary Generated",
  "Investigation Report Generated",
  "Threat Contained",
] as const;

export type FocusMode = "split" | "soc";

export function getRiskScoreForStage(stage: number): number {
  if (stage <= 2) return 0;
  if (stage === 3) return 15;
  if (stage === 4) return 28;
  if (stage === 5) return 45;
  if (stage === 6) return 62;
  if (stage === 7) return 78;
  return 94;
}

type ModuleConfig = {
  name: string;
  start: number;
  end: number;
};

export const MODULES: ModuleConfig[] = [
  { name: "Attacker Activity", start: 1, end: 15 },
  { name: "Log Viewer", start: 1, end: 20 },
  { name: "AI Analysis", start: 7, end: 8 },
  { name: "MITRE Mapper", start: 8, end: 9 },
  { name: "IOC Extraction", start: 9, end: 10 },
  { name: "Threat Intelligence", start: 10, end: 11 },
  { name: "Alerts", start: 11, end: 12 },
  { name: "Asset Risk", start: 12, end: 13 },
  { name: "IP Blocking", start: 13, end: 15 },
  { name: "Incidents", start: 16, end: 17 },
  { name: "Playbook", start: 17, end: 19 },
  { name: "Reports", start: 19, end: 20 },
];

export const MITRE_CARDS = [
  {
    technique_id: "T1595",
    technique_name: "Active Scanning",
    tactic: "Reconnaissance",
    reason: "Multiple sensitive endpoints were probed",
  },
  {
    technique_id: "T1110",
    technique_name: "Brute Force",
    tactic: "Credential Access",
    reason: "Multiple failed login attempts against admin",
  },
  {
    technique_id: "T1190",
    technique_name: "Exploit Public-Facing Application",
    tactic: "Initial Access",
    reason: "Suspicious requests targeted public web endpoints",
  },
  {
    technique_id: "T1078",
    technique_name: "Valid Accounts",
    tactic: "Defense Evasion",
    reason: "Authentication abuse may indicate misuse of valid accounts",
  },
] as const;

export const PLAYBOOK_STEPS = [
  "Review suspicious web logs",
  "Confirm repeated source IP",
  "Extract IOC",
  "Check threat intelligence",
  "Create critical alert",
  "Block source IP",
  "Open incident",
  "Generate investigation report",
] as const;

export const INCIDENT_SUMMARY =
  "LogShield detected a simulated attack against the public web application. The activity began with reconnaissance against sensitive endpoints, followed by repeated authentication failures and suspicious web request patterns. The source IP 203.0.113.77 was extracted as an IOC and linked to a critical alert. LogShield mapped the behavior to MITRE ATT&CK techniques, recommended blocking the source IP, simulated the defensive block, opened an incident, executed a response playbook, and generated an investigation report. The threat is currently contained.";
