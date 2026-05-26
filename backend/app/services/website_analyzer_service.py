"""
Website Security Analyzer Service.

Performs safe, non-invasive security assessment of websites using only
GET/HEAD requests. No exploitation, no brute-forcing, no form submission.
"""
from __future__ import annotations

import ipaddress
import logging
import re
import socket
import ssl
from collections import defaultdict
from datetime import datetime, timezone
from difflib import SequenceMatcher
from typing import Any
from urllib.parse import urlparse

import httpx

logger = logging.getLogger("logshield.website_analyzer")

USER_AGENT = "LogShield-Security-Analyzer/1.0"
REQUEST_TIMEOUT = 10.0
MAX_REDIRECTS = 5
MAX_RESPONSE_SIZE = 512 * 1024  # 512KB
PASSIVE_FILE_TIMEOUT = 6.0
PASSIVE_FILE_MAX_BYTES = 256 * 1024
TLS_SOCKET_TIMEOUT = 4.0

SENSITIVE_PATHS = [
    "/robots.txt",
    "/sitemap.xml",
    "/.env",
    "/.git/",
    "/backup.zip",
    "/backup.sql",
    "/config.php",
    "/phpinfo.php",
    "/server-status",
    "/admin",
    "/wp-admin",
    "/.git/HEAD",
]

SENSITIVE_DISCLOSURE_KEYWORDS = (
    "staging",
    "dev",
    "backup",
    "old",
    "private",
    "admin",
    "hidden-admin",
    "config",
    "api",
    "v1",
    "test",
    "debug",
    "uploads",
    "database",
    "db",
    "temp",
    "secret",
)

SECURITY_HEADERS_SPEC: list[dict[str, Any]] = [
    {
        "name": "Content-Security-Policy",
        "severity": "medium",
        "owasp": "Security Misconfiguration",
        "impact": "Without CSP, the site is more vulnerable to XSS attacks.",
        "rec": "Add a restrictive Content-Security-Policy header to reduce XSS impact.",
    },
    {
        "name": "Strict-Transport-Security",
        "severity": "high",
        "owasp": "Security Misconfiguration",
        "impact": "Browsers may access the site over insecure HTTP.",
        "rec": "Add HSTS header with an appropriate max-age after confirming HTTPS works site-wide.",
    },
    {
        "name": "X-Frame-Options",
        "severity": "medium",
        "owasp": "Security Misconfiguration",
        "impact": "The site could be embedded in iframes, enabling clickjacking.",
        "rec": "Add X-Frame-Options: DENY or SAMEORIGIN to prevent clickjacking.",
    },
    {
        "name": "X-Content-Type-Options",
        "severity": "low",
        "owasp": "Security Misconfiguration",
        "impact": "Browsers may MIME-sniff responses, leading to content-type confusion.",
        "rec": "Add X-Content-Type-Options: nosniff header.",
    },
    {
        "name": "Referrer-Policy",
        "severity": "low",
        "owasp": "Security Misconfiguration",
        "impact": "Sensitive URL paths may leak via the Referer header.",
        "rec": "Add Referrer-Policy: strict-origin-when-cross-origin or no-referrer.",
    },
    {
        "name": "Permissions-Policy",
        "severity": "low",
        "owasp": "Security Misconfiguration",
        "impact": "Browser features like camera/microphone may be available to embedded content.",
        "rec": "Add a Permissions-Policy header to restrict browser feature access.",
    },
    {
        "name": "Cross-Origin-Opener-Policy",
        "severity": "low",
        "owasp": "Security Misconfiguration",
        "impact": "Cross-origin windows may retain references to this page.",
        "rec": "Add Cross-Origin-Opener-Policy: same-origin header.",
    },
]

SESSION_COOKIE_PATTERNS = re.compile(r"(session|sid|token|auth|jwt|csrf|xsrf)", re.IGNORECASE)
SENSITIVE_COOKIE_NAME_PATTERNS = re.compile(r"(session|sid|token|jwt|auth|access|refresh)", re.IGNORECASE)

SEVERITY_WEIGHTS = {"critical": 25, "high": 15, "medium": 8, "low": 3, "informational": 1}

PRIVATE_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fe80::/10"),
    ipaddress.ip_network("fc00::/7"),
]

KNOWN_PROVIDER_SUFFIXES: list[tuple[str, str]] = [
    ("google.com", "Google"),
    ("googleusercontent.com", "Google"),
    ("microsoft.com", "Microsoft"),
    ("azure.com", "Microsoft Azure"),
    ("amazonaws.com", "AWS"),
    ("cloudfront.net", "AWS CloudFront"),
    ("facebook.com", "Meta"),
    ("meta.com", "Meta"),
    ("github.com", "GitHub"),
    ("vercel.app", "Vercel"),
    ("netlify.app", "Netlify"),
    ("cloudflare.com", "Cloudflare"),
    ("cloudflarepages.com", "Cloudflare Pages"),
]

GENERIC_SERVER_HEADER_VALUES = (
    "esf",
    "cloudflare",
    "google frontend",
    "akamaighost",
    "nginx",
    "apache",
)

HIDDEN_STYLE_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("display:none", re.compile(r"display\s*:\s*none", re.I)),
    ("visibility:hidden", re.compile(r"visibility\s*:\s*hidden", re.I)),
    ("opacity:0", re.compile(r"opacity\s*:\s*0(?:\D|$)", re.I)),
    ("height:0", re.compile(r"height\s*:\s*0(?:\D|$)", re.I)),
    ("width:0", re.compile(r"width\s*:\s*0(?:\D|$)", re.I)),
    ("font-size:0", re.compile(r"font-size\s*:\s*0(?:\D|$)", re.I)),
    ("text-indent:-9999px", re.compile(r"text-indent\s*:\s*-\d{3,}\s*px", re.I)),
    ("left:-9999px", re.compile(r"left\s*:\s*-\d{3,}\s*px", re.I)),
    ("top:-9999px", re.compile(r"top\s*:\s*-\d{3,}\s*px", re.I)),
]

HIDDEN_SEO_KEYWORDS: tuple[str, ...] = (
    "casino",
    "poker",
    "gambling",
    "betting",
    "viagra",
    "cialis",
    "pharmacy",
    "hacked by",
    "owned by",
    "shell",
    "webshell",
    "free money",
    "crypto giveaway",
    "loan",
    "payday",
)

ENV_EXPOSURE_PATTERNS: tuple[str, ...] = (
    "DATABASE_URL",
    "DB_PASSWORD",
    "DB_USERNAME",
    "SECRET_KEY",
    "API_KEY",
    "ACCESS_TOKEN",
    "JWT_SECRET",
    "PRIVATE_KEY",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "SMTP_PASSWORD",
    "STRIPE_SECRET",
    "SUPABASE_SERVICE_ROLE",
    "OPENAI_API_KEY",
)

SQL_DUMP_PATTERNS: tuple[str, ...] = (
    "CREATE TABLE",
    "INSERT INTO",
    "DROP TABLE",
    "ALTER TABLE",
    "mysqldump",
    "PostgreSQL database dump",
    "-- Dumped by",
    "COPY public.",
    "LOCK TABLES",
)

SERVER_STATUS_PATTERNS: tuple[str, ...] = (
    "Apache Server Status",
    "Server Version",
    "Server MPM",
    "Current Time",
    "Restart Time",
    "Total accesses",
    "CPU Usage",
    "Scoreboard",
)

ADMIN_PATTERNS: tuple[str, ...] = (
    "type=\"password\"",
    "type='password'",
    "<form",
    "admin login",
    "administrator",
    "dashboard",
    "csrf",
    "login",
)

WP_ADMIN_PATTERNS: tuple[str, ...] = (
    "wp-login.php",
    "WordPress",
    "wp-admin",
    "wp-submit",
    "loginform",
    "wordpress_test_cookie",
)

DEFACEMENT_PHRASES: tuple[str, ...] = ("hacked by", "owned by", "webshell")
SUSPICIOUS_LINK_TERMS: tuple[str, ...] = (
    "casino",
    "bet",
    "poker",
    "viagra",
    "cialis",
    "loan",
    "crypto",
    "giveaway",
    "payday",
    "password",
    "login",
)


# ---------------------------------------------------------------------------
# URL validation
# ---------------------------------------------------------------------------


def validate_url(url: str) -> str:
    """Validate and normalize the URL. Raises ValueError on invalid input."""
    url = url.strip()
    if not url:
        raise ValueError("Please enter a valid URL starting with http:// or https://.")

    parsed = urlparse(url)
    scheme = parsed.scheme.lower()
    if scheme not in ("http", "https"):
        raise ValueError("Please enter a valid URL starting with http:// or https://.")

    hostname = parsed.hostname
    if not hostname:
        raise ValueError("Please enter a valid URL with a hostname.")

    if any(s in url.lower() for s in ("javascript:", "file:", "data:", "ftp:")):
        raise ValueError("This URL scheme is not allowed for safety reasons.")

    _check_private_host(hostname)
    return url


def _check_private_host(hostname: str) -> None:
    """Block localhost, private IPs, and cloud metadata endpoints."""
    lower = hostname.lower()
    if lower in ("localhost", "metadata.google.internal"):
        raise ValueError("This target is not allowed for safety reasons.")

    try:
        infos = socket.getaddrinfo(hostname, None, socket.AF_UNSPEC, socket.SOCK_STREAM)
        for info in infos:
            addr = info[4][0]
            ip = ipaddress.ip_address(addr)
            for net in PRIVATE_NETWORKS:
                if ip in net:
                    raise ValueError("This target is not allowed for safety reasons.")
    except socket.gaierror:
        raise ValueError("Could not resolve hostname. Please check the URL.")
    except ValueError as exc:
        if "not allowed" in str(exc) or "resolve" in str(exc):
            raise


def detect_provider_context(hostname: str) -> dict[str, Any]:
    """
    Detect whether hostname likely belongs to a managed major provider.
    This context is advisory only and never suppresses findings.
    """
    lower = hostname.lower().strip()
    provider_family: str | None = None
    for suffix, family in KNOWN_PROVIDER_SUFFIXES:
        if lower == suffix or lower.endswith(f".{suffix}"):
            provider_family = family
            break

    known = provider_family is not None
    if known:
        note = (
            "This domain appears to belong to a major technology provider. "
            "Some headers may be customized for platform-specific architecture. "
            "Findings are still reported, but lower-impact disclosure issues may be tuned with context."
        )
    else:
        note = "No known major provider context was detected from the hostname."
    return {
        "known_provider_domain": known,
        "provider_family": provider_family,
        "note": note,
        "adjusted_findings": 0,
    }


def enrich_provider_context_from_headers(provider_context: dict[str, Any], headers: dict[str, str]) -> dict[str, Any]:
    """
    Enrich provider context using passive response-header hints only.
    This does not suppress findings; it improves interpretation wording.
    """
    lower_headers = {k.lower(): str(v).lower() for k, v in (headers or {}).items()}
    server_value = lower_headers.get("server", "")
    cloudflare_detected = (
        "cloudflare" in server_value
        or "cf-ray" in lower_headers
        or "cf-cache-status" in lower_headers
    )

    if cloudflare_detected:
        provider_context["known_provider_domain"] = True
        provider_context["provider_family"] = provider_context.get("provider_family") or "Cloudflare"
        provider_context["note"] = "Cloudflare edge/proxy detected from response headers."
        return provider_context

    return provider_context


