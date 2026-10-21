# utils/redis_pool.py
"""
One bounded Redis connection pool per process, shared by every thread.

Django keeps a separate cache object per thread, and the built-in RedisCache gives each one its own
connection pool, so a busy ASGI server held one Redis connection per worker thread (60 under a burst of
60 requests) and blew through the 30-connection limit of a small Redis plan. redis-py pools are
thread-safe, so sharing one is safe; the blocking pool makes callers wait briefly for a free connection
instead of opening more.
"""
import threading

from redis import BlockingConnectionPool

_pools = {}
_lock = threading.Lock()


class SharedBlockingConnectionPool(BlockingConnectionPool):
    @classmethod
    def from_url(cls, url, **kwargs):
        key = (url, tuple(sorted((k, repr(v)) for k, v in kwargs.items())))
        with _lock:
            pool = _pools.get(key)
            if pool is None:
                pool = _pools[key] = super().from_url(url, **kwargs)
            return pool
