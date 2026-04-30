import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { RoleBasedRoute } from "./auth/RoleBasedRoute";
import { MainLayout } from "./layout/MainLayout";
import { AlertDetailsPage } from "./pages/AlertDetailsPage";
import { AlertsPage } from "./pages/AlertsPage";
import { AuditLogsPage } from "./pages/AuditLogsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { LogsPage } from "./pages/LogsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { RulesPage } from "./pages/RulesPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ThreatDetailsPage } from "./pages/ThreatDetailsPage";
import { ThreatIntelSearchPage } from "./pages/ThreatIntelSearchPage";
import { ThreatsPage } from "./pages/ThreatsPage";
import { UsersPage } from "./pages/UsersPage";

function App() {
  return (
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
  );
}
export default App;
