from __future__ import annotations

from functools import cached_property

from supabase import Client, create_client
from supabase.lib.client_options import SyncClientOptions

from app.core.config import Settings


class SupabaseClientFactory:
    """Creates Supabase clients for admin and recruiter-scoped access."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    @cached_property
    def _admin_client(self) -> Client:
        return create_client(
            self._settings.supabase_url,
            self._settings.supabase_service_role_key,
            options=SyncClientOptions(
                auto_refresh_token=False,
                persist_session=False,
            ),
        )

    def admin(self) -> Client:
        return self._admin_client

    def for_access_token(self, access_token: str) -> Client:
        return create_client(
            self._settings.supabase_url,
            self._settings.supabase_service_role_key,
            options=SyncClientOptions(
                headers={"Authorization": f"Bearer {access_token}"},
                auto_refresh_token=False,
                persist_session=False,
            ),
        )

