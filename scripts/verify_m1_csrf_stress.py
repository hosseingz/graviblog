#!/usr/bin/env python3
"""Milestone M1 Empirical Stress Test: CSRF Issuance & Enforcement.

This standalone test suite empirically stress-tests:
1. Cookie issuance attributes on login and register (HttpOnly=False, Path=/, SameSite=Lax).
2. Valid CSRF cookie + matching X-CSRFToken header -> 200 OK.
3. Missing CSRF cookie -> 403 Forbidden.
4. CSRF cookie present but missing header -> 403 Forbidden.
5. CSRF cookie present but mismatched/tampered header -> 403 Forbidden.
6. Bearer token authentication bypasses CSRF check as intended.
7. Safe HTTP methods (GET, HEAD, OPTIONS) do not enforce CSRF.
8. Dual auth presence (Bearer header + access cookie) precedence and CSRF bypass.
"""

import os
import sys
import unittest
from pathlib import Path

# Configure paths relative to repository root
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = WORKSPACE_ROOT / "backend"
APPS_DIR = BACKEND_DIR / "apps"

if str(WORKSPACE_ROOT) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_ROOT))
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(APPS_DIR) not in sys.path:
    sys.path.insert(0, str(APPS_DIR))

# Ensure Django is initialized
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django

django.setup()

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.middleware.csrf import _get_new_csrf_string, _mask_cipher_secret
from django.test import TestCase
from django.test.runner import DiscoverRunner
from rest_framework import status
from rest_framework.test import APIClient

from posts.models import Category, Post
from users.jwt_utils import (
    ACCESS_COOKIE_NAME,
    REFRESH_COOKIE_NAME,
    generate_token_pair,
)

User = get_user_model()


