from __future__ import annotations

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.auth.service import AuthService, AuthenticatedRecruiter

http_bearer = HTTPBearer(auto_error=False)


def get_current_recruiter(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(http_bearer),
) -> AuthenticatedRecruiter:
    """Resolve the authenticated recruiter from the Supabase bearer token."""
    auth_service: AuthService = request.app.state.auth_service
    token = credentials.credentials if credentials else None
    return auth_service.authenticate(token)

