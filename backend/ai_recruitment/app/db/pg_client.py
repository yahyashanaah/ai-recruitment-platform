from __future__ import annotations

import asyncpg
from asyncpg import Pool

from app.core.config import Settings


class DirectPostgresPool:
    """Optional asyncpg pool for latency-sensitive read paths."""

    def __init__(self, settings: Settings) -> None:
        self._dsn = settings.supabase_db_url.strip()
        self._min_size = max(settings.pg_pool_min_size, 1)
        self._max_size = max(settings.pg_pool_max_size, self._min_size)
        self._pool: Pool | None = None

    @property
    def enabled(self) -> bool:
        return bool(self._dsn)

    async def open(self) -> None:
        if not self.enabled:
            return

        self._pool = await asyncpg.create_pool(
            dsn=self._dsn,
            min_size=self._min_size,
            max_size=self._max_size,
            command_timeout=30,
            max_inactive_connection_lifetime=300,
            server_settings={"application_name": "ai_recruitment_api"},
        )

    async def close(self) -> None:
        if self._pool is not None:
            await self._pool.close()
            self._pool = None

    def get_pool(self) -> Pool | None:
        return self._pool
