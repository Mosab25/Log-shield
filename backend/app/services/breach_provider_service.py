from __future__ import annotations

from typing import Any
from urllib.parse import parse_qsl, quote

import httpx

from app.core.config import settings

PROVIDER_TIMEOUT_SECONDS = 10.0


class BreachProviderConfigError(Exception):
    pass


class BreachProviderService:
    def __init__(self) -> None:
        self.provider_name = "rapidapi"

    @property
    def provider_configured(self) -> bool:
        return settings.rapidapi_breach_provider_configured

    @property
    def provider_settings_complete(self) -> bool:
        return settings.rapidapi_breach_provider_settings_complete

    def map_provider_error(self, status_code: int) -> str:
        if status_code == 429:
            return "The breach provider rate limit was reached. Please wait and try again."
        if status_code in (401, 403):
            return "RapidAPI breach provider authentication failed. Check provider credentials."
        if status_code >= 500:
            return "The breach provider is currently unavailable. Please try again later."
        return "Could not complete the breach check with the configured provider."

    @staticmethod
    def _parse_extra_query(raw_query: str) -> dict[str, str]:
        """
        Parse fixed query params from env (e.g. 'func=auto&mode=fast').
        Invalid fragments are ignored safely.
        """
        extra: dict[str, str] = {}
        cleaned = (raw_query or "").strip().lstrip("?")
        if not cleaned:
            return extra
        for key, value in parse_qsl(cleaned, keep_blank_values=True):
            key_clean = key.strip()
            if not key_clean:
                continue
            extra[key_clean] = value
        return extra

    def _build_request(self, email: str) -> tuple[str, str, dict[str, str], dict[str, str], dict[str, str]]:
        method = (settings.rapidapi_breach_method or "GET").strip().upper()
        email_param = (settings.rapidapi_breach_email_param or "email").strip() or "email"
        base_url = settings.rapidapi_breach_url.strip()
        if not base_url:
            raise BreachProviderConfigError("RapidAPI breach provider settings are incomplete.")

        resolved_url = base_url
        params: dict[str, str] = self._parse_extra_query(settings.rapidapi_breach_extra_query)
        json_payload: dict[str, str] = {}
        form_payload: dict[str, str] = {}

        if "{email}" in base_url:
            resolved_url = base_url.replace("{email}", quote(email, safe=""))
        elif method == "GET":
            params[email_param] = email
        elif method in {"POST", "PUT", "PATCH"}:
            json_payload[email_param] = email
        else:
            params[email_param] = email

        headers = {
            "x-rapidapi-key": settings.rapidapi_breach_key.strip(),
            "x-rapidapi-host": settings.rapidapi_breach_host.strip(),
            "Accept": "application/json",
        }
        return method, resolved_url, headers, params, json_payload or form_payload

    @staticmethod
    def _normalize_breach_item(item: Any) -> dict[str, Any]:
        if not isinstance(item, dict):
            return {
                "name": "",
                "domain": "",
                "breach_date": "",
                "data_classes": [],
                "description": "",
            }

        name = str(item.get("Name") or item.get("name") or item.get("title") or "").strip()
        domain = str(item.get("Domain") or item.get("domain") or item.get("site") or "").strip()
        breach_date = str(
            item.get("BreachDate")
            or item.get("breach_date")
            or item.get("date")
            or item.get("breachDate")
            or ""
        ).strip()

        classes = (
            item.get("DataClasses")
            or item.get("data_classes")
            or item.get("dataClasses")
            or item.get("classes")
            or []
        )
        if not isinstance(classes, list):
            classes = [str(classes)] if classes else []

        description = str(item.get("Description") or item.get("description") or "").strip()
        return {
            "name": name,
            "domain": domain,
            "breach_date": breach_date,
            "data_classes": [str(cls).strip() for cls in classes if str(cls).strip()],
            "description": description,
        }

    def normalize_provider_response(self, response_body: Any) -> dict[str, Any]:
        breaches: list[dict[str, Any]] = []
        exposed_flag: bool | None = None
        explicit_count: int | None = None

        if isinstance(response_body, list):
            breaches = [self._normalize_breach_item(item) for item in response_body]
        elif isinstance(response_body, dict):
            for key in ("breaches", "results", "data", "items"):
                value = response_body.get(key)
                if isinstance(value, list):
                    breaches = [self._normalize_breach_item(item) for item in value]
                    break

            for flag_key in ("found", "exposed", "breached", "isBreached"):
                if flag_key in response_body:
                    exposed_flag = bool(response_body.get(flag_key))
                    break

            for count_key in ("count", "total", "breach_count", "results_count"):
                raw_count = response_body.get(count_key)
                if isinstance(raw_count, int):
                    explicit_count = max(0, raw_count)
                    break
                if isinstance(raw_count, str) and raw_count.isdigit():
                    explicit_count = int(raw_count)
                    break
        else:
            return {
                "status": "unknown",
                "exposed": False,
                "breach_count": 0,
                "breaches": [],
                "note": "Provider returned an unrecognized response format.",
            }

        breaches = [item for item in breaches if any(item.values())]
        breach_count = len(breaches)

        if breach_count > 0:
            return {
                "status": "exposed",
                "exposed": True,
                "breach_count": breach_count,
                "breaches": breaches,
                "note": None,
            }

        if explicit_count is not None:
            if explicit_count > 0:
                return {
                    "status": "exposed",
                    "exposed": True,
                    "breach_count": explicit_count,
                    "breaches": [],
                    "note": "Provider reported exposure count without breach detail entries.",
                }
            return {
                "status": "not_found",
                "exposed": False,
                "breach_count": 0,
                "breaches": [],
                "note": None,
            }

        if exposed_flag is True:
            return {
                "status": "exposed",
                "exposed": True,
                "breach_count": 1,
                "breaches": [],
                "note": "Provider indicated exposure without structured breach details.",
            }
        if exposed_flag is False:
            return {
                "status": "not_found",
                "exposed": False,
                "breach_count": 0,
                "breaches": [],
                "note": None,
            }

        return {
            "status": "unknown",
            "exposed": False,
            "breach_count": 0,
            "breaches": [],
            "note": "Provider returned an unrecognized response format.",
        }

    async def check_email(self, email: str) -> dict[str, Any]:
        if not self.provider_settings_complete:
            raise BreachProviderConfigError("RapidAPI breach provider settings are incomplete.")
        if not settings.rapidapi_breach_key.strip():
            raise BreachProviderConfigError(
                "RapidAPI breach provider is not configured. Add RAPIDAPI_BREACH_KEY to enable live checks."
            )

        method, url, headers, params, payload = self._build_request(email)

        try:
            async with httpx.AsyncClient(timeout=PROVIDER_TIMEOUT_SECONDS, follow_redirects=True) as client:
                request_kwargs: dict[str, Any] = {"headers": headers}
                if params:
                    request_kwargs["params"] = params
                if method in {"POST", "PUT", "PATCH"}:
                    request_kwargs["json"] = payload
                response = await client.request(method, url, **request_kwargs)
        except httpx.TimeoutException:
            return {
                "status": "provider_error",
                "exposed": False,
                "breach_count": 0,
                "breaches": [],
                "error": "The breach provider is currently unavailable. Please try again later.",
            }
        except httpx.RequestError:
            return {
                "status": "provider_error",
                "exposed": False,
                "breach_count": 0,
                "breaches": [],
                "error": "The breach provider is currently unavailable. Please try again later.",
            }

        if response.status_code == 429:
            return {
                "status": "provider_error",
                "exposed": False,
                "breach_count": 0,
                "breaches": [],
                "error": self.map_provider_error(response.status_code),
            }
        if response.status_code >= 400:
            return {
                "status": "provider_error",
                "exposed": False,
                "breach_count": 0,
                "breaches": [],
                "error": self.map_provider_error(response.status_code),
            }

        try:
            payload = response.json()
        except ValueError:
            return {
                "status": "unknown",
                "exposed": False,
                "breach_count": 0,
                "breaches": [],
                "note": "Provider returned an unrecognized response format.",
            }

        return self.normalize_provider_response(payload)
