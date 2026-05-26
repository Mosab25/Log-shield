import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Briefcase, Link2, MessageSquare, Paperclip, RefreshCw, ShieldAlert, Timer } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { apiClient, toUserErrorMessage } from "../api/client";
import { generateReportDraft, summarizeIncident, type AiAnalysisResult } from "../api/aiAnalysis";
import { AiInsightCard } from "../components/ai/AiInsightCard";
import { AiReportDraft } from "../components/ai/AiReportDraft";
import { useAuth } from "../auth/AuthContext";
import { EvidenceExplanation, InfoHint, RecommendedActions } from "../components/Guidance";
import { EmptyState, ErrorState, PageHeader, SectionHeader, SkeletonBlock } from "../components/UI";

type IncidentSeverity = "low" | "medium" | "high" | "critical";
type IncidentStatus = "open" | "investigating" | "resolved" | "closed" | "false_positive";
type IncidentEvidenceType = "log" | "alert" | "url" | "text" | "file_reference";

interface UserMini {
  id: number;
  full_name: string;
  email: string;
  role_name: string | null;
}

interface LinkedAlert {
  id: number;
  title: string;
  severity: string;
  status: string;
  risk_score: number;
  source_ip: string | null;
  username: string | null;
  linked_at: string;
  linked_by: UserMini | null;
}

