import { useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Database, Globe } from "lucide-react";

import { Chip } from "../components/ui/Chip";
import { InfoHint } from "../components/Guidance";
import { TabTransition } from "../components/PageTransition";
import { PageHeader } from "../components/ui/PageHeader";
import { ThreatIntelSearchPage } from "./ThreatIntelSearchPage";
import { ThreatsPage } from "./ThreatsPage";

type ThreatIntelTab = "knowledge" | "cve";

function normalizeTab(value: string | null, pathname: string): ThreatIntelTab {
  if (pathname === "/threat-intel") return "cve";
  if (pathname === "/threats") return "knowledge";
  return value === "cve" ? "cve" : "knowledge";
}

export function ThreatIntelligencePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeTab = normalizeTab(searchParams.get("tab"), location.pathname);

  useEffect(() => {
    if (location.pathname === "/threats") {
      navigate("/threat-intelligence?tab=knowledge", { replace: true });
    }
    if (location.pathname === "/threat-intel") {
      navigate("/threat-intelligence?tab=cve", { replace: true });
    }
  }, [location.pathname, navigate]);

  function switchTab(tab: ThreatIntelTab) {
    navigate(`/threat-intelligence?tab=${tab}`);
  }

  const tabs = [
    {
      id: "knowledge" as const,
      label: "Knowledge Base",
      description: "Curated indicators, MITRE mapping, vulnerabilities, and approved references.",
      icon: Database,
    },
    {
      id: "cve" as const,
      label: "CVE Search",
      description: "Search local CVE entries and external NVD intelligence.",
      icon: Globe,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="THREAT INTELLIGENCE"
        title="Threat Intelligence"
        description="Search indicators, CVEs, MITRE techniques, and external intelligence context."
      />

      <InfoHint title="How to use this workspace">
        Use Knowledge Base for curated threat entries and analyst-approved references. Use CVE Search for external NVD and local vulnerability lookup without changing the authenticated API flow.
      </InfoHint>

      <section className="grid gap-3 lg:grid-cols-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => switchTab(tab.id)}
              className={`soc-panel p-4 text-left transition ${
                active ? "border-cyber-cyan/50 bg-gradient-to-br from-cyber-cyan/15 to-cyber-cyan/5 shadow-lg shadow-cyber-950/30" : "hover:border-cyber-cyan/30 hover:bg-cyber-elevated/50"
              }`}
              aria-pressed={active}
            >
              <span className="flex items-start gap-3">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${
                  active ? "border-cyber-cyan/50 bg-gradient-to-br from-cyber-cyan/20 to-cyber-cyan/5 text-cyber-cyan" : "border-cyber-border-cyan bg-cyber-surface/70 text-cyber-muted"
                }`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block font-black text-cyber-text">
                    {tab.label}
                    <span className="ml-2 inline-block align-middle"><Chip tone="violet">Research</Chip></span>
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-cyber-muted">{tab.description}</span>
                </span>
              </span>
            </button>
          );
        })}
      </section>

      <TabTransition activeKey={activeTab}>
        {activeTab === "knowledge" ? <ThreatsPage embedded /> : <ThreatIntelSearchPage embedded />}
      </TabTransition>
    </div>
  );
}
