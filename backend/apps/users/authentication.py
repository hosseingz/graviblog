"""
Custom Cookie & Header JWT Authentication Backend for Django REST Framework.
"""

from __future__ import annotations

import logging
from typing import Any, Optional, Tuple
import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AbstractBaseUser
from django.core.cache import cache
from rest_framework import exceptions
from rest_framework.authentication import BaseAuthentication, CSRFCheck
from rest_framework.request import Request
from users.jwt_utils import (
    ACCESS_COOKIE_NAME,
    REFRESH_COOKIE_NAME,
    ALGORITHM,
    get_jwt_signing_key,
)

logger = logging.getLogger(__name__)
User = get_user_model()


class CookieJWTAuthentication(BaseAuthentication):
    """
    Production-grade JWT authentication backend inspecting both headers and HttpOnly cookies.

    Authentication Strategy:
    1. Authorization Header: `Bearer <jwt_token>` (for mobile/API clients - bypasses CSRF)
    2. HttpOnly Cookie: `pod_access_token` (for web browser clients - enforces CSRF on mutations)

    AI Guardrail & Security Rules:
    - Dedicated Signing Key: Validates tokens exclusively against `settings.JWT_SIGNING_KEY`.
    - Mandatory JTI: Every token must provide a unique UUID `jti` claim.
    - Stateful Revocation: Checks incoming `jti` against the Redis/cache blacklist.
    - Family Revocation: Rejects tokens if user session family has been invalidated.
    - CSRF Protection: Enforces strict CSRF check for cookie-authenticated state-changing requests.
    - Anti-Silent-Degradation: If an access token is expired, or if missing while refresh cookie exists,
      MUST raise `exceptions.AuthenticationFailed` with code `token_refresh_required` (HTTP 401).
    """

    def authenticate(self, request: Request) -> Optional[Tuple[AbstractBaseUser, dict[str, Any]]]:
        raw_token, from_cookie = self._extract_token(request)
        has_refresh_cookie: bool = REFRESH_COOKIE_NAME in request.COOKIES

        if raw_token is None:
            if has_refresh_cookie:
                logger.debug("Access cookie missing while refresh cookie is present. Triggering refresh.")
                raise exceptions.AuthenticationFailed(
                    detail={"detail": "Access token missing; refresh required.", "code": "token_refresh_required"},
                    code="token_refresh_required",
                )
            return None

        return self._authenticate_credentials(request, raw_token, has_refresh_cookie, from_cookie)

    def _extract_token(self, request: Request) -> Tuple[Optional[str], bool]:
        """
        Extracts the JWT from either the Authorization header or HttpOnly cookie.
        Header takes precedence for API clients / mobile apps.
        Returns tuple: (raw_token, from_cookie)
        """
        auth_header = request.headers.get("Authorization") or request.META.get("HTTP_AUTHORIZATION")
        if auth_header:
            parts = auth_header.split()
            if len(parts) == 2 and parts[0].lower() == "bearer":
                return parts[1], False

        cookie_token = request.COOKIES.get(ACCESS_COOKIE_NAME)
        if cookie_token:
            return cookie_token, True

        return None, False

    def enforce_csrf(self, request: Request) -> None:
        """
        Enforces CSRF validation for cookie-authenticated mutating requests.
        """
        def dummy_get_response(req):
            return None

        check = CSRFCheck(dummy_get_response)
        check.process_request(request)
        reason = check.process_view(request, None, (), {})
        if reason:
            logger.warning("CSRF validation failed for cookie-authenticated request: %s", reason)
            raise exceptions.PermissionDenied(f"CSRF Failed: {reason}")

    def _authenticate_credentials(
        self, request: Request, raw_token: str, has_refresh_cookie: bool, from_cookie: bool
    ) -> Tuple[AbstractBaseUser, dict[str, Any]]:
        # Enforce CSRF check for cookie-authenticated state-changing requests
        if from_cookie and request.method not in ("GET", "HEAD", "OPTIONS", "TRACE"):
            self.enforce_csrf(request)

        try:
            signing_key = get_jwt_signing_key()
        except ValueError as exc:
            logger.critical("Security configuration error: %s", exc)
            raise exceptions.AuthenticationFailed(
                detail={"detail": "Server security configuration error.", "code": "server_misconfigured"},
                code="server_misconfigured",
            )

        try:
            payload: dict[str, Any] = jwt.decode(
                raw_token,
                signing_key,
                algorithms=[ALGORITHM],
                options={"require": ["exp", "iat", "user_id", "jti"]},
            )
        except jwt.ExpiredSignatureError:
            logger.info("JWT access token signature expired.")
            code = "token_refresh_required" if has_refresh_cookie else "token_expired"
            raise exceptions.AuthenticationFailed(
                detail={
                    "detail": "Access token expired; refresh required.",
                    "code": code,
                },
                code=code,
            )
        except jwt.InvalidTokenError as exc:
            logger.warning("Invalid JWT access token: %s", exc)
            raise exceptions.AuthenticationFailed(
                detail={"detail": "Invalid authorization token.", "code": "token_invalid"},
                code="token_invalid",
            )

        token_type = payload.get("token_type") or payload.get("type")
        if token_type != "access":
            raise exceptions.AuthenticationFailed(
                detail={"detail": "Invalid token type presented for authentication.", "code": "token_type_invalid"},
                code="token_type_invalid",
            )

        jti = payload.get("jti")
        if not jti:
            raise exceptions.AuthenticationFailed(
                detail={"detail": "Token identifier claim missing.", "code": "token_jti_missing"},
                code="token_jti_missing",
            )

        # Stateful Revocation check against Redis / Cache blacklist
        if cache.get(f"jwt:blacklist:{jti}"):
            logger.warning("Revoked token presented for authentication: jti=%s", jti)
            raise exceptions.AuthenticationFailed(
                detail={"detail": "Token has been revoked or invalidated.", "code": "token_revoked"},
                code="token_revoked",
            )

        user_id = payload.get("user_id")
        if not user_id:
            raise exceptions.AuthenticationFailed(
                detail={"detail": "Malformed token payload.", "code": "token_malformed"},
                code="token_malformed",
            )

        # Family Revocation check
        if cache.get(f"jwt:user_revoked:{user_id}"):
            logger.warning("Revoked user session attempted token authentication: user_id=%s", user_id)
            raise exceptions.AuthenticationFailed(
                detail={"detail": "Session has been revoked or invalidated.", "code": "token_revoked"},
                code="token_revoked",
            )

        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            raise exceptions.AuthenticationFailed(
                detail={"detail": "User account associated with this token not found.", "code": "user_not_found"},
                code="user_not_found",
            )

        if not user.is_active:
            raise exceptions.AuthenticationFailed(
                detail={"detail": "User account is suspended or inactive.", "code": "user_inactive"},
                code="user_inactive",
            )

        return user, payload

    def authenticate_header(self, request: Request) -> str:
        return 'Bearer realm="api"'