interface TimelineEvent {
  id: number;
  incident_id: number;
  event_type: string;
  message: string;
  actor: UserMini | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

interface EvidenceItem {
  id: number;
  incident_id: number;
  title: string;
  evidence_type: string;
  content: string;
  related_log_id: number | null;
  related_alert_id: number | null;
  added_by: UserMini | null;
  created_at: string;
}

interface IncidentNote {
  id: number;
  incident_id: number;
  author: UserMini | null;
  note: string;
  created_at: string;
  updated_at: string;
}

interface IncidentDetail {
  id: number;
  title: string;
  description: string | null;
  severity: IncidentSeverity;
  status: IncidentStatus;
  owner: UserMini | null;
  created_by: UserMini | null;
  linked_alerts_count: number;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
  linked_alerts: LinkedAlert[];
  timeline: TimelineEvent[];
  evidence: EvidenceItem[];
  notes: IncidentNote[];
}

interface IncidentActionResponse {
  message: string;
  incident: IncidentDetail;
}

interface IncidentEvidenceActionResponse {
  message: string;
  evidence: EvidenceItem;
}

interface IncidentNoteActionResponse {
  message: string;
  note: IncidentNote;
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function severityClass(severity: string): string {
  switch (severity) {
    case "critical":
      return "border-red-400/35 bg-red-500/12 text-red-200";
    case "high":
      return "border-red-400/35 bg-red-500/12 text-red-200";
    case "medium":
      return "border-amber-400/35 bg-amber-500/12 text-amber-200";
    default:
      return "border-cyan-400/35 bg-cyan-500/12 text-cyan-200";
  }
}

function statusClass(status: string): string {
  switch (status) {
    case "investigating":
      return "border-amber-400/35 bg-amber-500/12 text-amber-200";
    case "resolved":
      return "border-emerald-400/35 bg-emerald-500/12 text-emerald-200";
    case "closed":
      return "border-slate-400/35 bg-slate-500/12 text-slate-200";
    case "false_positive":
      return "border-slate-400/35 bg-slate-500/12 text-slate-200";
    default:
      return "border-cyan-400/35 bg-cyan-500/12 text-cyan-200";
  }
}

export function IncidentDetailsPage() {
  const { id } = useParams();
  const { role } = useAuth();
  const canManage = role === "admin" || role === "analyst";

  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [ownerInput, setOwnerInput] = useState("");
  const [linkAlertId, setLinkAlertId] = useState("");
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [evidenceType, setEvidenceType] = useState<IncidentEvidenceType>("text");
  const [evidenceContent, setEvidenceContent] = useState("");
  const [relatedAlertId, setRelatedAlertId] = useState("");
  const [relatedLogId, setRelatedLogId] = useState("");
  const [noteText, setNoteText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [aiSummaryBusy, setAiSummaryBusy] = useState(false);
  const [aiReportBusy, setAiReportBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AiAnalysisResult | null>(null);

  const incidentId = useMemo(() => Number(id), [id]);

  async function load() {
    if (!id || Number.isNaN(incidentId)) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<IncidentDetail>(`/incidents/${incidentId}`);
      setIncident(response);
      setOwnerInput(response.owner?.id ? String(response.owner.id) : "");
    } catch (err: any) {
      setIncident(null);
      setError(toUserErrorMessage(err, "Failed to load incident details."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function updateStatus(nextStatus: IncidentStatus) {
    if (!canManage || !incident || saving) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await apiClient.patch<IncidentActionResponse>(`/incidents/${incident.id}`, { status: nextStatus });
      setIncident(response.incident);
      setOwnerInput(response.incident.owner?.id ? String(response.incident.owner.id) : "");
      setMessage(response.message);
    } catch (err: any) {
      setError(toUserErrorMessage(err, "Failed to update incident status."));
    } finally {
      setSaving(false);
    }
  }

  async function updateSeverity(nextSeverity: IncidentSeverity) {
    if (!canManage || !incident || saving) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await apiClient.patch<IncidentActionResponse>(`/incidents/${incident.id}`, { severity: nextSeverity });
      setIncident(response.incident);
      setOwnerInput(response.incident.owner?.id ? String(response.incident.owner.id) : "");
      setMessage(response.message);
    } catch (err: any) {
      setError(toUserErrorMessage(err, "Failed to update incident severity."));
    } finally {
      setSaving(false);
    }
  }

  async function updateOwner(event: FormEvent) {
    event.preventDefault();
    if (!canManage || !incident || saving) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload = {
        owner_user_id: ownerInput.trim() ? Number(ownerInput.trim()) : null,
      };
      const response = await apiClient.patch<IncidentActionResponse>(`/incidents/${incident.id}`, payload);
      setIncident(response.incident);
      setOwnerInput(response.incident.owner?.id ? String(response.incident.owner.id) : "");
      setMessage(response.message);
    } catch (err: any) {
      setError(toUserErrorMessage(err, "Failed to update owner."));
    } finally {
      setSaving(false);
    }
  }

  async function linkAlert(event: FormEvent) {
    event.preventDefault();
    if (!canManage || !incident || saving || !linkAlertId.trim()) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await apiClient.post<IncidentActionResponse>(`/incidents/${incident.id}/alerts`, { alert_id: Number(linkAlertId.trim()) });
      setIncident(response.incident);
      setLinkAlertId("");
      setMessage(response.message);
    } catch (err: any) {
      setError(toUserErrorMessage(err, "Failed to link alert."));
    } finally {
      setSaving(false);
    }
  }

  async function unlinkAlert(alertId: number) {
    if (!canManage || !incident || saving) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await apiClient.delete<IncidentActionResponse>(`/incidents/${incident.id}/alerts/${alertId}`);
      setIncident(response.incident);
      setMessage(response.message);
    } catch (err: any) {
      setError(toUserErrorMessage(err, "Failed to unlink alert."));
    } finally {
      setSaving(false);
    }
  }

  async function addEvidence(event: FormEvent) {
    event.preventDefault();
    if (!canManage || !incident || saving) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await apiClient.post<IncidentEvidenceActionResponse>(`/incidents/${incident.id}/evidence`, {
        title: evidenceTitle,
        evidence_type: evidenceType,
        content: evidenceContent,
        related_alert_id: relatedAlertId.trim() ? Number(relatedAlertId.trim()) : null,
        related_log_id: relatedLogId.trim() ? Number(relatedLogId.trim()) : null,
      });
      setEvidenceTitle("");
      setEvidenceType("text");
      setEvidenceContent("");
      setRelatedAlertId("");
      setRelatedLogId("");
      setMessage(response.message);
      await load();
    } catch (err: any) {
      setError(toUserErrorMessage(err, "Failed to add evidence."));
    } finally {
      setSaving(false);
    }
  }

  async function addNote(event: FormEvent) {
    event.preventDefault();
    if (!canManage || !incident || saving || !noteText.trim()) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await apiClient.post<IncidentNoteActionResponse>(`/incidents/${incident.id}/notes`, { note: noteText.trim() });
      setNoteText("");
      setMessage(response.message);
      await load();
    } catch (err: any) {
      setError(toUserErrorMessage(err, "Failed to add incident note."));
    } finally {
      setSaving(false);
    }
  }

