from fastapi import APIRouter

from app.api.routes import alerts, audit_logs, auth, dashboard, detection, health, ip_blocks, logs, normalized_logs, reports, risk, threat_intel, threats, users

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(logs.router, prefix="/logs", tags=["Logs"])
api_router.include_router(normalized_logs.router, prefix="/logs", tags=["Normalization"])
api_router.include_router(detection.router, prefix="/detection", tags=["Detection"])
api_router.include_router(risk.router, prefix="/risk", tags=["Risk Scoring"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["Alerts"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(audit_logs.router, prefix="/audit-logs", tags=["Audit Logs"])
api_router.include_router(ip_blocks.router, prefix="/blocks", tags=["IP Blocks"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(threats.router, prefix="/threats", tags=["Threat Intelligence"])
api_router.include_router(threat_intel.router, prefix="/threat-intel", tags=["Threat Intel Search"])
