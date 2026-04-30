import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiClient } from "../api/client";
import { AlertDetailsPanel } from "../components/AlertDetailsPanel";
import { NotesPanel } from "../components/NotesPanel";
import { ErrorState, SkeletonBlock } from "../components/UI";

export function AlertDetailsPage() {
  const { id } = useParams();
  const [alert, setAlert] = useState<any | null>(null);
  const [risk, setRisk] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    setError(null);
    try {
      const a = await apiClient.get<any>(`/alerts/${id}`);
      setAlert(a);
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

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!alert) return <div className="space-y-4"><SkeletonBlock className="h-52" /><SkeletonBlock className="h-72" /></div>;
  return <div className="space-y-6"><AlertDetailsPanel alert={alert} risk={risk} /><NotesPanel notes={alert.analyst_notes} onAddNote={addNote} /></div>;
}
