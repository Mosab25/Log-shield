import { FormEvent, useState } from "react";

export function NotesPanel({ notes, onAddNote }: { notes: any[]; onAddNote: (note: string) => Promise<void> }) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!note.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onAddNote(note.trim());
      setNote("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="soc-panel p-5">
      <h2 className="text-lg font-bold text-cyber-text">Analyst Notes</h2>
      <div className="mt-4 space-y-3">
        {notes.length === 0 ? <p className="text-sm text-cyber-muted">No analyst notes have been added yet.</p> : null}
        {notes.map(n => (
          <div key={n.id} className="rounded-2xl border border-cyan-400/10 bg-cyber-elevated/60 p-4">
            <p className="text-sm text-cyber-muted">{n.analyst?.full_name ?? "Unknown"} - {new Date(n.created_at).toLocaleString()}</p>
            <p className="mt-2 text-cyber-text">{n.note}</p>
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input value={note} onChange={e => setNote(e.target.value)} className="soc-input flex-1" placeholder="Add note..." />
        <button disabled={submitting} className="soc-button-primary">{submitting ? "Adding..." : "Add Note"}</button>
      </form>
    </section>
  );
}
