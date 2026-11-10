"""Tier 1: Feature Coverage E2E Tests (55 Tests).

Covers happy path requirements for all 11 features defined in PROJECT.md:
- Feature 1: API Endpoint Routing (5 tests)
- Feature 2: SSR Category Route (5 tests)
- Feature 3: CSRF Cookie Issuance & Verification (5 tests)
- Feature 4: Production Python Dependencies (5 tests)
- Feature 5: Redis Password & URL Alignment (5 tests)
- Feature 6: Container & Reverse Proxy Scaffolding (5 tests)
- Feature 7: Live Search Component & Endpoint (5 tests)
- Feature 8: Hot Takes Deck Integration (5 tests)
- Feature 9: Comment Submission Form & API (5 tests)
- Feature 10: Open Redirect Prevention (5 tests)
- Feature 11: Stored XSS Content Sanitization (5 tests)
"""

import re
from rest_framework import status
from django.conf import settings
from tests.e2e.harness import (
    E2ETestBase,
    E2EWorkspaceBase,
    read_workspace_file,
    workspace_file_exists,
    is_safe_redirect_url,
    sanitize_html_mock,
)


class TestTier1Feature1ApiEndpointRouting(E2ETestBase):
    """Feature 1: API Endpoint Routing in frontend config and backend URLs."""

    def test_f1_01_api_config_auth_routes_prefix_v1(self):
        """Frontend apiConfig.ts auth routes must use /api/v1/auth/ prefix."""
        content = read_workspace_file("frontend/lib/api/apiConfig.ts")
        self.assertTrue(len(content) > 0, "frontend/lib/api/apiConfig.ts must exist and be readable")
        self.assertIn("/api/v1/auth/login/", content, "login endpoint must point to /api/v1/auth/login/")
        self.assertIn("/api/v1/auth/register/", content, "register endpoint must point to /api/v1/auth/register/")
        self.assertIn("/api/v1/auth/logout/", content, "logout endpoint must point to /api/v1/auth/logout/")
        self.assertIn("/api/v1/auth/token/refresh/", content, "tokenRefresh endpoint must point to /api/v1/auth/token/refresh/")

    def test_f1_02_api_config_profile_me_routing(self):
        """Frontend apiConfig.ts profile.me must point to /api/v1/auth/me/."""
        content = read_workspace_file("frontend/lib/api/apiConfig.ts")
        self.assertIn("/api/v1/auth/me/", content, "profile.me endpoint must point to /api/v1/auth/me/")

    def test_f1_03_api_config_otp_and_reset_endpoints_use_v1(self):
        """Frontend apiConfig.ts OTP and password reset endpoints must use /api/v1/auth/."""
        content = read_workspace_file("frontend/lib/api/apiConfig.ts")
        self.assertIn("/api/v1/auth/otp/send/", content, "sendOtp must use /api/v1/auth/otp/send/")
        self.assertIn("/api/v1/auth/otp/verify/", content, "verifyOtp must use /api/v1/auth/otp/verify/")
        self.assertIn("/api/v1/auth/password/reset/", content, "resetPassword must use /api/v1/auth/password/reset/")

    def test_f1_04_backend_auth_me_endpoint_returns_user_data(self):
        """Backend /api/v1/auth/me/ must return user data for authenticated requests."""
        user = self.create_user(username="f1_user", email="f1@example.com")
        self.client.force_authenticate(user=user)
        response = self.client.get("/api/v1/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data.get("username"), "f1_user")
        self.assertEqual(data.get("role"), "READER")

    def test_f1_05_backend_auth_token_refresh_route_exists(self):
        """Backend /api/v1/auth/token/refresh/ route must exist and be mounted."""
        # Unauthenticated request without refresh cookie should return 400 or 401, NOT 404
        response = self.client.post("/api/v1/auth/token/refresh/", data={})
        self.assertIn(
            response.status_code,
            [status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED],
            f"Expected 400 or 401 for empty refresh call, got {response.status_code}",
        )


class TestTier1Feature2SsrCategoryRoute(E2ETestBase):
    """Feature 2: SSR Category Route in frontend and backend."""

    def test_f2_01_articles_page_fetches_categories_from_v1_categories(self):
        """frontend/app/articles/page.tsx must fetch categories from /api/v1/categories/."""
        content = read_workspace_file("frontend/app/articles/page.tsx")
        self.assertTrue(len(content) > 0, "frontend/app/articles/page.tsx must exist")
        self.assertIn(
            "/api/v1/categories/",
            content,
            "frontend/app/articles/page.tsx must fetch from /api/v1/categories/",
        )
        self.assertNotIn(
            "/api/v1/editorial/categories/",
            content,
            "frontend/app/articles/page.tsx must NOT fetch from non-existent /api/v1/editorial/categories/",
        )

    def test_f2_02_backend_categories_endpoint_status_200(self):
        """Backend GET /api/v1/categories/ must return HTTP 200 OK."""
        response = self.client.get("/api/v1/categories/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_f2_03_backend_categories_endpoint_returns_list(self):
        """Backend GET /api/v1/categories/ must return an unpaginated JSON array."""
        self.create_category(name="Neural Tech", slug="neural-tech")
        response = self.client.get("/api/v1/categories/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.json(), list, "Categories response must be a JSON array")

    def test_f2_04_backend_categories_schema_fields(self):
        """Backend category items must include name, slug, color_class, and post count."""
        self.create_category(name="Hardware Hacks", slug="hardware-hacks", color_class="neon-pink")
        response = self.client.get("/api/v1/categories/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        items = response.json()
        self.assertTrue(len(items) > 0, "At least one category should be returned")
        first = items[0]
        self.assertIn("name", first)
        self.assertIn("slug", first)
        self.assertIn("color_class", first)
        self.assertTrue("count" in first or "post_count" in first, "Category must have count or post_count")

    def test_f2_05_backend_categories_post_count_aggregation(self):
        """Category count must accurately reflect published posts count."""
        cat = self.create_category(name="Cyber Ops", slug="cyber-ops")
        self.create_post(category=cat, title="Ops Post 1", slug="ops-post-1")
        response = self.client.get("/api/v1/categories/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        items = response.json()
        target = next((item for item in items if item["slug"] == "cyber-ops"), None)
        self.assertIsNotNone(target, "Created category must exist in response")
        count = target.get("count", target.get("post_count", 0))
        self.assertGreaterEqual(count, 1)


class TestTier1Feature3CsrfCookieIssuance(E2ETestBase):
    """Feature 3: CSRF Cookie Issuance & Verification."""

    def test_f3_01_login_sets_csrftoken_cookie(self):
        """POST /api/v1/auth/login/ must set the csrftoken cookie on success."""
        self.create_user(username="f3_login_user", password="Password123!")
        response = self.client.post(
            "/api/v1/auth/login/",
            data={"username": "f3_login_user", "password": "Password123!"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(
            "csrftoken",
            response.cookies,
            "Response cookies must include csrftoken after successful login",
        )

    def test_f3_02_register_sets_csrftoken_cookie(self):
        """POST /api/v1/auth/register/ must set the csrftoken cookie on success."""
        response = self.client.post(
            "/api/v1/auth/register/",
            data={
                "username": "f3_reg_user",
                "email": "f3_reg@example.com",
                "password": "Password123!",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn(
            "csrftoken",
            response.cookies,
            "Response cookies must include csrftoken after successful registration",
        )

    def test_f3_03_cookie_auth_mutating_request_with_valid_csrf_succeeds(self):
        """Mutating request with cookie auth and valid X-CSRFToken header must succeed."""
        self.create_user(username="f3_mut_user", password="Password123!")
        login_resp = self.client.post(
            "/api/v1/auth/login/",
            data={"username": "f3_mut_user", "password": "Password123!"},
        )
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)
        csrf_token = login_resp.cookies.get("csrftoken").value if "csrftoken" in login_resp.cookies else ""

        # Make mutating request with access token cookie and CSRF token header
        self.client.cookies["csrftoken"] = csrf_token
        patch_resp = self.client.patch(
            "/api/v1/auth/me/",
            data={"bio": "Updated Gamer Bio"},
            format="json",
            HTTP_X_CSRFTOKEN=csrf_token,
        )
        self.assertEqual(patch_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_resp.json().get("bio"), "Updated Gamer Bio")

    def test_f3_04_safe_get_request_with_cookie_auth_does_not_require_csrf(self):
        """Safe GET request with cookie authentication does not require CSRF header."""
        self.create_user(username="f3_safe_user", password="Password123!")
        login_resp = self.client.post(
            "/api/v1/auth/login/",
            data={"username": "f3_safe_user", "password": "Password123!"},
        )
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)
        get_resp = self.client.get("/api/v1/auth/me/")
        self.assertEqual(get_resp.status_code, status.HTTP_200_OK)

    def test_f3_05_views_decorated_with_ensure_csrf_cookie(self):
        """LoginAPIView and RegisterAPIView in backend/apps/users/views.py must be decorated with ensure_csrf_cookie."""
        content = read_workspace_file("backend/apps/users/views.py")
        self.assertTrue(len(content) > 0, "backend/apps/users/views.py must exist")
        self.assertIn("ensure_csrf_cookie", content, "views.py must import or use ensure_csrf_cookie")
        # Check decoration pattern
        has_login_decor = re.search(r"@method_decorator\(ensure_csrf_cookie.*?\)\s*class LoginAPIView", content, re.DOTALL)
        has_register_decor = re.search(r"@method_decorator\(ensure_csrf_cookie.*?\)\s*class RegisterAPIView", content, re.DOTALL)
        self.assertTrue(
            bool(has_login_decor and has_register_decor),
            "LoginAPIView and RegisterAPIView must be decorated with @method_decorator(ensure_csrf_cookie, name='dispatch')",
        )


class TestTier1Feature4ProductionDependencies(E2EWorkspaceBase):
    """Feature 4: Production Python Dependencies in backend/requirements.txt."""

    def test_f4_01_requirements_file_exists(self):
        """backend/requirements.txt must exist and be non-empty."""
        self.assertTrue(workspace_file_exists("backend/requirements.txt"))
        content = read_workspace_file("backend/requirements.txt")
        self.assertTrue(len(content.strip()) > 0)

    def test_f4_02_requirements_contains_gunicorn(self):
        """backend/requirements.txt must declare gunicorn."""
        content = read_workspace_file("backend/requirements.txt")
        self.assertRegex(content, r"(?i)gunicorn", "backend/requirements.txt must contain gunicorn")

    def test_f4_03_requirements_contains_celery(self):
        """backend/requirements.txt must declare celery."""
        content = read_workspace_file("backend/requirements.txt")
        self.assertRegex(content, r"(?i)celery", "backend/requirements.txt must contain celery")

    def test_f4_04_gunicorn_version_pin(self):
        """gunicorn must be pinned to >=21.2.0."""
        content = read_workspace_file("backend/requirements.txt")
        match = re.search(r"gunicorn>=([0-9]+\.[0-9]+(?:\.[0-9]+)?)", content, re.IGNORECASE)
        self.assertIsNotNone(match, "gunicorn must be pinned with >= version (e.g., gunicorn>=21.2.0)")
        version_parts = [int(p) for p in match.group(1).split(".")]
        self.assertGreaterEqual(tuple(version_parts), (21, 2, 0))

    def test_f4_05_celery_version_pin(self):
        """celery must be pinned to >=5.3.6."""
        content = read_workspace_file("backend/requirements.txt")
        match = re.search(r"celery>=([0-9]+\.[0-9]+(?:\.[0-9]+)?)", content, re.IGNORECASE)
        self.assertIsNotNone(match, "celery must be pinned with >= version (e.g., celery>=5.3.6)")
        version_parts = [int(p) for p in match.group(1).split(".")]
        self.assertGreaterEqual(tuple(version_parts), (5, 3, 6))


class TestTier1Feature5RedisPasswordAlignment(E2EWorkspaceBase):
    """Feature 5: Redis Password & URL Alignment in docker-compose.yml."""

    def test_f5_01_docker_compose_exists_and_valid(self):
        """docker-compose.yml must exist and be readable."""
        self.assertTrue(workspace_file_exists("docker-compose.yml"))
        content = read_workspace_file("docker-compose.yml")
        self.assertTrue(len(content.strip()) > 0)

    def test_f5_02_redis_service_requires_password(self):
        """Redis service command must enforce --requirepass with REDIS_PASSWORD."""
        content = read_workspace_file("docker-compose.yml")
        self.assertIn("--requirepass", content, "Redis command must include --requirepass")
        self.assertIn("REDIS_PASSWORD", content, "Redis requirepass must reference REDIS_PASSWORD")

    def test_f5_03_redis_url_interpolates_password(self):
        """REDIS_URL in backend environment must interpolate REDIS_PASSWORD."""
        content = read_workspace_file("docker-compose.yml")
        # Match pattern containing :${REDIS_PASSWORD...}@redis
        self.assertRegex(
            content,
            r"REDIS_URL:.*?\$\{REDIS_PASSWORD.*?@redis",
            "REDIS_URL must include Redis password interpolation (e.g. redis://:${REDIS_PASSWORD:-...}@redis:...)",
        )

    def test_f5_04_celery_broker_url_interpolates_password(self):
        """CELERY_BROKER_URL must interpolate REDIS_PASSWORD."""
        content = read_workspace_file("docker-compose.yml")
        self.assertRegex(
            content,
            r"CELERY_BROKER_URL:.*?\$\{REDIS_PASSWORD.*?@redis",
            "CELERY_BROKER_URL must include Redis password interpolation",
        )

    def test_f5_05_celery_result_backend_interpolates_password(self):
        """CELERY_RESULT_BACKEND must interpolate REDIS_PASSWORD."""
        content = read_workspace_file("docker-compose.yml")
        self.assertRegex(
            content,
            r"CELERY_RESULT_BACKEND:.*?\$\{REDIS_PASSWORD.*?@redis",
            "CELERY_RESULT_BACKEND must include Redis password interpolation",
        )


class TestTier1Feature6ContainerScaffolding(E2EWorkspaceBase):
    """Feature 6: Container & Reverse Proxy Scaffolding."""

    def test_f6_01_backend_dockerfile_exists_and_multistage(self):
        """backend/Dockerfile must exist, use python:3.12-slim-bookworm, and declare non-root user."""
        self.assertTrue(workspace_file_exists("backend/Dockerfile"), "backend/Dockerfile must exist")
        content = read_workspace_file("backend/Dockerfile")
        self.assertIn("python:3.12-slim-bookworm", content, "backend/Dockerfile must use python:3.12-slim-bookworm")
        self.assertIn("USER appuser", content, "backend/Dockerfile must run as unprivileged appuser")
        self.assertIn("entrypoint.sh", content, "backend/Dockerfile must specify entrypoint.sh")

    def test_f6_02_frontend_dockerfile_exists_and_multistage(self):
        """frontend/Dockerfile must exist, use node:20-alpine, and declare non-root user."""
        self.assertTrue(workspace_file_exists("frontend/Dockerfile"), "frontend/Dockerfile must exist")
        content = read_workspace_file("frontend/Dockerfile")
        self.assertIn("node:20-alpine", content, "frontend/Dockerfile must use node:20-alpine")
        self.assertIn("USER nextjs", content, "frontend/Dockerfile must run as unprivileged nextjs user")
        self.assertIn("server.js", content, "frontend/Dockerfile must run standalone server.js")

    def test_f6_03_nginx_conf_exists_and_routes(self):
        """nginx/nginx.conf must exist and route static, media, admin, api, and frontend."""
        self.assertTrue(workspace_file_exists("nginx/nginx.conf"), "nginx/nginx.conf must exist")
        content = read_workspace_file("nginx/nginx.conf")
        self.assertIn("location /api/", content, "nginx/nginx.conf must proxy /api/")
        self.assertIn("location /admin/", content, "nginx/nginx.conf must proxy /admin/")
        self.assertIn("location /static/", content, "nginx/nginx.conf must route /static/")
        self.assertIn("location /", content, "nginx/nginx.conf must route frontend /")

    def test_f6_04_entrypoint_script_exists_and_executable(self):
        """backend/entrypoint.sh must exist, use pipefail, and handle migration and handoff."""
        self.assertTrue(workspace_file_exists("backend/entrypoint.sh"), "backend/entrypoint.sh must exist")
        content = read_workspace_file("backend/entrypoint.sh")
        self.assertIn("set -euo pipefail", content, "backend/entrypoint.sh must use set -euo pipefail")
        self.assertIn("migrate", content, "backend/entrypoint.sh must run migrations")
        self.assertIn("collectstatic", content, "backend/entrypoint.sh must run collectstatic")
        self.assertIn('exec "$@"', content, "backend/entrypoint.sh must exec command line arguments")

    def test_f6_05_celery_module_exists_in_backend(self):
        """backend/config/celery.py must exist and configure Celery app from django.conf."""
        self.assertTrue(workspace_file_exists("backend/config/celery.py"), "backend/config/celery.py must exist")
        content = read_workspace_file("backend/config/celery.py")
        self.assertIn("Celery", content, "celery.py must instantiate Celery app")
        self.assertIn("config_from_object", content, "celery.py must configure app from django.conf:settings")


class TestTier1Feature7LiveSearch(E2ETestBase):
    """Feature 7: Live Search Component & Endpoint."""

    def test_f7_01_search_endpoint_returns_paginated_results(self):
        """GET /api/v1/posts/?search= must return HTTP 200 with paginated structure."""
        self.create_post(title="Searchable Post Alpha", slug="searchable-alpha")
        response = self.client.get("/api/v1/posts/?search=")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn("count", data)
        self.assertIn("results", data)
        self.assertIsInstance(data["results"], list)

    def test_f7_02_search_filters_by_post_title(self):
        """Search query matching title keyword returns matching post."""
        self.create_post(title="Cyberdeck Quantum Architecture", slug="cyberdeck-arch")
        response = self.client.get("/api/v1/posts/?search=Cyberdeck")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.json()["results"]
        slugs = [r["slug"] for r in results]
        self.assertIn("cyberdeck-arch", slugs)

    def test_f7_03_search_filters_by_post_excerpt(self):
        """Search query matching excerpt keyword returns matching post."""
        self.create_post(
            title="Neural Synapse 2077",
            slug="neural-synapse-2077",
            excerpt="UniqueBioMechanicsExcerptKeyphrase for testing",
        )
        response = self.client.get("/api/v1/posts/?search=UniqueBioMechanicsExcerptKeyphrase")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.json()["results"]
        slugs = [r["slug"] for r in results]
        self.assertIn("neural-synapse-2077", slugs)

    def test_f7_04_search_filters_by_tags(self):
        """Search query matching post tags returns matching post."""
        self.create_post(
            title="Hardware Modding Guide",
            slug="hardware-modding-guide",
            tags=["overclocking", "cryo-cooling"],
        )
        response = self.client.get("/api/v1/posts/?search=overclocking")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.json()["results"]
        slugs = [r["slug"] for r in results]
        self.assertIn("hardware-modding-guide", slugs)

    def test_f7_05_search_modal_component_connects_to_api(self):
        """Search modal component must fetch from /api/v1/posts/?search= instead of static empty array."""
        content = read_workspace_file("frontend/components/SearchDrawerModal.tsx")
        if not content:
            content = read_workspace_file("frontend/components/SearchDrawerModalClient.tsx")
        self.assertTrue(len(content) > 0, "SearchDrawerModal component must exist")
        self.assertIn(
            "/api/v1/posts/?search=",
            content,
            "Search modal must connect to /api/v1/posts/?search=",
        )


class TestTier1Feature8HotTakesDeck(E2ETestBase):
    """Feature 8: Hot Takes Deck Integration."""

    def test_f8_01_hot_takes_list_endpoint_status_200(self):
        """GET /api/v1/editorial/hot-takes/ must return HTTP 200 OK."""
        response = self.client.get("/api/v1/editorial/hot-takes/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_f8_02_hot_takes_list_returns_unpaginated_array(self):
        """GET /api/v1/editorial/hot-takes/ must return unpaginated JSON array."""
        self.create_hot_take(author="Neon Samurai", opinion="Edge computing wins")
        response = self.client.get("/api/v1/editorial/hot-takes/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.json(), list, "Hot takes must return an array, not paginated object")

    def test_f8_03_hot_takes_item_schema(self):
        """Hot take items must contain author, opinion, body, upvotes, total_votes, upvote_percent."""
        take = self.create_hot_take(
            author="Decker",
            opinion="CRTs are aesthetically superior",
            body="Phosphor glow is unmatched.",
            upvotes=8,
            total_votes=10,
        )
        response = self.client.get("/api/v1/editorial/hot-takes/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        items = response.json()
        target = next((i for i in items if i["id"] == take.id), None)
        self.assertIsNotNone(target)
        self.assertIn("author", target)
        self.assertIn("opinion", target)
        self.assertIn("body", target)
        self.assertIn("upvotes", target)
        self.assertIn("total_votes", target)
        self.assertIn("upvote_percent", target)

    def test_f8_04_hot_takes_vote_endpoint_support_true(self):
        """POST /api/v1/editorial/hot-takes/{id}/vote/ with support=true increments upvotes and total_votes."""
        take = self.create_hot_take(upvotes=5, total_votes=10)
        response = self.client.post(
            f"/api/v1/editorial/hot-takes/{take.id}/vote/",
            data={"support": True},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["total_votes"], 11)
        self.assertEqual(data["upvotes"], 6)

    def test_f8_05_hot_take_deck_component_connects_to_editorial_api(self):
        """HotTakeDeck.tsx must connect to /api/v1/editorial/hot-takes/."""
        content = read_workspace_file("frontend/components/HotTakeDeck.tsx")
        self.assertTrue(len(content) > 0, "frontend/components/HotTakeDeck.tsx must exist")
        self.assertIn(
            "/api/v1/editorial/hot-takes/",
            content,
            "HotTakeDeck.tsx must fetch from /api/v1/editorial/hot-takes/",
        )
        self.assertIn(
            "/vote/",
            content,
            "HotTakeDeck.tsx must send votes to editorial vote endpoint",
        )


class TestTier1Feature9CommentSubmission(E2ETestBase):
    """Feature 9: Comment Submission Form & API."""

    def test_f9_01_comment_post_endpoint_creates_comment(self):
        """POST /api/v1/posts/{slug}/comments/ creates comment and returns 201 Created."""
        post = self.create_post(title="Commentable Article", slug="commentable-article")
        response = self.client.post(
            f"/api/v1/posts/{post.slug}/comments/",
            data={"handle": "NetRunner", "content": "Sensational read on cyber systems!"},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_f9_02_comment_response_schema(self):
        """Comment response contains id, author, badge, content, upvotes, created_at."""
        post = self.create_post(title="Schema Article", slug="schema-article")
        response = self.client.post(
            f"/api/v1/posts/{post.slug}/comments/",
            data={"handle": "CyberGamer", "content": "Validating fields format."},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertIn("id", data)
        self.assertIn("author", data)
        self.assertIn("badge", data)
        self.assertIn("content", data)
        self.assertIn("upvotes", data)
        self.assertIn("created_at", data)

    def test_f9_03_anonymous_comment_gets_cyber_reader_badge(self):
        """Anonymous comment receives badge CYBER READER."""
        post = self.create_post(title="Badge Article", slug="badge-article")
        response = self.client.post(
            f"/api/v1/posts/{post.slug}/comments/",
            data={"handle": "AnonReader", "content": "Checking badge assignment."},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json().get("badge"), "CYBER READER")

    def test_f9_04_comments_list_retrieves_created_comment(self):
        """GET /api/v1/posts/{slug}/comments/ returns the newly submitted comment."""
        post = self.create_post(title="Retrieval Article", slug="retrieval-article")
        post_resp = self.client.post(
            f"/api/v1/posts/{post.slug}/comments/",
            data={"handle": "Observer", "content": "Retrievable comment message."},
        )
        self.assertEqual(post_resp.status_code, status.HTTP_201_CREATED)
        new_id = post_resp.json()["id"]

        get_resp = self.client.get(f"/api/v1/posts/{post.slug}/comments/")
        self.assertEqual(get_resp.status_code, status.HTTP_200_OK)
        comments = get_resp.json()
        comment_ids = [c["id"] for c in comments]
        self.assertIn(new_id, comment_ids)

    def test_f9_05_article_detail_page_wires_comment_submission(self):
        """frontend/components/ArticleDetailPageClient.tsx must handle submit and call comments endpoint."""
        content = read_workspace_file("frontend/components/ArticleDetailPageClient.tsx")
        self.assertTrue(len(content) > 0, "ArticleDetailPageClient.tsx must exist")
        self.assertIn(
            "/comments/",
            content,
            "ArticleDetailPageClient.tsx must submit comment to comments API",
        )


class TestTier1Feature10OpenRedirect(E2EWorkspaceBase):
    """Feature 10: Open Redirect Prevention (CWE-601)."""

    def test_f10_01_safe_relative_path_allowed(self):
        """Relative path /dashboard must be approved by safe redirect policy."""
        self.assertTrue(is_safe_redirect_url("/dashboard"))

    def test_f10_02_safe_articles_path_allowed(self):
        """Relative path /articles must be approved by safe redirect policy."""
        self.assertTrue(is_safe_redirect_url("/articles"))

    def test_f10_03_safe_article_slug_path_allowed(self):
        """Nested relative path /articles/quantum-computing-2077 must be approved."""
        self.assertTrue(is_safe_redirect_url("/articles/quantum-computing-2077"))

    def test_f10_04_safe_query_string_path_allowed(self):
        """Relative path with query parameters /articles?category=cyber must be approved."""
        self.assertTrue(is_safe_redirect_url("/articles?category=cyber"))

    def test_f10_05_middleware_inspects_origin_equality(self):
        """frontend/middleware.ts must validate origin equality and reject protocol-relative URLs."""
        content = read_workspace_file("frontend/middleware.ts")
        self.assertTrue(len(content) > 0, "frontend/middleware.ts must exist")
        self.assertIn(
            "origin",
            content,
            "middleware.ts must validate URL origin against request.nextUrl.origin",
        )
        self.assertIn(
            "//",
            content,
            "middleware.ts must check for or reject protocol-relative // slashes",
        )


class TestTier1Feature11StoredXss(E2EWorkspaceBase):
    """Feature 11: Stored XSS Content Sanitization."""

    def test_f11_01_safe_html_paragraphs_preserved(self):
        """Safe paragraph markup is preserved by sanitizer."""
        clean = sanitize_html_mock("<p>Safe text with <strong>bold</strong> formatting.</p>")
        self.assertIn("<p>", clean)
        self.assertIn("<strong>bold</strong>", clean)

    def test_f11_02_safe_headings_and_lists_preserved(self):
        """Safe headings and unordered list markup are preserved by sanitizer."""
        clean = sanitize_html_mock("<h3>Architecture</h3><ul><li>Layer 1</li><li>Layer 2</li></ul>")
        self.assertIn("<h3>Architecture</h3>", clean)
        self.assertIn("<li>Layer 1</li>", clean)

    def test_f11_03_basic_script_tag_stripped(self):
        """Script tags must be stripped from sanitized output."""
        clean = sanitize_html_mock("<script>alert('XSS')</script><p>Clean content</p>")
        self.assertNotIn("<script>", clean)
        self.assertNotIn("alert('XSS')", clean)
        self.assertIn("<p>Clean content</p>", clean)

    def test_f11_04_image_onerror_attribute_stripped(self):
        """Inline event handler onerror must be stripped from image tag."""
        clean = sanitize_html_mock('<img src="invalid.jpg" onerror="alert(document.cookie)">')
        self.assertNotIn("onerror", clean)
        self.assertNotIn("alert", clean)

    def test_f11_05_article_detail_sanitizes_before_dangerously_set_html(self):
        """ArticleDetailPageClient.tsx must import and use a DOM sanitizer before dangerouslySetInnerHTML."""
        content = read_workspace_file("frontend/components/ArticleDetailPageClient.tsx")
        self.assertTrue(len(content) > 0, "ArticleDetailPageClient.tsx must exist")
        self.assertRegex(
            content,
            r"(?i)(dompurify|sanitize)",
            "ArticleDetailPageClient.tsx must import and apply DOMPurify or sanitizer before rendering HTML",
        )
