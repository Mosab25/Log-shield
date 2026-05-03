import time
import logging
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.config import settings

logger = logging.getLogger("logshield")

class PerformanceLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log API performance metrics in development."""
    
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Get request info
        method = request.method
        path = request.url.path
        query_params = str(request.url.query) if request.url.query else ""
        
        # Process request
        response = await call_next(request)
        
        # Calculate duration
        duration_ms = int((time.time() - start_time) * 1000)
        status_code = response.status_code
        
        # Log performance metrics (only in development or if explicitly enabled)
        if settings.debug:
            logger.info(
                f"[PERF] {method} {path}{query_params if query_params else ''} "
                f"{status_code} {duration_ms}ms"
            )
        
        return response
