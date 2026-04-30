import { FormEvent, useState } from "react";

export function NotesPanel({ notes, onAddNote }: { notes: any[]; onAddNote: (note: string) => Promise<void> }) {
  const [note, setNote] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    await onAddNote(note.trim());
    setNote("");
  }
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
      <h2 className="text-lg font-semibold">Analyst Notes</h2>
      <div className="mt-4 space-y-3">{notes.map(n => <div key={n.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-4"><p className="text-sm text-slate-400">{n.analyst?.full_name ?? "Unknown"} · {new Date(n.created_at).toLocaleString()}</p><p className="mt-2">{n.note}</p></div>)}</div>
      <form onSubmit={submit} className="mt-4 flex gap-3"><input value={note} onChange={e=>setNote(e.target.value)} className="flex-1 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2" placeholder="Add note..." /><button className="rounded-2xl bg-cyan-400 px-4 py-2 font-bold text-slate-950">Add</button></form>
    </section>
  );
}
