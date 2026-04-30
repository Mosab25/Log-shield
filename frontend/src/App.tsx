import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { RoleBasedRoute } from "./auth/RoleBasedRoute";
import { MainLayout } from "./layout/MainLayout";

const AlertDetailsPage = lazy(() => import("./pages/AlertDetailsPage").then(m => ({ default: m.AlertDetailsPage })));
const AlertsPage = lazy(() => import("./pages/AlertsPage").then(m => ({ default: m.AlertsPage })));
const AuditLogsPage = lazy(() => import("./pages/AuditLogsPage").then(m => ({ default: m.AuditLogsPage })));
const DashboardPage = lazy(() => import("./pages/DashboardPage").then(m => ({ default: m.DashboardPage })));
const LoginPage = lazy(() => import("./pages/LoginPage").then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import("./pages/RegisterPage").then(m => ({ default: m.RegisterPage })));
const LogsPage = lazy(() => import("./pages/LogsPage").then(m => ({ default: m.LogsPage })));
const ReportsPage = lazy(() => import("./pages/ReportsPage").then(m => ({ default: m.ReportsPage })));
const RulesPage = lazy(() => import("./pages/RulesPage").then(m => ({ default: m.RulesPage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then(m => ({ default: m.SettingsPage })));
const ThreatDetailsPage = lazy(() => import("./pages/ThreatDetailsPage").then(m => ({ default: m.ThreatDetailsPage })));
const ThreatIntelSearchPage = lazy(() => import("./pages/ThreatIntelSearchPage").then(m => ({ default: m.ThreatIntelSearchPage })));
const ThreatsPage = lazy(() => import("./pages/ThreatsPage").then(m => ({ default: m.ThreatsPage })));
const UsersPage = lazy(() => import("./pages/UsersPage").then(m => ({ default: m.UsersPage })));

function RouteFallback() {
  return (
    <div className="flex min-h-[20rem] items-center justify-center">
      <div className="soc-panel px-6 py-5 text-sm font-semibold text-slate-300">Loading LogShield workspace...</div>
    </div>
  );
}

function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="logs" element={<LogsPage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="alerts/:id" element={<AlertDetailsPage />} />
          <Route path="threats" element={<ThreatsPage />} />
          <Route path="threats/:id" element={<ThreatDetailsPage />} />
          <Route path="threat-intel" element={<ThreatIntelSearchPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="rules" element={<RulesPage />} />
          <Route path="users" element={<RoleBasedRoute allowedRoles={["admin"]}><UsersPage /></RoleBasedRoute>} />
          <Route path="audit" element={<RoleBasedRoute allowedRoles={["admin"]}><AuditLogsPage /></RoleBasedRoute>} />
          <Route path="settings" element={<RoleBasedRoute allowedRoles={["admin"]}><SettingsPage /></RoleBasedRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
export default App;