def _severity_priority(value: str) -> int:
    return {"critical": 0, "high": 1, "medium": 2, "low": 3, "informational": 4}.get(value, 5)


def _maybe_adjust_severity(
    original: str,
    adjusted: str,
    reason: str,
    analyst_note: str | None = None,
) -> tuple[str, str | None, str | None, str | None]:
    if _severity_priority(adjusted) >= _severity_priority(original):
        return adjusted, original, reason, analyst_note
    return original, None, None, analyst_note


# ---------------------------------------------------------------------------
# Individual check modules
# ---------------------------------------------------------------------------


async def _fetch_page(url: str) -> tuple[httpx.Response | None, str | None]:
    """Fetch the URL safely, returning response and error message."""
    try:
        async with httpx.AsyncClient(
            timeout=REQUEST_TIMEOUT,
            max_redirects=MAX_REDIRECTS,
            follow_redirects=True,
            headers={"User-Agent": USER_AGENT},
            verify=True,
        ) as client:
            resp = await client.get(url)
            return resp, None
    except httpx.TooManyRedirects:
        return None, "Too many redirects detected."
    except httpx.TimeoutException:
        return None, "The website did not respond in time. Try again later."
    except httpx.ConnectError:
        return None, "Could not connect to the website."
    except Exception as exc:
        logger.warning("Fetch error for %s: %s", url, exc)
        return None, f"Connection error: {type(exc).__name__}"


async def _fetch_origin_text(origin: str, path: str) -> dict[str, Any]:
    """
    Fetch a known public text resource from the same origin.
    Uses a strict timeout and response-size cap.
    """
    url = f"{origin}{path}"
    result: dict[str, Any] = {
        "url": url,
        "status_code": None,
        "fetched": False,
        "error": None,
        "content_type": "",
        "size_limited": False,
        "text": "",
    }

    try:
        async with httpx.AsyncClient(
            timeout=PASSIVE_FILE_TIMEOUT,
            max_redirects=2,
            follow_redirects=True,
            headers={"User-Agent": USER_AGENT},
            verify=True,
        ) as client:
            async with client.stream("GET", url) as response:
                result["status_code"] = response.status_code
                result["content_type"] = response.headers.get("content-type", "")
                if response.status_code >= 400:
                    return result

                chunks: list[bytes] = []
                total = 0
                async for chunk in response.aiter_bytes():
                    if not chunk:
                        continue
                    total += len(chunk)
                    if total > PASSIVE_FILE_MAX_BYTES:
                        chunks.append(chunk[: PASSIVE_FILE_MAX_BYTES - (total - len(chunk))])
                        result["size_limited"] = True
                        break
                    chunks.append(chunk)

                raw = b"".join(chunks)
                result["text"] = raw.decode("utf-8", errors="replace")
                result["fetched"] = True
    except Exception as exc:
        result["error"] = type(exc).__name__
    return result


