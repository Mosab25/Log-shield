"""Simple in-memory TTL cache for expensive summary endpoints."""
import time
import hashlib
from typing import Any, Dict, Optional
import logging

logger = logging.getLogger("logshield")

class PerformanceCache:
    """Simple thread-safe TTL cache for performance optimization."""
    
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._lock = None  # Simple for single instance deployment
    
    def get(self, key: str) -> Optional[Any]:
        """Get item from cache if not expired."""
        if key not in self._cache:
            return None
        
        item = self._cache[key]
        if time.time() > item["expires_at"]:
            del self._cache[key]
            return None
        
        return item["data"]
    
    def set(self, key: str, data: Any, ttl_seconds: int = 30) -> None:
        """Set item in cache with TTL."""
        self._cache[key] = {
            "data": data,
            "expires_at": time.time() + ttl_seconds,
            "created_at": time.time()
        }
    
    def invalidate(self, pattern: str) -> None:
        """Invalidate cache entries matching pattern."""
        keys_to_delete = [key for key in self._cache.keys() if pattern in key]
        for key in keys_to_delete:
            del self._cache[key]
    
    def clear(self) -> None:
        """Clear all cache entries."""
        self._cache.clear()
    
    def stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        now = time.time()
        active_items = sum(1 for item in self._cache.values() if now <= item["expires_at"])
        return {
            "total_keys": len(self._cache),
            "active_items": active_items,
            "memory_usage_estimate": len(str(self._cache))
        }

# Global cache instance
cache = PerformanceCache()

# Cache TTLs in seconds
CACHE_TTL = {
    "dashboard_summary": 15,      # 15 seconds
    "security_center": 60,        # 1 minute
    "logs_summary": 30,           # 30 seconds
    "audit_summary": 30,           # 30 seconds
    "awareness_summary": 120,       # 2 minutes
    "alerts_stats": 15,           # 15 seconds
}

def get_cache_key(prefix: str, **kwargs) -> str:
    """Generate cache key from parameters."""
    import hashlib
    param_str = str(sorted(kwargs.items()))
    return f"{prefix}_{hashlib.md5(param_str.encode()).hexdigest()}"

def cached_result(cache_type: str, ttl_seconds: Optional[int] = None):
    """Decorator for caching expensive function results."""
    def decorator(func):
        def wrapper(*args, **kwargs):
            # Skip cache for POST/PATCH/DELETE operations by checking function name
            func_name = func.__name__.lower()
            if any(method in func_name for method in ['post', 'patch', 'delete', 'create', 'update']):
                return func(*args, **kwargs)
            
            cache_key = get_cache_key(cache_type, **kwargs)
            ttl = ttl_seconds or CACHE_TTL.get(cache_type, 30)
            
            # Try to get from cache
            result = cache.get(cache_key)
            if result is not None:
                logger.debug(f"Cache HIT: {cache_type}")
                return result
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            cache.set(cache_key, result, ttl)
            logger.debug(f"Cache SET: {cache_type} (TTL: {ttl}s)")
            
            return result
        return wrapper
    return decorator
