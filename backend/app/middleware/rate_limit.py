from __future__ import annotations

import time
from collections import defaultdict, deque
from collections.abc import Awaitable, Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response


class InMemoryRateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, requests_per_minute: int = 120, auth_requests_per_minute: int = 20):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.auth_requests_per_minute = auth_requests_per_minute
        self.clients: dict[str, deque[float]] = defaultdict(deque)

    def _client_key(self, request: Request) -> str:
        ip_address = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        if not ip_address:
            ip_address = request.client.host if request.client else "unknown"
        return f"{ip_address}:{request.url.path}"

    def _limit_for_path(self, path: str) -> int:
        if path.startswith("/api/auth/login") or path.startswith("/api/auth/refresh"):
            return self.auth_requests_per_minute
        return self.requests_per_minute

    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        key = self._client_key(request)
        now = time.time()
        bucket = self.clients[key]
        while bucket and bucket[0] < now - 60:
            bucket.popleft()
        if len(bucket) >= self._limit_for_path(request.url.path):
            return JSONResponse(status_code=429, content={"detail": "Rate limit exceeded. Please try again later."})
        bucket.append(now)
        return await call_next(request)
