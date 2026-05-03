import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { RoleBasedRoute } from "./auth/RoleBasedRoute";
import { MainLayout } from "./layout/MainLayout";

const AlertDetailsPage = lazy(() => import("./pages/AlertDetailsPage").then(m => ({ default: m.AlertDetailsPage })));
const AlertsPage = lazy(() => import("./pages/AlertsPage").then(m => ({ default: m.AlertsPage })));
const AssetInventoryPage = lazy(() => import("./pages/AssetInventoryPage").then(m => ({ default: m.AssetInventoryPage })));
const AuditLogsPage = lazy(() => import("./pages/AuditLogsPage").then(m => ({ default: m.AuditLogsPage })));
const AwarenessPage = lazy(() => import("./pages/AwarenessPage").then(m => ({ default: m.AwarenessPage })));
const BlocksPage = lazy(() => import("./pages/BlocksPage").then(m => ({ default: m.BlocksPage })));
const DashboardPage = lazy(() => import("./pages/DashboardPage").then(m => ({ default: m.DashboardPage })));
const LeaderboardPage = lazy(() => import("./pages/LeaderboardPage").then(m => ({ default: m.LeaderboardPage })));
const HomePage = lazy(() => import("./pages/HomePage").then(m => ({ default: m.HomePage })));
const IOCManagementPage = lazy(() => import("./pages/IOCManagementPage").then(m => ({ default: m.IOCManagementPage })));
const IncidentDetailsPage = lazy(() => import("./pages/IncidentDetailsPage").then(m => ({ default: m.IncidentDetailsPage })));
const IncidentsPage = lazy(() => import("./pages/IncidentsPage").then(m => ({ default: m.IncidentsPage })));
const LoginPage = lazy(() => import("./pages/LoginPage").then(m => ({ default: m.LoginPage })));
const MyScoresPage = lazy(() => import("./pages/MyScoresPage").then(m => ({ default: m.MyScoresPage })));
const QuizManagementPage = lazy(() => import("./pages/QuizManagementPage").then(m => ({ default: m.QuizManagementPage })));
const QuizPage = lazy(() => import("./pages/QuizPage").then(m => ({ default: m.QuizPage })));
const QuizScoresPage = lazy(() => import("./pages/QuizScoresPage").then(m => ({ default: m.QuizScoresPage })));
const RegisterPage = lazy(() => import("./pages/RegisterPage").then(m => ({ default: m.RegisterPage })));
const LogsPage = lazy(() => import("./pages/LogsPage").then(m => ({ default: m.LogsPage })));
const ResponsePlaybooksPage = lazy(() => import("./pages/ResponsePlaybooksPage").then(m => ({ default: m.ResponsePlaybooksPage })));
const ReportsPage = lazy(() => import("./pages/ReportsPage").then(m => ({ default: m.ReportsPage })));
const RulesPage = lazy(() => import("./pages/RulesPage").then(m => ({ default: m.RulesPage })));
const SecurityCenterPage = lazy(() => import("./pages/SecurityCenterPage").then(m => ({ default: m.SecurityCenterPage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then(m => ({ default: m.SettingsPage })));
const ThreatHuntingPage = lazy(() => import("./pages/ThreatHuntingPage").then(m => ({ default: m.ThreatHuntingPage })));
const ThreatDetailsPage = lazy(() => import("./pages/ThreatDetailsPage").then(m => ({ default: m.ThreatDetailsPage })));
const ThreatIntelligencePage = lazy(() => import("./pages/ThreatIntelligencePage").then(m => ({ default: m.ThreatIntelligencePage })));
const URLScannerPage = lazy(() => import("./pages/URLScannerPage").then(m => ({ default: m.URLScannerPage })));
const URLScanDetailsPage = lazy(() => import("./pages/URLScanDetailsPage").then(m => ({ default: m.URLScanDetailsPage })));
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
          <Route path="awareness" element={<AwarenessPage />} />
          <Route path="awareness/my-scores" element={<MyScoresPage />} />
          <Route path="awareness/quiz/:slug" element={<QuizPage />} />
          <Route path="awareness/manage" element={<RoleBasedRoute allowedRoles={["admin", "analyst"]}><QuizManagementPage /></RoleBasedRoute>} />
          <Route path="awareness/scores" element={<RoleBasedRoute allowedRoles={["admin"]}><QuizScoresPage /></RoleBasedRoute>} />
          <Route path="awareness/leaderboard" element={<RoleBasedRoute allowedRoles={["admin"]}><LeaderboardPage /></RoleBasedRoute>} />
          <Route path="logs" element={<LogsPage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="alerts/:id" element={<AlertDetailsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="url-scanner" element={<URLScannerPage />} />
          <Route path="url-scanner/:id" element={<URLScanDetailsPage />} />
          <Route path="security-center" element={<RoleBasedRoute allowedRoles={["admin"]}><SecurityCenterPage /></RoleBasedRoute>} />
          <Route path="users" element={<RoleBasedRoute allowedRoles={["admin"]}><UsersPage /></RoleBasedRoute>} />
          <Route path="audit" element={<RoleBasedRoute allowedRoles={["admin"]}><AuditLogsPage /></RoleBasedRoute>} />
          <Route path="blocks" element={<RoleBasedRoute allowedRoles={["admin"]}><BlocksPage /></RoleBasedRoute>} />
          <Route path="settings" element={<RoleBasedRoute allowedRoles={["admin"]}><SettingsPage /></RoleBasedRoute>} />
          <Route path="threat-intelligence" element={<ThreatIntelligencePage />} />
          <Route path="threats" element={<ThreatIntelligencePage />} />
          <Route path="threats/:id" element={<ThreatDetailsPage />} />
          <Route path="threat-intel" element={<ThreatIntelligencePage />} />
          <Route path="assets" element={<AssetInventoryPage />} />
          <Route path="vulnerabilities" element={<Navigate to="/threat-intelligence?tab=cve" replace />} />
          <Route path="incidents" element={<IncidentsPage />} />
          <Route path="incidents/:id" element={<IncidentDetailsPage />} />
          <Route path="hunting" element={<ThreatHuntingPage />} />
          <Route path="iocs" element={<IOCManagementPage />} />
          <Route path="playbooks" element={<ResponsePlaybooksPage />} />
          <Route path="rules" element={<RulesPage />} />
          <Route path="tools" element={<SocToolsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </Suspense>
  );
}
export default App;
