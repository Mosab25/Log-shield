from __future__ import annotations

from collections.abc import Awaitable, Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.config import settings


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()"
        if not settings.is_development:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        connect_src = "'self'"
        if settings.is_development:
            connect_src += " http://localhost:8000 http://localhost:5173 http://localhost:8080"
        for origin in settings.cors_origins_list:
            if origin not in connect_src:
                connect_src += f" {origin}"

        response.headers["Content-Security-Policy"] = (
            f"default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; "
            f"script-src 'self'; font-src 'self' data:; connect-src {connect_src}; frame-ancestors 'none';"
        )
        return response