def check_https(url: str, response: httpx.Response | None) -> dict[str, Any]:
    """Check HTTPS usage and certificate info."""
    parsed = urlparse(url)
    result: dict[str, Any] = {
        "uses_https": parsed.scheme == "https",
        "final_scheme": parsed.scheme,
        "redirect_count": 0,
        "certificate": None,
    }

    if response is not None:
        result["final_scheme"] = str(response.url.scheme)
        result["redirect_count"] = len(response.history)
        result["final_url"] = str(response.url)
        result["uses_https"] = str(response.url.scheme) == "https"

    hostname = parsed.hostname or ""
    try:
        ctx = ssl.create_default_context()
        with ctx.wrap_socket(socket.socket(), server_hostname=hostname) as sock:
            sock.settimeout(TLS_SOCKET_TIMEOUT)
            sock.connect((hostname, 443))
            cert = sock.getpeercert()
            if cert:
                not_after = cert.get("notAfter", "")
                if not_after:
                    exp = datetime.strptime(not_after, "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
                    days_left = (exp - datetime.now(timezone.utc)).days
                    issuer_parts = cert.get("issuer", ())
                    issuer_str = ""
                    for rdn in issuer_parts:
                        for attr in rdn:
                            if attr[0] in ("organizationName", "commonName"):
                                issuer_str = attr[1]
                                break
                        if issuer_str:
                            break
                    result["certificate"] = {
                        "issuer": issuer_str,
                        "expires": not_after,
                        "days_until_expiry": days_left,
                    }
    except Exception:
        pass

    return result


def _probe_tls_version_sync(hostname: str, tls_version: Any, label: str) -> dict[str, str]:
    """
    Safe single-handshake TLS probe for one explicit version.
    Returns supported / not_supported / inconclusive.
    """
    if tls_version is None:
        return {"status": "inconclusive", "reason": f"{label} probing is unavailable in this runtime."}

    try:
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE
        context.minimum_version = tls_version
        context.maximum_version = tls_version

        with socket.create_connection((hostname, 443), timeout=TLS_SOCKET_TIMEOUT) as raw_sock:
            with context.wrap_socket(raw_sock, server_hostname=hostname):
                return {"status": "supported", "reason": f"{label} handshake succeeded."}
    except ssl.SSLError as exc:
        text = str(exc).lower()
        if "no ciphers" in text or "unsupported protocol" in text:
            return {"status": "inconclusive", "reason": f"{label} probe unsupported by local OpenSSL policy."}
        return {"status": "not_supported", "reason": f"{label} handshake rejected by server."}
    except OSError:
        return {"status": "inconclusive", "reason": "Could not complete TLS probe to target host."}


async def check_tls_versions(url: str, final_scheme: str) -> dict[str, Any]:
    """Check legacy TLS support on HTTPS targets using one handshake per version."""
    parsed = urlparse(url)
    hostname = parsed.hostname or ""
    if not hostname or final_scheme != "https":
        return {
            "checked": False,
            "hostname": hostname,
            "port": 443,
            "tls_1_0": {"status": "inconclusive", "reason": "Target is not HTTPS."},
            "tls_1_1": {"status": "inconclusive", "reason": "Target is not HTTPS."},
            "recommendation": "Use HTTPS with TLS 1.2+ or TLS 1.3.",
        }

    tls_v = getattr(ssl, "TLSVersion", None)
    tls_1_0 = getattr(tls_v, "TLSv1", None) if tls_v else None
    tls_1_1 = getattr(tls_v, "TLSv1_1", None) if tls_v else None

    probe_10 = await asyncio_to_thread(_probe_tls_version_sync, hostname, tls_1_0, "TLS 1.0")
    probe_11 = await asyncio_to_thread(_probe_tls_version_sync, hostname, tls_1_1, "TLS 1.1")
    return {
        "checked": True,
        "hostname": hostname,
        "port": 443,
        "tls_1_0": probe_10,
        "tls_1_1": probe_11,
        "recommendation": "Disable TLS 1.0/1.1 and enforce TLS 1.2+ or TLS 1.3.",
    }


def check_security_headers(headers: dict[str, str]) -> list[dict[str, Any]]:
    """Analyze security headers."""
    results = []
    lower_headers = {k.lower(): v for k, v in headers.items()}

    for spec in SECURITY_HEADERS_SPEC:
        name_lower = spec["name"].lower()
        present = name_lower in lower_headers
        results.append(
            {
                "header": spec["name"],
                "present": present,
                "value": lower_headers.get(name_lower, ""),
                "severity": spec["severity"],
                "owasp": spec["owasp"],
                "impact": spec["impact"],
                "recommendation": spec["rec"],
            }
        )
    return results


def analyze_csp(headers: dict[str, str], provider_context: dict[str, Any]) -> dict[str, Any]:
    """Deep CSP quality analysis with context-aware severity tuning."""
    lower_headers = {k.lower(): v for k, v in headers.items()}
    csp_value = lower_headers.get("content-security-policy", "").strip()
    xfo_present = "x-frame-options" in lower_headers
    is_known_provider = bool(provider_context.get("known_provider_domain"))

    result: dict[str, Any] = {
        "present": bool(csp_value),
        "raw": csp_value,
        "directives": {},
        "issues": [],
        "risk_level": "low",
    }

    if not csp_value:
        result["issues"].append(
            {
                "id": "csp-missing",
                "severity": "medium",
                "confidence": "high",
                "title": "Content-Security-Policy header is missing",
                "evidence": "No Content-Security-Policy header was detected.",
                "impact": "Without CSP, XSS impact can be significantly higher.",
                "recommendation": "Add a restrictive Content-Security-Policy header.",
            }
        )
        result["risk_level"] = "medium"
        return result

    directives: dict[str, list[str]] = {}
    for directive_blob in csp_value.split(";"):
        blob = directive_blob.strip()
        if not blob:
            continue
        parts = blob.split()
        name = parts[0].lower()
        values = parts[1:]
        directives[name] = values
    result["directives"] = directives

    def add_issue(
        issue_id: str,
        severity: str,
        title: str,
        evidence: str,
        impact: str,
        recommendation: str,
        confidence: str = "high",
        analyst_note: str | None = None,
        original_severity: str | None = None,
        adjustment_reason: str | None = None,
    ) -> None:
        result["issues"].append(
            {
                "id": issue_id,
                "severity": severity,
                "confidence": confidence,
                "analyst_note": analyst_note,
                "original_severity": original_severity,
                "adjustment_reason": adjustment_reason,
                "title": title,
                "evidence": evidence,
                "impact": impact,
                "recommendation": recommendation,
            }
        )

    default_src = directives.get("default-src", [])
    script_src = directives.get("script-src", [])
    connect_src = directives.get("connect-src", [])
    img_src = directives.get("img-src", [])
    has_nonce_or_hash = any(
        value.startswith("'nonce-")
        or value.startswith("'sha256-")
        or value.startswith("'sha384-")
        or value.startswith("'sha512-")
        for value in script_src
    )

    if default_src and "*" in default_src:
        add_issue(
            "csp-default-src-wildcard",
            "high",
            "Overly broad default-src wildcard",
            "default-src contains '*' which allows broad resource loading.",
            "A broad default policy weakens client-side protection if script injection occurs.",
            "Replace wildcard default-src with restrictive trusted origins.",
        )

    if script_src and "*" in script_src:
        sev = "medium" if is_known_provider else "high"
        note = (
            "Wildcard use in script-src can be present in complex managed deployments, but it still broadens script trust."
            if is_known_provider
            else None
        )
        add_issue(
            "csp-script-src-wildcard",
            sev,
            "script-src uses wildcard",
            "script-src contains '*'.",
            "Wildcard script sources can increase exposure to malicious script inclusion.",
            "Use explicit trusted origins in script-src.",
            confidence="high" if not is_known_provider else "medium",
            analyst_note=note,
        )

    if connect_src and "*" in connect_src:
        add_issue(
            "csp-connect-src-wildcard",
            "medium",
            "connect-src uses wildcard",
            "connect-src contains '*'.",
            "Broad outbound connection policy can increase data exfiltration and abuse surface in browser contexts.",
            "Use explicit trusted endpoints in connect-src where possible.",
            confidence="medium" if is_known_provider else "high",
            analyst_note=(
                "Some complex SaaS applications use broader connect-src policies for multi-service APIs. "
                "This should still be justified and minimized."
                if is_known_provider
                else None
            ),
        )

    if img_src and "*" in img_src:
        add_issue(
            "csp-img-src-wildcard",
            "low",
            "img-src uses wildcard",
            "img-src contains '*'.",
            "Wildcard image sources are less risky than script wildcards but still broaden external resource trust.",
            "Limit img-src to trusted domains where feasible.",
        )

    if "'unsafe-inline'" in script_src:
        severity = "high"
        original_severity = None
        adjustment_reason = None
        analyst_note = None
        confidence = "high"
        if has_nonce_or_hash:
            severity = "medium"
            original_severity = "high"
            adjustment_reason = "Nonce/hash-based CSP controls detected alongside unsafe-inline."
            analyst_note = (
                "unsafe-inline was detected, but nonce/hash controls were also present. "
                "This reduces exploitability compared to a fully open policy."
            )
            confidence = "medium"
        add_issue(
            "csp-unsafe-inline",
            severity,
            "script-src allows unsafe-inline",
            "script-src includes 'unsafe-inline'.",
            "Inline scripts can increase XSS exploitability.",
            "Replace unsafe-inline with nonces or hashes for approved scripts.",
            confidence=confidence,
            analyst_note=analyst_note,
            original_severity=original_severity,
            adjustment_reason=adjustment_reason,
        )

    if "'unsafe-eval'" in script_src:
        severity = "medium" if is_known_provider else "high"
        add_issue(
            "csp-unsafe-eval",
            severity,
            "script-src allows unsafe-eval",
            "script-src includes 'unsafe-eval'.",
            "unsafe-eval enables execution patterns frequently abused in script injection chains.",
            "Remove unsafe-eval and refactor code that depends on eval-like behavior.",
            confidence="high" if not is_known_provider else "medium",
            analyst_note=(
                "Some complex web applications use unsafe-eval for runtime framework behavior. "
                "This still weakens CSP and should be explicitly justified."
                if is_known_provider
                else None
            ),
            original_severity="high" if is_known_provider else None,
            adjustment_reason="Known provider context suggests complex runtime behavior; finding remains visible."
            if is_known_provider
            else None,
        )

    if "object-src" not in directives:
        severity = "medium"
        analyst_note = None
        original_severity = None
        adjustment_reason = None
        confidence = "high"
        if default_src == ["'none'"]:
            severity = "low"
            original_severity = "medium"
            adjustment_reason = "default-src 'none' provides restrictive fallback behavior."
            analyst_note = "object-src is missing, but default-src 'none' reduces plugin/object execution exposure."
            confidence = "medium"
        add_issue(
            "csp-object-src-missing",
            severity,
            "object-src directive is missing",
            "CSP does not define object-src.",
            "Browser plugin/object content may be less constrained.",
            "Set object-src 'none' unless plugin content is required.",
            confidence=confidence,
            analyst_note=analyst_note,
            original_severity=original_severity,
            adjustment_reason=adjustment_reason,
        )

    if "base-uri" not in directives:
        add_issue(
            "csp-base-uri-missing",
            "low",
            "base-uri directive is missing",
            "CSP does not define base-uri.",
            "Attackers may abuse document base URL behavior in some injection scenarios.",
            "Set base-uri 'self' (or stricter) to constrain base URL changes.",
        )

    if "upgrade-insecure-requests" not in directives:
        add_issue(
            "csp-upgrade-insecure-missing",
            "low",
            "upgrade-insecure-requests is missing",
            "CSP does not include upgrade-insecure-requests.",
            "Mixed content upgrade behavior is not explicitly enforced by CSP.",
            "Consider adding upgrade-insecure-requests for HTTPS sites.",
        )

    if "frame-ancestors" not in directives and not xfo_present:
        add_issue(
            "csp-frame-ancestors-missing",
            "medium",
            "No frame embedding policy detected",
            "CSP frame-ancestors is missing and X-Frame-Options is also absent.",
            "The site may be exposed to clickjacking if embedding is not restricted elsewhere.",
            "Add frame-ancestors in CSP or X-Frame-Options header.",
        )

    max_sev = "low"
    if any(i["severity"] == "high" for i in result["issues"]):
        max_sev = "high"
    elif any(i["severity"] == "medium" for i in result["issues"]):
        max_sev = "medium"
    result["risk_level"] = max_sev
    return result


def check_cookies(headers: httpx.Headers) -> list[dict[str, Any]]:
    """Analyze Set-Cookie headers for security flags."""
    results = []
    raw_cookies = headers.get_list("set-cookie")

    for raw in raw_cookies:
        parts = raw.split(";")
        name_val = parts[0].strip()
        eq = name_val.find("=")
        name = name_val[:eq].strip() if eq > 0 else name_val.strip()
        flags_str = raw.lower()

        is_session = bool(SESSION_COOKIE_PATTERNS.search(name))
        has_domain = False
        path = ""
        for attr in parts[1:]:
            token = attr.strip()
            low = token.lower()
            if low.startswith("domain="):
                has_domain = True
            if low.startswith("path="):
                path = token[5:].strip()

        entry: dict[str, Any] = {
            "name": name,
            "value": "[REDACTED]",
            "secure": "secure" in flags_str,
            "httponly": "httponly" in flags_str,
            "samesite": "none",
            "is_session_cookie": is_session,
            "has_domain_attr": has_domain,
            "path": path,
        }
        if "samesite=strict" in flags_str:
            entry["samesite"] = "strict"
        elif "samesite=lax" in flags_str:
            entry["samesite"] = "lax"
        elif "samesite=none" in flags_str:
            entry["samesite"] = "none"
        else:
            entry["samesite"] = "missing"

        results.append(entry)
    return results


def analyze_cookie_prefixes(cookie_results: list[dict[str, Any]]) -> dict[str, Any]:
    """Check sensitive cookie names for secure prefixes and __Host- constraints."""
    review: dict[str, Any] = {"sensitive_cookies": [], "issues": []}
    for cookie in cookie_results:
        name = str(cookie.get("name", ""))
        if not SENSITIVE_COOKIE_NAME_PATTERNS.search(name):
            continue

        has_secure_prefix = name.startswith("__Secure-")
        has_host_prefix = name.startswith("__Host-")
        has_domain_attr = bool(cookie.get("has_domain_attr"))
        path = str(cookie.get("path", "")).strip()
        secure = bool(cookie.get("secure"))

        cookie_view = {
            "name": name,
            "prefix": "__Host-" if has_host_prefix else "__Secure-" if has_secure_prefix else "none",
            "secure": secure,
            "httponly": bool(cookie.get("httponly")),
            "samesite": cookie.get("samesite", "missing"),
            "host_prefix_constraints_ok": True,
        }

        if not has_secure_prefix and not has_host_prefix:
            review["issues"].append(
                {
                    "id": "cookie-prefix-missing",
                    "cookie_name": name,
                    "severity": "medium" if cookie.get("is_session_cookie") else "low",
                    "title": "Sensitive cookie does not use a secure prefix",
                    "evidence": f"Sensitive cookie '{name}' is missing __Secure- or __Host- prefix.",
                    "impact": "Prefix hardening helps reduce cookie misuse risk in misconfiguration scenarios.",
                    "recommendation": "Use __Host- for host-bound sensitive cookies where possible, otherwise use __Secure-.",
                }
            )

        if has_host_prefix:
            host_ok = secure and not has_domain_attr and path == "/"
            cookie_view["host_prefix_constraints_ok"] = host_ok
            if not host_ok:
                review["issues"].append(
                    {
                        "id": "cookie-host-prefix-constraints",
                        "cookie_name": name,
                        "severity": "high" if cookie.get("is_session_cookie") else "medium",
                        "title": "__Host- cookie violates required constraints",
                        "evidence": (
                            f"Cookie '{name}' with __Host- must be Secure, have Path=/, and no Domain attribute. "
                            f"Detected Secure={secure}, Path='{path or '[missing]'}', DomainAttr={has_domain_attr}."
                        ),
                        "impact": "Misconfigured __Host- cookies may not deliver intended host-bound security guarantees.",
                        "recommendation": "For __Host- cookies set Secure, Path=/, and omit Domain attribute.",
                    }
                )

        review["sensitive_cookies"].append(cookie_view)
    return review


async def analyze_robots(base_url: str) -> dict[str, Any]:
    """Passively fetch and analyze robots.txt without following discovered paths."""
    parsed = urlparse(base_url)
    origin = f"{parsed.scheme}://{parsed.netloc}"
    fetched = await _fetch_origin_text(origin, "/robots.txt")
    text = fetched.get("text", "")

    disallow_entries: list[str] = []
    sensitive_entries: list[dict[str, str]] = []
    if fetched.get("fetched") and isinstance(text, str):
        for raw_line in text.splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#"):
                continue
            if line.lower().startswith("disallow:"):
                value = line.split(":", 1)[1].strip()
                if not value:
                    continue
                disallow_entries.append(value)
                lower_value = value.lower()
                for keyword in SENSITIVE_DISCLOSURE_KEYWORDS:
                    if keyword in lower_value:
                        sensitive_entries.append({"path": value, "keyword": keyword})
                        break

    return {
        "url": fetched["url"],
        "status_code": fetched["status_code"],
        "fetched": fetched["fetched"],
        "error": fetched["error"],
        "size_limited": fetched["size_limited"],
        "disallow_count": len(disallow_entries),
        "sensitive_disallow_paths": sensitive_entries,
    }


async def analyze_sitemap(base_url: str) -> dict[str, Any]:
    """Passively fetch sitemap.xml and analyze contents only as text."""
    parsed = urlparse(base_url)
    origin = f"{parsed.scheme}://{parsed.netloc}"
    fetched = await _fetch_origin_text(origin, "/sitemap.xml")
    text = fetched.get("text", "")

    loc_values: list[str] = []
    sensitive_urls: list[dict[str, str]] = []
    http_urls: list[str] = []

    if fetched.get("fetched") and isinstance(text, str):
        loc_values = [value.strip() for value in re.findall(r"<loc>(.*?)</loc>", text, flags=re.I | re.S) if value.strip()]
        for loc in loc_values:
            lower = loc.lower()
            if lower.startswith("http://"):
                http_urls.append(loc)
            for keyword in SENSITIVE_DISCLOSURE_KEYWORDS:
                if keyword in lower:
                    sensitive_urls.append({"url": loc, "keyword": keyword})
                    break

    return {
        "url": fetched["url"],
        "status_code": fetched["status_code"],
        "fetched": fetched["fetched"],
        "error": fetched["error"],
        "size_limited": fetched["size_limited"],
        "url_count": len(loc_values),
        "sensitive_url_count": len(sensitive_urls),
        "sensitive_url_samples": sensitive_urls[:8],
        "http_url_count": len(http_urls),
        "http_url_samples": http_urls[:6],
    }


def _html_title(body: str) -> str:
    match = re.search(r"<title[^>]*>(.*?)</title>", body or "", re.I | re.S)
    return re.sub(r"\s+", " ", match.group(1)).strip().lower() if match else ""


def _asset_refs(body: str) -> set[str]:
    refs = re.findall(r"""(?:src|href)=["']([^"']+\.(?:js|css)(?:\?[^"']*)?)["']""", body or "", re.I)
    return {ref.split("?")[0] for ref in refs[:30]}


def _normalized_html_text(body: str, limit: int = 6000) -> str:
    text = re.sub(r"<script[^>]*>.*?</script>", " ", body or "", flags=re.I | re.S)
    text = re.sub(r"<style[^>]*>.*?</style>", " ", text, flags=re.I | re.S)
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip().lower()[:limit]


def looks_like_same_homepage(path_body: str, homepage_body: str, content_type: str) -> bool:
    """Detect SPA/history fallback where unknown paths return the same app shell."""
    lower_ct = (content_type or "").lower()
    if "text/html" not in lower_ct:
        return False

    path_lower = (path_body or "").lower()
    home_lower = (homepage_body or "").lower()
    if "<html" not in path_lower or "<html" not in home_lower:
        return False

    score = 0
    for marker in ('id="root"', "id='root'", 'id="app"', "id='app'"):
        if marker in path_lower and marker in home_lower:
            score += 2
            break

    if _html_title(path_body) and _html_title(path_body) == _html_title(homepage_body):
        score += 2

    path_assets = _asset_refs(path_body)
    home_assets = _asset_refs(homepage_body)
    if path_assets and home_assets:
        overlap = len(path_assets & home_assets) / max(len(path_assets | home_assets), 1)
        if overlap >= 0.55:
            score += 2

    home_len = max(len(homepage_body or ""), 1)
    length_ratio = abs(len(path_body or "") - home_len) / home_len
    if length_ratio <= 0.18:
        score += 1

    similarity = SequenceMatcher(None, _normalized_html_text(path_body), _normalized_html_text(homepage_body)).ratio()
    if similarity >= 0.86:
        score += 3
    elif similarity >= 0.74:
        score += 1

    return score >= 4


def _safe_response_snippet(path: str, body: str, matches: list[str] | None = None) -> str:
    """Return short evidence without exposing sensitive values."""
    if matches:
        if path == "/.env":
            return "Matched environment variable key(s): " + ", ".join(sorted(set(matches))[:8])
        return "Matched pattern(s): " + ", ".join(sorted(set(matches))[:8])
    return _sanitize_html_text_snippet(body, 160)


def _contains_any(body: str, patterns: tuple[str, ...], case_sensitive: bool = False) -> list[str]:
    haystack = body if case_sensitive else body.lower()
    found: list[str] = []
    for pattern in patterns:
        needle = pattern if case_sensitive else pattern.lower()
        if needle in haystack:
            found.append(pattern)
    return found


def classify_sensitive_path(path: str, status_code: int | None, content_type: str, body: str, homepage_body: str) -> dict[str, Any]:
    if status_code is None:
        classification = "inconclusive"
        reason = "Request failed or timed out."
        matches: list[str] = []
    elif status_code in (401, 403):
        classification = "protected"
        reason = "Path appears protected or access is denied."
        matches = []
    elif status_code in (404, 410):
        classification = "not_found"
        reason = "Path was not found."
        matches = []
    elif status_code >= 400:
        classification = "inconclusive"
        reason = "LogShield could not confirm exposure from this response."
        matches = []
    elif looks_like_same_homepage(body, homepage_body, content_type):
        classification = "spa_fallback"
        reason = (
            "The path returned HTTP 200, but the response appears to be the normal application shell "
            "due to SPA fallback routing. No sensitive content exposure was confirmed."
        )
        matches = []
    else:
        lower_ct = (content_type or "").lower()
        matches = []
        classification = "generic_html" if "text/html" in lower_ct else "inconclusive"
        reason = (
            "The path returned a generic HTML response, but no sensitive content pattern was confirmed."
            if classification == "generic_html"
            else "LogShield could not confirm exposure from this response."
        )

        if path == "/.env":
            matches = [key for key in ENV_EXPOSURE_PATTERNS if re.search(rf"(^|\n)\s*{re.escape(key)}\s*=", body, re.I)]
            if matches:
                classification = "confirmed_exposed"
                reason = "Environment-style key/value content was observed."
        elif path == "/backup.sql":
            matches = _contains_any(body, SQL_DUMP_PATTERNS)
            if matches:
                classification = "confirmed_exposed"
                reason = "SQL dump indicators were observed."
        elif path == "/server-status":
            matches = _contains_any(body, SERVER_STATUS_PATTERNS)
            if matches:
                classification = "confirmed_exposed"
                reason = "Apache server-status indicators were observed."
        elif path == "/admin":
            matches = _contains_any(body, ADMIN_PATTERNS)
            has_form = "<form" in body.lower()
            has_password = "type=\"password\"" in body.lower() or "type='password'" in body.lower()
            if has_password or (has_form and any(item in [m.lower() for m in matches] for item in ("login", "csrf"))):
                classification = "confirmed_exposed"
                reason = "A real admin login or dashboard surface appears to be present."
        elif path == "/wp-admin":
            matches = _contains_any(body, WP_ADMIN_PATTERNS)
            if matches:
                classification = "confirmed_exposed"
                reason = "WordPress admin/login indicators were observed."
        elif path in ("/.git/", "/.git/HEAD"):
            matches = _contains_any(body, ("ref: refs/heads/", "[core]", "repositoryformatversion"))
            if matches:
                classification = "confirmed_exposed"
                reason = "Git repository metadata indicators were observed."
        elif path == "/config.php":
            matches = _contains_any(body, ("<?php", "$db", "DB_PASSWORD", "mysqli_connect", "PDO("), case_sensitive=True)
            if matches:
                classification = "confirmed_exposed"
                reason = "Configuration source indicators were observed."
        elif path == "/phpinfo.php":
            matches = _contains_any(body, ("phpinfo()", "PHP Version", "Loaded Configuration File", "_SERVER["))
            if matches:
                classification = "confirmed_exposed"
                reason = "PHP info page indicators were observed."
        elif path == "/backup.zip":
            if "zip" in lower_ct or body[:4].encode("utf-8", errors="ignore").startswith(b"PK"):
                classification = "confirmed_exposed"
                reason = "Backup archive content type or ZIP signature was observed."

    confirmed = classification == "confirmed_exposed"
    if confirmed and path == "/.env":
        evidence = "Matched environment variable key: " + ", ".join(sorted(set(matches))[:8])
    elif confirmed and path == "/backup.sql":
        evidence = "Matched SQL dump pattern: " + ", ".join(sorted(set(matches))[:8])
    elif confirmed:
        evidence = _safe_response_snippet(path, body, matches)
    else:
        evidence = reason

    risk_impact = "none"
    if confirmed:
        risk_impact = {
            "/.env": "critical",
            "/backup.sql": "high",
            "/server-status": "medium",
            "/admin": "medium",
            "/wp-admin": "medium",
        }.get(path, "high")

    return {
        "classification": classification,
        "confirmed": confirmed,
        "confirmed_exposed": confirmed,
        "risk_impact": risk_impact,
        "reason": reason,
        "evidence": evidence,
        "matched_evidence": matches,
        "response_body_snippet": _safe_response_snippet(path, body, matches),
        "finding_created": confirmed,
    }


async def check_exposed_paths(base_url: str) -> list[dict[str, Any]]:
    """Check a small list of common sensitive paths using safe GET and content confirmation."""
    parsed = urlparse(base_url)
    origin = f"{parsed.scheme}://{parsed.netloc}"
    results = []

    async with httpx.AsyncClient(
        timeout=5.0,
        max_redirects=2,
        follow_redirects=True,
        headers={"User-Agent": USER_AGENT},
        verify=True,
    ) as client:
        homepage_body = ""
        try:
            homepage = await client.get(f"{origin}/")
            homepage_body = homepage.text[:MAX_RESPONSE_SIZE]
        except Exception:
            homepage_body = ""

        for path in SENSITIVE_PATHS[:12]:
            path_url = f"{origin}{path}"
            try:
                resp = await client.get(path_url)
                ct = resp.headers.get("content-type", "")
                cl = resp.headers.get("content-length", "")
                body = resp.text[:MAX_RESPONSE_SIZE] if resp.status_code < 400 else ""
                classification = classify_sensitive_path(path, resp.status_code, ct, body, homepage_body)
                results.append(
                    {
                        "path": path,
                        "status_code": resp.status_code,
                        "content_type": ct[:80],
                        "content_length": cl,
                        "response_size": len(body.encode("utf-8", errors="ignore")),
                        "final_url": str(resp.url),
                        "accessible": classification["confirmed_exposed"],
                        **classification,
                    }
                )
            except Exception:
                results.append(
                    {
                        "path": path,
                        "status_code": None,
                        "content_type": "",
                        "content_length": "",
                        "response_size": 0,
                        "final_url": path_url,
                        "accessible": False,
                        "classification": "inconclusive",
                        "confirmed": False,
                        "confirmed_exposed": False,
                        "risk_impact": "none",
                        "reason": "Request failed or timed out.",
                        "evidence": "LogShield could not confirm exposure from this response.",
                        "matched_evidence": [],
                        "response_body_snippet": "",
                        "finding_created": False,
                    }
                )
    return results


def check_technology(headers: dict[str, str], html_snippet: str) -> list[dict[str, Any]]:
    """Check for technology exposure in headers and HTML."""
    results = []
    lower_h = {k.lower(): v for k, v in headers.items()}

    server = lower_h.get("server", "")
    if server:
        results.append(
            {
                "type": "Server Header",
                "value": server,
                "risk": "Server version visible to attackers.",
                "recommendation": "Remove or generalize the Server header.",
            }
        )

    xpb = lower_h.get("x-powered-by", "")
    if xpb:
        results.append(
            {
                "type": "X-Powered-By",
                "value": xpb,
                "risk": "Backend technology exposed.",
                "recommendation": "Remove the X-Powered-By header.",
            }
        )

    gen_match = re.search(r'<meta[^>]+name=["\']generator["\'][^>]+content=["\']([^"\']+)', html_snippet, re.I)
    if gen_match:
        results.append(
            {
                "type": "Generator Meta Tag",
                "value": gen_match.group(1),
                "risk": "CMS and version exposed.",
                "recommendation": "Remove the generator meta tag.",
            }
        )

    return results


def check_forms(html_snippet: str) -> list[dict[str, Any]]:
    """Detect forms and input surfaces in limited HTML."""
    results = []
    forms = re.findall(r"<form[^>]*>.*?</form>", html_snippet, re.I | re.S)

    for form_html in forms:
        lower_form = form_html.lower()
        has_password = 'type="password"' in lower_form or "type='password'" in lower_form
        has_file_upload = 'type="file"' in lower_form or "type='file'" in lower_form
        has_csrf = bool(re.search(r'name=["\']_?csrf|name=["\']_token|name=["\']authenticity_token', lower_form))
        results.append(
            {
                "type": "form",
                "has_password": has_password,
                "has_file_upload": has_file_upload,
                "csrf_token_present": has_csrf,
            }
        )
    return results


def _sanitize_html_text_snippet(value: str, limit: int = 160) -> str:
    text = re.sub(r"<[^>]+>", " ", value or "")
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= limit:
        return text
    return text[: limit - 3].rstrip() + "..."


def _link_domain(url: str) -> str:
    try:
        parsed = urlparse(url)
        return (parsed.hostname or "").lower()
    except Exception:
        return ""


def analyze_hidden_defacement(html: str, final_url: str) -> dict[str, Any]:
    """
    Passive hidden-content analysis for potential SEO spam/defacement indicators.
    HTML is treated as untrusted text; no rendering and no script execution.
    """
    if not html:
        return {
            "hidden_elements_checked": 0,
            "suspicious_hidden_elements": [],
            "spam_keywords_found": [],
            "suspicious_links_found": [],
            "risk_level": "informational",
            "findings": [],
        }

    html_limited = html[:MAX_RESPONSE_SIZE]
    final_host = (urlparse(final_url).hostname or "").lower()
    hidden_elements_checked = 0
    suspicious_hidden_elements: list[dict[str, Any]] = []
    spam_keywords_found: list[str] = []
    suspicious_links_found: list[dict[str, str]] = []
    findings: list[dict[str, Any]] = []

    hidden_element_pattern = re.compile(
        r"<(?P<tag>div|span|p|a|section|article|li|ul|ol|nav|footer|header)\b(?P<attrs>[^>]*)>(?P<content>.{0,1200}?)</\1>",
        re.I | re.S,
    )
    hidden_style_matchers = [matcher for _, matcher in HIDDEN_STYLE_PATTERNS]

    for match in hidden_element_pattern.finditer(html_limited):
        attrs = match.group("attrs") or ""
        content = match.group("content") or ""
        attrs_lower = attrs.lower()
        content_lower = content.lower()
        style_match = re.search(r"style\s*=\s*['\"]([^'\"]+)['\"]", attrs, re.I)
        style_value = style_match.group(1) if style_match else ""
        has_hidden_style = any(m.search(style_value) for m in hidden_style_matchers) if style_value else False
        has_aria_hidden = 'aria-hidden="true"' in attrs_lower or "aria-hidden='true'" in attrs_lower
        looks_sr_only = "sr-only" in attrs_lower or "screen-reader" in attrs_lower

        if not has_hidden_style and not has_aria_hidden:
            continue

        hidden_elements_checked += 1
        if looks_sr_only and not has_hidden_style:
            continue

        matched_keywords = [keyword for keyword in HIDDEN_SEO_KEYWORDS if keyword in content_lower]
        if matched_keywords:
            spam_keywords_found.extend(matched_keywords)

        urls = re.findall(r'href\s*=\s*["\']([^"\']+)["\']', content, flags=re.I)
        external_link_hits = 0
        for href in urls[:25]:
            href_l = href.strip().lower()
            if not href_l or href_l.startswith(("#", "javascript:", "mailto:", "tel:")):
                continue
            domain = _link_domain(href_l)
            if not domain:
                continue
            is_external = bool(domain and final_host and domain != final_host and not domain.endswith(f".{final_host}"))
            anchor_context = _sanitize_html_text_snippet(content, limit=160).lower()
            spammy_anchor = any(term in anchor_context for term in SUSPICIOUS_LINK_TERMS)
            if is_external and (spammy_anchor or matched_keywords):
                external_link_hits += 1
                suspicious_links_found.append(
                    {
                        "domain": domain,
                        "anchor_context": _sanitize_html_text_snippet(content, limit=120),
                    }
                )

        matched_patterns: list[str] = []
        for label, pattern in HIDDEN_STYLE_PATTERNS:
            if pattern.search(style_value):
                matched_patterns.append(label)
        if has_aria_hidden:
            matched_patterns.append("aria-hidden=true")

        has_defacement_phrase = any(phrase in content_lower for phrase in DEFACEMENT_PHRASES)
        should_flag = bool(matched_keywords or external_link_hits or has_defacement_phrase)
        if not should_flag:
            continue

        suspicious_hidden_elements.append(
            {
                "tag": match.group("tag").lower(),
                "matched_hidden_patterns": matched_patterns,
                "matched_keywords": matched_keywords[:5],
                "external_link_count": external_link_hits,
                "snippet": _sanitize_html_text_snippet(content),
            }
        )

    spam_keywords_found = sorted(set(spam_keywords_found))
    suspicious_links_found = suspicious_links_found[:12]
    suspicious_count = len(suspicious_hidden_elements)
    suspicious_link_count = len(suspicious_links_found)
    has_defacement = any(
        any(phrase in " ".join(item.get("matched_keywords", []) + [item.get("snippet", "").lower()]) for phrase in DEFACEMENT_PHRASES)
        for item in suspicious_hidden_elements
    )

    risk_level = "informational"
    reason = "Hidden UI elements were observed, but no obvious spam or defacement indicators were detected."
    if suspicious_count == 0:
        if hidden_elements_checked == 0:
            reason = "No hidden-content patterns were observed in the tested public HTML sample."
        return {
            "hidden_elements_checked": hidden_elements_checked,
            "suspicious_hidden_elements": [],
            "spam_keywords_found": [],
            "suspicious_links_found": [],
            "risk_level": risk_level,
            "findings": [],
            "summary_note": reason,
        }

    if has_defacement and suspicious_link_count >= 1:
        risk_level = "critical"
        reason = "Potential hidden SEO spam or defacement indicator detected with defacement phrase and suspicious external links."
    elif has_defacement or suspicious_link_count >= 2 or len(spam_keywords_found) >= 2:
        risk_level = "high"
        reason = "Potential hidden SEO spam or defacement indicator detected with multiple suspicious hidden signals."
    elif suspicious_link_count == 1:
        risk_level = "medium"
        reason = "Potential hidden SEO spam or defacement indicator detected: hidden external link signal observed."
    elif len(spam_keywords_found) == 1:
        risk_level = "low"
        reason = "A suspicious keyword was observed inside hidden content and should be reviewed."
    else:
        risk_level = "medium"
        reason = "Potential hidden SEO spam indicator detected and requires investigation."

    findings.append(
        {
            "id": "hidden-seo-spam-detected",
            "title": "Potential Hidden SEO Spam Detected",
            "severity": risk_level,
            "category": "Hidden Defacement",
            "owasp_category": "Security Logging and Monitoring Failures",
            "evidence": reason,
            "impact": "Hidden spam content can damage search reputation and may indicate unauthorized modification of the website.",
            "recommendation": "Review affected page source, CMS theme/plugins, and recent file changes. Remove unauthorized hidden links and rotate CMS/admin credentials.",
            "priority": 1 if risk_level in ("critical", "high") else 2,
        }
    )

    return {
        "hidden_elements_checked": hidden_elements_checked,
        "suspicious_hidden_elements": suspicious_hidden_elements[:12],
        "spam_keywords_found": spam_keywords_found[:20],
        "suspicious_links_found": suspicious_links_found,
        "risk_level": risk_level,
        "findings": findings,
        "summary_note": reason,
    }


# ---------------------------------------------------------------------------
# Finding generation and scoring
# ---------------------------------------------------------------------------


def _make_finding(
    fid: str,
    title: str,
    severity: str,
    category: str,
    owasp: str,
    evidence: str,
    impact: str,
    rec: str,
    priority: int,
    confidence: str = "high",
    original_severity: str | None = None,
    adjustment_reason: str | None = None,
    analyst_note: str | None = None,
) -> dict[str, Any]:
    finding: dict[str, Any] = {
        "id": fid,
        "title": title,
        "severity": severity,
        "confidence": confidence,
        "category": category,
        "owasp_category": owasp,
        "evidence": evidence,
        "impact": impact,
        "recommendation": rec,
        "priority": priority,
    }
    if original_severity:
        finding["original_severity"] = original_severity
    if adjustment_reason:
        finding["adjustment_reason"] = adjustment_reason
    if analyst_note:
        finding["analyst_note"] = analyst_note
    return finding


def generate_findings(
    https_result: dict[str, Any],
    tls_versions: dict[str, Any],
    header_results: list[dict[str, Any]],
    csp_analysis: dict[str, Any],
    cookie_results: list[dict[str, Any]],
    cookie_prefix_review: dict[str, Any],
    exposed_results: list[dict[str, Any]],
    robots_result: dict[str, Any],
    sitemap_result: dict[str, Any],
    tech_results: list[dict[str, Any]],
    form_results: list[dict[str, Any]],
    hidden_defacement_result: dict[str, Any],
    provider_context: dict[str, Any],
) -> list[dict[str, Any]]:
    """Build all findings from check results."""
    findings: list[dict[str, Any]] = []
    counter = 0

    if not https_result.get("uses_https"):
        counter += 1
        findings.append(
            _make_finding(
                f"HTTPS-{counter}",
                "Website does not use HTTPS",
                "high",
                "Transport Security",
                "Cryptographic Failures",
                "The final URL uses HTTP instead of HTTPS.",
                "All traffic is transmitted in plaintext, exposing sensitive data.",
                "Migrate the website to HTTPS with a valid TLS certificate.",
                1,
            )
        )

    cert = https_result.get("certificate")
    if cert and isinstance(cert, dict):
        days = cert.get("days_until_expiry", 999)
        if days < 0:
            counter += 1
            findings.append(
                _make_finding(
                    f"CERT-{counter}",
                    "TLS certificate has expired",
                    "critical",
                    "Transport Security",
                    "Cryptographic Failures",
                    f"Certificate expired {abs(days)} days ago.",
                    "Browsers will show security warnings; users may not trust the site.",
                    "Renew the TLS certificate immediately.",
                    1,
                )
            )
        elif days < 30:
            counter += 1
            findings.append(
                _make_finding(
                    f"CERT-{counter}",
                    "TLS certificate expires soon",
                    "medium",
                    "Transport Security",
                    "Cryptographic Failures",
                    f"Certificate expires in {days} days.",
                    "If not renewed, the site will become untrusted.",
                    "Renew the TLS certificate before expiration.",
                    2,
                )
            )

    if https_result.get("redirect_count", 0) > 3:
        counter += 1
        findings.append(
            _make_finding(
                f"REDIR-{counter}",
                "Excessive redirects detected",
                "low",
                "Configuration",
                "Security Misconfiguration",
                f"{https_result['redirect_count']} redirects detected.",
                "Long redirect chains may indicate misconfiguration.",
                "Review redirect configuration and minimize redirect hops.",
                4,
            )
        )

    tls_10_status = tls_versions.get("tls_1_0", {}).get("status")
    tls_11_status = tls_versions.get("tls_1_1", {}).get("status")
    if tls_10_status == "supported":
        counter += 1
        findings.append(
            _make_finding(
                f"TLS-{counter}",
                "Deprecated TLS 1.0 appears to be supported",
                "high",
                "Cryptography",
                "Cryptographic Failures",
                "A safe handshake probe indicates TLS 1.0 support.",
                "Legacy TLS versions are vulnerable to downgrade and cryptographic weaknesses.",
                "Disable TLS 1.0 and enforce TLS 1.2+ or TLS 1.3.",
                1,
            )
        )
    if tls_11_status == "supported":
        counter += 1
        findings.append(
            _make_finding(
                f"TLS-{counter}",
                "Deprecated TLS 1.1 appears to be supported",
                "high",
                "Cryptography",
                "Cryptographic Failures",
                "A safe handshake probe indicates TLS 1.1 support.",
                "Legacy TLS versions increase exposure to known cryptographic risks.",
                "Disable TLS 1.1 and enforce TLS 1.2+ or TLS 1.3.",
                1,
            )
        )

    is_known_provider = bool(provider_context.get("known_provider_domain"))
    provider_family = provider_context.get("provider_family")

    for h in header_results:
        if not h["present"]:
            severity = h["severity"]
            evidence = f"{h['header']} header is not set."
            impact = h["impact"]
            recommendation = h["recommendation"]
            analyst_note: str | None = None
            confidence = "high"

            if h["header"] == "Strict-Transport-Security":
                if not https_result.get("uses_https"):
                    severity = "medium"
                evidence = "HSTS was not observed in the tested response."
                if https_result.get("uses_https"):
                    evidence += " HTTPS redirection exists, but HSTS was not observed in this response."
                if is_known_provider:
                    analyst_note = (
                        f"HSTS may be managed at a parent domain or edge layer ({provider_family or 'managed platform'}), "
                        "but this specific response did not include the header."
                    )
                impact = (
                    "Without an observed HSTS header, browsers may still initiate insecure HTTP requests before upgrade."
                )
                recommendation = (
                    "Add Strict-Transport-Security on HTTPS responses after validating HTTPS coverage across the application."
                )

            counter += 1
            findings.append(
                _make_finding(
                    f"HDR-{counter}",
                    f"Missing {h['header']} header",
                    severity,
                    "Security Headers",
                    h["owasp"],
                    evidence,
                    impact,
                    recommendation,
                    2 if severity in ("high", "critical") else 3,
                    confidence=confidence,
                    analyst_note=analyst_note,
                )
            )

    for csp_issue in csp_analysis.get("issues", []):
        counter += 1
        findings.append(
            _make_finding(
                f"CSP-{counter}",
                csp_issue["title"],
                csp_issue["severity"],
                "Content Security Policy",
                "Security Misconfiguration",
                csp_issue["evidence"],
                csp_issue["impact"],
                csp_issue["recommendation"],
                2 if csp_issue["severity"] == "high" else 3,
                confidence=csp_issue.get("confidence", "high"),
                original_severity=csp_issue.get("original_severity"),
                adjustment_reason=csp_issue.get("adjustment_reason"),
                analyst_note=csp_issue.get("analyst_note"),
            )
        )

    for c in cookie_results:
        if c.get("is_session_cookie"):
            if not c.get("httponly"):
                counter += 1
                findings.append(
                    _make_finding(
                        f"COOKIE-{counter}",
                        f"Session cookie '{c['name']}' missing HttpOnly",
                        "high",
                        "Cookie Security",
                        "Identification and Authentication Failures",
                        f"Cookie '{c['name']}' does not have the HttpOnly flag.",
                        "The cookie can be accessed by client-side scripts, enabling session theft.",
                        "Add the HttpOnly flag to session cookies.",
                        2,
                    )
                )
            if not c.get("secure"):
                counter += 1
                findings.append(
                    _make_finding(
                        f"COOKIE-{counter}",
                        f"Cookie '{c['name']}' missing Secure flag",
                        "medium",
                        "Cookie Security",
                        "Cryptographic Failures",
                        f"Cookie '{c['name']}' does not have the Secure flag.",
                        "The cookie may be sent over insecure HTTP connections.",
                        "Add the Secure flag to cookies served over HTTPS.",
                        2,
                    )
                )
        if c.get("samesite") == "missing":
            counter += 1
            findings.append(
                _make_finding(
                    f"COOKIE-{counter}",
                    f"Cookie '{c['name']}' missing SameSite",
                    "low",
                    "Cookie Security",
                    "Security Misconfiguration",
                    f"Cookie '{c['name']}' does not set SameSite attribute.",
                    "Without SameSite, the cookie may be sent with cross-site requests.",
                    "Add SameSite=Lax or SameSite=Strict to cookies.",
                    3,
                )
            )

    for issue in cookie_prefix_review.get("issues", []):
        counter += 1
        findings.append(
            _make_finding(
                f"CPFX-{counter}",
                issue["title"],
                issue["severity"],
                "Cookie Security",
                "Security Misconfiguration",
                issue["evidence"],
                issue["impact"],
                issue["recommendation"],
                2 if issue["severity"] in ("high", "critical") else 3,
            )
        )

    sensitive_exposed = {
        "/.env": ("critical", "Environment file exposed and may contain secrets."),
        "/.git/": ("critical", "Git directory exposed and source code metadata may be accessible."),
        "/.git/HEAD": ("critical", "Git HEAD exposed and repository structure may leak."),
        "/backup.zip": ("high", "Backup archive publicly accessible."),
        "/backup.sql": ("high", "Database backup publicly accessible."),
        "/config.php": ("high", "Configuration file publicly accessible."),
        "/phpinfo.php": ("high", "PHP info page exposed and reveals configuration."),
        "/server-status": ("medium", "Server status page publicly accessible."),
        "/admin": ("medium", "Admin path publicly reachable."),
        "/wp-admin": ("medium", "WordPress admin panel publicly reachable."),
    }
    for ep in exposed_results:
        if ep.get("confirmed_exposed") and ep["path"] in sensitive_exposed:
            sev, desc = sensitive_exposed[ep["path"]]
            counter += 1
            evidence = ep.get("response_body_snippet") or f"{ep['path']} returned HTTP {ep['status_code']} with confirmed exposure indicators."
            findings.append(
                _make_finding(
                    f"PATH-{counter}",
                    f"Sensitive path accessible: {ep['path']}",
                    sev,
                    "Exposed Files",
                    "Security Misconfiguration",
                    f"{ep['path']} returned HTTP {ep['status_code']}. {evidence}",
                    desc,
                    f"Restrict access to {ep['path']} or remove it from production.",
                    1 if sev == "critical" else 2,
                )
            )

    for disclosure in robots_result.get("sensitive_disallow_paths", []):
        counter += 1
        findings.append(
            _make_finding(
                f"ROBOTS-{counter}",
                "Sensitive path disclosed in robots.txt",
                "medium",
                "Passive Discovery",
                "Security Misconfiguration",
                (
                    "robots.txt contains Disallow entry with sensitive keyword: "
                    f"{disclosure['path']} (keyword: {disclosure['keyword']})."
                ),
                "Robots.txt may reveal interesting paths to attackers, even though it does not grant access.",
                "Avoid exposing sensitive environment or backup paths in robots.txt and enforce server-side access control.",
                3,
            )
        )

    if sitemap_result.get("http_url_count", 0) > 0:
        counter += 1
        findings.append(
            _make_finding(
                f"SITEMAP-{counter}",
                "Sitemap includes HTTP URLs",
                "medium",
                "Passive Discovery",
                "Security Misconfiguration",
                f"sitemap.xml includes {sitemap_result['http_url_count']} URL(s) using HTTP scheme.",
                "HTTP links in sitemaps can weaken transport hygiene and may expose insecure entry points.",
                "Update sitemap entries to HTTPS-only URLs and enforce HTTPS redirects.",
                3,
            )
        )

    if sitemap_result.get("sensitive_url_count", 0) > 0:
        counter += 1
        findings.append(
            _make_finding(
                f"SITEMAP-{counter}",
                "Potentially sensitive URLs disclosed in sitemap.xml",
                "medium",
                "Passive Discovery",
                "Security Misconfiguration",
                f"sitemap.xml lists {sitemap_result['sensitive_url_count']} URL(s) with sensitive keywords.",
                "Sitemap disclosures can help attackers prioritize interesting targets.",
                "Review sitemap entries and avoid listing sensitive operational paths.",
                3,
            )
        )

    for t in tech_results:
        severity = "low"
        confidence = "high"
        analyst_note: str | None = None
        original_severity: str | None = None
        adjustment_reason: str | None = None
        title = f"Technology disclosure: {t['type']}"
        impact = t["risk"]
        recommendation = t["recommendation"]
        evidence = f"{t['type']}: {t['value']}"

        if t["type"] == "Server Header":
            raw_value = str(t.get("value", "")).strip()
            lower_value = raw_value.lower()
            has_version = bool(re.search(r"\b\d+\.\d+(\.\d+)?\b", raw_value))
            generic_platform = any(token == lower_value or lower_value.startswith(f"{token}/") for token in GENERIC_SERVER_HEADER_VALUES)

            if has_version:
                severity = "low" if is_known_provider else "medium"
                impact = "Exact software version disclosure can help attackers target known vulnerabilities faster."
                recommendation = "Hide or generalize exact server software versions."
            elif generic_platform:
                severity = "informational"
                title = "Informational platform header detected"
                impact = "Server header appears generic and does not expose a specific software version."
                recommendation = "Keep server disclosures minimal and avoid exposing exact versions."
                analyst_note = (
                    "The server header appears to identify a managed platform rather than expose a specific vulnerable software version."
                )
            else:
                severity = "low"
                impact = "Server product disclosure can support attacker reconnaissance."
                recommendation = "Reduce unnecessary server identification details where feasible."

            if is_known_provider and severity in ("medium", "low"):
                adjusted, orig, reason, note = _maybe_adjust_severity(
                    severity,
                    "low",
                    "Known provider context suggests managed edge infrastructure with lower direct fingerprinting impact.",
                    analyst_note or "Managed platform context detected; disclosure finding remains visible.",
                )
                severity = adjusted
                original_severity = orig
                adjustment_reason = reason
                analyst_note = note

        elif t["type"] == "X-Powered-By":
            severity = "low"
            impact = "Framework disclosure can help targeted reconnaissance."
            recommendation = "Remove X-Powered-By where possible."

        counter += 1
        findings.append(
            _make_finding(
                f"TECH-{counter}",
                title,
                severity,
                "Information Disclosure",
                "Vulnerable and Outdated Components",
                evidence,
                impact,
                recommendation,
                4,
                confidence=confidence,
                original_severity=original_severity,
                adjustment_reason=adjustment_reason,
                analyst_note=analyst_note,
            )
        )

    for f in form_results:
        if f.get("has_password") and not f.get("csrf_token_present"):
            counter += 1
            findings.append(
                _make_finding(
                    f"FORM-{counter}",
                    "Login form without obvious CSRF token",
                    "medium",
                    "Input Surfaces",
                    "Identification and Authentication Failures",
                    "A login form was detected without an obvious CSRF token marker.",
                    "Missing CSRF protection may allow cross-site request forgery attacks.",
                    "Add CSRF token protection to all forms, especially login forms.",
                    2,
                )
            )
        if f.get("has_file_upload"):
            counter += 1
            findings.append(
                _make_finding(
                    f"FORM-{counter}",
                    "File upload form detected",
                    "medium",
                    "Input Surfaces",
                    "Software and Data Integrity Failures",
                    "A file upload form was detected.",
                    "File uploads can be exploited if not properly validated.",
                    "Validate file type, size, and content; store uploads outside the web root.",
                    3,
                )
            )

    for hidden_issue in hidden_defacement_result.get("findings", []):
        counter += 1
        findings.append(
            _make_finding(
                f"HIDDEN-{counter}",
                hidden_issue.get("title", "Potential Hidden SEO Spam Detected"),
                hidden_issue.get("severity", "medium"),
                hidden_issue.get("category", "Hidden Defacement"),
                hidden_issue.get("owasp_category", "Security Logging and Monitoring Failures"),
                hidden_issue.get("evidence", "Potential hidden SEO spam or defacement indicator detected."),
                hidden_issue.get(
                    "impact",
                    "Hidden spam content can damage search reputation and may indicate unauthorized modification.",
                ),
                hidden_issue.get(
                    "recommendation",
                    "Review source output and remove unauthorized hidden content.",
                ),
                hidden_issue.get("priority", 2),
            )
        )

    findings.sort(
        key=lambda finding: (
            {"critical": 0, "high": 1, "medium": 2, "low": 3, "informational": 4}.get(finding["severity"], 5),
            finding["priority"],
        )
    )
    return findings


def correlate_risks(
    header_results: list[dict[str, Any]],
    cookie_results: list[dict[str, Any]],
    exposed_results: list[dict[str, Any]],
    tech_results: list[dict[str, Any]],
    form_results: list[dict[str, Any]],
    csp_analysis: dict[str, Any],
    robots_result: dict[str, Any],
    sitemap_result: dict[str, Any],
    findings: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Deterministic risk correlation matrix.
    These are correlated risk scenarios, not confirmed vulnerabilities.
    """
    correlated: list[dict[str, Any]] = []
    scenario_index = 0

    missing_hsts = any(h["header"] == "Strict-Transport-Security" and not h["present"] for h in header_results)
    weak_cookie = any((not c.get("secure")) or (not c.get("httponly")) or c.get("samesite") == "missing" for c in cookie_results)
    has_login_form = any(f.get("has_password") for f in form_results)
    login_no_csrf = any(f.get("has_password") and not f.get("csrf_token_present") for f in form_results)
    admin_reachable = any(item.get("path") == "/admin" and item.get("confirmed_exposed") for item in exposed_results)
    csp_weak = (not csp_analysis.get("present")) or len(csp_analysis.get("issues", [])) > 0
    tech_disclosure = any(t["type"] in ("Server Header", "X-Powered-By") for t in tech_results)
    sensitive_disclosure = bool(robots_result.get("sensitive_disallow_paths")) or sitemap_result.get("sensitive_url_count", 0) > 0

    def related_ids(*keywords: str) -> list[str]:
        out = []
        lowered = [k.lower() for k in keywords]
        for finding in findings:
            hay = " ".join([finding["id"], finding["title"], finding["evidence"]]).lower()
            if any(k in hay for k in lowered):
                out.append(finding["id"])
        return sorted(set(out))

    if has_login_form and login_no_csrf and any(c.get("is_session_cookie") and not c.get("httponly") for c in cookie_results):
        scenario_index += 1
        evidence = [
            "Login form detected.",
            "No obvious CSRF token marker was found on at least one login form.",
            "Sensitive/session cookie is missing HttpOnly.",
        ]
        correlated.append(
            {
                "id": f"CRS-{scenario_index}",
                "title": "High Risk of Session Abuse and Account Takeover Exposure",
                "severity": "critical" if any(not c.get("secure") for c in cookie_results if c.get("is_session_cookie")) else "high",
                "evidence": evidence,
                "why_it_matters": "Combined form and cookie weaknesses can amplify account compromise risk if exploited.",
                "recommended_actions": [
                    "Enforce CSRF tokens on all authentication forms.",
                    "Set HttpOnly, Secure, and SameSite on session cookies.",
                    "Review authentication hardening controls.",
                ],
                "related_finding_ids": related_ids("csrf", "cookie", "session"),
            }
        )

    if admin_reachable and missing_hsts and weak_cookie:
        scenario_index += 1
        evidence = [
            "Admin path appears publicly reachable.",
            "HSTS header is missing.",
            "Weak cookie attributes detected (Secure/HttpOnly/SameSite).",
        ]
        correlated.append(
            {
                "id": f"CRS-{scenario_index}",
                "title": "Elevated Admin Surface Exposure",
                "severity": "high",
                "evidence": evidence,
                "why_it_matters": "Admin surface combined with weaker transport/session controls increases attacker opportunity.",
                "recommended_actions": [
                    "Restrict admin endpoint exposure by network and access policy.",
                    "Enable HSTS once HTTPS is stable.",
                    "Harden cookie security attributes for administrative sessions.",
                ],
                "related_finding_ids": related_ids("/admin", "strict-transport-security", "cookie"),
            }
        )

    if tech_disclosure and sensitive_disclosure:
        scenario_index += 1
        evidence = [
            "Technology header disclosures were detected.",
            "robots.txt or sitemap.xml discloses sensitive-looking paths/URLs.",
        ]
        correlated.append(
            {
                "id": f"CRS-{scenario_index}",
                "title": "Technology and Path Disclosure Cluster",
                "severity": "medium",
                "evidence": evidence,
                "why_it_matters": "Layered disclosures can accelerate attacker reconnaissance and target prioritization.",
                "recommended_actions": [
                    "Reduce verbose technology headers.",
                    "Review robots.txt and sitemap content for sensitive path leakage.",
                    "Enforce server-side access controls even for discovered paths.",
                ],
                "related_finding_ids": related_ids("technology disclosure", "robots", "sitemap"),
            }
        )

    if csp_weak and has_login_form and weak_cookie:
        scenario_index += 1
        evidence = [
            "CSP is missing or has weak directives.",
            "Form input surface was detected.",
            "Cookie security weaknesses are present.",
        ]
        correlated.append(
            {
                "id": f"CRS-{scenario_index}",
                "title": "Client-Side Attack Impact Amplification",
                "severity": "high",
                "evidence": evidence,
                "why_it_matters": "Weak client-side policy plus form and cookie weaknesses can increase impact if script injection occurs.",
                "recommended_actions": [
                    "Harden CSP directives (remove unsafe-inline/unsafe-eval, tighten sources).",
                    "Apply CSRF and form hardening.",
                    "Enforce secure cookie attributes and prefixes for sensitive cookies.",
                ],
                "related_finding_ids": related_ids("csp", "form", "cookie"),
            }
        )

    return correlated


def correlated_findings(correlated: list[dict[str, Any]], start_counter: int) -> tuple[list[dict[str, Any]], int]:
    """Convert correlated scenarios into regular findings for prioritization and scoring."""
    out: list[dict[str, Any]] = []
    counter = start_counter
    for scenario in correlated:
        counter += 1
        out.append(
            _make_finding(
                f"CORR-{counter}",
                scenario["title"],
                scenario["severity"],
                "Correlated Risk Scenario",
                "Risk Correlation",
                "; ".join(scenario["evidence"]) + f" Related findings: {', '.join(scenario['related_finding_ids']) or 'none'}.",
                scenario["why_it_matters"],
                " / ".join(scenario["recommended_actions"]),
                1 if scenario["severity"] in ("critical", "high") else 2,
            )
        )
    return out, counter


def calculate_risk_score(findings: list[dict[str, Any]]) -> tuple[int, str]:
    """Calculate risk score 0-100 and risk level."""
    score = 0
    for finding in findings:
        score += SEVERITY_WEIGHTS.get(finding["severity"], 1)
    score = min(100, score)

    if score <= 20:
        level = "low"
    elif score <= 50:
        level = "medium"
    elif score <= 75:
        level = "high"
    else:
        level = "critical"
    return score, level


def summarize_severity(findings: list[dict[str, Any]]) -> dict[str, int]:
    summary = {"critical": 0, "high": 0, "medium": 0, "low": 0, "informational": 0}
    for finding in findings:
        sev = str(finding.get("severity", "informational")).lower()
        if sev not in summary:
            sev = "informational"
        summary[sev] += 1
    return summary


def summarize_owasp(findings: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[str, dict[str, int]] = defaultdict(
        lambda: {"count": 0, "critical": 0, "high": 0, "medium": 0, "low": 0, "informational": 0}
    )
    for finding in findings:
        category = str(finding.get("owasp_category") or "General")
        sev = str(finding.get("severity", "informational")).lower()
        if sev not in grouped[category]:
            sev = "informational"
        grouped[category]["count"] += 1
        grouped[category][sev] += 1

    rows: list[dict[str, Any]] = []
    for category, values in grouped.items():
        row = {"category": category}
        row.update(values)
        rows.append(row)
    rows.sort(key=lambda item: item["count"], reverse=True)
    return rows


def summarize_context_tuning(findings: list[dict[str, Any]]) -> dict[str, Any]:
    adjusted = [finding for finding in findings if finding.get("original_severity")]
    downgraded = 0
    upgraded = 0
    notes: list[str] = []
    for finding in adjusted:
        original = str(finding.get("original_severity", ""))
        final = str(finding.get("severity", ""))
        if _severity_priority(final) > _severity_priority(original):
            downgraded += 1
        elif _severity_priority(final) < _severity_priority(original):
            upgraded += 1
        reason = finding.get("adjustment_reason")
        if isinstance(reason, str) and reason.strip() and reason not in notes:
            notes.append(reason)
    return {
        "enabled": True,
        "adjusted_findings_count": len(adjusted),
        "downgraded_findings_count": downgraded,
        "upgraded_findings_count": upgraded,
        "notes": notes[:6],
    }


def generate_summary(
    findings: list[dict[str, Any]],
    correlated: list[dict[str, Any]],
    hidden_defacement_result: dict[str, Any],
    sensitive_path_checks: list[dict[str, Any]],
    score: int,
    level: str,
    hostname: str,
) -> dict[str, Any]:
    """Generate executive summary without requiring external AI."""
    top3 = findings[:3]
    top_titles = [f["title"] for f in top3]

    crit_count = sum(1 for finding in findings if finding["severity"] == "critical")
    high_count = sum(1 for finding in findings if finding["severity"] == "high")
    med_count = sum(1 for finding in findings if finding["severity"] == "medium")

    correlated_titles = [scenario["title"] for scenario in correlated[:2]]
    correlated_note = (
        " Top correlated risks: " + "; ".join(correlated_titles) + "."
        if correlated_titles
        else ""
    )
    hidden_risk = str(hidden_defacement_result.get("risk_level", "informational")).lower()
    hidden_note = (
        " Potential hidden SEO spam indicators were observed in the public HTML. "
        "This may indicate unauthorized content injection or compromised CMS/theme output and should be investigated."
        if hidden_risk in {"low", "medium", "high", "critical"}
        and hidden_defacement_result.get("suspicious_hidden_elements")
        else " Hidden content checks did not identify obvious SEO spam or defacement indicators."
    )
    confirmed_path_count = sum(1 for item in sensitive_path_checks if item.get("confirmed"))
    informational_path_count = sum(
        1
        for item in sensitive_path_checks
        if item.get("classification") in {"spa_fallback", "generic_html", "protected", "not_found", "inconclusive"}
    )
    if confirmed_path_count:
        path_note = " Confirmed sensitive exposure was detected and should be remediated immediately."
    elif informational_path_count:
        path_note = (
            " Sensitive path checks returned HTTP 200 for some paths, but the responses matched the normal "
            "application shell or did not contain sensitive content patterns. No sensitive file exposure was confirmed."
        )
    else:
        path_note = ""

    if level == "critical":
        overview = (
            f"The security posture of {hostname} is critical. "
            f"There are {crit_count} critical and {high_count} high-severity issues that require immediate attention."
            f"{correlated_note}{hidden_note}{path_note}"
        )
        explanation = (
            f"Your website has a Critical security risk ({score}/100). The presence of multiple critical/high issues "
            "significantly increases risk of unauthorized access or data exposure. These findings do not prove active compromise, "
            "but they indicate high exposure that attackers can target quickly."
        )
    elif level == "high":
        overview = (
            f"The security posture of {hostname} is concerning. "
            f"There are {high_count} high-severity issues that should be addressed promptly."
            f"{correlated_note}{hidden_note}{path_note}"
        )
        explanation = (
            f"Your website has a High security risk ({score}/100). Key issues relate to transport security, client-side hardening, "
            "and session protection. Addressing these gaps can materially reduce exposure."
        )
    elif level == "medium":
        overview = (
            f"The security posture of {hostname} shows room for improvement. "
            f"There are {med_count} medium-severity issues to review."
            f"{correlated_note}{hidden_note}{path_note}"
        )
        explanation = (
            f"Your website has a Medium security risk ({score}/100). The main issues are hardening gaps that could increase impact "
            "under targeted attack conditions."
        )
    else:
        if score <= 5 and crit_count == 0 and high_count == 0 and med_count == 0:
            overview = (
                "The website shows a low-risk posture based on this passive assessment. "
                "Only informational notes were observed."
                f"{correlated_note}{hidden_note}{path_note}"
            )
            explanation = (
                f"Your website has a Low security risk ({score}/100). "
                "This passive assessment found informational observations only and no critical/high/medium findings."
            )
        else:
            overview = (
                f"The security posture of {hostname} appears reasonable based on this non-invasive scan. "
                f"Minor improvements are still recommended.{correlated_note}{hidden_note}{path_note}"
            )
            explanation = (
                f"Your website has a Low security risk ({score}/100). This safe passive assessment did not detect critical or high risk "
                "issues, but it does not guarantee full vulnerability absence."
            )

    priorities = []
    if crit_count:
        priorities.append(f"Fix {crit_count} critical issue(s) immediately.")
    if high_count:
        priorities.append(f"Address {high_count} high-severity finding(s).")
    if correlated_titles:
        priorities.append(f"Review correlated risk scenario: {correlated_titles[0]}")
    if top_titles:
        priorities.append(f"Top priority: {top_titles[0]}")
    priorities.append("Review missing security headers and secure cookie configuration.")

    actions = [
        "Review and fix critical and high-severity findings first.",
        "Implement missing security headers and tighten CSP directives.",
        "Ensure HTTPS is enforced with TLS 1.2+ and no legacy TLS support.",
        "Reduce passive disclosure in robots.txt/sitemap.xml and restrict sensitive paths.",
        "Schedule recurring safe security posture assessments.",
    ]

    return {
        "summary": overview,
        "risk_explanation": explanation,
        "top_priorities": priorities[:5],
        "recommended_actions": actions,
    }


def generate_roadmap(findings: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Generate a prioritized, actionable fix roadmap from scan findings."""
    roadmap = []

    https_findings = [finding["id"] for finding in findings if finding["id"].startswith(("HTTPS-", "CERT-", "TLS-"))]
    if https_findings:
        roadmap.append(
            {
                "priority": 1,
                "action": "Enforce HTTPS, renew certificates, and disable legacy TLS 1.0/1.1.",
                "effort": "medium",
                "impact": "high",
                "findings": https_findings,
            }
        )

    header_findings = [finding["id"] for finding in findings if finding["id"].startswith(("HDR-", "CSP-"))]
    if header_findings:
        roadmap.append(
            {
                "priority": 2,
                "action": "Implement missing browser security headers and harden Content-Security-Policy directives.",
                "effort": "low",
                "impact": "high",
                "findings": header_findings,
            }
        )

    cookie_findings = [finding["id"] for finding in findings if finding["id"].startswith(("COOKIE-", "CPFX-"))]
    if cookie_findings:
        roadmap.append(
            {
                "priority": 3,
                "action": "Harden sensitive cookies with HttpOnly, Secure, SameSite, and __Host-/__Secure- prefixes.",
                "effort": "low",
                "impact": "high",
                "findings": cookie_findings,
            }
        )

    path_findings = [finding["id"] for finding in findings if finding["id"].startswith(("PATH-", "ROBOTS-", "SITEMAP-"))]
    if path_findings:
        roadmap.append(
            {
                "priority": 4,
                "action": "Reduce exposure of sensitive paths and passive metadata in robots.txt and sitemap.xml.",
                "effort": "medium",
                "impact": "medium",
                "findings": path_findings,
            }
        )

    form_findings = [finding["id"] for finding in findings if finding["id"].startswith("FORM-")]
    if form_findings:
        roadmap.append(
            {
                "priority": 5,
                "action": "Add CSRF protection and review secure handling for input and upload surfaces.",
                "effort": "medium",
                "impact": "medium",
                "findings": form_findings,
            }
        )

    corr_findings = [finding["id"] for finding in findings if finding["id"].startswith("CORR-")]
    if corr_findings:
        roadmap.append(
            {
                "priority": 6,
                "action": "Address correlated risk scenarios by remediating related root findings in combination.",
                "effort": "medium",
                "impact": "high",
                "findings": corr_findings,
            }
        )

    roadmap.sort(key=lambda item: item["priority"])
    return roadmap


async def asyncio_to_thread(func: Any, *args: Any) -> Any:
    """Small wrapper to keep import-surface narrow and explicit."""
    import asyncio

    return await asyncio.to_thread(func, *args)


# ---------------------------------------------------------------------------
# Main scan orchestrator
# ---------------------------------------------------------------------------


async def run_scan(url: str) -> dict[str, Any]:
    """Run the full website security scan and return structured results."""
    validated_url = validate_url(url)
    parsed = urlparse(validated_url)
    provider_context = detect_provider_context(parsed.hostname or "")

    response, fetch_error = await _fetch_page(validated_url)

    if fetch_error and response is None:
        return {
            "mode": "safe_non_invasive_scan",
            "target": {
                "input_url": validated_url,
                "final_url": validated_url,
                "hostname": parsed.hostname or "",
                "scheme": parsed.scheme,
            },
            "overall": {
                "risk_score": 0,
                "risk_level": "unknown",
                "summary": fetch_error,
                "risk_explanation": "Could not assess security posture because the website was unreachable or timed out.",
                "top_priorities": ["Ensure the website is reachable."],
            },
            "context": provider_context,
            "context_tuning_summary": {
                "enabled": True,
                "adjusted_findings_count": 0,
                "downgraded_findings_count": 0,
                "upgraded_findings_count": 0,
                "notes": [],
            },
            "severity_summary": {"critical": 0, "high": 0, "medium": 0, "low": 0, "informational": 0},
            "owasp_summary": [],
            "checks": {
                "https": {},
                "tls_versions": {},
                "headers": [],
                "csp_analysis": {},
                "cookies": [],
                "cookie_prefix_review": {},
                "robots": {},
                "sitemap": {},
                "exposed_paths": [],
                "sensitive_path_checks": [],
                "technology": [],
                "forms": [],
                "hidden_defacement": {
                    "hidden_elements_checked": 0,
                    "suspicious_hidden_elements": [],
                    "spam_keywords_found": [],
                    "suspicious_links_found": [],
                    "risk_level": "informational",
                    "findings": [],
                    "summary_note": "No hidden-content analysis was performed because the target was unreachable.",
                },
                "correlated_risks": [],
            },
            "findings": [],
            "roadmap": [],
            "recommended_actions": ["Verify the URL is correct and the server is online."],
            "safety_model": {
                "authorized_confirmed": True,
                "non_invasive": True,
                "exploits_used": False,
                "forms_submitted": False,
                "bruteforce_used": False,
                "html_rendered": False,
                "javascript_executed": False,
                "links_followed": False,
                "raw_html_stored": False,
                "max_paths_checked": 12,
                "note": "This assessment uses safe non-invasive checks only.",
            },
        }

    headers_dict: dict[str, str] = {}
    html_snippet = ""
    if response is not None:
        headers_dict = dict(response.headers)
        try:
            html_snippet = response.text[:MAX_RESPONSE_SIZE]
        except Exception:
            pass
    provider_context = enrich_provider_context_from_headers(provider_context, headers_dict)

    https_result = check_https(validated_url, response)
    final_scheme = str(urlparse(str(response.url) if response else validated_url).scheme)
    tls_versions = await check_tls_versions(validated_url, final_scheme)
    header_results = check_security_headers(headers_dict)
    csp_analysis = analyze_csp(headers_dict, provider_context)
    cookie_results = check_cookies(response.headers) if response else []
    cookie_prefix_review = analyze_cookie_prefixes(cookie_results)
    robots_result = await analyze_robots(validated_url)
    sitemap_result = await analyze_sitemap(validated_url)
    exposed_results = await check_exposed_paths(validated_url)
    tech_results = check_technology(headers_dict, html_snippet)
    form_results = check_forms(html_snippet)
    hidden_defacement_result = analyze_hidden_defacement(html_snippet, str(response.url) if response else validated_url)

    findings = generate_findings(
        https_result,
        tls_versions,
        header_results,
        csp_analysis,
        cookie_results,
        cookie_prefix_review,
        exposed_results,
        robots_result,
        sitemap_result,
        tech_results,
        form_results,
        hidden_defacement_result,
        provider_context,
    )

    correlated = correlate_risks(
        header_results,
        cookie_results,
        exposed_results,
        tech_results,
        form_results,
        csp_analysis,
        robots_result,
        sitemap_result,
        findings,
    )
    correlated_as_findings, _ = correlated_findings(correlated, len(findings))
    findings.extend(correlated_as_findings)
    findings.sort(
        key=lambda finding: (_severity_priority(finding["severity"]), finding["priority"])
    )

    context_tuning_summary = summarize_context_tuning(findings)
    provider_context["adjusted_findings"] = context_tuning_summary["adjusted_findings_count"]
    score, level = calculate_risk_score(findings)
    severity_summary = summarize_severity(findings)
    owasp_summary = summarize_owasp(findings)
    hostname = parsed.hostname or ""
    summary_data = generate_summary(findings, correlated, hidden_defacement_result, exposed_results, score, level, hostname)
    roadmap_data = generate_roadmap(findings)
    final_url = str(response.url) if response else validated_url

    return {
        "mode": "safe_non_invasive_scan",
        "target": {
            "input_url": validated_url,
            "final_url": final_url,
            "hostname": hostname,
            "scheme": str(urlparse(final_url).scheme),
        },
        "overall": {
            "risk_score": score,
            "risk_level": level,
            "summary": summary_data["summary"],
            "risk_explanation": summary_data["risk_explanation"],
            "top_priorities": summary_data["top_priorities"],
        },
        "context": provider_context,
        "context_tuning_summary": context_tuning_summary,
        "severity_summary": severity_summary,
        "owasp_summary": owasp_summary,
        "checks": {
            "https": https_result,
            "tls_versions": tls_versions,
            "headers": header_results,
            "csp_analysis": csp_analysis,
            "cookies": cookie_results,
            "cookie_prefix_review": cookie_prefix_review,
            "robots": robots_result,
            "sitemap": sitemap_result,
            "exposed_paths": exposed_results,
            "sensitive_path_checks": exposed_results,
            "technology": tech_results,
            "forms": form_results,
            "hidden_defacement": hidden_defacement_result,
            "correlated_risks": correlated,
        },
        "findings": findings,
        "roadmap": roadmap_data,
        "recommended_actions": summary_data["recommended_actions"],
        "safety_model": {
            "authorized_confirmed": True,
            "non_invasive": True,
            "exploits_used": False,
            "forms_submitted": False,
            "bruteforce_used": False,
            "html_rendered": False,
            "javascript_executed": False,
            "links_followed": False,
            "raw_html_stored": False,
            "max_paths_checked": len(SENSITIVE_PATHS[:12]),
            "note": "This assessment uses safe non-invasive checks only.",
        },
    }
