"""Tier 2: Boundary & Corner Cases E2E Tests (55 Tests).

Tests extreme inputs, missing parameters, malformed headers, protocol exploits,
and edge conditions across all 11 features:
- Feature 1: API Endpoint Routing Boundary Cases (5 tests)
- Feature 2: SSR Category Route Boundary Cases (5 tests)
- Feature 3: CSRF Cookie Enforcement Corner Cases (5 tests)
- Feature 4: Production Dependencies Format Boundary Cases (5 tests)
- Feature 5: Redis Password Injection & Port Corner Cases (5 tests)
- Feature 6: Container Security & LF Line Ending Corner Cases (5 tests)
- Feature 7: Search Input Robustness & Injection Corner Cases (5 tests)
- Feature 8: Hot Take Voting Division & Method Corner Cases (5 tests)
- Feature 9: Comment Validation Error Corner Cases (5 tests)
- Feature 10: Open Redirect Protocol Exploit Corner Cases (5 tests)
- Feature 11: Stored XSS Obfuscation & Vector Corner Cases (5 tests)
"""

import re
from rest_framework import status
from rest_framework.test import APIClient
from django.conf import settings
from tests.e2e.harness import (
    E2ETestBase,
    E2EWorkspaceBase,
    read_workspace_file,
    workspace_file_exists,
    is_safe_redirect_url,
    sanitize_html_mock,
)