  async function generateAiSummary() {
    if (!incident || aiSummaryBusy) return;
    setAiSummaryBusy(true);
    setAiError(null);
    try {
      const incidentText = [
        incident.description || "",
        ...incident.timeline.map((item) => `${item.event_type}: ${item.message}`),
        ...incident.evidence.map((item) => `${item.evidence_type}: ${item.content}`),
      ].join("\n");
      const response = await summarizeIncident({
        incident_id: incident.id,
        incident_title: incident.title,
        incident_text: incidentText,
        incident_severity: incident.severity,
        incident_status: incident.status,
      });
      setAiResult(response);
    } catch (err: any) {
      setAiError(toUserErrorMessage(err, "Failed to generate AI summary."));
    } finally {
      setAiSummaryBusy(false);
    }
  }

  async function generateAiReport() {
    if (!incident || aiReportBusy) return;
    setAiReportBusy(true);
    setAiError(null);
    try {
      const sourceText = [
        incident.title,
        incident.description || "",
        ...incident.linked_alerts.map((a) => `Alert ${a.id}: ${a.title} (${a.severity}/${a.status})`),
        ...incident.evidence.map((item) => `${item.title}: ${item.content}`),
      ].join("\n");
      const response = await generateReportDraft({
        title: `Incident Report - ${incident.title}`,
        source_text: sourceText,
        context: `Incident #${incident.id}`,
      });
      setAiResult(response);
    } catch (err: any) {
      setAiError(toUserErrorMessage(err, "Failed to generate AI report draft."));
    } finally {
      setAiReportBusy(false);
    }
  }

  if (error && !incident) return <ErrorState message={error} onRetry={() => void load()} />;
  if (loading && !incident) return <div className="space-y-4"><SkeletonBlock className="h-48" /><SkeletonBlock className="h-80" /></div>;
  if (!incident) return <ErrorState message="Incident not found." onRetry={() => void load()} />;

  return (
    <div className="space-y-6">
      <Link to="/incidents" className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 hover:text-white">
        <ArrowLeft className="h-4 w-4" />
        Back to Incidents
      </Link>

      <PageHeader
        eyebrow="Incident Case"
        title={incident.title}
        description={incident.description || "No description provided."}
        icon={Briefcase}
        actions={
          <button type="button" onClick={() => void load()} className="soc-button-ghost">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        }
      />

      {message ? (
        <div className="rounded-2xl border border-emerald-300/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {message}
        </div>
      ) : null}
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

      <InfoHint title="Investigation lifecycle">
        The timeline shows what changed and when. Evidence preserves facts, while notes preserve analyst reasoning, handoffs, containment decisions, and final conclusions.
      </InfoHint>

      <section className="soc-panel p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Severity</p>
            <span className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase ${severityClass(incident.severity)}`}>
              {incident.severity}
            </span>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Status</p>
            <span className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase ${statusClass(incident.status)}`}>
              {incident.status.replace("_", " ")}
            </span>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Owner</p>
            <p className="mt-2 text-sm font-semibold text-slate-100">{incident.owner?.full_name ?? "Unassigned"}</p>
            <p className="text-xs text-slate-500">{incident.owner?.email ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Created By</p>
            <p className="mt-2 text-sm font-semibold text-slate-100">{incident.created_by?.full_name ?? "Unknown"}</p>
            <p className="text-xs text-slate-500">{incident.created_by?.email ?? "-"}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 text-xs text-slate-400 md:grid-cols-2 xl:grid-cols-4">
          <p>Created: {formatDate(incident.created_at)}</p>
          <p>Updated: {formatDate(incident.updated_at)}</p>
          <p>Resolved: {formatDate(incident.resolved_at)}</p>
          <p>Closed: {formatDate(incident.closed_at)}</p>
        </div>
      </section>

      <RecommendedActions
        title={`Recommended next step for ${incident.status.replace("_", " ")}`}
        actions={
          incident.status === "open"
            ? ["Assign an owner.", "Link related alerts.", "Add first evidence item.", "Move to investigating when triage starts."]
            : incident.status === "investigating"
              ? ["Review linked alert evidence.", "Add analyst notes.", "Document containment actions.", "Resolve when impact is understood."]
              : incident.status === "resolved"
                ? ["Confirm no active alerts remain.", "Add final evidence.", "Prepare report if needed.", "Close the case."]
                : ["Review the timeline for auditability.", "Confirm evidence is complete.", "Use the case as learning material.", "Reopen only if new evidence appears."]
        }
      />

      <section className="soc-panel p-5 space-y-3">
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => void generateAiSummary()} disabled={aiSummaryBusy} className="soc-button-primary">
            {aiSummaryBusy ? "Generating..." : "Generate AI Summary"}
          </button>
          <button type="button" onClick={() => void generateAiReport()} disabled={aiReportBusy} className="soc-button-ghost">
            {aiReportBusy ? "Generating..." : "Generate AI Report Draft"}
          </button>
        </div>
        {aiError ? <ErrorState message={aiError} /> : null}
      </section>
      {aiResult ? <AiInsightCard result={aiResult} title="AI Incident Insight" /> : null}
      {aiResult ? <AiReportDraft result={aiResult} /> : null}

