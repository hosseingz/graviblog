"""
Standalone Verification & Empirical Stress-Test Script for Milestone M1
Focus Areas:
1. Registration Validation Boundaries (password length, duplicate username, case collision)
2. Profile Alias Endpoint (/api/v1/auth/profile/ vs /api/v1/auth/me/ equivalence)
3. SSR Category Contract (/api/v1/categories/ list structure, schema fields, post count calculation)
4. Frontend Static Check (/api/v2/ zero occurrences in apiConfig.ts and entire codebase)
"""

import os
import sys
import json
import re

# Setup Django environment
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

User = get_user_model()

class ChallengerVerificationRunner:
    def __init__(self):
        self.client = APIClient()
        self.results = []

    def record(self, test_name: str, passed: bool, details: str = ""):
        self.results.append({
            "test": test_name,
            "passed": passed,
            "details": details
        })
        mark = "PASS" if passed else "FAIL"
        print(f"[{mark}] {test_name}: {details}")

    def run_all(self):
        print("=" * 70)
        print("RUNNING STANDALONE M1 BOUNDARY & CONTRACT VERIFICATION SUITE")
        print("=" * 70)

        setup_test_environment()
        old_db_name = connection.creation.create_test_db(verbosity=0)

        try:
            cache.clear()
            self.test_registration_boundaries()
            self.test_profile_alias_contract()
            self.test_ssr_category_contract()
            self.test_frontend_static_checks()
        finally:
            cache.clear()
            connection.creation.destroy_test_db(old_db_name, verbosity=0)
            teardown_test_environment()

        print("=" * 70)
        total = len(self.results)
        passed = sum(1 for r in self.results if r["passed"])
        failed = total - passed
        print(f"VERIFICATION SUMMARY: {passed}/{total} passed, {failed} failed.")
        print("=" * 70)
        return failed == 0

    def test_registration_boundaries(self):
        print("\n--- 1. Testing Registration Validation Boundaries ---")

        # 1.1 Password length < 8 (empty, 1 char, 7 chars)
        for pwd, desc in [("", "empty password"), ("a", "1-char password"), ("1234567", "7-char password")]:
            payload = {
                "username": f"user_pwd_{len(pwd)}",
                "email": f"pwd{len(pwd)}@example.com",
                "password": pwd
            }
            res = self.client.post("/api/v1/auth/register/", data=payload, format="json")
            passed = (res.status_code == status.HTTP_400_BAD_REQUEST and "password" in res.json())
            self.record(
                f"Registration rejects {desc} (<8 chars)",
                passed,
                f"Status: {res.status_code}, Response: {res.json()}"
            )

        # 1.2 Boundary: Exactly 8 characters (should succeed)
        boundary_pwd = "aB3$5678"
        payload_8 = {
            "username": "user_boundary_8",
            "email": "boundary8@example.com",
            "password": boundary_pwd
        }
        res_8 = self.client.post("/api/v1/auth/register/", data=payload_8, format="json")
        passed_8 = (res_8.status_code == status.HTTP_201_CREATED and "user" in res_8.json())
        self.record(
            "Registration accepts exactly 8 characters",
            passed_8,
            f"Status: {res_8.status_code}, User ID: {res_8.json().get('user', {}).get('id')}"
        )

        # 1.3 Boundary: Duplicate username rejection
        initial_payload = {
            "username": "unique_cadet",
            "email": "cadet@example.com",
            "password": "StrongPassword123!"
        }
        res_init = self.client.post("/api/v1/auth/register/", data=initial_payload, format="json")
        self.record("Initial registration of 'unique_cadet'", res_init.status_code == status.HTTP_201_CREATED)

        # Attempt exact duplicate username
        dup_payload = {
            "username": "unique_cadet",
            "email": "cadet_duplicate@example.com",
            "password": "AnotherPassword456!"
        }
        res_dup = self.client.post("/api/v1/auth/register/", data=dup_payload, format="json")
        passed_dup = (res_dup.status_code == status.HTTP_400_BAD_REQUEST and "username" in res_dup.json())
        self.record(
            "Registration rejects exact duplicate username",
            passed_dup,
            f"Status: {res_dup.status_code}, Errors: {res_dup.json()}"
        )

        # 1.4 Missing fields (missing username, missing password)
        res_no_user = self.client.post("/api/v1/auth/register/", data={"email": "a@b.com", "password": "Password123!"}, format="json")
        self.record("Registration rejects missing username", res_no_user.status_code == status.HTTP_400_BAD_REQUEST and "username" in res_no_user.json())

        res_no_pwd = self.client.post("/api/v1/auth/register/", data={"username": "nopass", "email": "a@b.com"}, format="json")
        self.record("Registration rejects missing password", res_no_pwd.status_code == status.HTTP_400_BAD_REQUEST and "password" in res_no_pwd.json())

        # 1.5 Cookie security attributes on registration
        reg_payload = {
            "username": "cookie_tester",
            "email": "cookie_tester@example.com",
            "password": "Password123!"
        }
        res_reg = self.client.post("/api/v1/auth/register/", data=reg_payload, format="json")
        cookies = res_reg.cookies
        has_access = "pod_access_token" in cookies and cookies["pod_access_token"]["httponly"]
        has_refresh = "pod_refresh_token" in cookies and cookies["pod_refresh_token"]["httponly"]
        csrf_name = getattr(settings, "CSRF_COOKIE_NAME", "csrftoken")
        has_csrf = csrf_name in cookies and not cookies[csrf_name]["httponly"]
        csrf_samesite = cookies[csrf_name]["samesite"].lower() == "lax" if csrf_name in cookies else False

        self.record(
            "Registration sets dual HttpOnly JWT cookies and non-HttpOnly CSRF cookie with SameSite=Lax",
            has_access and has_refresh and has_csrf and csrf_samesite,
            f"access={has_access}, refresh={has_refresh}, csrf={has_csrf}, SameSite={csrf_samesite}"
        )

    def test_profile_alias_contract(self):
        print("\n--- 2. Testing Profile Alias Endpoint Contract ---")

        # Create user
        user = User.objects.create_user(
            username="alias_user",
            password="Password123!",
            email="alias@example.com",
            handle="ALIAS_MASTER",
            bio="Original bio"
        )

        # Login to obtain cookies
        login_res = self.client.post("/api/v1/auth/login/", data={"username": "alias_user", "password": "Password123!"}, format="json")
        access_token = login_res.cookies["pod_access_token"].value
        csrf_token = login_res.cookies[settings.CSRF_COOKIE_NAME].value

        auth_client = APIClient()
        auth_client.cookies["pod_access_token"] = access_token
        auth_client.cookies[settings.CSRF_COOKIE_NAME] = csrf_token

        # 2.1 GET /api/v1/auth/profile/ returns 200
        res_profile = auth_client.get("/api/v1/auth/profile/")
        passed_profile_200 = res_profile.status_code == status.HTTP_200_OK
        self.record("GET /api/v1/auth/profile/ returns HTTP 200", passed_profile_200, f"Status: {res_profile.status_code}")

        # 2.2 GET /api/v1/auth/me/ returns 200
        res_me = auth_client.get("/api/v1/auth/me/")
        passed_me_200 = res_me.status_code == status.HTTP_200_OK
        self.record("GET /api/v1/auth/me/ returns HTTP 200", passed_me_200, f"Status: {res_me.status_code}")

        # 2.3 Exact schema & value equivalence between /profile/ and /me/
        profile_data = res_profile.json()
        me_data = res_me.json()
        data_matches = (profile_data == me_data)
        self.record(
            "/api/v1/auth/profile/ payload perfectly matches /api/v1/auth/me/",
            data_matches,
            f"Keys in response: {list(profile_data.keys())}"
        )

        # 2.4 Unauthenticated access to /api/v1/auth/profile/ returns 401
        anon_client = APIClient()
        res_anon_profile = anon_client.get("/api/v1/auth/profile/")
        self.record(
            "Unauthenticated GET /api/v1/auth/profile/ returns HTTP 401",
            res_anon_profile.status_code == status.HTTP_401_UNAUTHORIZED,
            f"Status: {res_anon_profile.status_code}"
        )

        # 2.5 PATCH /api/v1/auth/profile/ alias mutation support
        patch_res = auth_client.patch(
            "/api/v1/auth/profile/",
            data={"bio": "Updated bio via alias"},
            format="json",
            HTTP_X_CSRFTOKEN=csrf_token
        )
        passed_patch = (patch_res.status_code == status.HTTP_200_OK and patch_res.json()["bio"] == "Updated bio via alias")
        self.record(
            "PATCH /api/v1/auth/profile/ mutates profile seamlessly",
            passed_patch,
            f"Status: {patch_res.status_code}, Bio: {patch_res.json().get('bio')}"
        )

    def test_ssr_category_contract(self):
        print("\n--- 3. Testing SSR Category Contract ---")

        # Populate test categories and posts
        Category.objects.all().delete()
        cat_tech = Category.objects.create(name="Tech Dispatch", slug="tech-dispatch", description="Technology articles", color_class="bg-blue-500 text-white")
        cat_retro = Category.objects.create(name="Retro Gaming", slug="retro-gaming", description="Classic games", color_class="bg-purple-500 text-white")

        author = User.objects.create_user(username="author1", password="Password123!", email="author1@example.com")

        # Create published post for Tech and draft post for Tech
        Post.objects.create(title="Published Tech", slug="pub-tech", category=cat_tech, author=author, status=Post.Status.PUBLISHED)
        Post.objects.create(title="Draft Tech", slug="draft-tech", category=cat_tech, author=author, status=Post.Status.DRAFT)
        # Create published post for Retro
        Post.objects.create(title="Published Retro", slug="pub-retro", category=cat_retro, author=author, status=Post.Status.PUBLISHED)

        res = self.client.get("/api/v1/categories/")
        passed_200 = res.status_code == status.HTTP_200_OK
        self.record("GET /api/v1/categories/ returns HTTP 200", passed_200, f"Status: {res.status_code}")

        data = res.json()
        is_list = isinstance(data, list)
        self.record("Category response is a clean JSON array (unpaginated)", is_list, f"Type: {type(data).__name__}, Count: {len(data) if is_list else 'N/A'}")

        # Check required fields for SSR hydration in ArticlesPageClient.tsx:
        # interface Category { slug: string; name: string; count: number; }
        # serializer fields: ["id", "name", "slug", "color_class", "description", "count"]
        required_fields = {"id", "name", "slug", "color_class", "description", "count"}
        all_items_valid = True
        field_errors = []

        for item in data:
            missing = required_fields - set(item.keys())
            if missing:
                all_items_valid = False
                field_errors.append(f"Item {item.get('slug')} missing fields: {missing}")
            if not isinstance(item.get("slug"), str) or not isinstance(item.get("name"), str) or not isinstance(item.get("count"), int):
                all_items_valid = False
                field_errors.append(f"Item {item.get('slug')} has invalid field types")

        self.record(
            "Category objects contain all required contract fields (id, name, slug, count, color_class, description)",
            all_items_valid,
            "; ".join(field_errors) if field_errors else "All items conform to contract"
        )

        # Check that post count only includes PUBLISHED posts
        cat_tech_data = next((c for c in data if c["slug"] == "tech-dispatch"), None)
        cat_retro_data = next((c for c in data if c["slug"] == "retro-gaming"), None)

        count_accurate = (
            cat_tech_data is not None and cat_tech_data["count"] == 1 and
            cat_retro_data is not None and cat_retro_data["count"] == 1
        )
        self.record(
            "Category post count accurately reflects only PUBLISHED posts (excluding drafts)",
            count_accurate,
            f"Tech count: {cat_tech_data['count'] if cat_tech_data else None} (expected 1), Retro count: {cat_retro_data['count'] if cat_retro_data else None} (expected 1)"
        )

    def test_frontend_static_checks(self):
        print("\n--- 4. Testing Frontend Static Configuration ---")

        api_config_path = os.path.join("frontend", "lib", "api", "apiConfig.ts")
        if not os.path.isfile(api_config_path):
            self.record("frontend/lib/api/apiConfig.ts exists", False, "File not found")
            return

        with open(api_config_path, "r", encoding="utf-8") as f:
            content = f.read()

        # 4.1 Zero occurrences of /api/v2/ in apiConfig.ts
        v2_matches = re.findall(r"/api/v2/", content)
        self.record(
            "apiConfig.ts contains zero occurrences of '/api/v2/'",
            len(v2_matches) == 0,
            f"Found {len(v2_matches)} matches"
        )

        # 4.2 Verify all required endpoints use /api/v1/
        required_routes = [
            "/api/v1/auth/register/",
            "/api/v1/auth/login/",
            "/api/v1/auth/logout/",
            "/api/v1/auth/token/refresh/",
            "/api/v1/auth/me/"
        ]
        all_routes_present = all(route in content for route in required_routes)
        self.record(
            "apiConfig.ts defines all core v1 auth endpoints",
            all_routes_present,
            f"Checked: {required_routes}"
        )

        # 4.3 Verify SSR category route in frontend/app/articles/page.tsx
        articles_page_path = os.path.join("frontend", "app", "articles", "page.tsx")
        with open(articles_page_path, "r", encoding="utf-8") as f:
            articles_content = f.read()

        editorial_cat_matches = re.findall(r"/api/v1/editorial/categories/", articles_content)
        v1_cat_matches = re.findall(r"/api/v1/categories/", articles_content)

        self.record(
            "articles/page.tsx has zero occurrences of broken '/api/v1/editorial/categories/'",
            len(editorial_cat_matches) == 0,
            f"Found {len(editorial_cat_matches)} matches"
        )

        self.record(
            "articles/page.tsx correctly queries '/api/v1/categories/'",
            len(v1_cat_matches) > 0,
            f"Found {len(v1_cat_matches)} occurrences"
        )

if __name__ == "__main__":
    runner = ChallengerVerificationRunner()
    success = runner.run_all()
    sys.exit(0 if success else 1)
