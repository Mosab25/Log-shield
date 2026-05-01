from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any
from urllib.parse import urlparse

from app.core.config import settings


class URLReputationProvider(ABC):
    """Abstract base class for URL reputation providers."""
    
    @abstractmethod
    async def scan_url(self, url: str) -> dict[str, Any]:
        """Scan a URL and return reputation data."""
        pass
    
    @abstractmethod
    def normalize_result(self, raw_result: dict[str, Any]) -> dict[str, Any]:
        """Normalize provider-specific result to standard format."""
        pass
    
    @abstractmethod
    def get_provider_name(self) -> str:
        """Get the provider name."""
        pass


class VirusTotalProvider(URLReputationProvider):
    """VirusTotal URL reputation provider."""
    
    def __init__(self):
        self.api_key = settings.virustotal_api_key
        self.base_url = "https://www.virustotal.com/api/v3"
    
    def get_provider_name(self) -> str:
        return "virustotal"
    
    async def scan_url(self, url: str) -> dict[str, Any]:
        """Scan URL using VirusTotal API."""
        import httpx
        
        if not self.api_key:
            raise ValueError("VirusTotal API key not configured")
        
        headers = {"x-apikey": self.api_key}
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            # First, get the URL ID
            url_id = self._get_url_id(url)
            
            # Get the URL report
            response = await client.get(
                f"{self.base_url}/urls/{url_id}",
                headers=headers
            )
            
            if response.status_code == 404:
                # URL not found, submit for analysis
                return await self._submit_url(client, headers, url)
            elif response.status_code == 200:
                return response.json()
            else:
                raise Exception(f"VirusTotal API error: {response.status_code}")
    
    async def _submit_url(self, client: httpx.AsyncClient, headers: dict[str, str], url: str) -> dict[str, Any]:
        """Submit URL for analysis to VirusTotal."""
        import httpx
        
        # Submit URL for analysis
        submit_response = await client.post(
            f"{self.base_url}/urls",
            headers=headers,
            data={"url": url}
        )
        
        if submit_response.status_code != 200:
            raise Exception(f"Failed to submit URL: {submit_response.status_code}")
        
        submit_data = submit_response.json()
        
        # Get the analysis result
        analysis_id = submit_data.get("data", {}).get("id")
        if not analysis_id:
            raise Exception("No analysis ID returned")
        
        # Wait a moment and get the result
        import asyncio
        await asyncio.sleep(2)
        
        result_response = await client.get(
            f"{self.base_url}/analyses/{analysis_id}",
            headers=headers
        )
        
        if result_response.status_code != 200:
            raise Exception(f"Failed to get analysis result: {result_response.status_code}")
        
        return result_response.json()
    
    def _get_url_id(self, url: str) -> str:
        """Get VirusTotal URL ID (base64 encoded URL)."""
        import base64
        import hashlib
        
        # VirusTotal uses SHA256 of the URL
        url_hash = hashlib.sha256(url.encode()).hexdigest()
        return url_hash
    
    def normalize_result(self, raw_result: dict[str, Any]) -> dict[str, Any]:
        """Normalize VirusTotal result to standard format."""
        data = raw_result.get("data", {})
        attributes = data.get("attributes", {})
        
        # Get last analysis stats
        last_analysis_stats = attributes.get("last_analysis_stats", {})
        malicious = last_analysis_stats.get("malicious", 0)
        suspicious = last_analysis_stats.get("suspicious", 0)
        harmless = last_analysis_stats.get("harmless", 0)
        undetected = last_analysis_stats.get("undetected", 0)
        timeout = last_analysis_stats.get("timeout", 0)
        
        # Determine status
        if malicious > 0:
            status = "malicious"
            score = min(100, malicious * 10)
        elif suspicious > 0:
            status = "suspicious"
            score = min(80, suspicious * 5 + 20)
        elif harmless > 0:
            status = "safe"
            score = 0
        else:
            status = "unknown"
            score = 50
        
        # Get categories
        categories = attributes.get("categories", {})
        
        # Get last analysis date
        last_analysis_date = attributes.get("last_analysis_date")
        
        # Generate recommendation
        if status == "malicious":
            recommendation = "This URL has malicious reputation. Do not open it and consider blocking related IOCs."
        elif status == "suspicious":
            recommendation = "Some engines flagged this URL as suspicious. Review before opening."
        elif status == "safe":
            recommendation = "No malicious reputation was found. Continue with normal caution."
        else:
            recommendation = "No reliable reputation data found. Treat with caution."
        
        return {
            "url": attributes.get("url", ""),
            "normalized_url": attributes.get("url", ""),
            "status": status,
            "score": score,
            "provider": self.get_provider_name(),
            "summary": {
                "malicious": malicious,
                "suspicious": suspicious,
                "harmless": harmless,
                "undetected": undetected,
                "timeout": timeout,
            },
            "categories": list(categories.values()) if categories else [],
            "last_analysis_date": last_analysis_date,
            "recommendation": recommendation,
            "raw_reference": {
                "provider_id": data.get("id", ""),
                "permalink": f"https://www.virustotal.com/gui/url/{self._get_url_id(attributes.get('url', ''))}",
            }
        }


def get_reputation_provider() -> URLReputationProvider:
    """Get the configured URL reputation provider."""
    provider_name = getattr(settings, 'url_reputation_provider', 'virustotal').lower()
    
    if provider_name == "virustotal":
        return VirusTotalProvider()
    else:
        raise ValueError(f"Unsupported URL reputation provider: {provider_name}")
