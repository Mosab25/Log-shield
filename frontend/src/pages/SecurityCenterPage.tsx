import { useEffect, useState } from "react";
import { Activity, AlertTriangle, Ban, Database, Lock, RefreshCw, Shield, ShieldCheck, Users, UserCheck, Clock, TrendingUp, AlertCircle, CheckCircle, Info, XCircle } from "lucide-react";
import { apiClient } from "../api/client";
import { EmptyState, ErrorState, PageHeader, SectionHeader, SkeletonBlock } from "../components/UI";

interface SecurityControl {
  admin_2fa_enabled: boolean;
  root_admin_protected: boolean;
  ip_blocking_enabled: boolean;
  rate_limiting_enabled: boolean;
  rbac_enabled: boolean;
  audit_logging_enabled: boolean;
}

interface SecurityMetrics {
  failed_logins_today: number;
  admin_logins_today: number;
  active_blocked_ips: number;
  sensitive_actions_today: number;
  open_critical_alerts: number;
  open_incidents: number;
}

interface RecentEvent {
  id: number;
  action: string;
  actor: string | null;
  ip_address: string | null;
  entity_type: string | null;
  created_at: string;
  summary: string;
}

interface RecentBlockedIP {
  id: number;
  ip_address: string;
  reason: string | null;
  source: string;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
}

interface Admin2FAInfo {
  enabled: boolean;
  method: string;
  security_email_masked: string | null;
}

interface Recommendation {
  level: string;
  title: string;
  description: string;
}

interface SecurityCenterSummary {
  controls: SecurityControl;
  metrics: SecurityMetrics;
  recent_events: RecentEvent[];
  recent_blocked_ips: RecentBlockedIP[];
  admin_2fa: Admin2FAInfo;
  recommendations: Recommendation[];
}

