export function ConfirmDialog({ open, title, description, onConfirm, onCancel }: { open: boolean; title: string; description: string; onConfirm: () => void; onCancel: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-xl font-bold">{title}</h2><p className="mt-3 text-slate-400">{description}</p>
        <div className="mt-6 flex justify-end gap-3"><button onClick={onCancel} className="rounded-2xl border border-slate-700 px-4 py-2">Cancel</button><button onClick={onConfirm} className="rounded-2xl bg-red-400 px-4 py-2 font-bold text-slate-950">Confirm</button></div>
      </div>
    </div>
  );
}
