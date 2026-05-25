import { Copy, Download, Eye } from "lucide-react";
import { useMemo, useState } from "react";
import { AppModal } from "../ui/AppModal";

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

export function DemoReportPanel() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const reportText = useMemo(
    () => `Website Attack Investigation Report

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

Final Status: THREAT CONTAINED`,
    [],
  );

  const reportJson = useMemo(
    () =>
      JSON.stringify(
        {
          title: "Website Attack Investigation Report",
          final_status: "THREAT CONTAINED",
          risk_score: 94,
          asset: "Public Web Application",
          attack_type: "web_attack",
          iocs: ["203.0.113.77"],
          mitre: ["T1595", "T1110", "T1190", "T1078"],
          alert_id: "ALT-DEMO-001",
          incident_id: "INC-DEMO-001",
        },
        null,
        2,
      ),
    [],
  );

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="soc-panel p-4">
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">Investigation Report Panel</h3>
      <p className="mt-1 text-[11px] text-[var(--text-faint)]">Simulated Demo Data</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="row-action primary" onClick={() => setOpen(true)}>
          <Eye className="h-3.5 w-3.5" />
          View Report
        </button>
        <button type="button" className="row-action" onClick={() => void copyReport()}>
          <Copy className="h-3.5 w-3.5" />
          {copied ? "Copied" : "Copy Report"}
        </button>
        <button type="button" className="row-action" onClick={() => downloadFile(reportText, "logshield-demo-report.txt", "text/plain;charset=utf-8")}>
          <Download className="h-3.5 w-3.5" />
          Export as .txt
        </button>
        <button type="button" className="row-action" onClick={() => downloadFile(reportJson, "logshield-demo-report.json", "application/json;charset=utf-8")}>
          <Download className="h-3.5 w-3.5" />
          Export as .json
        </button>
      </div>
      <AppModal isOpen={open} onClose={() => setOpen(false)} size="lg" panelClassName="soc-panel p-5">
        <h4 className="text-lg font-bold text-[var(--text-primary)]">Website Attack Investigation Report</h4>
        <pre className="mt-3 whitespace-pre-wrap text-xs text-[var(--text-muted)]">{reportText}</pre>
      </AppModal>
    </section>
  );
}

