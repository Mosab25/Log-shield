import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { RoleBasedRoute } from "./auth/RoleBasedRoute";
import { MainLayout } from "./layout/MainLayout";

const AlertDetailsPage = lazy(() => import("./pages/AlertDetailsPage").then(m => ({ default: m.AlertDetailsPage })));
const AlertsPage = lazy(() => import("./pages/AlertsPage").then(m => ({ default: m.AlertsPage })));
const AuditLogsPage = lazy(() => import("./pages/AuditLogsPage").then(m => ({ default: m.AuditLogsPage })));
const BlocksPage = lazy(() => import("./pages/BlocksPage").then(m => ({ default: m.BlocksPage })));
const DashboardPage = lazy(() => import("./pages/DashboardPage").then(m => ({ default: m.DashboardPage })));
const HomePage = lazy(() => import("./pages/HomePage").then(m => ({ default: m.HomePage })));
const IncidentDetailsPage = lazy(() => import("./pages/IncidentDetailsPage").then(m => ({ default: m.IncidentDetailsPage })));
const IncidentsPage = lazy(() => import("./pages/IncidentsPage").then(m => ({ default: m.IncidentsPage })));
const LoginPage = lazy(() => import("./pages/LoginPage").then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import("./pages/RegisterPage").then(m => ({ default: m.RegisterPage })));
const LogsPage = lazy(() => import("./pages/LogsPage").then(m => ({ default: m.LogsPage })));
const ReportsPage = lazy(() => import("./pages/ReportsPage").then(m => ({ default: m.ReportsPage })));
const RulesPage = lazy(() => import("./pages/RulesPage").then(m => ({ default: m.RulesPage })));
const SecurityCenterPage = lazy(() => import("./pages/SecurityCenterPage").then(m => ({ default: m.SecurityCenterPage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then(m => ({ default: m.SettingsPage })));
const ThreatDetailsPage = lazy(() => import("./pages/ThreatDetailsPage").then(m => ({ default: m.ThreatDetailsPage })));
const ThreatIntelSearchPage = lazy(() => import("./pages/ThreatIntelSearchPage").then(m => ({ default: m.ThreatIntelSearchPage })));
const ThreatsPage = lazy(() => import("./pages/ThreatsPage").then(m => ({ default: m.ThreatsPage })));
const URLScannerPage = lazy(() => import("./pages/URLScannerPage").then(m => ({ default: m.URLScannerPage })));
const UsersPage = lazy(() => import("./pages/UsersPage").then(m => ({ default: m.UsersPage })));
const SocToolsPage = lazy(() => import("./pages/SocToolsPage").then(m => ({ default: m.SocToolsPage })));

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
          <Route index element={<Navigate to="/home" replace />} />
          <Route path="home" element={<HomePage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="logs" element={<LogsPage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="alerts/:id" element={<AlertDetailsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="url-scanner" element={<URLScannerPage />} />
          <Route path="security-center" element={<RoleBasedRoute allowedRoles={["admin"]}><SecurityCenterPage /></RoleBasedRoute>} />
          <Route path="users" element={<RoleBasedRoute allowedRoles={["admin"]}><UsersPage /></RoleBasedRoute>} />
          <Route path="audit" element={<RoleBasedRoute allowedRoles={["admin"]}><AuditLogsPage /></RoleBasedRoute>} />
          <Route path="blocks" element={<RoleBasedRoute allowedRoles={["admin"]}><BlocksPage /></RoleBasedRoute>} />
          <Route path="settings" element={<RoleBasedRoute allowedRoles={["admin"]}><SettingsPage /></RoleBasedRoute>} />
          <Route path="threats" element={<ThreatsPage />} />
          <Route path="threats/:id" element={<ThreatDetailsPage />} />
          <Route path="threat-intel" element={<ThreatIntelSearchPage />} />
          <Route path="incidents" element={<IncidentsPage />} />
          <Route path="incidents/:id" element={<IncidentDetailsPage />} />
          <Route path="rules" element={<RulesPage />} />
          <Route path="tools" element={<SocToolsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
export default App;
