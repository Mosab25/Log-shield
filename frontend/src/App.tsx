import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { RoleBasedRoute } from "./auth/RoleBasedRoute";
import { PublicRoute } from "./components/auth/PublicRoute";
import { AdaptiveLayout } from "./layout/AdaptiveLayout";
import { MainLayout } from "./layout/MainLayout";
import { RouteTransition } from "./components/PageTransition";

const AlertDetailsPage = lazy(() => import("./pages/AlertDetailsPage").then(m => ({ default: m.AlertDetailsPage })));
const AlertsPage = lazy(() => import("./pages/AlertsPage").then(m => ({ default: m.AlertsPage })));
const AssetInventoryPage = lazy(() => import("./pages/AssetInventoryPage").then(m => ({ default: m.AssetInventoryPage })));
const AuditLogsPage = lazy(() => import("./pages/AuditLogsPage").then(m => ({ default: m.AuditLogsPage })));
const AwarenessPage = lazy(() => import("./pages/AwarenessPage").then(m => ({ default: m.AwarenessPage })));
const BlocksPage = lazy(() => import("./pages/BlocksPage").then(m => ({ default: m.BlocksPage })));
const DashboardPage = lazy(() => import("./pages/DashboardPage").then(m => ({ default: m.DashboardPage })));
const DemoModePage = lazy(() => import("./pages/DemoModePage").then(m => ({ default: m.DemoModePage })));
const LeaderboardPage = lazy(() => import("./pages/LeaderboardPage").then(m => ({ default: m.LeaderboardPage })));
const LogShieldIntroPage = lazy(() => import("./pages/LogShieldIntroPage").then(m => ({ default: m.LogShieldIntroPage })));
const HomePage = lazy(() => import("./pages/HomePage").then(m => ({ default: m.HomePage })));
const MySecurityPage = lazy(() => import("./pages/MySecurityPage").then(m => ({ default: m.MySecurityPage })));
const ScanHistoryPage = lazy(() => import("./pages/ScanHistoryPage").then(m => ({ default: m.ScanHistoryPage })));
const RecommendationsPage = lazy(() => import("./pages/RecommendationsPage").then(m => ({ default: m.RecommendationsPage })));
const MyReportsPage = lazy(() => import("./pages/MyReportsPage").then(m => ({ default: m.MyReportsPage })));
const ConnectWebsitePage = lazy(() => import("./pages/ConnectWebsitePage").then(m => ({ default: m.ConnectWebsitePage })));
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
  return <div style={{ background: "#05070D", minHeight: "100vh" }} />;
}

function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Navigate to="/intro" replace />} />
        <Route path="/intro" element={<RouteTransition><LogShieldIntroPage /></RouteTransition>} />
        <Route path="/login" element={<PublicRoute><RouteTransition><LoginPage /></RouteTransition></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RouteTransition><RegisterPage /></RouteTransition></PublicRoute>} />
        <Route element={<AdaptiveLayout />}>
          <Route path="home" element={<HomePage />} />
          <Route path="awareness" element={<AwarenessPage />} />
          <Route path="url-scanner" element={<URLScannerPage />} />
          <Route path="research-hub" element={<ThreatIntelligencePage />} />
          <Route path="threat-intelligence" element={<ThreatIntelligencePage />} />
          <Route path="threats" element={<ThreatIntelligencePage />} />
          <Route path="threat-intel" element={<ThreatIntelligencePage />} />
          <Route path="cve-search" element={<Navigate to="/research-hub?tab=cve" replace />} />
          <Route path="playbooks" element={<ResponsePlaybooksPage />} />
          <Route path="tools" element={<SocToolsPage />} />
        </Route>
        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route path="dashboard" element={<RoleBasedRoute allowedRoles={["admin", "analyst"]}><DashboardPage /></RoleBasedRoute>} />
          <Route path="demo" element={<RoleBasedRoute allowedRoles={["admin", "analyst"]}><DemoModePage /></RoleBasedRoute>} />
          <Route path="awareness/my-scores" element={<MyScoresPage />} />
          <Route path="awareness/quiz/:slug" element={<QuizPage />} />
          <Route path="awareness/manage" element={<RoleBasedRoute allowedRoles={["admin", "analyst"]}><QuizManagementPage /></RoleBasedRoute>} />
          <Route path="awareness/scores" element={<RoleBasedRoute allowedRoles={["admin"]}><QuizScoresPage /></RoleBasedRoute>} />
          <Route path="awareness/leaderboard" element={<RoleBasedRoute allowedRoles={["admin"]}><LeaderboardPage /></RoleBasedRoute>} />
          <Route path="my-security" element={<MySecurityPage />} />
          <Route path="scan-history" element={<ScanHistoryPage />} />
          <Route path="recommendations" element={<RecommendationsPage />} />
          <Route path="my-reports" element={<MyReportsPage />} />
          <Route path="connect-website" element={<ConnectWebsitePage />} />
          <Route path="logs" element={<RoleBasedRoute allowedRoles={["admin", "analyst"]}><LogsPage /></RoleBasedRoute>} />
          <Route path="alerts" element={<RoleBasedRoute allowedRoles={["admin", "analyst"]}><AlertsPage /></RoleBasedRoute>} />
          <Route path="alerts/:id" element={<RoleBasedRoute allowedRoles={["admin", "analyst"]}><AlertDetailsPage /></RoleBasedRoute>} />
          <Route path="reports" element={<RoleBasedRoute allowedRoles={["admin", "analyst"]}><ReportsPage /></RoleBasedRoute>} />
          <Route path="url-scanner/:id" element={<URLScanDetailsPage />} />
          <Route path="security-center" element={<RoleBasedRoute allowedRoles={["admin"]}><SecurityCenterPage /></RoleBasedRoute>} />
          <Route path="users" element={<RoleBasedRoute allowedRoles={["admin"]}><UsersPage /></RoleBasedRoute>} />
          <Route path="audit" element={<RoleBasedRoute allowedRoles={["admin"]}><AuditLogsPage /></RoleBasedRoute>} />
          <Route path="blocks" element={<RoleBasedRoute allowedRoles={["admin"]}><BlocksPage /></RoleBasedRoute>} />
          <Route path="settings" element={<RoleBasedRoute allowedRoles={["admin", "analyst", "viewer"]}><SettingsPage /></RoleBasedRoute>} />
          <Route path="threats/:id" element={<ThreatDetailsPage />} />
          <Route path="assets" element={<RoleBasedRoute allowedRoles={["admin", "analyst"]}><AssetInventoryPage /></RoleBasedRoute>} />
          <Route path="vulnerabilities" element={<Navigate to="/research-hub" replace />} />
          <Route path="incidents" element={<RoleBasedRoute allowedRoles={["admin", "analyst"]}><IncidentsPage /></RoleBasedRoute>} />
          <Route path="incidents/:id" element={<RoleBasedRoute allowedRoles={["admin", "analyst"]}><IncidentDetailsPage /></RoleBasedRoute>} />
          <Route path="hunting" element={<RoleBasedRoute allowedRoles={["admin", "analyst"]}><ThreatHuntingPage /></RoleBasedRoute>} />
          <Route path="iocs" element={<RoleBasedRoute allowedRoles={["admin", "analyst"]}><IOCManagementPage /></RoleBasedRoute>} />
          <Route path="rules" element={<RoleBasedRoute allowedRoles={["admin", "analyst"]}><RulesPage /></RoleBasedRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </Suspense>
  );
}
export default App;
