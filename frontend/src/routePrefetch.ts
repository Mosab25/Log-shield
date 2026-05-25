import type { QueryClient } from "@tanstack/react-query";

import { apiClient } from "./api/client";
import { deriveAttackSignalFromText } from "./securitySignals";

const STALE_TIME = 5 * 60 * 1000;
const EMPTY_DASHBOARD_FILTERS = { severity: "", source: "", status: "" };
const EMPTY_LOG_FILTERS = {
  eventType: "",
  category: "",
  severity: "",
  source: "",
  ipAddress: "",
  username: "",
  endpoint: "",
  startDate: "",
  endDate: "",
};

function countLocalScriptSignals(): number {
  try {
    const raw = localStorage.getItem("logshield.fileAnalyzer.findings");
    const findings = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(findings)) return 0;
    return findings.filter((finding: any) =>
      deriveAttackSignalFromText(
        finding?.attack_name,
        finding?.classification,
        finding?.event_type,
        finding?.risk_reasons?.join?.(" "),
      ).isAttack,
    ).length;
  } catch {
    return 0;
  }
}

async function fetchDashboardCharts() {
  const [timelineResult, riskResult] = await Promise.allSettled([
    apiClient.get<any>("/dashboard/alerts-timeline"),
    apiClient.get<any>("/dashboard/risk-distribution"),
  ]);

  return {
    timeline: timelineResult.status === "fulfilled" && Array.isArray(timelineResult.value?.items) ? timelineResult.value.items : [],
    risk: riskResult.status === "fulfilled" && Array.isArray(riskResult.value?.items) ? riskResult.value.items : [],
    failedEndpoints: [
      ...(timelineResult.status === "rejected" ? ["timeline"] : []),
      ...(riskResult.status === "rejected" ? ["risk-distribution"] : []),
    ],
  };
}

async function fetchDashboardSecondary() {
  const [topUsersResult, eventsResult, alertsResult] = await Promise.allSettled([
    apiClient.get<any>("/dashboard/top-attacked-users?limit=5"),
    apiClient.get<any>("/dashboard/recent-events?limit=10"),
    apiClient.get<any>("/alerts?limit=8"),
  ]);

  const topUsers = topUsersResult.status === "fulfilled" && Array.isArray(topUsersResult.value?.items) ? topUsersResult.value.items : [];
  const events = eventsResult.status === "fulfilled" && Array.isArray(eventsResult.value?.items) ? eventsResult.value.items : [];
  const alerts = alertsResult.status === "fulfilled" && Array.isArray(alertsResult.value?.items) ? alertsResult.value.items : [];
  const signalFromEvents = events.filter((item: any) =>
    deriveAttackSignalFromText(item?.message, item?.raw_message, item?.event_type, item?.source, item?.user_agent).isAttack,
  ).length;
  const signalFromAlerts = alerts.filter((item: any) =>
    deriveAttackSignalFromText(item?.title, item?.description, item?.source_ip, item?.username).isAttack,
  ).length;

  return {
    topUsers,
    events,
    alerts,
    scriptAttackSignals: signalFromEvents + signalFromAlerts + countLocalScriptSignals(),
    failedEndpoints: [
      ...(topUsersResult.status === "rejected" ? ["top-users"] : []),
      ...(eventsResult.status === "rejected" ? ["recent-events"] : []),
      ...(alertsResult.status === "rejected" ? ["alerts"] : []),
    ],
  };
}

export function prefetchRouteData(queryClient: QueryClient, path: string) {
  if (path === "/dashboard") {
    void queryClient.prefetchQuery({
      queryKey: ["dashboard", "summary", EMPTY_DASHBOARD_FILTERS],
      queryFn: () => apiClient.get<any>("/dashboard/summary"),
      staleTime: STALE_TIME,
    });
    void queryClient.prefetchQuery({
      queryKey: ["dashboard", "charts", EMPTY_DASHBOARD_FILTERS],
      queryFn: fetchDashboardCharts,
      staleTime: STALE_TIME,
    });
    void queryClient.prefetchQuery({
      queryKey: ["dashboard", "secondary", EMPTY_DASHBOARD_FILTERS],
      queryFn: fetchDashboardSecondary,
      staleTime: STALE_TIME,
    });
    return;
  }

  if (path === "/logs") {
    void queryClient.prefetchQuery({
      queryKey: ["logs", "raw", 1, "", EMPTY_LOG_FILTERS],
      queryFn: () => apiClient.get<any>("/logs/raw?skip=0&limit=25"),
      staleTime: STALE_TIME,
    });
    return;
  }

  if (path === "/alerts") {
    void queryClient.prefetchQuery({
      queryKey: ["alerts", { page: 1, status: "", severity: "" }],
      queryFn: () => apiClient.get<any>("/alerts?skip=0&limit=10"),
      staleTime: STALE_TIME,
    });
    return;
  }

  if (path === "/incidents") {
    void queryClient.prefetchQuery({
      queryKey: ["incidents", { page: 1, status: "", severity: "", ownerUserId: "", alertIdFilter: "", appliedSearch: "" }],
      queryFn: () => apiClient.get<any>("/incidents?skip=0&limit=10"),
      staleTime: STALE_TIME,
    });
  }
}
