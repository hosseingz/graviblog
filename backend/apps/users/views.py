from datetime import datetime, timezone
import logging
import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

from users.serializers import UserSerializer, LoginSerializer, RegisterSerializer
from users.jwt_utils import (
    generate_token_pair,
    set_auth_cookies,
    clear_auth_cookies,
    get_jwt_signing_key,
    ACCESS_COOKIE_NAME,
    REFRESH_COOKIE_NAME,
    ALGORITHM,
    REFRESH_LIFETIME,
)

logger = logging.getLogger(__name__)
User = get_user_model()


@method_decorator(ensure_csrf_cookie, name="dispatch")
class LoginAPIView(APIView):
    """
    Authenticates user and sets dual HttpOnly JWT cookies.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]

        # Reset any prior family revocation on fresh login
        cache.delete(f"jwt:user_revoked:{user.pk}")

        access_token, refresh_token = generate_token_pair(user)

        response = Response(
            {
                "status": "authenticated",
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )
        set_auth_cookies(response, access_token, refresh_token)
        return response


class RefreshTokenView(APIView):
    """
    Exchanges HttpOnly refresh token cookie for a rotated access/refresh pair.
    Implements stateful Refresh Token Rotation (RTR) and reuse detection.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        refresh_token = request.COOKIES.get(REFRESH_COOKIE_NAME)
        if not refresh_token:
            response = Response(
                {"detail": "Refresh token cookie missing.", "code": "token_missing"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            clear_auth_cookies(response)
            return response

        try:
            signing_key = get_jwt_signing_key()
            payload = jwt.decode(
                refresh_token,
                signing_key,
                algorithms=[ALGORITHM],
                options={"require": ["exp", "iat", "user_id", "jti"]},
            )
        except jwt.ExpiredSignatureError:
            response = Response(
                {"detail": "Refresh token has expired. Re-login required.", "code": "session_expired"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            clear_auth_cookies(response)
            return response
        except jwt.InvalidTokenError:
            response = Response(
                {"detail": "Invalid refresh token presented.", "code": "token_invalid"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            clear_auth_cookies(response)
            return response

        token_type = payload.get("token_type") or payload.get("type")
        if token_type != "refresh":
            response = Response(
                {"detail": "Invalid token type.", "code": "token_type_invalid"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            clear_auth_cookies(response)
            return response

        jti = payload.get("jti")
        user_id = payload.get("user_id")
        if not jti or not user_id:
            response = Response(
                {"detail": "Malformed token payload.", "code": "token_malformed"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            clear_auth_cookies(response)
            return response

        # Refresh Token Rotation (RTR): Check if this token was already rotated/revoked (Reuse Detection)
        if cache.get(f"jwt:blacklist:{jti}"):
            logger.critical(
                "SECURITY ALERT: Refresh token reuse detected! jti=%s for user_id=%s. Revoking session family.",
                jti,
                user_id,
            )
            # Invalidate entire token lineage/family for this user
            cache.set(f"jwt:user_revoked:{user_id}", True, timeout=int(REFRESH_LIFETIME.total_seconds()))
            response = Response(
                {"detail": "Token reuse detected. All active sessions invalidated.", "code": "token_reuse_detected"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            clear_auth_cookies(response)
            return response

        # Check if user session family has been revoked
        if cache.get(f"jwt:user_revoked:{user_id}"):
            logger.warning("Revoked user session attempted token refresh: user_id=%s", user_id)
            response = Response(
                {"detail": "Session has been terminated. Please log in again.", "code": "session_terminated"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            clear_auth_cookies(response)
            return response

        user = User.objects.filter(pk=user_id, is_active=True).first()
        if user is None:
            response = Response(
                {"detail": "User associated with token not found or inactive.", "code": "user_not_found"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            clear_auth_cookies(response)
            return response

        # Blacklist the consumed refresh token jti for its remaining TTL in Redis
        now_ts = datetime.now(timezone.utc).timestamp()
        exp_ts = payload.get("exp", now_ts + REFRESH_LIFETIME.total_seconds())
        remaining_ttl = max(int(exp_ts - now_ts), 60)
        cache.set(f"jwt:blacklist:{jti}", "rotated", timeout=remaining_ttl)

        # Issue fresh token pair (RTR)
        new_access_token, new_refresh_token = generate_token_pair(user)
        response = Response(
            {
                "status": "refreshed",
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )
        set_auth_cookies(response, new_access_token, new_refresh_token)
        return response


class LogoutAPIView(APIView):
    """
    Clears HttpOnly auth cookies deterministically and blacklists active tokens.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        for cookie_name in (ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME):
            raw_token = request.COOKIES.get(cookie_name)
            if raw_token:
                try:
                    payload = jwt.decode(
                        raw_token,
                        get_jwt_signing_key(),
                        algorithms=[ALGORITHM],
                        options={"verify_exp": False, "verify_signature": True},
                    )
                    jti = payload.get("jti")
                    if jti:
                        now_ts = datetime.now(timezone.utc).timestamp()
                        exp_ts = payload.get("exp")
                        remaining_ttl = max(int(exp_ts - now_ts), 60) if exp_ts else int(REFRESH_LIFETIME.total_seconds())
                        cache.set(f"jwt:blacklist:{jti}", "logout", timeout=remaining_ttl)
                        logger.info("Blacklisted token jti=%s on logout.", jti)
                except Exception as exc:
                    logger.debug("Could not decode token during logout blacklisting: %s", exc)

        response = Response({"status": "logged_out"}, status=status.HTTP_200_OK)
        clear_auth_cookies(response)
        return response


class MeAPIView(APIView):
    """
    Returns or updates profile metadata for the authenticated user.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


@method_decorator(ensure_csrf_cookie, name="dispatch")
class RegisterAPIView(APIView):
    """
    Registration endpoint for creating reader accounts.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        access_token, refresh_token = generate_token_pair(user)
        response = Response(
            {
                "status": "created",
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )
        set_auth_cookies(response, access_token, refresh_token)
        return response
