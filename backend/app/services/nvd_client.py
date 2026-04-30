from __future__ import annotations

import time
from typing import Any

import httpx
from fastapi import HTTPException, status

from app.core.config import settings


class NVDClientError(Exception):
    pass


class NVDRateLimitError(NVDClientError):
    pass


class NVDClient:
    def __init__(self) -> None:
        self.base_url = settings.nvd_api_base_url
        self.api_key = settings.nvd_api_key
        self.timeout = settings.nvd_request_timeout_seconds
        self.results_per_page = settings.nvd_results_per_page

    def _get_headers(self) -> dict[str, str]:
        headers = {"User-Agent": "LogShield-SOC/1.0 (defensive-vulnerability-intelligence)"}
        if self.api_key:
            headers["apiKey"] = self.api_key
        return headers

    async def search_by_cve_id(self, cve_id: str) -> dict[str, Any]:
        if not cve_id.upper().startswith("CVE-"):
            cve_id = f"CVE-{cve_id}"
        params = {"cveId": cve_id}
        return await self._request(params)

    async def search_by_keyword(self, keyword: str, severity: str | None = None, start_index: int = 0) -> dict[str, Any]:
        params = {
            "keywordSearch": keyword,
            "resultsPerPage": self.results_per_page,
            "startIndex": start_index,
        }
        if severity:
            params["cvssV3Severity"] = severity.upper()
        return await self._request(params)

    async def _request(self, params: dict[str, Any]) -> dict[str, Any]:
        headers = self._get_headers()
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(self.base_url, headers=headers, params=params)
                if response.status_code == 403:
                    raise NVDRateLimitError("NVD API rate limit exceeded. Please try again later.")
                if response.status_code == 404:
                    return {"vulnerabilities": [], "totalResults": 0}
                if response.status_code >= 400:
                    raise NVDClientError(f"NVD API error: {response.status_code} - {response.text}")
                return response.json()
        except httpx.TimeoutException:
            raise NVDClientError("NVD API request timed out.")
        except httpx.RequestError as e:
            raise NVDClientError(f"NVD API request failed: {e}")
        except NVDClientError:
            raise
        except Exception as e:
            raise NVDClientError(f"Unexpected error: {e}")

    @staticmethod
    def is_cve_id(query: str) -> bool:
        q = query.strip().upper()
        return q.startswith("CVE-") or q.replace("-", "").isdigit() and len(q.replace("-", "")) >= 8
