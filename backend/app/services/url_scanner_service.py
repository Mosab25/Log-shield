from __future__ import annotations

import hashlib
import ipaddress
import json
import re
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import unquote, urlparse

from sqlalchemy.orm import Session

from app.models.url_scan_result import URLScanResult
from app.models.user import User
from app.services.url_reputation.providers import get_reputation_provider
from app.utils.cache import short_cache


class URLValidator:
    """URL validation and safety checks."""
    
    # Allowed schemes
    ALLOWED_SCHEMES = {"http", "https"}
    
    # Blocked schemes
    BLOCKED_SCHEMES = {
        "file", "ftp", "javascript", "data", "mailto", "tel", "sms", 
        "about", "chrome", "chrome-extension", "moz-extension", "ws", "wss"
    }
    
    # Private IP ranges
    PRIVATE_IP_RANGES = [
        ipaddress.ip_network("10.0.0.0/8"),
        ipaddress.ip_network("172.16.0.0/12"),
        ipaddress.ip_network("192.168.0.0/16"),
        ipaddress.ip_network("127.0.0.0/8"),
        ipaddress.ip_network("169.254.0.0/16"),
        ipaddress.ip_network("::1/128"),
        ipaddress.ip_network("fc00::/7"),
        ipaddress.ip_network("fe80::/10"),
    ]
    
    # Suspicious TLDs
    SUSPICIOUS_TLDS = {
        ".tk", ".ml", ".ga", ".cf", ".top", ".click", ".download", ".loan",
        ".win", ".review", ".science", ".work", ".party", ".trade"
    }
    
    @classmethod
    def validate_url(cls, url: str) -> tuple[bool, str]:
        """Validate URL format and safety."""
        try:
            # Basic format check
            if not url or len(url.strip()) == 0:
                return False, "URL cannot be empty"
            
            if len(url) > 2048:
                return False, "URL too long (max 2048 characters)"
            
            # Parse URL
            parsed = urlparse(url.strip())
            
            # Check scheme
            if not parsed.scheme:
                return False, "URL must include scheme (http:// or https://)"
            
            if parsed.scheme.lower() in cls.BLOCKED_SCHEMES:
                return False, f"URL scheme '{parsed.scheme}' is not allowed"
            
            if parsed.scheme.lower() not in cls.ALLOWED_SCHEMES:
                return False, f"Only HTTP and HTTPS URLs are allowed"
            
            # Check hostname
            if not parsed.hostname:
                return False, "URL must have a valid hostname"
            
            # Check for localhost/internal addresses
            if cls._is_internal_hostname(parsed.hostname):
                return False, "Internal network addresses are not allowed"

            return True, "Valid URL"
            
        except Exception as e:
            return False, f"Invalid URL format: {str(e)}"
    
    @classmethod
    def _is_internal_hostname(cls, hostname: str) -> bool:
        """Check if hostname points to internal network."""
        try:
            # Check for localhost variations
            localhost_variants = {
                "localhost", "localhost.localdomain", "ip6-localhost",
                "ip6-loopback", "localhost6", "localhost6.localdomain6"
            }
            
            if hostname.lower() in localhost_variants:
                return True
            
            # Check for IP addresses
            try:
                ip = ipaddress.ip_address(hostname)
                return any(ip in network for network in cls.PRIVATE_IP_RANGES)
            except ValueError:
                pass  # Not an IP address
            
            # Check for internal domain patterns
            internal_patterns = [
                r".*\.local$",
                r".*\.internal$",
                r".*\.corp$",
                r".*\.private$",
            ]
            
            for pattern in internal_patterns:
                if re.match(pattern, hostname.lower()):
                    return True
            
            return False
            
        except Exception:
            return True  # Err on side of caution
    
    @classmethod
    def _has_suspicious_patterns(cls, url: str) -> bool:
        """
        Check for suspicious patterns without false positives.

        This helper is intentionally non-blocking for validation. It can be
        reused later for enrichment/scoring, but should not reject otherwise
        valid URLs.
        """
        try:
            parsed = urlparse(url.strip())
            host = (parsed.hostname or "").lower()
        except Exception:
            return False

        # Check suspicious TLD on hostname only (not full URL string).
        if any(host.endswith(tld) for tld in cls.SUSPICIOUS_TLDS):
            return True

        # Check known shorteners by exact host or subdomain.
        suspicious_hosts = {"bit.ly", "tinyurl.com", "short.link", "t.co"}
        if host in suspicious_hosts or any(host.endswith(f".{item}") for item in suspicious_hosts):
            return True

        # Detect literal IPv4 host.
        if re.fullmatch(r"[0-9]{1,3}(?:\.[0-9]{1,3}){3}", host):
            return True

        return False


