import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PageHeader } from "../components/ui/PageHeader";
import { ThreatIntelSearchPage } from "./ThreatIntelSearchPage";

export function ThreatIntelligencePage() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (
      location.pathname === "/threat-intelligence" ||
      location.pathname === "/threat-intel" ||
      location.pathname === "/threats"
    ) {
      navigate("/research-hub?tab=cve", { replace: true });
    }
  }, [location.pathname, navigate]);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="RESEARCH HUB"
        title="Research Hub"
        description="Search indicators, CVEs, MITRE techniques, and external intelligence context."
      />

      <ThreatIntelSearchPage embedded />
    </div>
  );
}
