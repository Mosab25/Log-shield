import { useCallback, useEffect, useState, type ReactNode } from "react";
import { apiClient, blockedAccessStore, type BlockedAccessDetails } from "../api/client";
import { BlockedAccessPage } from "../pages/BlockedAccessPage";

function detailsFromSelfCheck(response: {
  ip_address: string;
  reason: string | null;
  blocked_until: string | null;
  is_permanent: boolean;
}): BlockedAccessDetails {
  return {
    detail: "Your IP address is blocked.",
    code: "IP_BLOCKED",
    ip_address: response.ip_address,
    reason: response.reason ?? "Blocked by administrator",
    blocked_until: response.blocked_until ?? null,
    is_permanent: Boolean(response.is_permanent),
  };
}

export function BlockedAccessGate({ children }: { children: ReactNode }) {
  const [details, setDetails] = useState<BlockedAccessDetails | null>(() => blockedAccessStore.getSnapshot());
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  const checkAccess = useCallback(async (retry = false) => {
    if (retry) {
      setRetrying(true);
      setRetryError(null);
    }
    try {
      const response = await apiClient.checkSelfBlock();
      if (response.blocked) {
        blockedAccessStore.set(detailsFromSelfCheck(response));
      } else {
        blockedAccessStore.clear();
      }
    } catch (err: any) {
      if (retry) setRetryError(err?.message || "Unable to verify access right now.");
    } finally {
      setRetrying(false);
    }
  }, []);

  useEffect(() => blockedAccessStore.subscribe(setDetails), []);

  useEffect(() => {
    void checkAccess(false);
  }, [checkAccess]);

  if (details) {
    return <BlockedAccessPage details={details} retrying={retrying} error={retryError} onRetry={() => void checkAccess(true)} />;
  }

  return <>{children}</>;
}
