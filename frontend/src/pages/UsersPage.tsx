import { useEffect, useState } from "react";
import { apiClient } from "../api/client";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Pagination } from "../components/Pagination";
import { StatusBadge } from "../components/StatusBadge";
import { UserFormModal } from "../components/UserFormModal";

export function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<any | null>(null);
  const [confirm, setConfirm] = useState<any | null>(null);
  const pageSize = 10;
  async function load() { const res = await apiClient.get<any>(`/users?skip=${(page-1)*pageSize}&limit=${pageSize}`); setUsers(res.items); setTotal(res.total); }
  useEffect(() => { void load(); }, [page]);
  async function save(values: any) {
    if (form) {
      const body: any = { full_name: values.full_name, email: values.email, is_active: values.is_active };
      if (values.password) body.password = values.password;
      await apiClient.patch(`/users/${form.id}`, body);
      if (values.role_name !== form.role.name) await apiClient.patch(`/users/${form.id}/role`, { role_name: values.role_name });
    } else {
      await apiClient.post("/users", values);
    }
    setForm(null); await load();
  }
  async function toggle() { if (!confirm) return; await apiClient.patch(`/users/${confirm.id}/${confirm.is_active ? "deactivate" : "activate"}`); setConfirm(null); await load(); }
  return (
    <div className="space-y-6">
      <section className="flex justify-between"><div><p className="text-sm uppercase tracking-[.3em] text-cyan-300">Admin</p><h1 className="mt-3 text-3xl font-bold">Users Management</h1></div><button onClick={()=>setForm(false)} className="h-10 rounded-2xl bg-cyan-400 px-5 font-bold text-slate-950">Create User</button></section>
      <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70">
        <table className="min-w-full divide-y divide-slate-800"><tbody className="divide-y divide-slate-800">{users.map(u=><tr key={u.id}><td className="px-5 py-4"><p className="font-semibold">{u.full_name}</p><p className="text-xs text-slate-500">{u.email}</p></td><td>{u.role.name}</td><td><StatusBadge status={u.is_active ? "normalized" : "failed"} /></td><td className="text-right px-5"><button onClick={()=>setForm(u)} className="mr-2 rounded-xl border border-slate-700 px-3 py-1">Edit</button><button onClick={()=>setConfirm(u)} className="rounded-xl border border-slate-700 px-3 py-1">{u.is_active ? "Deactivate" : "Activate"}</button></td></tr>)}</tbody></table>
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
      </div>
      <UserFormModal open={form !== null} initial={form || undefined} onClose={()=>setForm(null)} onSubmit={save} />
      <ConfirmDialog open={Boolean(confirm)} title="Confirm user change" description="This will activate/deactivate the selected user." onCancel={()=>setConfirm(null)} onConfirm={()=>void toggle()} />
    </div>
  );
}
