import { Link } from "react-router-dom";
import { Globe, Link2, PlugZap } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";

const sections = [
  {
    title: "Website Security Analyzer",
    status: "Available now",
    description: "Scan your website manually with safe, non-invasive checks and generate readable reports.",
  },
  {
    title: "API Connector",
    status: "Coming soon",
    description: "Send website security events from your backend to LogShield for continuous visibility.",
  },
  {
    title: "Tracking Script",
    status: "Coming soon",
    description: "Add a lightweight script for selected frontend security telemetry.",
  },
  {
    title: "WordPress Plugin",
    status: "Future integration",
    description: "A guided plugin flow for WordPress websites is planned.",
  },
  {
    title: "Client SIEM Workspace",
    status: "Future development",
    description: "Dedicated client workspaces with advanced integration options are planned.",
  },
];

export function ConnectWebsitePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="User Security Portal"
        title="Connect Website"
        description="Start with manual scanning today and follow the future integration roadmap."
      />

      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((item) => (
          <div key={item.title} className="soc-panel p-5">
            <div className="flex items-center gap-2">
              <PlugZap className="h-4 w-4 text-[var(--brand)]" />
              <h3 className="text-base font-bold text-[var(--text-primary)]">{item.title}</h3>
            </div>
            <p className="mt-2 text-xs uppercase text-[var(--status-warning)]">{item.status}</p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">{item.description}</p>
          </div>
        ))}
      </div>

      <div className="soc-panel p-5">
        <h3 className="section-title">Start with Website Security Analyzer</h3>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          No API keys or agent setup required right now. You can start immediately with safe assessment scans.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/tools?tool=website-security-analyzer" className="soc-button-primary inline-flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Start with Website Security Analyzer
          </Link>
          <Link to="/my-security" className="soc-button-ghost inline-flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Open My Security
          </Link>
        </div>
      </div>
    </div>
  );
}
