"""
JWT Utility functions for Dual-Cookie HttpOnly Authentication Flow.
"""

from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Optional, Tuple
import uuid
import jwt
from django.conf import settings
from django.http import HttpResponse
from django.contrib.auth import get_user_model

User = get_user_model()

JWT_CONFIG = getattr(
    settings,
    "JWT_AUTH",
    {
        "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
        "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
        "ACCESS_COOKIE_NAME": "pod_access_token",
        "REFRESH_COOKIE_NAME": "pod_refresh_token",
        "ALGORITHM": "HS256",
    },
)

ACCESS_COOKIE_NAME = JWT_CONFIG.get("ACCESS_COOKIE_NAME", "pod_access_token")
REFRESH_COOKIE_NAME = JWT_CONFIG.get("REFRESH_COOKIE_NAME", "pod_refresh_token")
ALGORITHM = JWT_CONFIG.get("ALGORITHM", "HS256")
ACCESS_LIFETIME = JWT_CONFIG.get("ACCESS_TOKEN_LIFETIME", timedelta(minutes=15))
REFRESH_LIFETIME = JWT_CONFIG.get("REFRESH_TOKEN_LIFETIME", timedelta(days=7))


def get_jwt_signing_key() -> str:
    """
    Retrieves the dedicated JWT signing key. Reusing SECRET_KEY is strictly prohibited.
    """
    key = getattr(settings, "JWT_SIGNING_KEY", "")
    secret_key = getattr(settings, "SECRET_KEY", "")
    if not key or (secret_key and key == secret_key):
        raise ValueError("FATAL: JWT_SIGNING_KEY is unconfigured or identical to SECRET_KEY.")
    return key


def generate_token_pair(user: Any) -> Tuple[str, str]:
    """
    Generates access and refresh tokens for a user using dedicated JWT_SIGNING_KEY
    and embedding a unique UUID v4 jti in each token payload.
    """
    now = datetime.now(timezone.utc)
    signing_key = get_jwt_signing_key()

    access_jti = str(uuid.uuid4())
    refresh_jti = str(uuid.uuid4())

    access_payload = {
        "user_id": user.pk,
        "username": user.username,
        "role": getattr(user, "role", "READER"),
        "token_type": "access",
        "type": "access",
        "iat": now,
        "exp": now + ACCESS_LIFETIME,
        "jti": access_jti,
    }

    refresh_payload = {
        "user_id": user.pk,
        "token_type": "refresh",
        "type": "refresh",
        "iat": now,
        "exp": now + REFRESH_LIFETIME,
        "jti": refresh_jti,
    }

    access_token = jwt.encode(access_payload, signing_key, algorithm=ALGORITHM)
    refresh_token = jwt.encode(refresh_payload, signing_key, algorithm=ALGORITHM)

    return access_token, refresh_token


def set_auth_cookies(response: HttpResponse, access_token: str, refresh_token: Optional[str] = None) -> HttpResponse:
    """
    Sets HttpOnly cookies on the HTTP response with mandatory Path="/" scope.
    """
    secure = not getattr(settings, "DEBUG", False)
    samesite = "Lax"

    response.set_cookie(
        key=ACCESS_COOKIE_NAME,
        value=access_token,
        max_age=int(ACCESS_LIFETIME.total_seconds()),
        httponly=True,
        secure=secure,
        samesite=samesite,
        path="/",
    )

    if refresh_token:
        response.set_cookie(
            key=REFRESH_COOKIE_NAME,
            value=refresh_token,
            max_age=int(REFRESH_LIFETIME.total_seconds()),
            httponly=True,
            secure=secure,
            samesite=samesite,
            path="/",
        )

    return response


def clear_auth_cookies(response: HttpResponse) -> HttpResponse:
    """
    Deletes the auth cookies deterministically by setting max_age=0,
    past Expires header, and path="/".
    """
    secure = not getattr(settings, "DEBUG", False)
    samesite = "Lax"

    for cookie_name in (ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME):
        response.delete_cookie(cookie_name, path="/")
        response.set_cookie(
            key=cookie_name,
            value="",
            max_age=0,
            expires="Thu, 01 Jan 1970 00:00:00 GMT",
            httponly=True,
            secure=secure,
            samesite=samesite,
            path="/",
        )
    return response
