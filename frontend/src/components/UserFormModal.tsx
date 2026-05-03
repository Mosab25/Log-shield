import { FormEvent, useEffect, useState } from "react";

export function UserFormModal({ open, initial, onClose, onSubmit }: { open: boolean; initial?: any; onClose: () => void; onSubmit: (values: any) => Promise<void> }) {
  const [values, setValues] = useState<any>({ full_name: "", email: "", password: "", role_name: "viewer", is_active: true });
  useEffect(() => { if (open) setValues({ full_name: initial?.full_name ?? "", email: initial?.email ?? "", password: "", role_name: initial?.role?.name ?? "viewer", is_active: initial?.is_active ?? true }); }, [open, initial]);
  if (!open) return null;
  async function submit(e: FormEvent) { e.preventDefault(); await onSubmit(values); }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-cyber-bg/80 px-4 backdrop-blur-sm">
      <form onSubmit={submit} className="soc-panel-strong w-full max-w-xl space-y-4 p-6">
        <h2 className="text-xl font-black text-cyber-text">{initial ? "Edit User" : "Create User"}</h2>
        <input value={values.full_name} onChange={e=>setValues({...values, full_name:e.target.value})} placeholder="Full name" className="soc-input w-full" />
        <input value={values.email} onChange={e=>setValues({...values, email:e.target.value})} placeholder="Email" className="soc-input w-full" />
        <input type="password" value={values.password} onChange={e=>setValues({...values, password:e.target.value})} placeholder="Password" className="soc-input w-full" />
        <select value={values.role_name} onChange={e=>setValues({...values, role_name:e.target.value})} className="soc-input w-full"><option value="admin">Admin</option><option value="analyst">Analyst</option><option value="viewer">Viewer</option></select>
        <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="soc-button-ghost">Cancel</button><button className="soc-button-primary">Save</button></div>
      </form>
    </div>
  );
}
