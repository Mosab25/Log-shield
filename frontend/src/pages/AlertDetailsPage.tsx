import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Briefcase, Link2, Plus } from "lucide-react";
import { apiClient } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { AlertDetailsPanel } from "../components/AlertDetailsPanel";
import { EvidenceExplanation, InvestigationChecklist, RecommendedActions, RiskExplanation } from "../components/Guidance";
import { NotesPanel } from "../components/NotesPanel";
import { EmptyState, ErrorState, SectionHeader, SkeletonBlock } from "../components/UI";

interface IncidentListItem {
  id: number;
  title: string;
  severity: string;
  status: string;
  owner: { full_name: string; email: string } | null;
  linked_alerts_count: number;
  updated_at: string;
}

interface IncidentListResponse {
  total: number;
  items: IncidentListItem[];
}

export function AlertDetailsPage() {
  const { id } = useParams();
  const { role } = useAuth();
  const canManageIncidents = role === "admin" || role === "analyst";
  const [alert, setAlert] = useState<any | null>(null);
  const [risk, setRisk] = useState<any | null>(null);
  const [linkedIncidents, setLinkedIncidents] = useState<IncidentListItem[]>([]);
  const [incidentId, setIncidentId] = useState("");
  const [incidentMessage, setIncidentMessage] = useState<string | null>(null);
  const [incidentError, setIncidentError] = useState<string | null>(null);
  const [incidentSaving, setIncidentSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadLinkedIncidents(alertId: string) {
    const response = await apiClient.get<IncidentListResponse>(`/incidents?alert_id=${alertId}&limit=20`);
    setLinkedIncidents(Array.isArray(response.items) ? response.items : []);
  }

  async function load() {
    if (!id) return;
    setError(null);
    try {
      const a = await apiClient.get<any>(`/alerts/${id}`);
      setAlert(a);
      try { await loadLinkedIncidents(id); } catch { setLinkedIncidents([]); }
      try { setRisk(await apiClient.get<any>(`/risk/alert/${id}`)); } catch { setRisk(null); }
    } catch (err: any) {
      setAlert(null);
      setError(err?.message || "Failed to load alert details.");
    }
  }
  useEffect(() => { void load(); }, [id]);

  async function addNote(note: string) {
    await apiClient.post(`/alerts/${id}/notes`, { note });
    await load();
  }

  async function createIncidentFromAlert() {
    if (!id || !alert || incidentSaving) return;
    setIncidentSaving(true);
    setIncidentMessage(null);
    setIncidentError(null);
    try {
      const created = await apiClient.post<any>("/incidents", {
        title: `Incident: ${alert.title}`,
        description: `Created from alert #${id}. ${alert.description ?? ""}`.trim(),
        severity: alert.severity || "medium",
        status: "open",
        owner_user_id: null,
      });
      await apiClient.post(`/incidents/${created.id}/alerts`, { alert_id: Number(id) });
      setIncidentMessage("Incident created and alert linked.");
      await loadLinkedIncidents(id);
    } catch (err: any) {
      setIncidentError(err?.message || "Failed to create incident from alert.");
    } finally {
      setIncidentSaving(false);
    }
  }

  async function addToIncident(event: FormEvent) {
    event.preventDefault();
    if (!id || !incidentId.trim() || incidentSaving) return;
    setIncidentSaving(true);
    setIncidentMessage(null);
    setIncidentError(null);
    try {
      await apiClient.post(`/incidents/${incidentId.trim()}/alerts`, { alert_id: Number(id) });
      setIncidentId("");
      setIncidentMessage("Alert linked to incident.");
      await loadLinkedIncidents(id);
    } catch (err: any) {
      setIncidentError(err?.message || "Failed to link alert to incident.");
    } finally {
      setIncidentSaving(false);
    }
  }

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!alert) return <div className="space-y-4"><SkeletonBlock className="h-52" /><SkeletonBlock className="h-72" /></div>;
  return (
    <div className="space-y-6">
      <AlertDetailsPanel alert={alert} risk={risk} />

      <section className="grid gap-4 xl:grid-cols-3">
        <InvestigationChecklist
          title="How to triage this alert"
          steps={[
            "Review severity and risk score.",
            "Check source IP and affected user.",
            "Review related evidence logs.",
            "Search related CVE or IOC if present.",
            "Create or link to an incident.",
            "Add analyst notes and update status.",
          ]}
        />
        <EvidenceExplanation
          title="Why this alert was generated"
          points={[
            alert.description || "The detection rule matched suspicious event evidence.",
            alert.mitre_technique ? `MITRE technique mapping: ${alert.mitre_technique}.` : "No MITRE mapping is attached yet.",
            alert.attack_type ? `Attack family: ${String(alert.attack_type).replace(/_/g, " ")}.` : "Review related logs to confirm the activity pattern.",
          ]}
        />
        <RiskExplanation
          score={alert.risk_score}
          reasons={[
            `Severity is ${alert.severity || "not set"}.`,
            alert.source_ip ? `Source IP observed: ${alert.source_ip}.` : "No source IP is attached.",
            alert.username ? `Affected user: ${alert.username}.` : "No affected user is attached.",
          ]}
        />
      </section>

      <RecommendedActions
        title="Continue the investigation"
        actions={[
          "Open related logs and verify evidence.",
          "Search IOCs in Threat Intel or URL Scanner.",
          "Link this alert to an incident case.",
          "Document conclusions in analyst notes.",
        ]}
      />

      <section className="soc-panel p-5">
        <SectionHeader title="Incident Case Linkage" icon={Briefcase} />
        {incidentMessage ? <div className="mb-4 rounded-2xl border border-emerald-300/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{incidentMessage}</div> : null}
        {incidentError ? <div className="mb-4"><ErrorState message={incidentError} /></div> : null}

        {canManageIncidents ? (
          <div className="mb-4 grid gap-3 xl:grid-cols-[auto_1fr_auto]">
            <button type="button" onClick={() => void createIncidentFromAlert()} disabled={incidentSaving} className="soc-button-primary">
              <Plus className="h-4 w-4" />
              {incidentSaving ? "Working..." : "Create Incident"}
            </button>
            <form onSubmit={addToIncident} className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <input value={incidentId} onChange={event => setIncidentId(event.target.value)} placeholder="Existing incident ID" className="soc-input" />
              <button type="submit" disabled={incidentSaving} className="soc-button-ghost">
                <Link2 className="h-4 w-4" />
                Add to Incident
              </button>
            </form>
          </div>
        ) : null}

        {linkedIncidents.length === 0 ? (
          <EmptyState title="No linked incidents" description="This alert is not part of an incident case yet." icon={Briefcase} />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {linkedIncidents.map(incident => (
              <Link key={incident.id} to={`/incidents/${incident.id}`} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 transition hover:border-cyan-300/35 hover:bg-cyan-300/10">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-2 py-0.5 text-xs font-bold text-cyan-200">INC-{incident.id}</span>
                  <span className="rounded-full border border-slate-600 bg-slate-800/60 px-2 py-0.5 text-xs font-bold uppercase text-slate-200">{incident.status.replace("_", " ")}</span>
                  <span className="rounded-full border border-amber-300/25 bg-amber-400/10 px-2 py-0.5 text-xs font-bold uppercase text-amber-100">{incident.severity}</span>
                </div>
                <p className="mt-3 font-semibold text-white">{incident.title}</p>
                <p className="mt-1 text-xs text-slate-500">Owner: {incident.owner?.full_name ?? "Unassigned"} | Linked alerts: {incident.linked_alerts_count}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <NotesPanel notes={alert.analyst_notes} onAddNote={addNote} />
    </div>
  );
}
