import type { ReactNode } from "react";
import { useAuth, type UserRole } from "./AuthContext";

export function RoleBasedRoute({ allowedRoles, children }: { allowedRoles: UserRole[]; children: ReactNode }) {
  const { role } = useAuth();

  if (!role || !allowedRoles.includes(role)) {
    return (
      <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-8 text-amber-100">
        <h2 className="text-xl font-semibold">Access denied</h2>
        <p className="mt-3 text-sm text-amber-100/80">Your current role does not have permission to view this page.</p>
      </div>
    );
  }

  return <>{children}</>;
}
