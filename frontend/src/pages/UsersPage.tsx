import { useEffect, useState } from "react";
import { Plus, Users } from "lucide-react";
import { apiClient } from "../api/client";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Pagination } from "../components/Pagination";
import { UserFormModal } from "../components/UserFormModal";
import { EmptyState, ErrorState, SkeletonRows } from "../components/UI";
import { BulkBar } from "../components/ui/BulkBar";
import { Chip } from "../components/ui/Chip";
import { FilterRow } from "../components/ui/FilterRow";
import { PageHeader } from "../components/ui/PageHeader";
import { RowActions } from "../components/ui/RowActions";
import { StatCard } from "../components/ui/StatCard";
import { useAuth } from "../auth/AuthContext";

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<any | null>(null);
  const [confirm, setConfirm] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkBusy, setBulkBusy] = useState<"disable" | "delete" | null>(null);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
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

  const visibleUsers = users.filter(u => {
    const matchesQ = !query.trim() || `${u.full_name} ${u.email}`.toLowerCase().includes(query.trim().toLowerCase());
    const matchesRole = !roleFilter || String(u.role?.name ?? "").toLowerCase() === roleFilter.toLowerCase();
    const matchesStatus = !statusFilter || (statusFilter === "active" ? Boolean(u.is_active) : !u.is_active);
    return matchesQ && matchesRole && matchesStatus;
  });

  const roleOptions = Array.from(new Set(users.map(u => String(u.role?.name ?? "unknown"))));
  const activeCount = users.filter(u => u.is_active).length;
  const adminCount = users.filter(u => String(u.role?.name ?? "").toLowerCase() === "admin").length;
  const selectedUsers = users.filter(u => selectedIds.includes(u.id));

  function toggleSelect(id: number, checked: boolean) {
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(x => x !== id));
  }

  function toggleSelectAll(checked: boolean) {
    setSelectedIds(checked ? visibleUsers.map(u => u.id) : []);
  }

  const allSelected = visibleUsers.length > 0 && visibleUsers.every(u => selectedIds.includes(u.id));

  function csvCell(value: unknown) {
    const text = value == null ? "" : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  }

  function exportSelectedUsers() {
    if (selectedUsers.length === 0) return;
    const headers = ["name", "email", "role", "status", "created_at", "last_login"];
    const rows = selectedUsers.map(user => [
      user.full_name,
      user.email,
      user.role?.name ?? "user",
      user.is_active ? "active" : "inactive",
      user.created_at ?? "",
      user.last_login_at ?? "",
    ]);
    const csv = [headers, ...rows].map(row => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `logshield-users-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setBulkMessage(`Exported ${selectedUsers.length} selected user${selectedUsers.length === 1 ? "" : "s"}.`);
  }

  async function disableSelectedUsers() {
    const targets = selectedUsers.filter(user => user.id !== currentUser?.id && user.is_active);
    if (targets.length === 0) {
      setBulkMessage("No active selected users can be disabled.");
      return;
    }
    setBulkBusy("disable");
    setBulkMessage(null);
    setError(null);
    try {
      for (const target of targets) {
        await apiClient.patch(`/users/${target.id}/deactivate`);
      }
      setSelectedIds([]);
      setBulkMessage(`Disabled ${targets.length} selected user${targets.length === 1 ? "" : "s"}.`);
      await load();
    } catch (err: any) {
      setError(err?.message || "Unable to disable selected users. Please try again.");
    } finally {
      setBulkBusy(null);
    }
  }

  async function deleteSelectedUsers() {
    const targets = selectedUsers.filter(user => user.id !== currentUser?.id);
    if (targets.length === 0) {
      setBulkMessage("No selected users can be deleted.");
      return;
    }
    if (!window.confirm(`Deactivate ${targets.length} selected user${targets.length === 1 ? "" : "s"}?`)) return;
    setBulkBusy("delete");
    setBulkMessage(null);
    setError(null);
    try {
      for (const target of targets) {
        await apiClient.delete(`/users/${target.id}`);
      }
      setSelectedIds([]);
      setBulkMessage(`Deleted/deactivated ${targets.length} selected user${targets.length === 1 ? "" : "s"}.`);
      await load();
    } catch (err: any) {
      setError(err?.message || "Unable to delete selected users. Please try again.");
    } finally {
      setBulkBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="ACCESS CONTROL"
        title="User Management"
        description="Manage users, roles, account status, and administrative access."
        actions={<button onClick={() => setForm(false)} className="soc-button-primary"><Plus className="h-4 w-4" />Create User</button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Users" value={users.length} icon={<Users className="h-4 w-4" />} />
        <StatCard label="Active Users" value={activeCount} />
        <StatCard label="Admins" value={adminCount} />
        <StatCard label="Pending/Inactive" value={Math.max(0, users.length - activeCount)} />
      </div>

      <FilterRow
        actions={
          <button type="button" className="soc-button-ghost px-3 py-2 text-xs" onClick={() => { setQuery(""); setRoleFilter(""); setStatusFilter(""); }}>
            Reset
          </button>
        }
      >
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search user or email..." className="soc-input w-full sm:w-64" />
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="soc-input w-full sm:w-48">
          <option value="">All Roles</option>
          {roleOptions.map(role => <option key={role} value={role}>{role}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="soc-input w-full sm:w-48">
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </FilterRow>

      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {loading ? <SkeletonRows rows={6} /> : null}

      {!loading ? (
        <div className="soc-panel overflow-hidden">
          <BulkBar
            active={selectedIds.length > 0}
            selectedCount={selectedIds.length}
            title="Selected users"
            actions={
              <>
                <button type="button" className="row-action" onClick={() => void disableSelectedUsers()} disabled={bulkBusy !== null} title="Deactivate selected active users with the existing user endpoint.">
                  {bulkBusy === "disable" ? "Disabling..." : "Disable Selected"}
                </button>
                <button type="button" className="row-action" onClick={exportSelectedUsers}>Export</button>
                <button type="button" className="row-action danger" onClick={() => void deleteSelectedUsers()} disabled={bulkBusy !== null} title="Backend delete currently deactivates user accounts.">
                  {bulkBusy === "delete" ? "Deleting..." : "Delete Selected"}
                </button>
                <button type="button" className="row-action" onClick={() => setSelectedIds([])}>Clear</button>
              </>
            }
          />
          {bulkMessage ? (
            <div className="border-b border-slate-800 px-4 py-2 text-sm text-emerald-200">
              {bulkMessage}
            </div>
          ) : null}
          {visibleUsers.length === 0 ? (
            <div className="p-5"><EmptyState title="No users found" description="Create a user to grant access to the SOC workspace." icon={Users} /></div>
          ) : (
            <div className="table-wrapper">
              <table className="soc-table tbl">
                <thead><tr><th><input type="checkbox" checked={allSelected} onChange={e => toggleSelectAll(e.target.checked)} /></th><th>User</th><th>Role</th><th>Status</th><th className="col-hide-mobile">2FA</th><th>Actions</th></tr></thead>
                <tbody>
                  {visibleUsers.map(u => (
                    <tr key={u.id} className={!u.is_active ? "bg-[rgba(255,59,59,0.03)]" : ""}>
                      <td><input type="checkbox" checked={selectedIds.includes(u.id)} onChange={e => toggleSelect(u.id, e.target.checked)} /></td>
                      <td><p className="font-bold text-white">{u.full_name}</p><p className="text-xs text-slate-500">{u.email}</p></td>
                      <td>
                        <Chip tone={String(u.role?.name ?? "").toLowerCase() === "admin" ? "violet" : String(u.role?.name ?? "").toLowerCase() === "analyst" ? "violet" : String(u.role?.name ?? "").toLowerCase() === "instructor" ? "info" : "neutral"}>
                          {u.role?.name ?? "User"}
                        </Chip>
                      </td>
                      <td><Chip tone={u.is_active ? "safe" : "critical"}>{u.is_active ? "Active" : "Inactive"}</Chip></td>
                      <td className="col-hide-mobile"><Chip tone="warning">{u.two_factor_enabled ? "Enabled" : "Disabled"}</Chip></td>
                      <td>
                        <RowActions
                          items={[
                            { key: "edit", label: "Edit", variant: "primary", onClick: () => setForm(u) },
                            u.is_active
                              ? { key: "disable", label: "Disable", variant: "danger", onClick: () => setConfirm(u) }
                              : { key: "enable", label: "Enable", variant: "success", onClick: () => setConfirm(u) },
                          ]}
                        />
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