class URLNormalizer:
    """URL normalization utilities."""
    
    @classmethod
    def normalize_url(cls, url: str) -> str:
        """Normalize URL for consistent storage and comparison."""
        try:
            parsed = urlparse(url.strip())
            
            # Normalize scheme to lowercase
            scheme = parsed.scheme.lower()
            
            # Normalize hostname to lowercase
            netloc = parsed.netloc.lower()
            
            # Remove default ports
            if scheme == "http" and netloc.endswith(":80"):
                netloc = netloc[:-3]
            elif scheme == "https" and netloc.endswith(":443"):
                netloc = netloc[:-4]
            
            # Remove fragment (everything after #)
            fragment = ""
            
            # Keep path, query, but normalize them
            path = parsed.path or "/"
            query = parsed.query
            
            # Reconstruct URL
            normalized = f"{scheme}://{netloc}{path}"
            if query:
                normalized += f"?{query}"
            
            return normalized
            
        except Exception:
            return url.strip()
    
    @classmethod
    def get_url_hash(cls, url: str) -> str:
        """Get SHA-256 hash of normalized URL."""
        normalized = cls.normalize_url(url)
        return hashlib.sha256(normalized.encode()).hexdigest()


class URLScannerService:
    """Main URL scanner service."""
    
    def __init__(self):
        self.provider = get_reputation_provider()
        self.validator = URLValidator()
        self.normalizer = URLNormalizer()

    @staticmethod
    def _coerce_provider_datetime(value: Any) -> datetime | None:
        """
        Convert provider timestamps safely.

        Providers may return datetime, ISO strings, or unix timestamps.
        We normalize all valid values to UTC-aware datetimes.
        """
        if value is None:
            return None

        if isinstance(value, datetime):
            if value.tzinfo is None:
                return value.replace(tzinfo=timezone.utc)
            return value.astimezone(timezone.utc)

        if isinstance(value, (int, float)):
            return datetime.fromtimestamp(float(value), tz=timezone.utc)

        if isinstance(value, str):
            raw = value.strip()
            if not raw:
                return None

            # Support unix timestamps provided as text.
            if re.fullmatch(r"-?\d+(?:\.\d+)?", raw):
                return datetime.fromtimestamp(float(raw), tz=timezone.utc)

            # Support ISO strings ending in Z.
            iso_candidate = raw.replace("Z", "+00:00")
            parsed = datetime.fromisoformat(iso_candidate)
            if parsed.tzinfo is None:
                return parsed.replace(tzinfo=timezone.utc)
            return parsed.astimezone(timezone.utc)

        return None

    @staticmethod
    def _build_local_fallback_result(normalized_url: str, provider_error: str | None = None) -> dict[str, Any]:
        """Analyze static URL indicators without visiting or executing the URL."""
        parsed = urlparse(normalized_url)
        hostname = (parsed.hostname or "").lower()
        path = parsed.path or "/"
        decoded_url = unquote(normalized_url)
        lowered = decoded_url.lower()
        reasons: list[str] = []
        categories: list[str] = ["local static analysis"]
        score = 10

        if parsed.scheme == "http":
            score += 10
            reasons.append("URL uses unencrypted HTTP.")

        if hostname.startswith("xn--") or ".xn--" in hostname:
            score += 25
            reasons.append("Hostname contains punycode, which can be used for lookalike domains.")

        try:
            ipaddress.ip_address(hostname)
            score += 20
            reasons.append("URL uses an IP address as the host.")
        except ValueError:
            pass

        if any(hostname.endswith(tld) for tld in URLValidator.SUSPICIOUS_TLDS):
            score += 20
            reasons.append("Hostname uses a high-risk or frequently abused TLD.")

        labels = [part for part in hostname.split(".") if part]
        if len(labels) > 4:
            score += 12
            reasons.append("Hostname has excessive subdomain depth.")

        suspicious_keywords = {
            "login",
            "verify",
            "update",
            "secure",
            "account",
            "reset",
            "password",
        }
        keyword_hits = sorted(keyword for keyword in suspicious_keywords if keyword in lowered)
        if keyword_hits:
            score += min(30, len(keyword_hits) * 6)
            reasons.append(f"URL contains credential-related keyword(s): {', '.join(keyword_hits)}.")

        if "%" in normalized_url or decoded_url != normalized_url:
            score += 10
            reasons.append("URL contains encoded characters.")

        if len(normalized_url) > 180:
            score += 15
            reasons.append("URL is unusually long.")

        suspicious_extensions = (".exe", ".scr", ".bat", ".cmd", ".ps1", ".vbs", ".js", ".jar", ".zip", ".rar", ".iso")
        if path.lower().endswith(suspicious_extensions):
            score += 25
            reasons.append("URL path ends with a file type often used for payload delivery.")

        has_suspicious_indicators = bool(reasons)

        if not has_suspicious_indicators:
            reasons.append("No obvious suspicious static URL indicators were found.")

        score = max(0, min(100, score))
        if has_suspicious_indicators and score >= 75:
            status = "suspicious"
            severity = "high"
        elif has_suspicious_indicators and score >= 35:
            status = "suspicious"
            severity = "medium"
        elif has_suspicious_indicators:
            status = "unknown"
            severity = "low"
        else:
            status = "unknown"
            severity = "informational"

        if status == "suspicious":
            summary_text = "Suspicious static URL indicators were found."
            recommendation = "Review the static indicators before opening or sharing this URL."
            recommended_actions = [
                "Do not open the URL directly until the indicators are reviewed.",
                "Defang the URL before sharing it.",
                "Correlate the hostname with logs, alerts, and IOC records.",
                "Use external reputation checks if needed.",
            ]
        else:
            summary_text = "No obvious suspicious static indicators were found, but this does not prove the URL is safe."
            recommendation = "Use normal caution. Do not submit credentials unless you trust the site and verify the domain."
            recommended_actions = [
                "Verify the domain carefully.",
                "Do not enter passwords or payment details unless you trust the site.",
                "Use external reputation checks if needed.",
            ]

        confidence_note = (
            "External reputation provider is unavailable. "
            "This result is based only on static URL indicators."
        )

        return {
            "url": normalized_url,
            "normalized_url": normalized_url,
            "status": status,
            "severity": severity,
            "score": score,
            "provider": "local_fallback",
            "mode": "local_fallback",
            "summary": {
                "malicious": 0,
                "suspicious": 1 if status == "suspicious" else 0,
                "harmless": 0,
                "undetected": 1 if status == "unknown" else 0,
            },
            "categories": categories,
            "last_analysis_date": None,
            "recommendation": recommendation,
            "summary_text": summary_text,
            "confidence_note": confidence_note,
            "raw_reference": {"provider_id": "", "permalink": ""},
            "reasons": reasons,
            "parsed_url": {
                "scheme": parsed.scheme,
                "hostname": hostname,
                "path": path,
            },
            "recommended_actions": recommended_actions,
            "safety_model": {
                "visited_url": False,
                "executed_content": False,
                "note": "URL was analyzed using static indicators only.",
            },
            "provider_error": provider_error,
        }
    
    async def scan_url(self, db: Session, url: str, user: User) -> URLScanResult:
        """Scan a URL for reputation."""
        # Validate URL
        is_valid, error_message = self.validator.validate_url(url)
        if not is_valid:
            raise ValueError(error_message)
        
        # Normalize URL
        normalized_url = self.normalizer.normalize_url(url)
        url_hash = self.normalizer.get_url_hash(normalized_url)
        
        # Check cache first
        cached_result = await self._get_cached_result(db, url_hash)
        if cached_result:
            return cached_result
        
        def create_result(normalized_result: dict[str, Any]) -> URLScanResult:
            raw_summary = json.dumps(normalized_result)
            return URLScanResult(
                submitted_url=url.strip(),
                normalized_url=normalized_url,
                url_hash=url_hash,
                status=normalized_result["status"],
                score=normalized_result["score"],
                provider=normalized_result["provider"],
                malicious_count=normalized_result["summary"]["malicious"],
                suspicious_count=normalized_result["summary"]["suspicious"],
                harmless_count=normalized_result["summary"]["harmless"],
                undetected_count=normalized_result["summary"]["undetected"],
                categories=json.dumps(normalized_result.get("categories", [])),
                provider_reference=normalized_result["raw_reference"]["provider_id"],
                raw_summary=raw_summary[:2000],
                last_analysis_date=self._coerce_provider_datetime(normalized_result.get("last_analysis_date")),
                submitted_by_user_id=user.id,
            )

        if not getattr(self.provider, "api_key", ""):
            normalized_result = self._build_local_fallback_result(normalized_url, "External provider API key is not configured.")
            result = create_result(normalized_result)
            db.add(result)
            db.commit()
            db.refresh(result)
            return result

        # Scan with provider
        try:
            raw_result = await self.provider.scan_url(normalized_url)
            normalized_result = self.provider.normalize_result(raw_result)
            
            # Create result record
            result = create_result(normalized_result)
            
            db.add(result)
            db.commit()
            db.refresh(result)
            
            # Cache the result
            await self._cache_result(url_hash, result)
            
            return result
            
        except Exception as e:
            normalized_result = self._build_local_fallback_result(normalized_url, str(e))
            result = create_result(normalized_result)
            
            db.add(result)
            db.commit()
            db.refresh(result)

            recent_result = await self._get_cached_result(db, url_hash)
            if recent_result:
                return recent_result

            # Return a graceful fallback result instead of propagating provider
            # failures to the client after persistence succeeded.
            return result
    
    async def _get_cached_result(self, db: Session, url_hash: str) -> URLScanResult | None:
        """Get cached result if available and recent."""
        cache_ttl_hours = getattr(self.provider, 'cache_ttl_hours', 24)
        cutoff_time = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=cache_ttl_hours)
        
        base_query = db.query(URLScanResult).filter(
            URLScanResult.url_hash == url_hash,
            URLScanResult.created_at >= cutoff_time
        )

        result = base_query.filter(
            URLScanResult.status != "unknown"
        ).order_by(URLScanResult.created_at.desc()).first()

        if result:
            return result

        result = base_query.order_by(URLScanResult.created_at.desc()).first()
        
        return result
    
    async def _cache_result(self, url_hash: str, result: URLScanResult):
        """Cache scan result using short cache."""
        cache_key = f"url_scan:{url_hash}"
        cache_data = {
            "id": result.id,
            "status": result.status,
            "score": result.score,
            "provider": result.provider,
        }
        short_cache.set(cache_key, cache_data, ttl=86400)  # 24 hours
    
    def get_scan_history(self, db: Session, user: User | None = None, limit: int = 50) -> list[URLScanResult]:
        """Get scan history."""
        query = db.query(URLScanResult)
        
        if user:
            query = query.filter(URLScanResult.submitted_by_user_id == user.id)
        
        return query.order_by(URLScanResult.created_at.desc()).limit(limit).all()
    
    def get_scan_result(self, db: Session, result_id: int) -> URLScanResult | None:
        """Get specific scan result."""
        return db.query(URLScanResult).filter(URLScanResult.id == result_id).first()
    
    def get_scan_statistics(self, db: Session, days: int = 7) -> dict[str, Any]:
        """Get scan statistics for the last N days."""
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        total_scans = db.query(URLScanResult).filter(
            URLScanResult.created_at >= cutoff_date
        ).count()
        
        status_counts = {}
        for status in ["safe", "suspicious", "malicious", "unknown"]:
            count = db.query(URLScanResult).filter(
                URLScanResult.created_at >= cutoff_date,
                URLScanResult.status == status
            ).count()
            status_counts[status] = count
        
        malicious_today = db.query(URLScanResult).filter(
            URLScanResult.created_at >= datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0),
            URLScanResult.status == "malicious"
        ).count()
        
        return {
            "total_scans": total_scans,
            "status_counts": status_counts,
            "malicious_today": malicious_today,
            "period_days": days,
        }
