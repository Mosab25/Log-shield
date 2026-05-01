from __future__ import annotations

import time
from typing import Any, Dict, Optional

class SimpleCache:
    """Simple in-memory cache with TTL"""
    def __init__(self, default_ttl: int = 300):  # 5 minutes default TTL
        self._cache: Dict[str, Dict[str, Any]] = {}
        self.default_ttl = default_ttl

    def get(self, key: str) -> Optional[Any]:
        """Get value from cache if not expired"""
        if key not in self._cache:
            return None
        
        item = self._cache[key]
        if time.time() > item["expires_at"]:
            del self._cache[key]
            return None
        
        return item["value"]

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Set value in cache with TTL"""
        expires_at = time.time() + (ttl or self.default_ttl)
        self._cache[key] = {
            "value": value,
            "expires_at": expires_at
        }

    def clear(self) -> None:
        """Clear all cache"""
        self._cache.clear()

    def delete(self, key: str) -> None:
        """Delete specific key from cache"""
        self._cache.pop(key, None)

# Global cache instances
cache = SimpleCache(default_ttl=300)  # 5 minutes
short_cache = SimpleCache(default_ttl=60)  # 1 minute
long_cache = SimpleCache(default_ttl=900)  # 15 minutes
