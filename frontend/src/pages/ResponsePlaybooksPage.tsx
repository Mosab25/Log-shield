import { useMemo, useState } from "react";
import { Copy, FileText, Search, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

import { InfoHint, InvestigationChecklist, RecommendedActions } from "../components/Guidance";
import { EmptyState, PageHeader } from "../components/UI";
import { SeverityBadge } from "../components/SeverityBadge";

type PlaybookSeverity = "low" | "medium" | "high" | "critical";

interface Playbook {
  id: string;
  title: string;
  category: string;
  severity: PlaybookSeverity;
  estimatedTime: string;
  mitre: string[];
  overview: string;
  whenToUse: string[];
  investigationSteps: string[];
  evidenceToCollect: string[];
  containmentActions: string[];
  remediationActions: string[];
  recoveryMonitoring: string[];
  reportNotes: string[];
}

const PLAYBOOKS: Playbook[] = [
  {
    id: "brute-force-attack",
    title: "Brute Force Attack",
    category: "Authentication Abuse",
    severity: "high",
    estimatedTime: "25-45 min",
    mitre: ["T1110 - Brute Force"],
    overview: "Investigate repeated authentication failures and determine whether the activity is malicious, automated, or a user issue.",
    whenToUse: [
      "Multiple failed login attempts from one source IP.",
      "Rapid credential attempts across many user accounts.",
      "Alert signals mention lockout or password spraying behavior.",
    ],
    investigationSteps: [
      "Identify affected accounts and login endpoints.",
      "Review source IP history across logs, alerts, and incidents.",
      "Check whether attempts resulted in any successful authentication.",
      "Correlate with user-agent anomalies and geolocation changes.",
      "Determine if credentials may already be compromised.",
    ],
    evidenceToCollect: [
      "Authentication logs with timestamps and source IPs.",
      "Affected usernames and lockout events.",
      "User-agent strings and endpoint paths.",
      "Related alerts and incident references.",
    ],
    containmentActions: [
      "Temporarily block abusive source IPs.",
      "Force password reset for high-risk accounts.",
      "Enable or enforce MFA for exposed accounts.",
    ],
    remediationActions: [
      "Tune detection rules for repeated login failures.",
      "Review rate limits and lockout policy thresholds.",
      "Educate users about credential hygiene and phishing.",
    ],
    recoveryMonitoring: [
      "Track new failed logins from previously blocked sources.",
      "Watch for post-reset suspicious sign-ins.",
    ],
    reportNotes: [
      "Summarize attack scope by user count and source count.",
      "Document blocked IPs and account actions taken.",
    ],
  },
  {
    id: "sql-injection-attempt",
    title: "SQL Injection Attempt",
    category: "Web Attack",
    severity: "critical",
    estimatedTime: "30-60 min",
    mitre: ["T1190 - Exploit Public-Facing Application"],
    overview: "Validate whether suspicious query payloads indicate exploitable SQL injection attempts against web applications.",
    whenToUse: [
      "Logs contain SQL keywords in request parameters.",
      "Detection identifies union select, OR 1=1, or information_schema patterns.",
      "Spike in 4xx/5xx requests against API or login endpoints.",
    ],
    investigationSteps: [
      "Locate affected URL paths, HTTP methods, and source IPs.",
      "Review payload fragments and repetition patterns.",
      "Check backend errors and database exception traces.",
      "Identify whether any request reached sensitive tables or endpoints.",
      "Correlate with threat intel for attacking source infrastructure.",
    ],
    evidenceToCollect: [
      "Raw/normalized HTTP logs with payload fields.",
      "Application error logs and status code spikes.",
      "WAF or reverse proxy events if available.",
      "Associated alerts and linked incidents.",
    ],
    containmentActions: [
      "Block confirmed attacking source IPs.",
      "Enable stricter input validation and WAF signatures.",
      "Temporarily restrict exposed endpoints if needed.",
    ],
    remediationActions: [
      "Fix insecure query handling and use parameterized queries.",
      "Add tests for SQL injection patterns in affected routes.",
      "Update detection signatures for missed payload variants.",
    ],
    recoveryMonitoring: [
      "Track continued probes against same endpoints.",
      "Watch for authentication anomalies after web attack activity.",
    ],
    reportNotes: [
      "Document vulnerable endpoint scope and payload families.",
      "Record containment timing and verification evidence.",
    ],
  },
  {
    id: "xss-script-payload",
    title: "XSS / Script Payload Detected",
    category: "Web Attack",
    severity: "high",
    estimatedTime: "20-40 min",
    mitre: ["T1059.007 - JavaScript"],
    overview: "Assess whether script payloads were reflected/stored and if end users were exposed to browser-side compromise.",
    whenToUse: [
      "Payloads contain script tags, javascript:, or event handlers.",
      "Logs show suspicious query/body values targeting UI pages.",
      "Multiple endpoints receive encoded script probes.",
    ],
    investigationSteps: [
      "Identify which endpoints accepted the payload.",
      "Check whether payload was rendered back to clients.",
      "Review user sessions around affected routes.",
      "Correlate with suspicious redirects or credential theft indicators.",
    ],
    evidenceToCollect: [
      "Request payload samples and encoded variants.",
      "Frontend rendering traces and response samples.",
      "Affected user session IDs (if available).",
    ],
    containmentActions: [
      "Block active attacking IPs and malformed payload patterns.",
      "Disable vulnerable UI paths temporarily if exploitation is confirmed.",
    ],
    remediationActions: [
      "Apply strict output encoding and CSP where applicable.",
      "Sanitize untrusted input on both client and server.",
    ],
    recoveryMonitoring: [
      "Watch repeated payload patterns and bypass attempts.",
      "Track impacted user accounts for suspicious login behavior.",
    ],
    reportNotes: [
      "List affected pages and payload classes.",
      "Document remediation owner and validation checks.",
    ],
  },
  {
    id: "suspicious-user-agent",
    title: "Suspicious User-Agent",
    category: "Reconnaissance",
    severity: "medium",
    estimatedTime: "15-30 min",
    mitre: ["T1595 - Active Scanning"],
    overview: "Investigate user-agent strings that indicate automated scanners, scripts, or known offensive tooling.",
    whenToUse: [
      "User-agent contains sqlmap, nmap, masscan, python-requests, curl.",
      "Requests span many paths in short intervals.",
      "Source is unknown and not part of allowed integrations.",
    ],
    investigationSteps: [
      "Review path distribution and request frequency.",
      "Identify recurring IP ranges and user-agent fingerprints.",
      "Correlate with alert timeline and response codes.",
    ],
    evidenceToCollect: [
      "User-agent strings and associated source IPs.",
      "Endpoint access timeline and method distribution.",
      "Related authentication or web attack alerts.",
    ],
    containmentActions: [
      "Block abusive IPs and rate-limit repeated requests.",
      "Add detection rules for recurring malicious fingerprints.",
    ],
    remediationActions: [
      "Harden exposed routes and reduce unnecessary endpoint leakage.",
      "Tune IDS/WAF logic for high-confidence scanner patterns.",
    ],
    recoveryMonitoring: [
      "Monitor scanner return attempts and rotated user-agents.",
      "Watch for privilege escalation attempts after recon.",
    ],
    reportNotes: [
      "Capture scanner indicators and confidence level.",
      "Track impact on availability and app performance.",
    ],
  },
  {
    id: "admin-login-unknown-ip",
    title: "Admin Login From Unknown IP",
    category: "Identity Compromise",
    severity: "critical",
    estimatedTime: "20-35 min",
    mitre: ["T1078 - Valid Accounts"],
    overview: "Validate whether privileged access from unusual locations is expected administrative activity or account compromise.",
    whenToUse: [
      "Alerts show admin authentication from unfamiliar source IPs.",
      "Login occurs outside expected admin working windows.",
      "Concurrent suspicious activity appears in alerts/logs.",
    ],
    investigationSteps: [
      "Confirm legitimate admin activity directly with account owner.",
      "Review source IP history and recent geo/network context.",
      "Inspect admin actions performed after login.",
      "Check related failed logins preceding successful access.",
    ],
    evidenceToCollect: [
      "Admin login records and source IP timeline.",
      "Post-login activity/audit logs for privileged actions.",
      "MFA events and token/session metadata.",
    ],
    containmentActions: [
      "Terminate suspicious sessions and rotate credentials.",
      "Force 2FA re-verification and block suspicious source IPs.",
    ],
    remediationActions: [
      "Review privileged access policy and break-glass controls.",
      "Strengthen admin monitoring and anomaly detection thresholds.",
    ],
    recoveryMonitoring: [
      "Track admin login anomalies over next 24-72h.",
      "Watch for repeated IPs and failed login bursts.",
    ],
    reportNotes: [
      "Document validation outcome with account owner.",
      "Record all privileged actions taken during suspicious session.",
    ],
  },
  {
    id: "privilege-escalation",
    title: "Privilege Escalation",
    category: "Post-Exploitation",
    severity: "critical",
    estimatedTime: "30-60 min",
    mitre: ["TA0004 - Privilege Escalation"],
    overview: "Investigate suspicious elevation of permissions or role changes that may indicate account or host compromise.",
    whenToUse: [
      "Role change events appear without change request context.",
      "System logs indicate sudo/admin privilege abuse.",
      "Critical resources accessed immediately after privilege gain.",
    ],
    investigationSteps: [
      "Identify actor, target account, and permission delta.",
      "Correlate with login source, device, and session chain.",
      "Review impacted systems and sensitive object access.",
      "Validate whether change was authorized by policy.",
    ],
    evidenceToCollect: [
      "Audit events for role/permission changes.",
      "System command logs around escalation timeframe.",
      "Incident timeline links and analyst notes.",
    ],
    containmentActions: [
      "Revoke unauthorized privileges immediately.",
      "Lock suspected compromised accounts/sessions.",
      "Isolate affected hosts if host compromise is suspected.",
    ],
    remediationActions: [
      "Apply least-privilege review and admin approval controls.",
      "Improve alerting on privilege-related event chains.",
    ],
    recoveryMonitoring: [
      "Watch for repeated privilege-change attempts.",
      "Monitor sensitive resource access by impacted accounts.",
    ],
    reportNotes: [
      "Detail privilege changes and authorization validation.",
      "Document rollback actions and prevention improvements.",
    ],
  },
  {
    id: "malicious-url",
    title: "Malicious URL",
    category: "Threat Intelligence",
    severity: "high",
    estimatedTime: "20-40 min",
    mitre: ["T1566 - Phishing"],
    overview: "Triage suspicious URLs using reputation context, internal telemetry, and investigation links.",
    whenToUse: [
      "URL scanner verdict is suspicious or malicious.",
      "Alerts reference suspicious outbound URLs.",
      "User reports phishing or suspicious links.",
    ],
    investigationSteps: [
      "Review URL verdict, detection ratio, and provider details.",
      "Defang URL and extract related domain/IP IOCs.",
      "Search logs for URL/domain/IP reuse across users.",
      "Link evidence to active incident if campaign-like behavior exists.",
    ],
    evidenceToCollect: [
      "URL scan result and provider reference.",
      "Related logs/alerts with source user and host context.",
      "IOC extraction output and timeline mapping.",
    ],
    containmentActions: [
      "Block related domain/IP in approved controls.",
      "Warn impacted users and quarantine malicious messages.",
    ],
    remediationActions: [
      "Update awareness content for phishing patterns.",
      "Tune URL scanning and IOC detection coverage.",
    ],
    recoveryMonitoring: [
      "Monitor for related domains, redirects, and hashes.",
      "Watch for credential abuse linked to affected users.",
    ],
    reportNotes: [
      "Include verdict reason and detection ratio context.",
      "Record blocked indicators and awareness follow-up.",
    ],
  },
  {
    id: "malware-alert",
    title: "Malware Alert",
    category: "Endpoint Security",
    severity: "critical",
    estimatedTime: "30-70 min",
    mitre: ["TA0002 - Execution", "TA0005 - Defense Evasion"],
    overview: "Investigate malware-related detections and determine spread, impact, and containment priority.",
    whenToUse: [
      "Endpoint/event alerts mention malware signatures or suspicious binaries.",
      "Multiple hosts trigger similar indicators.",
      "Threat intel links observed hashes to known malware families.",
    ],
    investigationSteps: [
      "Identify patient-zero host and propagation scope.",
      "Collect related hashes, domains, and command paths.",
      "Review persistence and lateral-movement indicators.",
      "Correlate endpoint and network events with timeline.",
    ],
    evidenceToCollect: [
      "File hashes and execution traces.",
      "Host/user context and suspicious process lineage.",
      "Network connections from affected hosts.",
    ],
    containmentActions: [
      "Isolate affected hosts from network segments.",
      "Block known malicious hashes/domains/IPs.",
      "Disable compromised credentials involved in execution.",
    ],
    remediationActions: [
      "Remove malware artifacts and patch exploited vectors.",
      "Harden detection rules around initial access indicators.",
    ],
    recoveryMonitoring: [
      "Track re-infection attempts and residual indicators.",
      "Monitor high-value assets for similar behavior.",
    ],
    reportNotes: [
      "Document infection timeline and affected scope.",
      "Track eradication evidence and validation criteria.",
    ],
  },
  {
    id: "data-exfiltration-indicator",
    title: "Data Exfiltration Indicator",
    category: "Data Protection",
    severity: "critical",
    estimatedTime: "40-90 min",
    mitre: ["TA0010 - Exfiltration"],
    overview: "Assess whether outbound traffic patterns indicate unauthorized transfer of sensitive data.",
    whenToUse: [
      "Unusual outbound volume or destination behavior appears in logs.",
      "High-risk alerts mention bulk transfer or archive creation events.",
      "Incident context includes credential compromise plus data access.",
    ],
    investigationSteps: [
      "Identify source asset/user and destination endpoints.",
      "Correlate timing with suspicious authentication or privilege events.",
      "Assess data sensitivity and potential impact scope.",
      "Validate if traffic pattern is business-approved.",
    ],
    evidenceToCollect: [
      "Outbound connection logs and transfer metadata.",
      "User/account activities around transfer windows.",
      "Relevant alerts, incidents, and DLP-like indicators.",
    ],
    containmentActions: [
      "Block suspicious destination channels immediately.",
      "Suspend compromised sessions and credentials.",
      "Engage incident response escalation if high impact suspected.",
    ],
    remediationActions: [
      "Close exposure paths and adjust egress controls.",
      "Improve detection for unusual data-transfer behavior.",
    ],
    recoveryMonitoring: [
      "Watch for repeated destination reuse or fallback channels.",
      "Track sensitive data access anomalies post-containment.",
    ],
    reportNotes: [
      "Document potential data classes and estimated exposure.",
      "Record legal/compliance notifications if required.",
    ],
  },
  {
    id: "account-lockout",
    title: "Account Lockout",
    category: "Identity Protection",
    severity: "medium",
    estimatedTime: "15-25 min",
    mitre: ["T1110 - Brute Force"],
    overview: "Determine whether lockouts are due to benign user behavior, automation errors, or targeted credential attacks.",
    whenToUse: [
      "Users report repeated lockout events.",
      "Logs show lockouts following failed login bursts.",
      "Service accounts unexpectedly lock after deployment changes.",
    ],
    investigationSteps: [
      "Identify lockout source and affected account set.",
      "Check whether lockouts align with known application retries.",
      "Correlate lockouts with suspicious login sources.",
      "Verify if account recovered and returned to normal behavior.",
    ],
    evidenceToCollect: [
      "Lockout and authentication failure logs.",
      "Source IPs and user-agent context.",
      "Related support tickets or change events.",
    ],
    containmentActions: [
      "Block abusive sources if attack-like behavior is confirmed.",
      "Force password reset for high-risk accounts.",
    ],
    remediationActions: [
      "Fix misconfigured authentication retries in apps/services.",
      "Tune lockout policy for balance between UX and security.",
    ],
    recoveryMonitoring: [
      "Monitor repeat lockouts by account and source.",
      "Track failed logins after credential reset.",
    ],
    reportNotes: [
      "Record whether event was malicious or operational misconfiguration.",
      "Document user impact and corrective changes.",
    ],
  },
];

function filterPlaybooks(playbooks: Playbook[], query: string, severity: string): Playbook[] {
  const q = query.trim().toLowerCase();
  return playbooks.filter(playbook => {
    if (severity && playbook.severity !== severity) return false;
    if (!q) return true;
    const haystack = [
      playbook.title,
      playbook.category,
      playbook.overview,
      ...playbook.whenToUse,
      ...playbook.mitre,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function ResponsePlaybooksPage() {
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState("");
  const [selectedId, setSelectedId] = useState<string>(PLAYBOOKS[0].id);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const filtered = useMemo(() => filterPlaybooks(PLAYBOOKS, query, severity), [query, severity]);
  const selected = filtered.find(playbook => playbook.id === selectedId) ?? filtered[0] ?? null;

  function copyChecklist(playbook: Playbook) {
    const content = [
      `LogShield Response Playbook: ${playbook.title}`,
      `Category: ${playbook.category}`,
      `Severity: ${playbook.severity}`,
      `Estimated Time: ${playbook.estimatedTime}`,
      "",
      "Investigation Steps:",
      ...playbook.investigationSteps.map((step, index) => `${index + 1}. ${step}`),
      "",
      "Evidence To Collect:",
      ...playbook.evidenceToCollect.map((item, index) => `${index + 1}. ${item}`),
      "",
      "Containment Actions:",
      ...playbook.containmentActions.map((item, index) => `${index + 1}. ${item}`),
      "",
      "Remediation Actions:",
      ...playbook.remediationActions.map((item, index) => `${index + 1}. ${item}`),
      "",
      "Recovery Monitoring:",
      ...playbook.recoveryMonitoring.map((item, index) => `${index + 1}. ${item}`),
      "",
      "Recommended Report Notes:",
      ...playbook.reportNotes.map((item, index) => `${index + 1}. ${item}`),
    ].join("\n");
    void navigator.clipboard.writeText(content).then(() => {
      setCopyMessage("Checklist copied.");
      window.setTimeout(() => setCopyMessage(null), 2200);
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Investigation"
        title="Response Playbooks"
        description="Use structured investigation and response checklists for common security scenarios."
        icon={ShieldCheck}
      />

      <InfoHint title="What is this page?">
        Playbooks guide analysts through repeatable, defensible incident response. Use them to standardize evidence collection, containment, remediation, and reporting.
      </InfoHint>

      <RecommendedActions
        title="Recommended next steps"
        actions={[
          "Choose a playbook that matches the alert or incident pattern.",
          "Follow investigation steps before changing incident status.",
          "Collect evidence early so decisions remain auditable.",
          "Copy checklist into your incident notes/report summary.",
        ]}
      />

      <section className="soc-panel p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_12rem]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search playbook title, category, or MITRE..."
              className="soc-input w-full pl-10"
            />
          </div>
          <select value={severity} onChange={event => setSeverity(event.target.value)} className="soc-input">
            <option value="">All severities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </section>

      {filtered.length === 0 ? (
        <div className="soc-panel p-5">
          <EmptyState title="No playbooks match the current filters" description="Try a different keyword or severity filter." icon={FileText} />
        </div>
      ) : (
        <section className="grid gap-6 xl:grid-cols-[minmax(0,23rem)_1fr]">
          <div className="soc-panel p-4">
            <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-400">Playbook Library</h2>
            <div className="space-y-2">
              {filtered.map(playbook => (
                <button
                  key={playbook.id}
                  type="button"
                  onClick={() => setSelectedId(playbook.id)}
                  className={`w-full rounded-2xl border p-3 text-left transition ${
                    selected?.id === playbook.id
                      ? "border-cyan-200/35 bg-cyan-300/10"
                      : "border-slate-800 bg-slate-950/60 hover:border-cyan-200/20 hover:bg-slate-900/80"
                  }`}
                >
                  <p className="text-sm font-bold text-white">{playbook.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{playbook.category} • {playbook.estimatedTime}</p>
                </button>
              ))}
            </div>
          </div>

          {selected ? (
            <div className="soc-panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black text-white">{selected.title}</h2>
                  <p className="mt-2 text-sm text-slate-400">{selected.overview}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={selected.severity} />
                    <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-bold text-slate-300">{selected.category}</span>
                    <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-bold text-cyan-200">{selected.estimatedTime}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => copyChecklist(selected)} className="soc-button-ghost">
                    <Copy className="h-4 w-4" />
                    Copy Checklist
                  </button>
                  <Link to="/incidents" className="soc-button-primary">
                    Create Incident
                  </Link>
                </div>
              </div>

              {copyMessage ? (
                <div className="mt-4 rounded-xl border border-emerald-300/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                  {copyMessage}
                </div>
              ) : null}

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <InvestigationChecklist title="When To Use" steps={selected.whenToUse} />
                <div className="rounded-[1.1rem] border border-slate-700/70 bg-slate-950/45 p-4">
                  <h3 className="text-sm font-bold text-white">MITRE Mapping</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selected.mitre.map(item => (
                      <span key={item} className="rounded-full border border-fuchsia-300/25 bg-fuchsia-400/10 px-3 py-1 text-xs font-bold text-fuchsia-200">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <InvestigationChecklist title="Investigation Steps" steps={selected.investigationSteps} />
                <InvestigationChecklist title="Evidence To Collect" steps={selected.evidenceToCollect} />
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <InvestigationChecklist title="Containment Actions" steps={selected.containmentActions} />
                <InvestigationChecklist title="Remediation Actions" steps={selected.remediationActions} />
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <InvestigationChecklist title="Recovery Monitoring" steps={selected.recoveryMonitoring} />
                <InvestigationChecklist title="Recommended Report Notes" steps={selected.reportNotes} />
              </div>
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}

