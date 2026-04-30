import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiClient } from "../api/client";
import { AlertDetailsPanel } from "../components/AlertDetailsPanel";
import { NotesPanel } from "../components/NotesPanel";

export function AlertDetailsPage() {
  const { id } = useParams();
  const [alert, setAlert] = useState<any | null>(null);
  const [risk, setRisk] = useState<any | null>(null);

  async function load() {
    if (!id) return;
    const a = await apiClient.get<any>(`/alerts/${id}`);
    setAlert(a);
    try { setRisk(await apiClient.get<any>(`/risk/alert/${id}`)); } catch { setRisk(null); }
  }
  useEffect(() => { void load(); }, [id]);

  async function addNote(note: string) {
    await apiClient.post(`/alerts/${id}/notes`, { note });
    await load();
  }

  if (!alert) return <div className="rounded-3xl bg-slate-900 p-8">Loading...</div>;
  return <div className="space-y-6"><AlertDetailsPanel alert={alert} risk={risk} /><NotesPanel notes={alert.analyst_notes} onAddNote={addNote} /></div>;
}
