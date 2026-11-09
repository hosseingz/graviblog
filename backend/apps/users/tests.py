import uuid
from datetime import datetime, timezone, timedelta
import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.middleware.csrf import _get_new_csrf_string, _mask_cipher_secret
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from users.jwt_utils import (
    ACCESS_COOKIE_NAME,
    REFRESH_COOKIE_NAME,
    ALGORITHM,
    generate_token_pair,
    get_jwt_signing_key,
)

User = get_user_model()


class AuthAPITests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="test_gamer",
            password="GamerPass123!",
            email="gamer@graviblog.dev",
            handle="TEST_GAMER",
        )

    def tearDown(self):
        cache.clear()

    def test_login_sets_httponly_cookies(self):
        response = self.client.post(
            "/api/v1/auth/login/",
            data={"username": "test_gamer", "password": "GamerPass123!"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("user", response.json())
        self.assertEqual(response.json()["user"]["username"], "test_gamer")

        # Verify HttpOnly cookies, Path=/, and SameSite=Lax
        self.assertIn(ACCESS_COOKIE_NAME, response.cookies)
        self.assertIn(REFRESH_COOKIE_NAME, response.cookies)
        self.assertTrue(response.cookies[ACCESS_COOKIE_NAME]["httponly"])
        self.assertTrue(response.cookies[REFRESH_COOKIE_NAME]["httponly"])
        self.assertEqual(response.cookies[ACCESS_COOKIE_NAME]["path"], "/")
        self.assertEqual(response.cookies[REFRESH_COOKIE_NAME]["path"], "/")
        self.assertEqual(response.cookies[ACCESS_COOKIE_NAME]["samesite"], "Lax")
        self.assertEqual(response.cookies[REFRESH_COOKIE_NAME]["samesite"], "Lax")

    def test_me_endpoint_with_cookie(self):
        login_res = self.client.post(
            "/api/v1/auth/login/",
            data={"username": "test_gamer", "password": "GamerPass123!"},
        )
        access_cookie = login_res.cookies[ACCESS_COOKIE_NAME].value
        self.client.cookies[ACCESS_COOKIE_NAME] = access_cookie

        me_res = self.client.get("/api/v1/auth/me/")
        self.assertEqual(me_res.status_code, status.HTTP_200_OK)
        self.assertEqual(me_res.json()["username"], "test_gamer")
        self.assertEqual(me_res.json()["handle"], "TEST_GAMER")

    def test_token_refresh(self):
        login_res = self.client.post(
            "/api/v1/auth/login/",
            data={"username": "test_gamer", "password": "GamerPass123!"},
        )
        refresh_cookie = login_res.cookies[REFRESH_COOKIE_NAME].value
        self.client.cookies[REFRESH_COOKIE_NAME] = refresh_cookie

        refresh_res = self.client.post("/api/v1/auth/token/refresh/")
        self.assertEqual(refresh_res.status_code, status.HTTP_200_OK)
        self.assertEqual(refresh_res.json()["status"], "refreshed")
        self.assertIn(ACCESS_COOKIE_NAME, refresh_res.cookies)
        self.assertEqual(refresh_res.cookies[ACCESS_COOKIE_NAME]["path"], "/")
        self.assertEqual(refresh_res.cookies[REFRESH_COOKIE_NAME]["path"], "/")

    def test_logout_clears_cookies(self):
        logout_res = self.client.post("/api/v1/auth/logout/")
        self.assertEqual(logout_res.status_code, status.HTTP_200_OK)
        self.assertEqual(logout_res.cookies[ACCESS_COOKIE_NAME]["max-age"], 0)
        self.assertEqual(logout_res.cookies[ACCESS_COOKIE_NAME]["expires"], "Thu, 01 Jan 1970 00:00:00 GMT")
        self.assertEqual(logout_res.cookies[ACCESS_COOKIE_NAME]["path"], "/")
        self.assertEqual(logout_res.cookies[REFRESH_COOKIE_NAME]["max-age"], 0)
        self.assertEqual(logout_res.cookies[REFRESH_COOKIE_NAME]["expires"], "Thu, 01 Jan 1970 00:00:00 GMT")
        self.assertEqual(logout_res.cookies[REFRESH_COOKIE_NAME]["path"], "/")

    def test_tokens_contain_valid_uuid_jti(self):
        access_token, refresh_token = generate_token_pair(self.user)
        signing_key = get_jwt_signing_key()

        access_payload = jwt.decode(access_token, signing_key, algorithms=[ALGORITHM])
        refresh_payload = jwt.decode(refresh_token, signing_key, algorithms=[ALGORITHM])

        self.assertIn("jti", access_payload)
        self.assertIn("jti", refresh_payload)

        # Validate that jti values are valid UUID v4
        access_uuid = uuid.UUID(access_payload["jti"], version=4)
        refresh_uuid = uuid.UUID(refresh_payload["jti"], version=4)
        self.assertNotEqual(access_uuid, refresh_uuid)

    def test_stateful_rtr_and_blacklisting(self):
        login_res = self.client.post(
            "/api/v1/auth/login/",
            data={"username": "test_gamer", "password": "GamerPass123!"},
        )
        initial_refresh_cookie = login_res.cookies[REFRESH_COOKIE_NAME].value
        signing_key = get_jwt_signing_key()
        initial_payload = jwt.decode(initial_refresh_cookie, signing_key, algorithms=[ALGORITHM])
        initial_jti = initial_payload["jti"]

        # 1. First refresh exchange rotates token and blacklists initial_jti
        self.client.cookies[REFRESH_COOKIE_NAME] = initial_refresh_cookie
        refresh_res = self.client.post("/api/v1/auth/token/refresh/")
        self.assertEqual(refresh_res.status_code, status.HTTP_200_OK)

        # Confirm old jti is blacklisted in cache
        self.assertEqual(cache.get(f"jwt:blacklist:{initial_jti}"), "rotated")

        new_refresh_cookie = refresh_res.cookies[REFRESH_COOKIE_NAME].value
        new_payload = jwt.decode(new_refresh_cookie, signing_key, algorithms=[ALGORITHM])
        self.assertNotEqual(initial_jti, new_payload["jti"])

        # 2. Reusing rotated initial refresh token triggers 401 and family revocation
        reuse_client = APIClient()
        reuse_client.cookies[REFRESH_COOKIE_NAME] = initial_refresh_cookie
        reuse_res = reuse_client.post("/api/v1/auth/token/refresh/")
        self.assertEqual(reuse_res.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(reuse_res.json()["code"], "token_reuse_detected")

        # Confirm user family is revoked in cache
        self.assertTrue(cache.get(f"jwt:user_revoked:{self.user.pk}"))

        # 3. Subsequent refresh with the new token is also rejected due to family revocation
        subsequent_client = APIClient()
        subsequent_client.cookies[REFRESH_COOKIE_NAME] = new_refresh_cookie
        subsequent_res = subsequent_client.post("/api/v1/auth/token/refresh/")
        self.assertEqual(subsequent_res.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(subsequent_res.json()["code"], "session_terminated")

    def test_blacklisted_token_rejected_by_cookie_auth(self):
        access_token, _ = generate_token_pair(self.user)
        signing_key = get_jwt_signing_key()
        payload = jwt.decode(access_token, signing_key, algorithms=[ALGORITHM])
        jti = payload["jti"]

        # Blacklist the access token
        cache.set(f"jwt:blacklist:{jti}", "revoked", timeout=60)

        self.client.cookies[ACCESS_COOKIE_NAME] = access_token
        res = self.client.get("/api/v1/auth/me/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(res.json()["code"], "token_revoked")

    def test_cryptographic_key_isolation(self):
        # 1. Sign a token with settings.SECRET_KEY instead of JWT_SIGNING_KEY
        now = datetime.now(timezone.utc)
        rogue_payload = {
            "user_id": self.user.pk,
            "username": self.user.username,
            "role": "READER",
            "token_type": "access",
            "iat": now,
            "exp": now + timedelta(minutes=15),
            "jti": str(uuid.uuid4()),
        }
        rogue_token = jwt.encode(rogue_payload, settings.SECRET_KEY, algorithm="HS256")

        # Authentication must reject rogue token signed with SECRET_KEY
        self.client.cookies[ACCESS_COOKIE_NAME] = rogue_token
        res = self.client.get("/api/v1/auth/me/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(res.json()["code"], "token_invalid")

        # 2. Token signed with dedicated JWT_SIGNING_KEY succeeds
        legit_token = jwt.encode(rogue_payload, settings.JWT_SIGNING_KEY, algorithm="HS256")
        self.client.cookies[ACCESS_COOKIE_NAME] = legit_token
        legit_res = self.client.get("/api/v1/auth/me/")
        self.assertEqual(legit_res.status_code, status.HTTP_200_OK)

        # 3. get_jwt_signing_key fails if JWT_SIGNING_KEY is substituted with SECRET_KEY
        with self.settings(JWT_SIGNING_KEY=settings.SECRET_KEY):
            with self.assertRaises(ValueError):
                get_jwt_signing_key()

    def test_case_insensitive_username_collision_resolution(self):
        # user1 exists as 'test_gamer' with handle 'TEST_GAMER'
        user2 = User.objects.create_user(
            username="Test_Gamer",
            password="Password123!",
            email="gamer2@graviblog.dev",
        )
        self.assertEqual(user2.handle, "TEST_GAMER_1")

        user3 = User.objects.create_user(
            username="TEST_GAMER",
            password="Password123!",
            email="gamer3@graviblog.dev",
        )
        self.assertEqual(user3.handle, "TEST_GAMER_2")

        # Updating user1 does not collide with its own handle
        self.user.bio = "Updated bio for gamer 1"
        self.user.save()
        self.assertEqual(self.user.handle, "TEST_GAMER")

    def test_case_insensitive_username_collision_long_handle(self):
        long_username = "X" * 64
        user_a = User.objects.create_user(
            username=long_username,
            password="Password123!",
            email="long_a@graviblog.dev",
        )
        self.assertEqual(user_a.handle, "X" * 64)

        user_b = User.objects.create_user(
            username=long_username.lower(),
            password="Password123!",
            email="long_b@graviblog.dev",
        )
        expected_handle = ("X" * 62) + "_1"
        self.assertEqual(user_b.handle, expected_handle)
        self.assertEqual(len(user_b.handle), 64)

    def test_csrf_enforcement_for_cookie_authenticated_mutations(self):
        access_token, _ = generate_token_pair(self.user)
        csrf_client = APIClient(enforce_csrf_checks=True)
        csrf_client.cookies[ACCESS_COOKIE_NAME] = access_token

        # 1. State-changing request (PATCH) with cookie auth but NO CSRF token must fail with 403
        no_csrf_res = csrf_client.patch(
            "/api/v1/auth/me/",
            data={"bio": "Unverified mutation"},
            format="json",
        )
        self.assertEqual(no_csrf_res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("CSRF Failed", no_csrf_res.json()["detail"])

        # 2. State-changing request with valid CSRF token succeeds
        csrf_token = _get_new_csrf_string()
        masked_token = _mask_cipher_secret(csrf_token)
        csrf_client.cookies[settings.CSRF_COOKIE_NAME] = csrf_token

        valid_csrf_res = csrf_client.patch(
            "/api/v1/auth/me/",
            data={"bio": "Legitimate verified mutation"},
            format="json",
            HTTP_X_CSRFTOKEN=masked_token,
        )
        self.assertEqual(valid_csrf_res.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.bio, "Legitimate verified mutation")

    def test_csrf_not_enforced_for_bearer_header_mutations(self):
        access_token, _ = generate_token_pair(self.user)
        bearer_client = APIClient()

        # Bearer header mutation without CSRF token succeeds
        res = bearer_client.patch(
            "/api/v1/auth/me/",
            data={"bio": "Bearer authenticated mutation"},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {access_token}",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.bio, "Bearer authenticated mutation")
