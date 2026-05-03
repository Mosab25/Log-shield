from __future__ import annotations

from datetime import datetime, timezone


DEMO_USERS = [
    {"email": "admin@logshield.demo", "password": "Admin@12345", "full_name": "LogShield Admin", "role_name": "admin", "is_active": True},
    {"email": "analyst@logshield.demo", "password": "Analyst@12345", "full_name": "SOC Analyst", "role_name": "analyst", "is_active": True},
    {"email": "viewer@logshield.demo", "password": "Viewer@12345", "full_name": "SOC Viewer", "role_name": "viewer", "is_active": True},
]


def utc_dt(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)


DEMO_RAW_LOGS = [
    # Normal successful login
    {"source": "auth-prod-01", "source_type": "auth_service", "raw_message": "User john.doe logged in successfully from 192.168.1.20", "received_at": utc_dt("2026-04-30T09:00:00Z"), "ip_address": "192.168.1.20", "hostname": "auth-prod-01", "metadata": {"event_name": "login_success", "username": "john.doe", "result": "success", "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "asset_importance": "high", "demo_scenario": "normal_login"}},
    
    # Suspicious user agent
    {"source": "web-prod-01", "source_type": "web_server", "raw_message": "GET /robots.txt HTTP/1.1 200 from 198.51.100.10", "received_at": utc_dt("2026-04-30T08:30:00Z"), "ip_address": "198.51.100.10", "hostname": "web-prod-01", "metadata": {"method": "GET", "path": "/robots.txt", "status_code": 200, "user_agent": "sqlmap/1.6.12#stable (http://sqlmap.org)", "asset_importance": "medium", "demo_scenario": "suspicious_user_agent"}},
    
    # Account lockout event
    {"source": "auth-prod-01", "source_type": "auth_service", "raw_message": "Account admin locked due to multiple failed login attempts from 203.0.113.45", "received_at": utc_dt("2026-04-30T10:45:00Z"), "ip_address": "203.0.113.45", "hostname": "auth-prod-01", "metadata": {"event_name": "account_locked", "username": "admin", "result": "locked", "user_agent": "Mozilla/5.0", "asset_importance": "critical", "demo_scenario": "account_lockout"}},
]

# Multiple failed login attempts (brute force)
for index in range(1, 9):
    DEMO_RAW_LOGS.append({"source": "auth-prod-01", "source_type": "auth_service", "raw_message": f"Failed login for user admin from 10.0.0.55 - attempt {index}", "received_at": utc_dt(f"2026-04-30T09:0{index}:00Z"), "ip_address": "10.0.0.55", "hostname": "auth-prod-01", "metadata": {"event_name": "login_failed", "username": "admin", "result": "failed", "user_agent": "Mozilla/5.0 (compatible; scanner/1.0)", "asset_importance": "high", "demo_scenario": "brute_force"}})

DEMO_RAW_LOGS.extend([
    {"source": "auth-prod-01", "source_type": "auth_service", "raw_message": "User admin logged in successfully from 203.0.113.88", "received_at": utc_dt("2026-04-30T22:15:00Z"), "ip_address": "203.0.113.88", "hostname": "auth-prod-01", "metadata": {"event_name": "login_success", "username": "admin", "result": "success", "user_agent": "Mozilla/5.0", "asset_importance": "critical", "demo_scenario": "admin_unknown_ip"}},
])

for index in range(1, 7):
    DEMO_RAW_LOGS.append({"source": "web-prod-01", "source_type": "web_server", "raw_message": f"GET /missing-{index} HTTP/1.1 404 from 203.0.113.50", "received_at": utc_dt(f"2026-04-30T09:1{index}:00Z"), "ip_address": "203.0.113.50", "hostname": "web-prod-01", "metadata": {"method": "GET", "path": f"/missing-{index}", "status_code": 404, "user_agent": "Mozilla/5.0", "asset_importance": "medium", "demo_scenario": "multiple_404"}})

DEMO_RAW_LOGS.extend([
    # SQL injection pattern
    {"source": "web-prod-01", "source_type": "web_server", "raw_message": "GET /search?q=' OR '1'='1 returned 400 from 203.0.113.77", "received_at": utc_dt("2026-04-30T09:30:00Z"), "ip_address": "203.0.113.77", "hostname": "web-prod-01", "metadata": {"method": "GET", "path": "/search", "status_code": 400, "user_agent": "Mozilla/5.0", "asset_importance": "high", "note": "Defensive demo log only. No exploitation performed.", "demo_scenario": "sql_pattern_text_only"}},
    
    # Privilege escalation
    {"source": "app-prod-01", "source_type": "application", "raw_message": "User support.agent role changed from viewer to admin by system_admin", "received_at": utc_dt("2026-04-30T09:40:00Z"), "ip_address": "172.16.5.25", "hostname": "app-prod-01", "metadata": {"event_name": "privilege_change", "target_user": "support.agent", "old_role": "viewer", "new_role": "admin", "changed_by": "system_admin", "asset_importance": "critical", "demo_scenario": "privilege_change"}},
    
    # IP blocked event
    {"source": "firewall-01", "source_type": "security_device", "raw_message": "IP address 203.0.113.45 blocked due to repeated failed authentication attempts", "received_at": utc_dt("2026-04-30T10:50:00Z"), "ip_address": "203.0.113.45", "hostname": "firewall-01", "metadata": {"action": "blocked", "reason": "brute_force_detection", "duration": "3600", "asset_importance": "high", "demo_scenario": "ip_blocked"}},
    
    # Normal web activity
    {"source": "web-prod-01", "source_type": "web_server", "raw_message": "GET /dashboard HTTP/1.1 200 from 192.168.1.100", "received_at": utc_dt("2026-04-30T11:00:00Z"), "ip_address": "192.168.1.100", "hostname": "web-prod-01", "metadata": {"method": "GET", "path": "/dashboard", "status_code": 200, "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "asset_importance": "medium", "demo_scenario": "normal_activity"}},
])

for index in range(1, 12):
    DEMO_RAW_LOGS.append({"source": "web-prod-01", "source_type": "web_server", "raw_message": "GET /api/orders HTTP/1.1 500 from 198.51.100.44", "received_at": utc_dt(f"2026-04-30T10:{index:02d}:00Z"), "ip_address": "198.51.100.44", "hostname": "web-prod-01", "metadata": {"method": "GET", "path": "/api/orders", "status_code": 500, "user_agent": "Mozilla/5.0", "asset_importance": "high", "demo_scenario": "high_error_rate"}})

for index in range(1, 5):
    DEMO_RAW_LOGS.append({"source": "web-prod-01", "source_type": "web_server", "raw_message": f"GET /admin/section-{index} HTTP/1.1 404 from 203.0.113.60", "received_at": utc_dt(f"2026-04-30T10:2{index}:00Z"), "ip_address": "203.0.113.60", "hostname": "web-prod-01", "metadata": {"method": "GET", "path": f"/admin/section-{index}", "status_code": 404, "user_agent": "Mozilla/5.0", "asset_importance": "high", "demo_scenario": "sensitive_paths"}})

for username, minute in [("sales.user", "01"), ("finance.user", "02"), ("hr.user", "03")]:
    DEMO_RAW_LOGS.append({"source": "auth-prod-01", "source_type": "auth_service", "raw_message": f"Failed login for user {username} from 198.51.100.90", "received_at": utc_dt(f"2026-04-30T11:{minute}:00Z"), "ip_address": "198.51.100.90", "hostname": "auth-prod-01", "metadata": {"event_name": "login_failed", "username": username, "result": "failed", "user_agent": "Mozilla/5.0", "demo_scenario": "multiple_users_same_ip"}})
