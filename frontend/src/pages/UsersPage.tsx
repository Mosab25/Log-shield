import { useEffect, useState } from "react";
import { Plus, Users } from "lucide-react";
import { apiClient } from "../api/client";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Pagination } from "../components/Pagination";
import { StatusBadge } from "../components/StatusBadge";
import { UserFormModal } from "../components/UserFormModal";
import { EmptyState, ErrorState, PageHeader, SkeletonRows } from "../components/UI";

export function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<any | null>(null);
  const [confirm, setConfirm] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageSize = 10;

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<any>(`/users?skip=${(page - 1) * pageSize}&limit=${pageSize}`);
      setUsers(Array.isArray(res.items) ? res.items : []);
      setTotal(Number(res.total ?? 0));
    } catch (err: any) {
      setUsers([]);
      setTotal(0);
      setError(err?.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }

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
    setForm(null);
    await load();
  }

  async function toggle() {
    if (!confirm) return;
    await apiClient.patch(`/users/${confirm.id}/${confirm.is_active ? "deactivate" : "activate"}`);
    setConfirm(null);
    await load();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Users Management"
        description="Manage analysts, administrators, viewers, access status, and profile details."
        icon={Users}
        actions={<button onClick={() => setForm(false)} className="soc-button-primary"><Plus className="h-4 w-4" />Create User</button>}
      />

      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {loading ? <SkeletonRows rows={6} /> : null}

      {!loading ? (
        <div className="soc-panel overflow-hidden">
          {users.length === 0 ? (
            <div className="p-5"><EmptyState title="No users found" description="Create a user to grant access to the SOC workspace." icon={Users} /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="soc-table">
                <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td><p className="font-bold text-white">{u.full_name}</p><p className="text-xs text-slate-500">{u.email}</p></td>
                      <td><span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-bold uppercase text-cyan-200">{u.role.name}</span></td>
                      <td><StatusBadge status={u.is_active ? "normalized" : "failed"} /></td>
                      <td className="text-right">
                        <button onClick={() => setForm(u)} className="soc-button-ghost mr-2 px-3 py-1.5 text-xs">Edit</button>
                        <button onClick={() => setConfirm(u)} className="soc-button-ghost px-3 py-1.5 text-xs">{u.is_active ? "Deactivate" : "Activate"}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
        </div>
      ) : null}

      <UserFormModal open={form !== null} initial={form || undefined} onClose={() => setForm(null)} onSubmit={save} />
      <ConfirmDialog open={Boolean(confirm)} title="Confirm user change" description="This will activate or deactivate the selected user." onCancel={() => setConfirm(null)} onConfirm={() => void toggle()} />
    </div>
  );
}