export function SecurityCenterPage() {
  const [data, setData] = useState<SecurityCenterSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  async function loadSecurityData() {
    setLoading(true);
    setError(null);

    try {
      const result = await apiClient.get<SecurityCenterSummary>("/security-center/summary");
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load security data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSecurityData();
  }, [refreshTick]);

  function handleRefresh() {
    setRefreshTick(prev => prev + 1);
  }

  function formatDateTime(dateString: string) {
    return new Date(dateString).toLocaleString();
  }

  function getRecommendationIcon(level: string) {
    switch (level) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-emerald-400" />;
      case "info":
        return <Info className="h-5 w-5 text-cyan-400" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 text-amber-400" />;
      case "critical":
        return <XCircle className="h-5 w-5 text-red-400" />;
      default:
        return <Info className="h-5 w-5 text-slate-400" />;
    }
  }

  function getRecommendationColor(level: string) {
    switch (level) {
      case "success":
        return "border-emerald-300/30 bg-emerald-300/10 text-emerald-200";
      case "info":
        return "border-cyan-300/30 bg-cyan-300/10 text-cyan-200";
      case "warning":
        return "border-amber-300/30 bg-amber-300/10 text-amber-200";
      case "critical":
        return "border-red-300/30 bg-red-300/10 text-red-200";
      default:
        return "border-slate-300/30 bg-slate-300/10 text-slate-200";
    }
  }

  function getActionBadgeColor(action: string) {
    if (action.includes("login")) return "bg-blue-500/20 text-blue-300 border-blue-500/30";
    if (action.includes("admin")) return "bg-purple-500/20 text-purple-300 border-purple-500/30";
    if (action.includes("block")) return "bg-red-500/20 text-red-300 border-red-500/30";
    if (action.includes("user")) return "bg-green-500/20 text-green-300 border-green-500/30";
    if (action.includes("rule")) return "bg-amber-500/20 text-amber-300 border-amber-500/30";
    if (action.includes("report")) return "bg-indigo-500/20 text-indigo-300 border-indigo-500/30";
    return "bg-slate-500/20 text-slate-300 border-slate-500/30";
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Security"
          title="Security Center"
          description="Centralized visibility into platform security controls, authentication protection, IP blocking, and sensitive administrative activity."
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <SkeletonBlock key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <SkeletonBlock className="h-96" />
          <SkeletonBlock className="h-96" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={handleRefresh}
      />
    );
  }

  if (!data) {
    return (
      <EmptyState
        title="No security data available"
        description="Security center information could not be loaded."
        action={
          <button
            onClick={handleRefresh}
            className="soc-button-ghost px-4 py-2 text-sm font-semibold"
          >
            Retry
          </button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Security"
        title="Security Center"
        description="Centralized visibility into platform security controls, authentication protection, IP blocking, and sensitive administrative activity."
        actions={
          <button
            onClick={handleRefresh}
            className="soc-button-ghost flex items-center gap-2 px-4 py-2 text-sm font-semibold"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        }
      />

      {/* Security Controls */}
      <SectionHeader title="Security Controls" description="Status of platform security controls and protections." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SecurityControlCard
          icon={ShieldCheck}
          title="Admin 2FA"
          status={data.controls.admin_2fa_enabled ? "Enabled" : "Disabled"}
          statusColor={data.controls.admin_2fa_enabled ? "text-emerald-400" : "text-red-400"}
          description="Additional verification for administrator logins."
        />
        <SecurityControlCard
          icon={Shield}
          title="Root Admin Protection"
          status={data.controls.root_admin_protected ? "Protected" : "Unprotected"}
          statusColor={data.controls.root_admin_protected ? "text-emerald-400" : "text-amber-400"}
          description="Prevents deletion, deactivation, or privilege downgrade of the primary admin."
        />
        <SecurityControlCard
          icon={Ban}
          title="IP Blocking"
          status={data.controls.ip_blocking_enabled ? "Active" : "Inactive"}
          statusColor={data.controls.ip_blocking_enabled ? "text-emerald-400" : "text-red-400"}
          description="Allows defensive blocking of suspicious source IPs."
        />
        <SecurityControlCard
          icon={Clock}
          title="Rate Limiting"
          status={data.controls.rate_limiting_enabled ? "Enabled" : "Disabled"}
          statusColor={data.controls.rate_limiting_enabled ? "text-emerald-400" : "text-red-400"}
          description="Reduces brute-force login attempts."
        />
        <SecurityControlCard
          icon={Users}
          title="RBAC"
          status={data.controls.rbac_enabled ? "Active" : "Inactive"}
          statusColor={data.controls.rbac_enabled ? "text-emerald-400" : "text-red-400"}
          description="Enforces role-based permissions across the platform."
        />
        <SecurityControlCard
          icon={Database}
          title="Audit Logging"
          status={data.controls.audit_logging_enabled ? "Active" : "Inactive"}
          statusColor={data.controls.audit_logging_enabled ? "text-emerald-400" : "text-red-400"}
          description="Tracks security-relevant actions for investigation and accountability."
        />
      </div>

      {/* Security Metrics */}
      <SectionHeader title="Security Metrics" description="Today's security activity and current status." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          icon={AlertTriangle}
          title="Failed Logins Today"
          value={data.metrics.failed_logins_today}
          description="Failed login attempts detected today."
          valueColor={data.metrics.failed_logins_today > 10 ? "text-red-400" : data.metrics.failed_logins_today > 0 ? "text-amber-400" : "text-emerald-400"}
        />
        <MetricCard
          icon={UserCheck}
          title="Admin Logins Today"
          value={data.metrics.admin_logins_today}
          description="Successful administrator logins today."
          valueColor="text-cyan-400"
        />
        <MetricCard
          icon={Ban}
          title="Active Blocked IPs"
          value={data.metrics.active_blocked_ips}
          description="Currently blocked IP addresses."
          valueColor={data.metrics.active_blocked_ips > 0 ? "text-amber-400" : "text-emerald-400"}
        />
        <MetricCard
          icon={Activity}
          title="Sensitive Actions Today"
          value={data.metrics.sensitive_actions_today}
          description="Security-sensitive administrative actions today."
          valueColor="text-purple-400"
        />
        <MetricCard
          icon={AlertCircle}
          title="Open Critical Alerts"
          value={data.metrics.open_critical_alerts}
          description="Critical alerts requiring immediate attention."
          valueColor={data.metrics.open_critical_alerts > 0 ? "text-red-400" : "text-emerald-400"}
        />
        <MetricCard
          icon={TrendingUp}
          title="Open Incidents"
          value={data.metrics.open_incidents}
          description="Incidents currently being investigated."
          valueColor={data.metrics.open_incidents > 5 ? "text-amber-400" : "text-cyan-400"}
        />
      </div>

      {/* Admin 2FA Panel */}
      <SectionHeader title="Admin 2FA Configuration" description="Two-factor authentication settings for administrator accounts." />
      <div className="soc-panel p-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">2FA Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Status</span>
                <span className={`font-semibold ${data.admin_2fa.enabled ? "text-emerald-400" : "text-red-400"}`}>
                  {data.admin_2fa.enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Method</span>
                <span className="text-cyan-400">{data.admin_2fa.method}</span>
              </div>
              {data.admin_2fa.security_email_masked && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Security Email</span>
                  <span className="text-cyan-400">{data.admin_2fa.security_email_masked}</span>
                </div>
              )}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Security Benefits</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                <span>Prevents unauthorized admin access even with compromised credentials</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                <span>Adds verification step for high-privilege operations</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                <span>Provides audit trail for admin authentication attempts</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Recent Security Events */}
      <SectionHeader title="Recent Security Events" description="Latest security-relevant activities from audit logs." />
      <div className="soc-panel p-6">
        {data.recent_events.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="soc-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>IP Address</th>
                  <th>Entity</th>
                  <th>Summary</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_events.map((event) => (
                  <tr key={event.id}>
                    <td className="text-slate-400">{formatDateTime(event.created_at)}</td>
                    <td>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${getActionBadgeColor(event.action)}`}>
                        {event.action.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="text-slate-300">{event.actor || "System"}</td>
                    <td className="text-slate-300">{event.ip_address || "N/A"}</td>
                    <td className="text-slate-300">{event.entity_type || "N/A"}</td>
                    <td className="text-slate-300">{event.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No recent security events"
            description="No security-relevant activities have been recorded recently."
          />
        )}
      </div>

      {/* Recent Blocked IPs */}
      <SectionHeader title="Recent Blocked IPs" description="Currently active IP address blocks." />
      <div className="soc-panel p-6">
        {data.recent_blocked_ips.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="soc-table">
              <thead>
                <tr>
                  <th>IP Address</th>
                  <th>Reason</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th>Expires At</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_blocked_ips.map((block) => (
                  <tr key={block.id}>
                    <td className="text-slate-300 font-mono">{block.ip_address}</td>
                    <td className="text-slate-300">{block.reason || "No reason provided"}</td>
                    <td>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${
                        block.source === "automatic" 
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                          : "bg-blue-500/20 text-blue-300 border-blue-500/30"
                      }`}>
                        {block.source}
                      </span>
                    </td>
                    <td>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${
                        block.is_active 
                          ? "bg-red-500/20 text-red-300 border-red-500/30"
                          : "bg-slate-500/20 text-slate-300 border-slate-500/30"
                      }`}>
                        {block.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="text-slate-400">{formatDateTime(block.created_at)}</td>
                    <td className="text-slate-400">{block.expires_at ? formatDateTime(block.expires_at) : "Never"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 text-center">
              <a
                href="/blocks"
                className="soc-button-ghost inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold"
              >
                Manage Blocks
                <Ban className="h-4 w-4" />
              </a>
            </div>
          </div>
        ) : (
          <EmptyState
            title="No active blocked IPs"
            description="No IP addresses are currently blocked."
          />
        )}
      </div>

      {/* Recommendations */}
      <SectionHeader title="Security Recommendations" description="Automated security recommendations based on current configuration and activity." />
      <div className="space-y-4">
        {data.recommendations.map((rec, index) => (
          <div key={index} className={`soc-panel p-4 border ${getRecommendationColor(rec.level)}`}>
            <div className="flex items-start gap-3">
              {getRecommendationIcon(rec.level)}
              <div className="flex-1">
                <h4 className="font-semibold text-white mb-1">{rec.title}</h4>
                <p className="text-sm text-slate-300">{rec.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface SecurityControlCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  status: string;
  statusColor: string;
  description: string;
}

function SecurityControlCard({ icon: Icon, title, status, statusColor, description }: SecurityControlCardProps) {
  return (
    <div className="soc-panel p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-300/10">
          <Icon className="h-6 w-6 text-cyan-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-white mb-1">{title}</h3>
          <p className={`text-sm font-medium mb-2 ${statusColor}`}>{status}</p>
          <p className="text-sm text-slate-300">{description}</p>
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: number;
  description: string;
  valueColor: string;
}

function MetricCard({ icon: Icon, title, value, description, valueColor }: MetricCardProps) {
  return (
    <div className="soc-panel p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-300/10">
          <Icon className="h-6 w-6 text-cyan-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-white mb-1">{title}</h3>
          <p className={`text-2xl font-bold mb-2 ${valueColor}`}>{value.toLocaleString()}</p>
          <p className="text-sm text-slate-300">{description}</p>
        </div>
      </div>
    </div>
  );
}
