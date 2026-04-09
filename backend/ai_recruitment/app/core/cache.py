from __future__ import annotations

from collections import OrderedDict
from threading import RLock
from time import monotonic
from typing import Generic, Hashable, TypeVar

K = TypeVar("K", bound=Hashable)
V = TypeVar("V")


class TTLCache(Generic[K, V]):
    """Small in-memory TTL cache for read-heavy hot paths."""

    def __init__(self, ttl_seconds: int, max_size: int = 512) -> None:
        self._ttl_seconds = max(ttl_seconds, 0)
        self._max_size = max(max_size, 1)
        self._store: OrderedDict[K, tuple[float, V]] = OrderedDict()
        self._lock = RLock()

    def get(self, key: K) -> V | None:
        if self._ttl_seconds <= 0:
            return None

        now = monotonic()
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None

            expires_at, value = entry
            if expires_at <= now:
                self._store.pop(key, None)
                return None

            self._store.move_to_end(key)
            return value

    def set(self, key: K, value: V) -> None:
        if self._ttl_seconds <= 0:
            return

        with self._lock:
            self._store[key] = (monotonic() + self._ttl_seconds, value)
            self._store.move_to_end(key)
            self._evict_if_needed()

    def clear(self) -> None:
        with self._lock:
            self._store.clear()

    def _evict_if_needed(self) -> None:
        now = monotonic()
        expired_keys = [key for key, (expires_at, _) in self._store.items() if expires_at <= now]
        for key in expired_keys:
            self._store.pop(key, None)

        while len(self._store) > self._max_size:
            self._store.popitem(last=False)
