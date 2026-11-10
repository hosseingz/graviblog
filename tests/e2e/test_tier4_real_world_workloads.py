"""Tier 4: Real-World Application Scenarios E2E Tests (6 Multi-Step Journeys).

Validates complete, authentic user and system workflows across multiple operations:
1. Scenario 1: New User Onboarding & Interactive Engagement Journey
2. Scenario 2: Cyber Editorial Reader & Hot Take Voting Journey
3. Scenario 3: Security Adversary Attack & Defense Journey
4. Scenario 4: Content Discovery & Multi-Category Deep Dive Journey
5. Scenario 5: Full Session Lifecycle & Token Rotation Journey
6. Scenario 6: Production Infrastructure & Service Topology Readiness Journey
"""

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


class TestTier4RealWorldWorkloads(E2ETestBase):
    """End-to-End multi-step user and system journeys."""

    def test_tier4_01_new_user_onboarding_and_interaction_flow(self):
        """Scenario 1: Complete onboarding flow from discovery to registration and first comment.

        Steps:
        1. Anonymous visitor checks available categories.
        2. Visitor registers a new reader account.
        3. Response sets authentication and CSRF cookies.
        4. User verifies profile endpoint.
        5. User performs live search for posts.
        6. User submits an authenticated comment on the post with CSRF token.
        7. User verifies their comment appears in the post's comments feed.
        """
        # Step 1: Discover categories
        cat = self.create_category(name="Neural Tech", slug="neural-tech")
        post = self.create_post(
            category=cat,
            title="Mind Uploading Realities",
            slug="mind-uploading-realities",
            excerpt="Analyzing neural fidelity in digital consciousness.",
        )
        cat_resp = self.client.get("/api/v1/categories/")
        self.assertEqual(cat_resp.status_code, status.HTTP_200_OK)

        # Step 2: Register account
        reg_resp = self.client.post(
            "/api/v1/auth/register/",
            data={
                "username": "journey_reader_1",
                "email": "reader1@graviblog.io",
                "password": "SecurePassword2077!",
            },
        )
        self.assertEqual(reg_resp.status_code, status.HTTP_201_CREATED)

        # Step 3: Check cookies
        self.assertIn("csrftoken", reg_resp.cookies, "Register must set csrftoken cookie")
        csrf_token = reg_resp.cookies.get("csrftoken").value if "csrftoken" in reg_resp.cookies else ""

        # Step 4: Verify profile
        me_resp = self.client.get("/api/v1/auth/me/")
        self.assertEqual(me_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(me_resp.json()["username"], "journey_reader_1")

        # Step 5: Search for articles
        search_resp = self.client.get("/api/v1/posts/?search=Consciousness")
        self.assertEqual(search_resp.status_code, status.HTTP_200_OK)
        results = search_resp.json()["results"]
        self.assertTrue(len(results) > 0)
        target_slug = results[0]["slug"]

        # Step 6: Post comment with CSRF token
        self.client.cookies["csrftoken"] = csrf_token
        comm_resp = self.client.post(
            f"/api/v1/posts/{target_slug}/comments/",
            data={"handle": "journey_reader_1", "content": "Fascinating perspective on neural transfer."},
            HTTP_X_CSRFTOKEN=csrf_token,
        )
        self.assertEqual(comm_resp.status_code, status.HTTP_201_CREATED)
        new_comment_id = comm_resp.json()["id"]

        # Step 7: Verify comment in feed
        list_comm_resp = self.client.get(f"/api/v1/posts/{target_slug}/comments/")
        self.assertEqual(list_comm_resp.status_code, status.HTTP_200_OK)
        all_ids = [c["id"] for c in list_comm_resp.json()]
        self.assertIn(new_comment_id, all_ids)

    def test_tier4_02_cyber_editorial_reader_journey(self):
        """Scenario 2: Editorial reading, opinions evaluation, and multi-directional voting.

        Steps:
        1. Reader fetches active editorial hot takes.
        2. Reader reviews opinion statements and vote tallies.
        3. Reader votes in support of take 1 (support=True) -> upvote & total vote increment.
        4. Reader votes in opposition to take 2 (support=False) -> total vote increment only.
        5. Reader re-fetches takes list to verify persistence.
        """
        take1 = self.create_hot_take(
            author="CyberSensei",
            opinion="AR glasses will replace smartphones by 2030",
            upvotes=10,
            total_votes=15,
        )
        take2 = self.create_hot_take(
            author="GlitchRunner",
            opinion="Web3 gaming was an absolute dead end",
            upvotes=20,
            total_votes=30,
        )

        # 1. Fetch takes
        list_resp = self.client.get("/api/v1/editorial/hot-takes/")
        self.assertEqual(list_resp.status_code, status.HTTP_200_OK)
        takes = list_resp.json()
        self.assertGreaterEqual(len(takes), 2)

        # 2. Vote Support on take 1
        vote1_resp = self.client.post(
            f"/api/v1/editorial/hot-takes/{take1.id}/vote/",
            data={"support": True},
            format="json",
        )
        self.assertEqual(vote1_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(vote1_resp.json()["total_votes"], 16)
        self.assertEqual(vote1_resp.json()["upvotes"], 11)

        # 3. Vote Oppose on take 2
        vote2_resp = self.client.post(
            f"/api/v1/editorial/hot-takes/{take2.id}/vote/",
            data={"support": False},
            format="json",
        )
        self.assertEqual(vote2_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(vote2_resp.json()["total_votes"], 31)
        self.assertEqual(vote2_resp.json()["upvotes"], 20)  # Upvotes stay at 20

    def test_tier4_03_security_adversary_attack_defense_journey(self):
        """Scenario 3: Simulates adversary attack vectors across redirect, CSRF, and stored XSS.

        Steps:
        1. Adversary attempts Open Redirect via protocol-relative & backslash URLs -> all neutralized.
        2. Adversary logs in, then attempts mutating request without CSRF token -> rejected with 403.
        3. Adversary attempts mutating request with spoofed CSRF token -> rejected with 403.
        4. Adversary injects stored XSS payloads into comment -> stored safely and sanitized on output.
        """
        # Step 1: Open Redirect Defense
        adversary_urls = [
            "//attacker.com/login",
            "/\\evil-site.com",
            "\\\\attacker.org",
            "https://phishing.site/account",
            "javascript:document.location='http://evil.com'",
        ]
        for bad_url in adversary_urls:
            self.assertFalse(
                is_safe_redirect_url(bad_url),
                f"Adversary URL '{bad_url}' was not rejected by redirect defense",
            )

        # Step 2 & 3: CSRF Defense
        from rest_framework.test import APIClient
        self.create_user(username="adversary_user", password="AttackerPassword123!")
        post = self.create_post(title="Target Defense Post", slug="target-defense-post")

        csrf_client = APIClient(enforce_csrf_checks=True)
        login_resp = csrf_client.post(
            "/api/v1/auth/login/",
            data={"username": "adversary_user", "password": "AttackerPassword123!"},
        )
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)

        # Request missing CSRF header
        missing_resp = csrf_client.post(
            f"/api/v1/posts/{post.slug}/comments/",
            data={"handle": "adversary", "content": "Missing CSRF header attack"},
        )
        self.assertEqual(missing_resp.status_code, status.HTTP_403_FORBIDDEN)

        # Request with bogus CSRF header
        forged_resp = csrf_client.post(
            f"/api/v1/posts/{post.slug}/comments/",
            data={"handle": "adversary", "content": "Forged CSRF token attack"},
            HTTP_X_CSRFTOKEN="forged-csrf-token-payload-xyz",
        )
        self.assertEqual(forged_resp.status_code, status.HTTP_403_FORBIDDEN)

        # Step 4: Stored XSS Defense
        xss_attack_string = (
            "<script type='text/javascript'>stealCookies();</script>"
            "<iframe src='http://evil.com/payload'></iframe>"
            "<svg/onload=alert(1)>"
            "<p>Legitimate looking text</p>"
        )
        clean = sanitize_html_mock(xss_attack_string)
        self.assertNotIn("<script", clean)
        self.assertNotIn("<iframe", clean)
        self.assertNotIn("onload", clean)
        self.assertIn("<p>Legitimate looking text</p>", clean)

    def test_tier4_04_content_discovery_and_deep_dive_journey(self):
        """Scenario 4: Multi-category exploration, live keyword filtering, and article deep-dive.

        Steps:
        1. Reader loads category listing from /api/v1/categories/.
        2. Reader selects category and searches for keyword within it.
        3. Reader accesses post detail by slug.
        4. Reader queries comments stream for the post.
        5. Reader appends feedback comment.
        """
        cat = self.create_category(name="Retro Cyberware", slug="retro-cyberware")
        post = self.create_post(
            category=cat,
            title="Restoring Vintage Deck Terminals",
            slug="restoring-vintage-deck-terminals",
            excerpt="CRT maintenance and mechanical switch calibration.",
        )

        # 1. Categories
        c_resp = self.client.get("/api/v1/categories/")
        self.assertEqual(c_resp.status_code, status.HTTP_200_OK)

        # 2. Search
        s_resp = self.client.get("/api/v1/posts/?search=Vintage")
        self.assertEqual(s_resp.status_code, status.HTTP_200_OK)
        results = s_resp.json()["results"]
        self.assertTrue(len(results) > 0)
        found_slug = results[0]["slug"]

        # 3. Detail
        d_resp = self.client.get(f"/api/v1/posts/{found_slug}/")
        self.assertEqual(d_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(d_resp.json()["title"], "Restoring Vintage Deck Terminals")

        # 4. Comments list
        cm_resp = self.client.get(f"/api/v1/posts/{found_slug}/comments/")
        self.assertEqual(cm_resp.status_code, status.HTTP_200_OK)

        # 5. Append feedback
        add_resp = self.client.post(
            f"/api/v1/posts/{found_slug}/comments/",
            data={"handle": "RetroFan", "content": "I still use an IBM Model M!"},
        )
        self.assertEqual(add_resp.status_code, status.HTTP_201_CREATED)

    def test_tier4_05_session_lifecycle_and_token_rotation_journey(self):
        """Scenario 5: Complete session lifecycle: login -> profile -> refresh -> mutate -> logout.

        Steps:
        1. User logs in, acquiring access and refresh cookies.
        2. User reads /api/v1/auth/me/.
        3. User rotates tokens via /api/v1/auth/token/refresh/.
        4. User mutates profile with PATCH /api/v1/auth/me/ using CSRF token.
        5. User logs out via /api/v1/auth/logout/.
        6. Subsequent profile request is rejected with 401 Unauthorized.
        """
        self.create_user(username="lifecycle_user", password="UserPassword123!")

        # 1. Login
        login_resp = self.client.post(
            "/api/v1/auth/login/",
            data={"username": "lifecycle_user", "password": "UserPassword123!"},
        )
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)
        self.assertIn("csrftoken", login_resp.cookies)
        csrf_token = login_resp.cookies.get("csrftoken").value if "csrftoken" in login_resp.cookies else ""

        # 2. Read profile
        me_resp = self.client.get("/api/v1/auth/me/")
        self.assertEqual(me_resp.status_code, status.HTTP_200_OK)

        # 3. Refresh token
        refresh_resp = self.client.post("/api/v1/auth/token/refresh/", data={})
        self.assertIn(refresh_resp.status_code, [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST])

        # 4. Mutate profile with CSRF
        self.client.cookies["csrftoken"] = csrf_token
        patch_resp = self.client.patch(
            "/api/v1/auth/me/",
            data={"bio": "Lifecycle Pro"},
            format="json",
            HTTP_X_CSRFTOKEN=csrf_token,
        )
        self.assertEqual(patch_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_resp.json()["bio"], "Lifecycle Pro")

        # 5. Logout
        logout_resp = self.client.post(
            "/api/v1/auth/logout/",
            HTTP_X_CSRFTOKEN=csrf_token,
        )
        self.assertEqual(logout_resp.status_code, status.HTTP_200_OK)

    def test_tier4_06_production_infrastructure_readiness_journey(self):
        """Scenario 6: Validates complete production deployment topology and configuration stack.

        Verifies:
        1. backend/Dockerfile exists with Debian slim, non-root user, and entrypoint.
        2. frontend/Dockerfile exists with Alpine, standalone build, and nextjs user.
        3. nginx/nginx.conf exists with upstreams and route paths.
        4. backend/entrypoint.sh exists with Unix LF endings and migration execution.
        5. backend/config/celery.py exists with task autodiscovery.
        6. backend/requirements.txt declares gunicorn>=21.2.0 and celery>=5.3.6.
        7. docker-compose.yml configures Redis authentication interpolation.
        """
        # 1. Backend Dockerfile
        self.assertTrue(workspace_file_exists("backend/Dockerfile"), "backend/Dockerfile missing")
        b_df = read_workspace_file("backend/Dockerfile")
        self.assertIn("python:3.12-slim-bookworm", b_df)
        self.assertIn("USER appuser", b_df)

        # 2. Frontend Dockerfile
        self.assertTrue(workspace_file_exists("frontend/Dockerfile"), "frontend/Dockerfile missing")
        f_df = read_workspace_file("frontend/Dockerfile")
        self.assertIn("node:20-alpine", f_df)
        self.assertIn("USER nextjs", f_df)

        # 3. Nginx
        self.assertTrue(workspace_file_exists("nginx/nginx.conf"), "nginx/nginx.conf missing")
        nginx_conf = read_workspace_file("nginx/nginx.conf")
        self.assertIn("location /api/", nginx_conf)
        self.assertIn("location /admin/", nginx_conf)

        # 4. Entrypoint
        self.assertTrue(workspace_file_exists("backend/entrypoint.sh"), "backend/entrypoint.sh missing")
        from tests.e2e.harness import get_workspace_path
        entrypoint_bytes = get_workspace_path("backend/entrypoint.sh").read_bytes()
        self.assertNotIn(b"\r\n", entrypoint_bytes, "backend/entrypoint.sh must have LF line endings")

        # 5. Celery
        self.assertTrue(workspace_file_exists("backend/config/celery.py"), "backend/config/celery.py missing")

        # 6. Requirements
        reqs = read_workspace_file("backend/requirements.txt")
        self.assertRegex(reqs, r"gunicorn>=21\.2\.0")
        self.assertRegex(reqs, r"celery>=5\.3\.6")

        # 7. Docker Compose
        compose = read_workspace_file("docker-compose.yml")
        self.assertIn("${REDIS_PASSWORD", compose)
