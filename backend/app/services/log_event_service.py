from __future__ import annotations

from typing import Any


class LogEventService:
    """Service for mapping and enhancing security event types"""
    
    # Security event type taxonomy with display labels and categories
    EVENT_TYPE_MAPPING = {
        "failed_login": {
            "label": "Failed Login Attempt",
            "category": "authentication",
            "default_severity": "medium",
            "mitre_technique": "T1110",
            "icon": "shield-alert"
        },
        "successful_login": {
            "label": "Successful Login",
            "category": "authentication", 
            "default_severity": "low",
            "mitre_technique": "T1078",
            "icon": "user-check"
        },
        "admin_login_unknown_ip": {
            "label": "Admin Login From Unknown IP",
            "category": "authentication",
            "default_severity": "high",
            "mitre_technique": "T1078",
            "icon": "alert-triangle"
        },
        "http_404": {
            "label": "HTTP 404 Request",
            "category": "web",
            "default_severity": "low",
            "mitre_technique": "T1595",
            "icon": "file-x"
        },
        "sql_injection_pattern": {
            "label": "SQL Injection Pattern",
            "category": "attack",
            "default_severity": "high",
            "mitre_technique": "T1190",
            "icon": "database-x"
        },
        "suspicious_user_agent": {
            "label": "Suspicious User-Agent",
            "category": "reconnaissance",
            "default_severity": "medium",
            "mitre_technique": "T1595",
            "icon": "search"
        },
        "privilege_escalation": {
            "label": "Privilege Escalation Event",
            "category": "privilege",
            "default_severity": "critical",
            "mitre_technique": "T1068",
            "icon": "arrow-up-circle"
        },
        "high_error_rate": {
            "label": "High Error Rate",
            "category": "system",
            "default_severity": "medium",
            "mitre_technique": "T1498",
            "icon": "alert-circle"
        },
        "sensitive_path_access": {
            "label": "Sensitive Path Access",
            "category": "reconnaissance",
            "default_severity": "medium",
            "mitre_technique": "T1083",
            "icon": "folder-x"
        },
        "account_lockout": {
            "label": "Account Lockout",
            "category": "authentication",
            "default_severity": "medium",
            "mitre_technique": "T1110",
            "icon": "user-x"
        },
        "ip_blocked": {
            "label": "IP Blocked",
            "category": "defense",
            "default_severity": "low",
            "mitre_technique": None,
            "icon": "shield"
        },
        "normal_activity": {
            "label": "Normal Activity",
            "category": "normal",
            "default_severity": "low",
            "mitre_technique": None,
            "icon": "activity"
        }
    }
    
    @staticmethod
    def _coerce_int(value: Any) -> int | None:
        try:
            if value is None:
                return None
            return int(value)
        except (TypeError, ValueError):
            return None

    @classmethod
    def infer_event_type(cls, raw_log: Any) -> str:
        """Infer security event type from raw log data"""
        metadata_raw = getattr(raw_log, 'event_metadata', {}) or {}
        metadata = metadata_raw if isinstance(metadata_raw, dict) else {}
        raw_message = str(getattr(raw_log, 'raw_message', '') or '')
        source_type = str(getattr(raw_log, 'source_type', '') or '')
        
        # Check for explicit event_name in metadata
        event_name = str(metadata.get('event_name', '') or '').lower()
        if event_name:
            # Map common event names to our taxonomy
            if 'login' in event_name and 'fail' in event_name:
                return 'failed_login'
            elif 'login' in event_name and 'success' in event_name:
                return 'successful_login'
            elif 'privilege' in event_name or 'role' in event_name:
                return 'privilege_escalation'
        
        # Check for HTTP status codes
        status_code = cls._coerce_int(metadata.get('status_code'))
        if status_code == 404:
            return 'http_404'
        elif status_code is not None and status_code >= 500:
            return 'high_error_rate'
        
        # Check for SQL injection patterns
        if any(pattern in raw_message.lower() for pattern in ["'", '"', ' or ', ' and ', 'union', 'select', 'drop']):
            return 'sql_injection_pattern'
        
        # Check for admin login from unknown IP
        if ('admin' in raw_message.lower() and 'login' in raw_message.lower() and 
            metadata.get('username') == 'admin' and metadata.get('demo_scenario') == 'admin_unknown_ip'):
            return 'admin_login_unknown_ip'
        
        # Check for sensitive path access
        path = str(metadata.get('path', '') or '')
        if any(sensitive in path.lower() for sensitive in ['/admin', '/config', '/system', '/api/internal']):
            return 'sensitive_path_access'
        
        # Check for suspicious user agents
        user_agent = str(metadata.get('user_agent', '') or '')
        if any(suspicious in user_agent.lower() for suspicious in ['bot', 'scanner', 'curl', 'wget']):
            return 'suspicious_user_agent'
        
        # Check for failed login patterns
        if ('failed' in raw_message.lower() and 'login' in raw_message.lower()) or \
           ('login' in event_name and 'fail' in event_name):
            return 'failed_login'
        
        # Check for successful login
        if ('logged in' in raw_message.lower() and 'successfully' in raw_message.lower()) or \
           ('login' in event_name and 'success' in event_name):
            return 'successful_login'
        
        # Default to normal activity
        return 'normal_activity'
    
    @classmethod
    def get_event_info(cls, event_type: str) -> dict[str, Any]:
        """Get event type information including label, category, etc."""
        if not isinstance(event_type, str) or not event_type.strip():
            event_type = "normal_activity"
        return cls.EVENT_TYPE_MAPPING.get(event_type, {
            "label": event_type.replace('_', ' ').title(),
            "category": "unknown",
            "default_severity": "low",
            "mitre_technique": None,
            "icon": "file-text"
        })
    
    @classmethod
    def enhance_normalized_log(cls, normalized_log: Any, raw_log: Any) -> dict[str, Any]:
        """Enhance normalized log with security event information"""
        # Infer event type if not set
        event_type = getattr(normalized_log, 'event_type', None) or cls.infer_event_type(raw_log)
        
        # Get event information
        event_info = cls.get_event_info(event_type)
        
        # Build enhanced response
        enhanced = {
            "id": normalized_log.id,
            "timestamp": getattr(normalized_log, 'event_time', None) or getattr(normalized_log, 'created_at', None),
            "source": normalized_log.source,
            "event_type": event_type,
            "event_label": event_info["label"],
            "category": event_info["category"],
            "severity": getattr(normalized_log, 'severity', event_info["default_severity"]),
            "username": getattr(normalized_log, 'username', None),
            "ip_address": getattr(normalized_log, 'src_ip', None),
            "user_agent": getattr(normalized_log, 'user_agent', None),
            "method": getattr(normalized_log, 'http_method', None),
            "endpoint": getattr(normalized_log, 'path', None),
            "status": getattr(normalized_log, 'status', None),
            "status_code": getattr(normalized_log, 'status_code', None),
            "message": normalized_log.message,
            "attack_type": cls._get_attack_type(event_type),
            "mitre_technique": event_info["mitre_technique"],
            "risk_score": cls._calculate_risk_score(normalized_log, event_info),
            "icon": event_info["icon"]
        }
        
        return enhanced
    
    @classmethod
    def _get_attack_type(cls, event_type: str) -> str:
        """Get attack type description for event type"""
        attack_mapping = {
            "failed_login": "Brute Force Indicator",
            "admin_login_unknown_ip": "Suspicious Admin Access",
            "sql_injection_pattern": "SQL Injection Attempt",
            "suspicious_user_agent": "Automated Scanner",
            "privilege_escalation": "Privilege Abuse",
            "http_404": "Reconnaissance Scanning",
            "high_error_rate": "System Anomaly",
            "sensitive_path_access": "Sensitive Asset Targeting",
            "account_lockout": "Account Attack",
            "ip_blocked": "Defense Action",
            "normal_activity": "Normal Operations"
        }
        return attack_mapping.get(event_type, "Unknown")
    
    @classmethod
    def _calculate_risk_score(cls, normalized_log: Any, event_info: dict[str, Any]) -> int:
        """Calculate risk score based on event type and other factors"""
        base_score = {
            "low": 20,
            "medium": 50,
            "high": 75,
            "critical": 90
        }.get(event_info["default_severity"], 20)
        
        # Adjust based on other factors
        if getattr(normalized_log, 'src_ip', None):
            # Check if IP is from known ranges
            ip = normalized_log.src_ip
            if ip.startswith('192.0.2.') or ip.startswith('198.51.100.') or ip.startswith('203.0.113.'):
                base_score += 10  # Demo IP ranges
        
        if getattr(normalized_log, 'username', None) == 'admin':
            base_score += 15
        
        status_code = cls._coerce_int(getattr(normalized_log, 'status_code', None))
        if status_code is not None and status_code >= 500:
            base_score += 10
        
        return min(base_score, 100)
    
    @classmethod
    def get_all_event_types(cls) -> list[dict[str, str]]:
        """Get all available event types for filters"""
        return [
            {"value": event_type, "label": info["label"], "category": info["category"]}
            for event_type, info in cls.EVENT_TYPE_MAPPING.items()
        ]
    
    @classmethod
    def get_categories(cls) -> list[str]:
        """Get all available categories"""
        return sorted(set(info["category"] for info in cls.EVENT_TYPE_MAPPING.values()))
