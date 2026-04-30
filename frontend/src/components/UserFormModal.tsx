import { FormEvent, useEffect, useState } from "react";

export function UserFormModal({ open, initial, onClose, onSubmit }: { open: boolean; initial?: any; onClose: () => void; onSubmit: (values: any) => Promise<void> }) {
  const [values, setValues] = useState<any>({ full_name: "", email: "", password: "", role_name: "viewer", is_active: true });
  useEffect(() => { if (open) setValues({ full_name: initial?.full_name ?? "", email: initial?.email ?? "", password: "", role_name: initial?.role?.name ?? "viewer", is_active: initial?.is_active ?? true }); }, [open, initial]);
  if (!open) return null;
  async function submit(e: FormEvent) { e.preventDefault(); await onSubmit(values); }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
      <form onSubmit={submit} className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-4">
        <h2 className="text-xl font-bold">{initial ? "Edit User" : "Create User"}</h2>
        <input value={values.full_name} onChange={e=>setValues({...values, full_name:e.target.value})} placeholder="Full name" className="w-full rounded-2xl bg-slate-950 px-4 py-2" />
        <input value={values.email} onChange={e=>setValues({...values, email:e.target.value})} placeholder="Email" className="w-full rounded-2xl bg-slate-950 px-4 py-2" />
        <input type="password" value={values.password} onChange={e=>setValues({...values, password:e.target.value})} placeholder="Password" className="w-full rounded-2xl bg-slate-950 px-4 py-2" />
        <select value={values.role_name} onChange={e=>setValues({...values, role_name:e.target.value})} className="w-full rounded-2xl bg-slate-950 px-4 py-2"><option value="admin">Admin</option><option value="analyst">Analyst</option><option value="viewer">Viewer</option></select>
        <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-2xl border border-slate-700 px-4 py-2">Cancel</button><button className="rounded-2xl bg-cyan-400 px-4 py-2 font-bold text-slate-950">Save</button></div>
      </form>
    </div>
  );
}
