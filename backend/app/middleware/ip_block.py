from __future__ import annotations

import time
from collections.abc import Awaitable, Callable

from sqlalchemy.exc import SQLAlchemyError
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.db.session import SessionLocal
from app.models.ip_block import IPBlock
from app.services.audit_service import AuditService
from app.services.ip_block_service import IPBlockService, get_client_ip


class IPBlockMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, audit_interval_seconds: int = 60):
        super().__init__(app)
        self.audit_interval_seconds = audit_interval_seconds
        self._audit_marks: dict[tuple[str, str, str], float] = {}

    @staticmethod
    def _should_skip(request: Request) -> bool:
        path = request.url.path
        if request.method == "OPTIONS":
            return True
        if path == "/":
            return True
        if path in {"/health", "/api/health", "/docs", "/redoc", "/openapi.json"}:
            return True
        if path.startswith("/api/health/"):
            return True
        if path == "/api/blocks/check-self":
            return True
        return not path.startswith("/api")

    def _audit_blocked_request(self, request: Request, block: IPBlock, ip_address: str) -> None:
        now = time.time()
        key = (ip_address, request.method, request.url.path)
        last_seen = self._audit_marks.get(key, 0)
        if now - last_seen < self.audit_interval_seconds:
            return
        self._audit_marks[key] = now

        db = SessionLocal()
        try:
            AuditService.create_audit_log(
                db=db,
                actor_user_id=None,
                action="blocked_ip_request",
                entity_type="ip_block",
                entity_id=str(block.id),
                ip_address=ip_address,
                user_agent=request.headers.get("user-agent"),
                details={
                    "ip_address": ip_address,
                    "path": request.url.path,
                    "method": request.method,
                    "reason": block.reason,
                    "blocked_until": block.blocked_until.isoformat() if block.blocked_until else None,
                },
            )
            db.commit()
        except SQLAlchemyError:
            db.rollback()
        finally:
            db.close()

    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        if self._should_skip(request):
            return await call_next(request)

        ip_address = get_client_ip(request)
        db = SessionLocal()
        lookup_failed = False
        try:
            block = IPBlockService.get_active_block(db, ip_address)
        except SQLAlchemyError:
            db.rollback()
            lookup_failed = True
            block = None
        finally:
            db.close()

        if lookup_failed or block is None:
            return await call_next(request)

        self._audit_blocked_request(request, block, ip_address)
        return JSONResponse(status_code=403, content=IPBlockService.blocked_error_payload(block))