class TestTier2Feature1ApiRoutingBoundary(E2ETestBase):
    """Feature 1 Boundary: Decommissioning of v2 routes and unauthenticated error handling."""

    def test_f1_bva_01_api_config_no_legacy_v2_auth_urls(self):
        """Frontend apiConfig.ts must contain zero occurrences of /api/v2/auth/."""
        content = read_workspace_file("frontend/lib/api/apiConfig.ts")
        self.assertNotIn(
            "/api/v2/auth/",
            content,
            "apiConfig.ts contains forbidden legacy /api/v2/auth/ prefix",
        )

    def test_f1_bva_02_backend_v2_auth_login_returns_404(self):
        """Backend POST /api/v2/auth/login/ must return HTTP 404 Not Found."""
        response = self.client.post("/api/v2/auth/login/", data={"username": "u", "password": "p"})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_f1_bva_03_backend_v2_auth_me_returns_404(self):
        """Backend GET /api/v2/auth/me/ or profile must return HTTP 404 Not Found."""
        response = self.client.get("/api/v2/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_f1_bva_04_backend_auth_me_unauthenticated_returns_401(self):
        """Backend GET /api/v1/auth/me/ without credentials returns 401 Unauthorized."""
        response = self.client.get("/api/v1/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn("detail", response.json())

    def test_f1_bva_05_backend_auth_me_malformed_bearer_token_returns_401(self):
        """Backend GET /api/v1/auth/me/ with malformed token header returns 401."""
        response = self.client.get(
            "/api/v1/auth/me/",
            HTTP_AUTHORIZATION="Bearer gibberish.token.payload",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class TestTier2Feature2CategoryRouteBoundary(E2ETestBase):
    """Feature 2 Boundary: Missing editorial categories route, empty DB, and method restrictions."""

    def test_f2_bva_01_backend_editorial_categories_returns_404(self):
        """GET /api/v1/editorial/categories/ must strictly return 404 Not Found."""
        response = self.client.get("/api/v1/editorial/categories/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_f2_bva_02_backend_categories_empty_database_returns_empty_list(self):
        """GET /api/v1/categories/ when no categories exist returns HTTP 200 with empty list."""
        from posts.models import Category, Post
        Post.objects.all().delete()
        Category.objects.all().delete()
        response = self.client.get("/api/v1/categories/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json(), [])

    def test_f2_bva_03_backend_categories_mutating_methods_rejected_405(self):
        """Mutating POST request to /api/v1/categories/ returns 405 Method Not Allowed."""
        response = self.client.post("/api/v1/categories/", data={"name": "Forbidden"})
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_f2_bva_04_backend_category_detail_invalid_slug_returns_404(self):
        """GET /api/v1/categories/non-existent-slug-xyz/ returns 404 Not Found."""
        response = self.client.get("/api/v1/categories/non-existent-slug-xyz/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_f2_bva_05_articles_page_no_editorial_categories_reference(self):
        """frontend/app/articles/page.tsx must contain zero occurrences of /api/v1/editorial/categories/."""
        content = read_workspace_file("frontend/app/articles/page.tsx")
        self.assertNotIn("/api/v1/editorial/categories/", content)


class TestTier2Feature3CsrfEnforcementBoundary(E2ETestBase):
    """Feature 3 Boundary: Strict CSRF token validation on cookie-authenticated requests."""

    def setUp(self):
        super().setUp()
        self.client = APIClient(enforce_csrf_checks=True)

    def test_f3_bva_01_cookie_auth_mutating_missing_csrf_returns_403(self):
        """Mutating request with cookie auth but missing X-CSRFToken header returns 403 Forbidden."""
        self.create_user(username="f3_bva_user", password="Password123!")
        login_resp = self.client.post(
            "/api/v1/auth/login/",
            data={"username": "f3_bva_user", "password": "Password123!"},
        )
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)
        # Attempt mutating request without X-CSRFToken
        patch_resp = self.client.patch("/api/v1/auth/me/", data={"bio": "Hacker"}, format="json")
        self.assertEqual(patch_resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("CSRF", patch_resp.json().get("detail", ""))

    def test_f3_bva_02_cookie_auth_mutating_invalid_csrf_returns_403(self):
        """Mutating request with mismatched/garbage X-CSRFToken header returns 403 Forbidden."""
        self.create_user(username="f3_bva_user2", password="Password123!")
        login_resp = self.client.post(
            "/api/v1/auth/login/",
            data={"username": "f3_bva_user2", "password": "Password123!"},
        )
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)
        # Send bogus token header
        patch_resp = self.client.patch(
            "/api/v1/auth/me/",
            data={"bio": "Hacker2"},
            format="json",
            HTTP_X_CSRFTOKEN="invalid-forged-csrf-token-123456",
        )
        self.assertEqual(patch_resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_f3_bva_03_cookie_auth_mutating_empty_csrf_header_returns_403(self):
        """Mutating request with empty string X-CSRFToken returns 403 Forbidden."""
        self.create_user(username="f3_bva_user3", password="Password123!")
        login_resp = self.client.post(
            "/api/v1/auth/login/",
            data={"username": "f3_bva_user3", "password": "Password123!"},
        )
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)
        patch_resp = self.client.patch(
            "/api/v1/auth/me/",
            data={"bio": "Hacker3"},
            format="json",
            HTTP_X_CSRFTOKEN="",
        )
        self.assertEqual(patch_resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_f3_bva_04_csrf_cookie_http_only_is_false(self):
        """The csrftoken cookie must NOT be HttpOnly so JavaScript client can read document.cookie."""
        self.create_user(username="f3_bva_user4", password="Password123!")
        login_resp = self.client.post(
            "/api/v1/auth/login/",
            data={"username": "f3_bva_user4", "password": "Password123!"},
        )
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)
        csrf_cookie = login_resp.cookies.get("csrftoken")
        self.assertIsNotNone(csrf_cookie, "csrftoken cookie must be present in response")
        # In Django SimpleCookie, httponly is stored in cookie dictionary key 'httponly'
        self.assertFalse(
            csrf_cookie.get("httponly", False),
            "csrftoken must have HttpOnly=False so client-side Axios can inspect document.cookie",
        )

    def test_f3_bva_05_api_client_attaches_csrf_on_mutating_methods(self):
        """frontend/lib/api/apiClient.ts interceptor attaches X-CSRFToken on POST/PUT/PATCH/DELETE."""
        content = read_workspace_file("frontend/lib/api/apiClient.ts")
        self.assertTrue(len(content) > 0, "apiClient.ts must exist")
        self.assertIn("X-CSRFToken", content)
        self.assertRegex(content, r"['\"]POST['\"].*?['\"]PUT['\"].*?['\"]PATCH['\"].*?['\"]DELETE['\"]")


class TestTier2Feature4DependenciesBoundary(E2EWorkspaceBase):
    """Feature 4 Boundary: Requirements format validation and core dependencies check."""

    def test_f4_bva_01_requirements_syntax_valid_pep508(self):
        """Each non-empty line in backend/requirements.txt must follow PEP 508 spec."""
        content = read_workspace_file("backend/requirements.txt")
        for line in content.splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            self.assertRegex(
                line,
                r"^[a-zA-Z0-9_\-\.\[\]]+([<>=!~].*)?$",
                f"Line '{line}' in backend/requirements.txt violates PEP 508 format",
            )

    def test_f4_bva_02_requirements_no_duplicate_packages(self):
        """backend/requirements.txt must not declare duplicate packages."""
        content = read_workspace_file("backend/requirements.txt")
        seen = set()
        for line in content.splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            pkg = re.split(r"[<>=!~\[]", line)[0].strip().lower()
            self.assertNotIn(pkg, seen, f"Duplicate package '{pkg}' found in backend/requirements.txt")
            seen.add(pkg)

    def test_f4_bva_03_core_production_stack_present(self):
        """backend/requirements.txt must include core stack: redis, psycopg2-binary, whitenoise."""
        content = read_workspace_file("backend/requirements.txt").lower()
        self.assertIn("redis", content)
        self.assertIn("psycopg2-binary", content)
        self.assertIn("whitenoise", content)

    def test_f4_bva_04_requirements_file_encoding_utf8_clean(self):
        """backend/requirements.txt must be readable without UTF-8 BOM or decoding error."""
        path = read_workspace_file("backend/requirements.txt")
        self.assertFalse(path.startswith("\ufeff"), "backend/requirements.txt contains forbidden UTF-8 BOM")

    def test_f4_bva_05_requirements_no_insecure_wildcard_pins(self):
        """Requirements must not use bare wildcard pins like 'gunicorn=*'."""
        content = read_workspace_file("backend/requirements.txt")
        self.assertNotRegex(content, r"==\*", "Wildcard pin ==* is prohibited in production requirements")


class TestTier2Feature5RedisConfigBoundary(E2EWorkspaceBase):
    """Feature 5 Boundary: Redis password default fallback, port bindings, and DB partitioning."""

    def test_f5_bva_01_redis_password_fallback_handling(self):
        """REDIS_URL in docker-compose.yml must support default fallback password."""
        content = read_workspace_file("docker-compose.yml")
        self.assertIn("redispassword", content, "REDIS_URL or command should contain fallback 'redispassword'")

    def test_f5_bva_02_redis_db_separation_cache_and_celery(self):
        """docker-compose.yml must partition Redis DB 1 for cache/session and DB 0 for Celery."""
        content = read_workspace_file("docker-compose.yml")
        self.assertRegex(content, r"REDIS_URL:.*?/1", "REDIS_URL must use database index /1")
        self.assertRegex(content, r"CELERY_BROKER_URL:.*?/0", "CELERY_BROKER_URL must use database index /0")

    def test_f5_bva_03_redis_healthcheck_authenticates(self):
        """Redis healthcheck in docker-compose.yml must authenticate using -a flag."""
        content = read_workspace_file("docker-compose.yml")
        self.assertIn("-a", content, "Redis healthcheck must use -a flag to authenticate redis-cli ping")

    def test_f5_bva_04_redis_port_not_exposed_to_public_host(self):
        """Redis service must not bind port 6379 directly to public host 0.0.0.0."""
        content = read_workspace_file("docker-compose.yml")
        # Match under redis service block
        redis_block = re.search(r"redis:.*?(?=\n\s\s[a-z_]+:|$)", content, re.DOTALL)
        if redis_block:
            block_text = redis_block.group(0)
            self.assertNotIn('"6379:6379"', block_text, "Redis port 6379 should not be bound to public host")

    def test_f5_bva_05_celery_worker_inherits_authenticated_broker(self):
        """Celery worker and beat in docker-compose.yml must inherit x-backend-base environment."""
        content = read_workspace_file("docker-compose.yml")
        self.assertIn("<<: *backend-base", content, "Celery services must inherit backend-base configuration")


class TestTier2Feature6ContainerSecurityBoundary(E2EWorkspaceBase):
    """Feature 6 Boundary: Line endings, security user isolation, and dockerignore entries."""

    def test_f6_bva_01_entrypoint_line_endings_are_unix_lf(self):
        """backend/entrypoint.sh must strictly use Unix LF (\\n) line endings, not Windows CRLF."""
        if not workspace_file_exists("backend/entrypoint.sh"):
            self.fail("backend/entrypoint.sh does not exist")
        from tests.e2e.harness import get_workspace_path
        binary_data = get_workspace_path("backend/entrypoint.sh").read_bytes()
        self.assertNotIn(b"\r\n", binary_data, "backend/entrypoint.sh contains Windows CRLF line endings")

    def test_f6_bva_02_dockerignore_excludes_virtualenv_and_git(self):
        """.dockerignore must exclude .git, .venv, and node_modules."""
        content = read_workspace_file(".dockerignore")
        if not content:
            content = read_workspace_file("backend/.dockerignore")
        self.assertTrue(len(content) > 0, ".dockerignore must exist")
        self.assertIn(".git", content)
        self.assertIn(".venv", content)
        self.assertIn("node_modules", content)

    def test_f6_bva_03_env_example_contains_all_required_secrets(self):
        """.env.example must document POSTGRES_PASSWORD, REDIS_PASSWORD, and SECRET_KEY."""
        self.assertTrue(workspace_file_exists(".env.example"), ".env.example must exist at root")
        content = read_workspace_file(".env.example")
        self.assertIn("POSTGRES_PASSWORD", content)
        self.assertIn("REDIS_PASSWORD", content)
        self.assertIn("SECRET_KEY", content)

    def test_f6_bva_04_celery_app_exported_in_config_init(self):
        """backend/config/__init__.py must import and expose celery_app."""
        content = read_workspace_file("backend/config/__init__.py")
        self.assertIn("celery_app", content, "backend/config/__init__.py must expose celery_app for auto-discovery")

    def test_f6_bva_05_dockerfiles_switch_to_unprivileged_user(self):
        """Dockerfiles must switch to non-root USER before final CMD."""
        backend_df = read_workspace_file("backend/Dockerfile")
        frontend_df = read_workspace_file("frontend/Dockerfile")
        self.assertIn("USER appuser", backend_df)
        self.assertIn("USER nextjs", frontend_df)


class TestTier2Feature7SearchBoundary(E2ETestBase):
    """Feature 7 Boundary: Empty, whitespace, SQL injection, unicode, and non-existent queries."""

    def test_f7_bva_01_search_empty_query_returns_all_posts(self):
        """Search query with empty string ?search= returns all published posts."""
        self.create_post(title="BVA Post 1", slug="bva-post-1")
        response = self.client.get("/api/v1/posts/?search=")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.json()["count"], 1)

    def test_f7_bva_02_search_whitespace_query_handled_safely(self):
        """Search query with whitespace ?search=%20%20 is stripped and returns 200 OK."""
        response = self.client.get("/api/v1/posts/?search=%20%20%20")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.json())

    def test_f7_bva_03_search_special_meta_characters_handled_safely(self):
        """Search query with SQL or regex meta characters executes safely without 500 error."""
        response = self.client.get("/api/v1/posts/?search='%20OR%201=1--%20;DROP%20TABLE")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_f7_bva_04_search_non_existent_keyword_returns_empty_results(self):
        """Search query with non-matching random string returns count=0 and results=[]."""
        response = self.client.get("/api/v1/posts/?search=Zzz987NonExistentTermXYZ456")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["count"], 0)
        self.assertEqual(data["results"], [])

    def test_f7_bva_05_search_unicode_persian_query_handled(self):
        """Search query with Persian/Unicode characters is handled safely without error."""
        self.create_post(title="فناوری کوانتومی سایبری", slug="quantum-persian-post")
        response = self.client.get("/api/v1/posts/?search=کوانتومی")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        slugs = [p["slug"] for p in response.json()["results"]]
        self.assertIn("quantum-persian-post", slugs)


class TestTier2Feature8HotTakeBoundary(E2ETestBase):
    """Feature 8 Boundary: Missing IDs, default payload values, zero-division, and method guards."""

    def test_f8_bva_01_vote_non_existent_hot_take_returns_404(self):
        """POST /api/v1/editorial/hot-takes/999999/vote/ returns 404 Not Found."""
        response = self.client.post("/api/v1/editorial/hot-takes/999999/vote/", data={"support": True})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_f8_bva_02_vote_empty_body_defaults_to_support_true(self):
        """POST /api/v1/editorial/hot-takes/{id}/vote/ with empty JSON defaults support to True."""
        take = self.create_hot_take(upvotes=2, total_votes=4)
        response = self.client.post(f"/api/v1/editorial/hot-takes/{take.id}/vote/", data={})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["upvotes"], 3)
        self.assertEqual(response.json()["total_votes"], 5)

    def test_f8_bva_03_upvote_percent_with_zero_total_votes(self):
        """Hot take with 0 total votes calculates upvote_percent as 0 without division error."""
        take = self.create_hot_take(upvotes=0, total_votes=0)
        self.assertEqual(take.upvote_percent, 0)
        response = self.client.get("/api/v1/editorial/hot-takes/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        target = next((t for t in response.json() if t["id"] == take.id), None)
        self.assertIsNotNone(target)
        self.assertEqual(target["upvote_percent"], 0)

    def test_f8_bva_04_inactive_hot_takes_excluded_from_list(self):
        """Inactive hot takes (is_active=False) must not appear in GET /api/v1/editorial/hot-takes/."""
        inactive_take = self.create_hot_take(
            opinion="Inactive secret opinion",
            is_active=False,
        )
        response = self.client.get("/api/v1/editorial/hot-takes/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [t["id"] for t in response.json()]
        self.assertNotIn(inactive_take.id, ids)

    def test_f8_bva_05_vote_endpoint_invalid_method_returns_405(self):
        """GET /api/v1/editorial/hot-takes/{id}/vote/ returns 405 Method Not Allowed."""
        take = self.create_hot_take()
        response = self.client.get(f"/api/v1/editorial/hot-takes/{take.id}/vote/")
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)


class TestTier2Feature9CommentValidationBoundary(E2ETestBase):
    """Feature 9 Boundary: Missing required fields, empty whitespace, non-existent slugs, malformed email."""

    def test_f9_bva_01_comment_missing_content_returns_400(self):
        """Comment submission with missing content returns 400 Bad Request."""
        post = self.create_post(title="Post For Comment Test", slug="post-comment-test-1")
        response = self.client.post(
            f"/api/v1/posts/{post.slug}/comments/",
            data={"handle": "Ghost"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("content", response.json())

    def test_f9_bva_02_comment_whitespace_content_returns_400(self):
        """Comment submission with blank/whitespace content returns 400 Bad Request."""
        post = self.create_post(title="Post For Comment Test 2", slug="post-comment-test-2")
        response = self.client.post(
            f"/api/v1/posts/{post.slug}/comments/",
            data={"handle": "Ghost", "content": "   \n\t   "},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_f9_bva_03_comment_missing_handle_returns_400(self):
        """Comment submission with missing handle returns 400 Bad Request."""
        post = self.create_post(title="Post For Comment Test 3", slug="post-comment-test-3")
        response = self.client.post(
            f"/api/v1/posts/{post.slug}/comments/",
            data={"content": "Valid content without handle."},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("handle", response.json())

    def test_f9_bva_04_comment_non_existent_post_returns_404(self):
        """Comment submission to non-existent post slug returns 404 Not Found."""
        response = self.client.post(
            "/api/v1/posts/non-existent-article-xyz/comments/",
            data={"handle": "Ghost", "content": "Valid comment."},
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_f9_bva_05_comment_invalid_email_format_returns_400(self):
        """Comment submission with malformed email format returns 400 Bad Request."""
        post = self.create_post(title="Post For Comment Test 5", slug="post-comment-test-5")
        response = self.client.post(
            f"/api/v1/posts/{post.slug}/comments/",
            data={"handle": "Ghost", "content": "Valid comment.", "email": "not-an-email"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.json())


class TestTier2Feature10OpenRedirectBoundary(E2EWorkspaceBase):
    """Feature 10 Boundary: Protocol-relative URLs, backslashes, external schemes, javascript URIs."""

    def test_f10_bva_01_protocol_relative_url_rejected(self):
        """Protocol-relative URL //attacker.com must be rejected."""
        self.assertFalse(is_safe_redirect_url("//attacker.com"))
        self.assertFalse(is_safe_redirect_url("//google.com/search"))

    def test_f10_bva_02_protocol_relative_backslash_rejected(self):
        """Protocol-relative bypass using /\\attacker.com must be rejected."""
        self.assertFalse(is_safe_redirect_url("/\\attacker.com"))

    def test_f10_bva_03_windows_backslash_rejected(self):
        """Windows-style path \\\\attacker.com or \\articles must be rejected."""
        self.assertFalse(is_safe_redirect_url("\\\\attacker.com"))
        self.assertFalse(is_safe_redirect_url("\\articles"))

    def test_f10_bva_04_absolute_external_url_rejected(self):
        """Absolute external URLs with http: or https: must be rejected."""
        self.assertFalse(is_safe_redirect_url("https://malicious.com"))
        self.assertFalse(is_safe_redirect_url("http://attacker.org/steal"))

    def test_f10_bva_05_javascript_pseudo_protocol_rejected(self):
        """JavaScript pseudo-protocol javascript:alert(1) must be rejected."""
        self.assertFalse(is_safe_redirect_url("javascript:alert(1)"))
        self.assertFalse(is_safe_redirect_url("data:text/html,<script>alert(1)</script>"))


class TestTier2Feature11StoredXssBoundary(E2EWorkspaceBase):
    """Feature 11 Boundary: Nested script tags, encoded attributes, SVG onload, dangerous iframes."""

    def test_f11_bva_01_nested_malformed_script_tags_neutralized(self):
        """Nested or malformed script tags like <<SCRIPT>alert(1)//<</SCRIPT> are neutralized."""
        clean = sanitize_html_mock("<<SCRIPT>alert(1)//<</SCRIPT>")
        self.assertNotIn("alert(1)", clean)

    def test_f11_bva_02_javascript_anchor_href_neutralized(self):
        """Anchor tags with javascript: URI in href must have href removed."""
        clean = sanitize_html_mock('<a href="javascript:alert(document.domain)">Click to Claim</a>')
        self.assertNotIn("javascript:", clean)

    def test_f11_bva_03_svg_onload_payload_neutralized(self):
        """SVG elements with onload handlers must have onload stripped."""
        clean = sanitize_html_mock('<svg onload="alert(1)"><circle cx="50" cy="50" r="40" /></svg>')
        self.assertNotIn("onload", clean)
        self.assertNotIn("alert", clean)

    def test_f11_bva_04_encoded_javascript_href_neutralized(self):
        """Sanitizer handles case variants or script injection attempts in attributes."""
        clean = sanitize_html_mock('<body onpageshow="alert(1)">Hello</body>')
        self.assertNotIn("onpageshow", clean)

    def test_f11_bva_05_iframe_payload_stripped(self):
        """Embedded iframes pointing to malicious origins are stripped."""
        clean = sanitize_html_mock('<iframe src="http://evil.com/phish"></iframe><p>Story</p>')
        self.assertNotIn("<iframe", clean)
        self.assertIn("<p>Story</p>", clean)
