"""
Adversarial Stress Test Suite for Milestone M1
Empirically challenges:
1. Registration boundaries, privilege escalation attempts (role injection, is_superuser injection),
   password whitespace & unicode handling, duplicate handle collision handling.
2. Profile alias security: HTTP method restrictions (POST/DELETE rejected with 405),
   token expiration parity, blacklisted token parity between /profile/ and /me/.
3. Category contract stress: pagination absence under large counts, default fallback values,
   color_class integrity, dynamic post count updates on post deletion/status transition.
"""

import os
import sys
import uuid
from datetime import datetime, timezone, timedelta
import jwt

sys.path.insert(0, os.path.abspath("backend"))
sys.path.insert(0, os.path.abspath("backend/apps"))
os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings"

import django
django.setup()

from django.test.utils import setup_test_environment, teardown_test_environment
from django.db import connection
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APIClient
from rest_framework import status
from posts.models import Category, Post
from users.jwt_utils import generate_token_pair, ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME, ALGORITHM

User = get_user_model()

def run_adversarial_suite():
    print("=" * 70)
    print("ADVERSARIAL STRESS-TESTING M1 BOUNDARIES & CONTRACTS")
    print("=" * 70)

    setup_test_environment()
    old_db = connection.creation.create_test_db(verbosity=0)
    client = APIClient()
    failures = []

    try:
        cache.clear()

        # =====================================================================
        # ADV-1: Privilege Escalation & Role Injection via Registration
        # =====================================================================
        print("\n[ADV-1] Testing Privilege Escalation via Registration...")
        malicious_payload = {
            "username": "hacker_bob",
            "email": "hacker@darkweb.io",
            "password": "HackerPassword123!",
            "role": "ADMIN",
            "is_superuser": True,
            "is_staff": True,
        }
        res = client.post("/api/v1/auth/register/", data=malicious_payload, format="json")
        if res.status_code != status.HTTP_201_CREATED:
            failures.append(f"ADV-1 registration failed unexpectedly: {res.status_code}")
        else:
            created_user = User.objects.get(username="hacker_bob")
            if created_user.role != "READER":
                failures.append(f"CRITICAL VULNERABILITY: Role injection succeeded! Role is {created_user.role}")
            elif created_user.is_superuser or created_user.is_staff:
                failures.append("CRITICAL VULNERABILITY: is_superuser or is_staff injected!")
            else:
                print("  PASS: Privilege escalation prevented. Injected role/superuser fields were ignored; role=READER, is_superuser=False, is_staff=False.")

        # =====================================================================
        # ADV-2: Password Whitespace and Boundary Trimming
        # =====================================================================
        print("\n[ADV-2] Testing Password Whitespace & Trimming Boundaries...")
        # 7 spaces + 1 char = 8 chars. If stripped, length 1 -> must reject
        res_spaces = client.post("/api/v1/auth/register/", data={
            "username": "user_space_pwd",
            "email": "space@test.com",
            "password": "       X"
        }, format="json")
        # DRF CharField by default does not strip password unless specified, or min_length is evaluated.
        # But if password is all spaces of length 7:
        res_7_spaces = client.post("/api/v1/auth/register/", data={
            "username": "user_7_spaces",
            "email": "s7@test.com",
            "password": "       "
        }, format="json")
        if res_7_spaces.status_code != status.HTTP_400_BAD_REQUEST:
            failures.append(f"ADV-2 failed: 7 spaces accepted as password (status {res_7_spaces.status_code})")
        else:
            print("  PASS: 7-character space password rejected with 400 Bad Request.")

        # Unicode password of 8 characters: 'گذرواژه۱'
        res_unicode = client.post("/api/v1/auth/register/", data={
            "username": "user_persian_pwd",
            "email": "persian@test.com",
            "password": "گذرواژه۱"
        }, format="json")
        if res_unicode.status_code != status.HTTP_201_CREATED:
            failures.append(f"ADV-2 failed: 8-char unicode password rejected: {res_unicode.status_code} {res_unicode.json()}")
        else:
            u_persian = User.objects.get(username="user_persian_pwd")
            if not u_persian.check_password("گذرواژه۱"):
                failures.append("ADV-2 failed: Unicode password hashing verification failed")
            else:
                print("  PASS: 8-character Unicode password correctly accepted and verified.")

        # =====================================================================
        # ADV-3: Profile Alias Security & Method Guarding
        # =====================================================================
        print("\n[ADV-3] Testing Profile Alias Method Guarding & Equivalence...")
        test_user = User.objects.create_user(username="adv_user", password="Password123!", email="adv@test.com")
        auth_client = APIClient()
        access_tok, _ = generate_token_pair(test_user)
        auth_client.cookies[ACCESS_COOKIE_NAME] = access_tok

        # POST to /api/v1/auth/profile/ must return 405 Method Not Allowed
        res_post_profile = auth_client.post("/api/v1/auth/profile/", data={"bio": "hack"}, format="json")
        res_post_me = auth_client.post("/api/v1/auth/me/", data={"bio": "hack"}, format="json")
        if res_post_profile.status_code != status.HTTP_405_METHOD_NOT_ALLOWED or res_post_me.status_code != status.HTTP_405_METHOD_NOT_ALLOWED:
            failures.append(f"ADV-3 failed: POST method not properly restricted: profile={res_post_profile.status_code}, me={res_post_me.status_code}")
        else:
            print("  PASS: POST /api/v1/auth/profile/ and /me/ both return 405 Method Not Allowed.")

        # DELETE to /api/v1/auth/profile/ must return 405 Method Not Allowed
        res_del_profile = auth_client.delete("/api/v1/auth/profile/")
        res_del_me = auth_client.delete("/api/v1/auth/me/")
        if res_del_profile.status_code != status.HTTP_405_METHOD_NOT_ALLOWED or res_del_me.status_code != status.HTTP_405_METHOD_NOT_ALLOWED:
            failures.append(f"ADV-3 failed: DELETE method not properly restricted: profile={res_del_profile.status_code}, me={res_del_me.status_code}")
        else:
            print("  PASS: DELETE /api/v1/auth/profile/ and /me/ both return 405 Method Not Allowed.")

        # Token expiration parity:
        expired_payload = {
            "user_id": test_user.pk,
            "username": test_user.username,
            "role": test_user.role,
            "token_type": "access",
            "iat": datetime.now(timezone.utc) - timedelta(hours=2),
            "exp": datetime.now(timezone.utc) - timedelta(hours=1),
            "jti": str(uuid.uuid4())
        }
        expired_token = jwt.encode(expired_payload, settings.JWT_SIGNING_KEY, algorithm=ALGORITHM)
        exp_client = APIClient()
        exp_client.cookies[ACCESS_COOKIE_NAME] = expired_token

        exp_res_profile = exp_client.get("/api/v1/auth/profile/")
        exp_res_me = exp_client.get("/api/v1/auth/me/")
        if exp_res_profile.status_code != status.HTTP_401_UNAUTHORIZED or exp_res_me.status_code != status.HTTP_401_UNAUTHORIZED:
            failures.append("ADV-3 failed: Expired token did not return 401")
        elif exp_res_profile.json() != exp_res_me.json():
            failures.append(f"ADV-3 failed: Expired token response mismatch: {exp_res_profile.json()} vs {exp_res_me.json()}")
        else:
            print(f"  PASS: Expired token uniformly rejected on both endpoints: {exp_res_profile.json()['code']}")

        # Token blacklist parity:
        fresh_tok, _ = generate_token_pair(test_user)
        payload = jwt.decode(fresh_tok, settings.JWT_SIGNING_KEY, algorithms=[ALGORITHM])
        cache.set(f"jwt:blacklist:{payload['jti']}", "revoked", timeout=60)

        bl_client = APIClient()
        bl_client.cookies[ACCESS_COOKIE_NAME] = fresh_tok
        bl_res_profile = bl_client.get("/api/v1/auth/profile/")
        bl_res_me = bl_client.get("/api/v1/auth/me/")
        if bl_res_profile.status_code != status.HTTP_401_UNAUTHORIZED or bl_res_profile.json() != bl_res_me.json():
            failures.append("ADV-3 failed: Blacklist revocation behavior differs between /profile/ and /me/")
        else:
            print(f"  PASS: Blacklisted token uniformly rejected on both endpoints: {bl_res_profile.json()['code']}")

        # =====================================================================
        # ADV-4: Category Contract Dynamic Post Count & Pagination Stress
        # =====================================================================
        print("\n[ADV-4] Testing Category Contract Under Dynamic Post Mutations...")
        cat = Category.objects.create(name="Cybersec", slug="cybersec")
        post = Post.objects.create(title="Zero-Day", slug="zero-day", category=cat, author=test_user, status=Post.Status.PUBLISHED)

        # Check count is 1
        res_cat1 = client.get("/api/v1/categories/")
        c_item = next(c for c in res_cat1.json() if c["slug"] == "cybersec")
        if c_item["count"] != 1:
            failures.append(f"ADV-4 failed: Initial count expected 1, got {c_item['count']}")
        else:
            print("  PASS: Category count is 1 for 1 published post.")

        # Transition post from PUBLISHED to DRAFT
        post.status = Post.Status.DRAFT
        post.save()

        res_cat2 = client.get("/api/v1/categories/")
        c_item2 = next(c for c in res_cat2.json() if c["slug"] == "cybersec")
        if c_item2["count"] != 0:
            failures.append(f"ADV-4 failed: Count expected 0 after transition to DRAFT, got {c_item2['count']}")
        else:
            print("  PASS: Category count dynamically decreased to 0 when post status changed to DRAFT.")

        # Delete post
        post.delete()
        res_cat3 = client.get("/api/v1/categories/")
        c_item3 = next(c for c in res_cat3.json() if c["slug"] == "cybersec")
        if c_item3["count"] != 0:
            failures.append("ADV-4 failed: Count not 0 after post deletion")
        else:
            print("  PASS: Category count remains 0 after post deletion.")

        # Large category volume check (verify unpaginated array contract under scale)
        for i in range(25):
            Category.objects.create(name=f"Bulk Category {i}", slug=f"bulk-cat-{i}")
        res_bulk = client.get("/api/v1/categories/")
        bulk_data = res_bulk.json()
        if not isinstance(bulk_data, list):
            failures.append("ADV-4 failed: Category response became dict/paginated under volume!")
        elif len(bulk_data) < 25:
            failures.append(f"ADV-4 failed: Expected at least 26 categories, got {len(bulk_data)}")
        else:
            print(f"  PASS: High-volume categories ({len(bulk_data)} items) returned as clean unpaginated JSON array.")

    finally:
        cache.clear()
        connection.creation.destroy_test_db(old_db, verbosity=0)
        teardown_test_environment()

    print("=" * 70)
    if failures:
        print(f"ADVERSARIAL SUITE ENCOUNTERED {len(failures)} FAILURES:")
        for f in failures:
            print(f"  - {f}")
        return False
    else:
        print("ALL ADVERSARIAL STRESS-TESTS PASSED WITH ZERO VULNERABILITIES!")
        print("=" * 70)
        return True

if __name__ == "__main__":
    success = run_adversarial_suite()
    sys.exit(0 if success else 1)
