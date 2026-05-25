from __future__ import annotations

from collections.abc import Awaitable, Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.config import settings


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    @staticmethod
    def _connect_src() -> str:
        origins: list[str] = ["'self'"]
        if settings.is_development:
            origins.extend([
                "http://localhost:8000",
                "http://127.0.0.1:8000",
                "http://localhost:5173",
                "http://127.0.0.1:5173",
            ])

        for origin in settings.cors_origins_list:
            if origin not in origins:
                origins.append(origin)

        return " ".join(origins)

    @classmethod
    def _default_csp(cls) -> str:
        return (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            f"connect-src {cls._connect_src()}; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'; "
            "object-src 'none'; "
            "upgrade-insecure-requests"
        )

    @classmethod
    def _docs_csp(cls) -> str:
        return (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
            "img-src 'self' data: https:; "
            "font-src 'self' data: https://cdn.jsdelivr.net; "
            f"connect-src {cls._connect_src()}; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'; "
            "object-src 'none'; "
            "upgrade-insecure-requests"
        )

    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
        response.headers["Cross-Origin-Resource-Policy"] = "same-origin"
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
        if not settings.is_development:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        if request.url.path.startswith("/docs") or request.url.path.startswith("/redoc"):
            response.headers["Content-Security-Policy"] = self._docs_csp()
        else:
            response.headers["Content-Security-Policy"] = self._default_csp()
        return response