class M1CsrfEmpiricalStressTests(TestCase):
    """Adversarial stress-testing of CSRF cookie issuance and enforcement."""

    def setUp(self):
        cache.clear()
        self.username = "csrf_adversary"
        self.password = "AdversaryPass123!"
        self.email = "adversary@graviblog.dev"
        self.user = User.objects.create_user(
            username=self.username,
            password=self.password,
            email=self.email,
            bio="Initial baseline bio",
        )

    def tearDown(self):
        cache.clear()

    # --------------------------------------------------------------------------
    # 1. Cookie Issuance Attributes on Login & Register
    # --------------------------------------------------------------------------
    def test_01_login_cookie_issuance_attributes(self):
        """Verify that login sets csrftoken with HttpOnly=False, Path=/, SameSite=Lax."""
        client = APIClient()
        response = client.post(
            "/api/v1/auth/login/",
            data={"username": self.username, "password": self.password},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # CSRF Cookie checks
        csrf_cookie_name = settings.CSRF_COOKIE_NAME
        self.assertIn(csrf_cookie_name, response.cookies, "csrftoken must be present in login response cookies")
        csrf_cookie = response.cookies[csrf_cookie_name]
        self.assertTrue(len(csrf_cookie.value) >= 32, "csrftoken must be a valid non-empty token string")
        self.assertFalse(
            bool(csrf_cookie.get("httponly")),
            f"CSRF cookie httponly must be False to allow client JS access, got: {csrf_cookie.get('httponly')}",
        )
        self.assertEqual(
            csrf_cookie.get("path"),
            "/",
            f"CSRF cookie path must be '/', got: {csrf_cookie.get('path')}",
        )
        self.assertEqual(
            str(csrf_cookie.get("samesite")).lower(),
            "lax",
            f"CSRF cookie samesite must be 'Lax', got: {csrf_cookie.get('samesite')}",
        )

        # Verify HttpOnly auth tokens
        self.assertTrue(bool(response.cookies[ACCESS_COOKIE_NAME].get("httponly")))
        self.assertTrue(bool(response.cookies[REFRESH_COOKIE_NAME].get("httponly")))

    def test_02_register_cookie_issuance_attributes(self):
        """Verify that register sets csrftoken with HttpOnly=False, Path=/, SameSite=Lax."""
        client = APIClient()
        response = client.post(
            "/api/v1/auth/register/",
            data={
                "username": "new_tester_user",
                "email": "new_tester@graviblog.dev",
                "password": "StrongPassword999!",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # CSRF Cookie checks
        csrf_cookie_name = settings.CSRF_COOKIE_NAME
        self.assertIn(csrf_cookie_name, response.cookies, "csrftoken must be present in register response cookies")
        csrf_cookie = response.cookies[csrf_cookie_name]
        self.assertTrue(len(csrf_cookie.value) >= 32, "csrftoken must be a valid non-empty token string")
        self.assertFalse(
            bool(csrf_cookie.get("httponly")),
            f"CSRF cookie httponly must be False to allow client JS access, got: {csrf_cookie.get('httponly')}",
        )
        self.assertEqual(
            csrf_cookie.get("path"),
            "/",
            f"CSRF cookie path must be '/', got: {csrf_cookie.get('path')}",
        )
        self.assertEqual(
            str(csrf_cookie.get("samesite")).lower(),
            "lax",
            f"CSRF cookie samesite must be 'Lax', got: {csrf_cookie.get('samesite')}",
        )

        # Verify HttpOnly auth tokens
        self.assertTrue(bool(response.cookies[ACCESS_COOKIE_NAME].get("httponly")))
        self.assertTrue(bool(response.cookies[REFRESH_COOKIE_NAME].get("httponly")))

    # --------------------------------------------------------------------------
    # 2. Valid CSRF cookie + Matching Header -> 200 OK
    # --------------------------------------------------------------------------
    def test_03_valid_csrf_cookie_and_matching_header_success(self):
        """Mutating request with cookie auth + valid CSRF cookie + matching X-CSRFToken succeeds."""
        access_token, _ = generate_token_pair(self.user)
        client = APIClient(enforce_csrf_checks=True)

        # Simulate browser holding access cookie and receiving CSRF token
        csrf_secret = _get_new_csrf_string()
        masked_token = _mask_cipher_secret(csrf_secret)

        client.cookies[ACCESS_COOKIE_NAME] = access_token
        client.cookies[settings.CSRF_COOKIE_NAME] = csrf_secret

        response = client.patch(
            "/api/v1/auth/me/",
            data={"bio": "Bio successfully updated via valid CSRF"},
            format="json",
            HTTP_X_CSRFTOKEN=masked_token,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["bio"], "Bio successfully updated via valid CSRF")
        self.user.refresh_from_db()
        self.assertEqual(self.user.bio, "Bio successfully updated via valid CSRF")

    def test_03b_login_issued_cookie_and_header_roundtrip_success(self):
        """End-to-end browser flow: login -> extract csrftoken -> PATCH with HTTP_X_CSRFTOKEN succeeds."""
        client = APIClient(enforce_csrf_checks=True)
        login_res = client.post(
            "/api/v1/auth/login/",
            data={"username": self.username, "password": self.password},
            format="json",
        )
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)

        issued_csrf = login_res.cookies[settings.CSRF_COOKIE_NAME].value
        client.cookies[settings.CSRF_COOKIE_NAME] = issued_csrf

        response = client.patch(
            "/api/v1/auth/me/",
            data={"bio": "Roundtrip login cookie bio update"},
            format="json",
            HTTP_X_CSRFTOKEN=issued_csrf,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.bio, "Roundtrip login cookie bio update")

    # --------------------------------------------------------------------------
    # 3. Missing CSRF Cookie -> 403 Forbidden
    # --------------------------------------------------------------------------
    def test_04_missing_csrf_cookie_forbidden(self):
        """Mutating request with cookie auth but missing CSRF cookie returns 403 Forbidden."""
        access_token, _ = generate_token_pair(self.user)
        client = APIClient(enforce_csrf_checks=True)
        client.cookies[ACCESS_COOKIE_NAME] = access_token

        # Case 4a: Missing cookie AND missing header
        res_no_cookie_no_header = client.patch(
            "/api/v1/auth/me/",
            data={"bio": "Tampered without any CSRF"},
            format="json",
        )
        self.assertEqual(res_no_cookie_no_header.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("CSRF", res_no_cookie_no_header.json().get("detail", ""))

        # Case 4b: Missing cookie BUT header supplied (e.g. cross-site forged header without cookie)
        res_header_only = client.patch(
            "/api/v1/auth/me/",
            data={"bio": "Tampered with header but no cookie"},
            format="json",
            HTTP_X_CSRFTOKEN="arbitrary_csrf_token_string_value",
        )
        self.assertEqual(res_header_only.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("CSRF", res_header_only.json().get("detail", ""))

        self.user.refresh_from_db()
        self.assertEqual(self.user.bio, "Initial baseline bio", "Bio must remain unchanged")

    # --------------------------------------------------------------------------
    # 4. CSRF Cookie Present but Missing Header -> 403 Forbidden
    # --------------------------------------------------------------------------
    def test_05_csrf_cookie_present_but_missing_header_forbidden(self):
        """Mutating request with cookie auth and CSRF cookie but omitted X-CSRFToken returns 403 Forbidden."""
        access_token, _ = generate_token_pair(self.user)
        client = APIClient(enforce_csrf_checks=True)
        client.cookies[ACCESS_COOKIE_NAME] = access_token
        client.cookies[settings.CSRF_COOKIE_NAME] = _get_new_csrf_string()

        response = client.patch(
            "/api/v1/auth/me/",
            data={"bio": "Attack without CSRF header"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("CSRF", response.json().get("detail", ""))

        self.user.refresh_from_db()
        self.assertEqual(self.user.bio, "Initial baseline bio", "Bio must remain unchanged")

    # --------------------------------------------------------------------------
    # 5. CSRF Cookie Present but Mismatched / Tampered Header -> 403 Forbidden
    # --------------------------------------------------------------------------
    def test_06_csrf_cookie_present_tampered_header_forbidden(self):
        """Mutating request with cookie auth and mismatched/tampered X-CSRFToken returns 403 Forbidden."""
        access_token, _ = generate_token_pair(self.user)
        client = APIClient(enforce_csrf_checks=True)
        valid_csrf_cookie = _get_new_csrf_string()
        client.cookies[ACCESS_COOKIE_NAME] = access_token
        client.cookies[settings.CSRF_COOKIE_NAME] = valid_csrf_cookie

        tampered_headers = [
            "completely_bogus_garbage_csrf_token",
            _get_new_csrf_string(),  # Another valid secret that does not match the cookie
            _mask_cipher_secret(_get_new_csrf_string()),  # Masked token from a different secret
            valid_csrf_cookie[:-4] + "XXXX",  # Slightly corrupted secret
            "12345",  # Too short
            " " * 32,  # Whitespace
        ]

        for bad_header in tampered_headers:
            with self.subTest(bad_header=bad_header):
                res = client.patch(
                    "/api/v1/auth/me/",
                    data={"bio": f"Attack with {bad_header}"},
                    format="json",
                    HTTP_X_CSRFTOKEN=bad_header,
                )
                self.assertEqual(
                    res.status_code,
                    status.HTTP_403_FORBIDDEN,
                    f"Expected 403 for tampered header '{bad_header}', got {res.status_code}",
                )
                self.assertIn("CSRF", res.json().get("detail", ""))

        self.user.refresh_from_db()
        self.assertEqual(self.user.bio, "Initial baseline bio", "Bio must remain unchanged")

    # --------------------------------------------------------------------------
    # 6. Bearer Token Authentication Bypasses CSRF Check as Intended
    # --------------------------------------------------------------------------
    def test_07_bearer_token_bypasses_csrf_check(self):
        """Mutating request using Authorization: Bearer header bypasses CSRF enforcement."""
        access_token, _ = generate_token_pair(self.user)
        client = APIClient(enforce_csrf_checks=True)

        # Case 7a: Bearer token only, no CSRF cookie, no CSRF header
        res_bearer_pure = client.patch(
            "/api/v1/auth/me/",
            data={"bio": "Updated via Bearer token without CSRF"},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {access_token}",
        )
        self.assertEqual(res_bearer_pure.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.bio, "Updated via Bearer token without CSRF")

        # Case 7b: Bearer token used even when invalid CSRF cookie & header are present
        client.cookies[settings.CSRF_COOKIE_NAME] = "bogus_csrf_cookie"
        res_bearer_with_bogus_csrf = client.patch(
            "/api/v1/auth/me/",
            data={"bio": "Updated via Bearer token ignoring bogus CSRF"},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {access_token}",
            HTTP_X_CSRFTOKEN="bogus_header_value",
        )
        self.assertEqual(res_bearer_with_bogus_csrf.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.bio, "Updated via Bearer token ignoring bogus CSRF")

    # --------------------------------------------------------------------------
    # 7. Safe HTTP Methods Do Not Require CSRF
    # --------------------------------------------------------------------------
    def test_08_safe_methods_do_not_enforce_csrf(self):
        """GET, HEAD, and OPTIONS requests with cookie auth succeed without CSRF headers."""
        access_token, _ = generate_token_pair(self.user)
        client = APIClient(enforce_csrf_checks=True)
        client.cookies[ACCESS_COOKIE_NAME] = access_token

        # Safe GET
        res_get = client.get("/api/v1/auth/me/")
        self.assertEqual(res_get.status_code, status.HTTP_200_OK)
        self.assertEqual(res_get.json()["username"], self.username)

        # Safe HEAD
        res_head = client.head("/api/v1/auth/me/")
        self.assertEqual(res_head.status_code, status.HTTP_200_OK)

        # Safe OPTIONS
        res_options = client.options("/api/v1/auth/me/")
        self.assertEqual(res_options.status_code, status.HTTP_200_OK)

    # --------------------------------------------------------------------------
    # 8. Dual Auth Presence: Bearer Header Takes Precedence
    # --------------------------------------------------------------------------
    def test_09_dual_auth_header_precedence_over_cookie(self):
        """When both Bearer header and cookie are present, header takes precedence and skips CSRF."""
        access_token, _ = generate_token_pair(self.user)
        other_user = User.objects.create_user(
            username="other_user",
            password="OtherPassword123!",
            email="other@graviblog.dev",
            bio="Other bio",
        )
        other_token, _ = generate_token_pair(other_user)

        client = APIClient(enforce_csrf_checks=True)
        # Cookie belongs to other_user, but Bearer header belongs to self.user
        client.cookies[ACCESS_COOKIE_NAME] = other_token

        res = client.patch(
            "/api/v1/auth/me/",
            data={"bio": "Precedence bio update"},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {access_token}",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.json()["username"], self.username)
        self.user.refresh_from_db()
        self.assertEqual(self.user.bio, "Precedence bio update")
        other_user.refresh_from_db()
        self.assertEqual(other_user.bio, "Other bio", "Other user bio must not be modified")

    # --------------------------------------------------------------------------
    # 9. CSRF Enforced Globally on Cookie-Authenticated Model Mutations
    # --------------------------------------------------------------------------
    def test_10_csrf_enforced_across_posts_mutations(self):
        """Verify that other endpoints (e.g. POST /api/v1/posts/{slug}/bookmark/) enforce CSRF for cookie auth."""
        category = Category.objects.create(name="Cybersecurity", slug="cybersecurity", color_class="neon-cyan")
        post = Post.objects.create(
            title="Adversarial CSRF Defense",
            slug="adversarial-csrf-defense",
            excerpt="Testing global CSRF enforcement",
            category=category,
            author=self.user,
            status=Post.Status.PUBLISHED,
        )

        access_token, _ = generate_token_pair(self.user)
        client = APIClient(enforce_csrf_checks=True)
        client.cookies[ACCESS_COOKIE_NAME] = access_token

        # 1. Mutating POST bookmark without CSRF cookie/header -> 403 Forbidden
        res_fail = client.post(f"/api/v1/posts/{post.slug}/bookmark/")
        self.assertEqual(res_fail.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("CSRF", res_fail.json().get("detail", ""))

        # 2. Mutating POST bookmark with valid CSRF cookie & matching header -> 200 OK
        csrf_secret = _get_new_csrf_string()
        client.cookies[settings.CSRF_COOKIE_NAME] = csrf_secret
        res_ok = client.post(
            f"/api/v1/posts/{post.slug}/bookmark/",
            HTTP_X_CSRFTOKEN=csrf_secret,
        )
        self.assertEqual(res_ok.status_code, status.HTTP_200_OK)
        self.assertTrue(res_ok.json().get("bookmarked"))


def main():
    print("=" * 70)
    print("  M1 EMPIRICAL STRESS TEST: CSRF ISSUANCE & ENFORCEMENT")
    print("=" * 70)

    django_runner = DiscoverRunner(verbosity=1, interactive=False)
    db_config = None
    try:
        db_config = django_runner.setup_databases()
    except Exception as e:
        print(f"[WARN] Database setup notice: {e}")

    suite = unittest.defaultTestLoader.loadTestsFromTestCase(M1CsrfEmpiricalStressTests)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    if db_config:
        try:
            django_runner.teardown_databases(db_config)
        except Exception as e:
            print(f"[WARN] Database teardown notice: {e}")

    print("\n" + "=" * 70)
    print(f"Results: {result.testsRun} tests run, {len(result.failures)} failures, {len(result.errors)} errors.")
    print("=" * 70)

    sys.exit(0 if result.wasSuccessful() else 1)


if __name__ == "__main__":
    main()