      {canManage ? (
        <section className="grid gap-4 xl:grid-cols-2">
          <div className="soc-panel p-5">
            <SectionHeader title="Case Controls" icon={ShieldAlert} />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <select
                value={incident.status}
                onChange={event => void updateStatus(event.target.value as IncidentStatus)}
                disabled={saving}
                className="soc-input"
              >
                <option value="open">Open</option>
                <option value="investigating">Investigating</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
                <option value="false_positive">False Positive</option>
              </select>
              <select
                value={incident.severity}
                onChange={event => void updateSeverity(event.target.value as IncidentSeverity)}
                disabled={saving}
                className="soc-input"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs text-slate-400">
                Changes are recorded in timeline and audit logs.
              </div>
            </div>
          </div>

          <div className="soc-panel p-5">
            <SectionHeader title="Owner Assignment" icon={Briefcase} />
            <form onSubmit={updateOwner} className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <input
                value={ownerInput}
                onChange={event => setOwnerInput(event.target.value)}
                placeholder="Owner user ID (blank to unassign)"
                className="soc-input"
              />
              <button type="submit" disabled={saving} className="soc-button-primary">
                {saving ? "Saving..." : "Save"}
              </button>
            </form>
          </div>
        </section>
      ) : null}

      <section className="soc-panel p-5">
        <SectionHeader title={`Linked Alerts (${incident.linked_alerts.length})`} icon={Link2} />
        {canManage ? (
          <form onSubmit={linkAlert} className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              value={linkAlertId}
              onChange={event => setLinkAlertId(event.target.value)}
              placeholder="Alert ID"
              className="soc-input"
              required
            />
            <button type="submit" disabled={saving} className="soc-button-primary">
              Link Alert
            </button>
          </form>
        ) : null}
        {incident.linked_alerts.length === 0 ? (
          <EmptyState title="No linked alerts" description="Link related alerts to track investigation context in one case." icon={Link2} />
        ) : (
          <div className="overflow-x-auto">
            <table className="soc-table">
              <thead>
                <tr>
                  <th>Alert</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Linked At</th>
                  <th>Open</th>
                  {canManage ? <th>Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {incident.linked_alerts.map(alert => (
                  <tr key={alert.id}>
                    <td>
                      <p className="font-semibold text-white">{alert.title}</p>
                      <p className="text-xs text-slate-500">#{alert.id} | {alert.source_ip ?? "No IP"} | {alert.username ?? "unknown user"}</p>
                    </td>
                    <td>
                      <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${severityClass(alert.severity)}`}>
                        {alert.severity}
                      </span>
                    </td>
                    <td>
                      <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${statusClass(alert.status)}`}>
                        {alert.status.replace("_", " ")}
                      </span>
                    </td>
                    <td>{formatDate(alert.linked_at)}</td>
                    <td>
                      <Link to={`/alerts/${alert.id}`} className="font-semibold text-cyan-200 hover:text-white">
                        Alert #{alert.id}
                      </Link>
                    </td>
                    {canManage ? (
                      <td>
                        <button type="button" onClick={() => void unlinkAlert(alert.id)} disabled={saving} className="soc-button-ghost px-3 py-1.5 text-xs">
                          Unlink
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="soc-panel p-5">
        <SectionHeader title={`Timeline (${incident.timeline.length})`} icon={Timer} />
        <EvidenceExplanation
          title="Timeline guidance"
          points={[
            "Timeline events explain the order of investigation actions.",
            "Use it to understand who changed status, linked alerts, or added evidence.",
            "A clean timeline makes handoff and final review easier.",
          ]}
        />
        <div className="mt-4" />
        {incident.timeline.length === 0 ? (
          <EmptyState title="No timeline events yet" description="Events appear as the investigation progresses." icon={Timer} />
        ) : (
          <div className="space-y-3">
            {incident.timeline.map(event => (
              <div key={event.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">{event.event_type.replace(/_/g, " ")}</p>
                  <p className="text-xs text-slate-500">{formatDate(event.created_at)}</p>
                </div>
                <p className="mt-1 text-sm text-slate-300">{event.message}</p>
                <p className="mt-1 text-xs text-slate-500">Actor: {event.actor?.full_name ?? "System"}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="soc-panel p-5">
        <SectionHeader title={`Investigation Notes (${incident.notes.length})`} icon={MessageSquare} />
        <EvidenceExplanation
          title="Notes guidance"
          points={[
            "Use notes for analyst reasoning, hypotheses, decisions, and handoffs.",
            "Do not paste secrets or credentials into notes.",
            "Write enough context that another analyst can continue the case.",
          ]}
        />
        {canManage ? (
          <form onSubmit={addNote} className="mb-4 mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              value={noteText}
              onChange={event => setNoteText(event.target.value)}
              placeholder="Add investigation note..."
              className="soc-input"
              required
            />
            <button type="submit" disabled={saving} className="soc-button-primary">
              Add Note
            </button>
          </form>
        ) : null}
        {incident.notes.length === 0 ? (
          <EmptyState title="No investigation notes" description="Notes preserve analyst thinking, handoffs, and case decisions." icon={MessageSquare} />
        ) : (
          <div className="space-y-3">
            {incident.notes.map(note => (
              <article key={note.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">{note.author?.full_name ?? "Unknown analyst"}</p>
                  <p className="text-xs text-slate-500">{formatDate(note.created_at)}</p>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{note.note}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="soc-panel p-5">
        <SectionHeader title={`Evidence (${incident.evidence.length})`} icon={Paperclip} />
        <EvidenceExplanation
          title="Evidence guidance"
          points={[
            "Evidence should be the facts: logs, alert IDs, URLs, screenshots references, or analyst-observed artifacts.",
            "Good evidence explains why the incident is safe, suspicious, malicious, or false positive.",
            "Link related alert or log IDs when possible.",
          ]}
        />
        {canManage ? (
          <form onSubmit={addEvidence} className="mb-4 mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <input
              value={evidenceTitle}
              onChange={event => setEvidenceTitle(event.target.value)}
              placeholder="Evidence title"
              className="soc-input xl:col-span-2"
              required
            />
            <select value={evidenceType} onChange={event => setEvidenceType(event.target.value as IncidentEvidenceType)} className="soc-input">
              <option value="text">Text</option>
              <option value="url">URL</option>
              <option value="alert">Alert</option>
              <option value="log">Log</option>
              <option value="file_reference">File Reference</option>
            </select>
            <input value={relatedAlertId} onChange={event => setRelatedAlertId(event.target.value)} placeholder="Related alert ID" className="soc-input" />
            <input value={relatedLogId} onChange={event => setRelatedLogId(event.target.value)} placeholder="Related log ID" className="soc-input" />
            <button type="submit" disabled={saving} className="soc-button-primary">
              Add Evidence
            </button>
            <textarea
              value={evidenceContent}
              onChange={event => setEvidenceContent(event.target.value)}
              rows={3}
              placeholder="Evidence content"
              className="soc-input resize-none md:col-span-2 xl:col-span-6"
              required
            />
          </form>
        ) : null}
        {incident.evidence.length === 0 ? (
          <EmptyState title="No evidence added" description="Add links, notes, logs, and references to preserve investigation context." icon={Paperclip} />
        ) : (
          <div className="space-y-3">
            {incident.evidence.map(item => (
              <article key={item.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-white">{item.title}</p>
                  <span className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-2 py-0.5 text-xs font-semibold uppercase text-cyan-200">
                    {item.evidence_type.replace("_", " ")}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{item.content}</p>
                <div className="mt-2 text-xs text-slate-500">
                  Added by {item.added_by?.full_name ?? "Unknown"} on {formatDate(item.created_at)}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Related alert: {item.related_alert_id ?? "-"} | Related log: {item.related_log_id ?? "-"}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
