import { API_BASE_URL } from "../api/client";

const BACKEND = API_BASE_URL;
const PING_INTERVAL = 10 * 60 * 1000;
const PING_ENDPOINT = "/health";

let pingTimer: ReturnType<typeof setInterval> | null = null;

export function startKeepAlive() {
  if (pingTimer) return;
  void pingBackend();
  pingTimer = setInterval(() => {
    void pingBackend();
  }, PING_INTERVAL);
}

export function stopKeepAlive() {
  if (!pingTimer) return;
  clearInterval(pingTimer);
  pingTimer = null;
}

async function pingBackend() {
  try {
    await fetch(`${BACKEND}${PING_ENDPOINT}`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // best-effort warmup
  }
}
