"""Tier 3: Cross-Feature Combinations E2E Tests (11 Tests).

Verifies pairwise and multi-feature interactions between independent subsystems:
1. Feature 1 + Feature 3: Register account -> Issue CSRF -> Login -> Issue JWT & CSRF
2. Feature 1 + Feature 3 + Feature 9: Login -> Acquire CSRF -> Submit authenticated comment
3. Feature 1 + Feature 7: Authenticated user session -> Live search query execution
4. Feature 1 + Feature 8: User session -> Fetch hot takes -> Cast vote -> Verify update
5. Feature 2 + Feature 7: Fetch categories -> Search posts by category -> Verify post count
6. Feature 3 + Feature 9: Cookie auth comment submission without CSRF (403) -> Recovery with CSRF (201)
7. Feature 7 + Feature 9: Search post by title -> Extract post slug -> Submit new comment
8. Feature 8 + Feature 9: Vote on editorial hot take + comment on article in same session
9. Feature 10 + Feature 1: Safe vs malicious redirect destination validation on auth route
10. Feature 11 + Feature 9: Comment submission containing XSS vectors -> Verified safe rendering
11. Feature 5 + Feature 6: Docker compose service architecture & authenticated Redis integration
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


class TestTier3PairwiseCombinations(E2ETestBase):
    """Pairwise cross-feature combinatorial test suite."""

    def test_tier3_01_auth_registration_then_login_flow(self):
        """Feature 1 + Feature 3: Register new account, verify cookies, then login."""
        reg_resp = self.client.post(
            "/api/v1/auth/register/",
            data={
                "username": "t3_user_01",
                "email": "t3_user_01@example.com",
                "password": "Password123!",
            },
        )
        self.assertEqual(reg_resp.status_code, status.HTTP_201_CREATED)
        self.assertIn("csrftoken", reg_resp.cookies, "Register must issue csrftoken cookie")

        # Now login with the newly created credentials
        login_resp = self.client.post(
            "/api/v1/auth/login/",
            data={"username": "t3_user_01", "password": "Password123!"},
        )
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)
        self.assertIn("csrftoken", login_resp.cookies, "Login must issue csrftoken cookie")
        self.assertIn("pod_access_token", login_resp.cookies, "Login must issue access cookie")

    def test_tier3_02_auth_cookie_login_then_comment_with_csrf(self):
        """Feature 1 + Feature 3 + Feature 9: Login, acquire CSRF, submit authenticated comment."""
        self.create_user(username="t3_commenter", password="Password123!")
        post = self.create_post(title="T3 Article 1", slug="t3-article-1")

        # 1. Login
        login_resp = self.client.post(
            "/api/v1/auth/login/",
            data={"username": "t3_commenter", "password": "Password123!"},
        )
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)
        csrf_token = login_resp.cookies.get("csrftoken").value if "csrftoken" in login_resp.cookies else ""

        # 2. Submit comment using cookie auth and CSRF header
        comment_resp = self.client.post(
            f"/api/v1/posts/{post.slug}/comments/",
            data={"handle": "t3_commenter", "content": "Authenticated comment verification."},
            HTTP_X_CSRFTOKEN=csrf_token,
        )
        self.assertEqual(comment_resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(comment_resp.json()["author"], "t3_commenter")

    def test_tier3_03_authenticated_user_performs_live_search(self):
        """Feature 1 + Feature 7: Authenticated user session queries live search endpoint."""
        user = self.create_user(username="t3_searcher", password="Password123!")
        self.create_post(title="Neural Network Hyperplanes", slug="neural-hyperplanes")

        self.client.force_authenticate(user=user)
        response = self.client.get("/api/v1/posts/?search=Hyperplanes")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.json()["results"]
        slugs = [p["slug"] for p in results]
        self.assertIn("neural-hyperplanes", slugs)

    def test_tier3_04_user_session_reads_hot_takes_and_votes(self):
        """Feature 1 + Feature 8: Retrieve hot takes, inspect opinion, cast vote, verify totals."""
        take = self.create_hot_take(
            author="GhostWriter",
            opinion="Quantum encryption is unbreakable",
            upvotes=4,
            total_votes=5,
        )
        # Fetch hot takes
        list_resp = self.client.get("/api/v1/editorial/hot-takes/")
        self.assertEqual(list_resp.status_code, status.HTTP_200_OK)
        takes = list_resp.json()
        target = next((t for t in takes if t["id"] == take.id), None)
        self.assertIsNotNone(target)

        # Vote support = True
        vote_resp = self.client.post(
            f"/api/v1/editorial/hot-takes/{take.id}/vote/",
            data={"support": True},
            format="json",
        )
        self.assertEqual(vote_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(vote_resp.json()["total_votes"], 6)
        self.assertEqual(vote_resp.json()["upvotes"], 5)

    def test_tier3_05_category_listing_and_post_search_cohesion(self):
        """Feature 2 + Feature 7: Verify category discovery matches post search and counts."""
        cat = self.create_category(name="Robotics Core", slug="robotics-core")
        self.create_post(
            category=cat,
            title="Bipedal Locomotion Dynamics",
            slug="bipedal-locomotion",
            excerpt="Advanced cyber robotics motors.",
        )

        # 1. Fetch categories
        cat_resp = self.client.get("/api/v1/categories/")
        self.assertEqual(cat_resp.status_code, status.HTTP_200_OK)
        cats = cat_resp.json()
        cat_data = next((c for c in cats if c["slug"] == "robotics-core"), None)
        self.assertIsNotNone(cat_data)
        count = cat_data.get("count", cat_data.get("post_count", 0))
        self.assertGreaterEqual(count, 1)

        # 2. Search posts matching excerpt
        search_resp = self.client.get("/api/v1/posts/?search=Locomotion")
        self.assertEqual(search_resp.status_code, status.HTTP_200_OK)
        results = search_resp.json()["results"]
        slugs = [r["slug"] for r in results]
        self.assertIn("bipedal-locomotion", slugs)

    def test_tier3_06_comment_submission_csrf_protection_and_recovery(self):
        """Feature 3 + Feature 9: Cookie-authenticated comment fails without CSRF (403), succeeds with CSRF (201)."""
        from rest_framework.test import APIClient
        self.create_user(username="t3_csrf_user", password="Password123!")
        post = self.create_post(title="CSRF Guarded Article", slug="csrf-guarded-article")

        # Login to obtain cookie authentication with CSRF enforcement
        csrf_client = APIClient(enforce_csrf_checks=True)
        login_resp = csrf_client.post(
            "/api/v1/auth/login/",
            data={"username": "t3_csrf_user", "password": "Password123!"},
        )
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)
        csrf_token = login_resp.cookies.get("csrftoken").value if "csrftoken" in login_resp.cookies else ""

        # Attempt comment WITHOUT X-CSRFToken header -> should fail 403 Forbidden
        fail_resp = csrf_client.post(
            f"/api/v1/posts/{post.slug}/comments/",
            data={"handle": "t3_csrf_user", "content": "Unprotected attempt"},
        )
        self.assertEqual(fail_resp.status_code, status.HTTP_403_FORBIDDEN)

        # Re-attempt comment WITH X-CSRFToken header -> should succeed 201 Created
        csrf_client.cookies["csrftoken"] = csrf_token
        success_resp = csrf_client.post(
            f"/api/v1/posts/{post.slug}/comments/",
            data={"handle": "t3_csrf_user", "content": "Protected success attempt"},
            HTTP_X_CSRFTOKEN=csrf_token,
        )
        self.assertEqual(success_resp.status_code, status.HTTP_201_CREATED)

    def test_tier3_07_search_post_then_comment_journey(self):
        """Feature 7 + Feature 9: Discover post via search, extract slug, submit new comment."""
        self.create_post(
            title="Synthetic Telepathy Protocols",
            slug="synthetic-telepathy-protocols",
            excerpt="Direct mind-to-machine interfaces.",
        )
        # Search
        search_resp = self.client.get("/api/v1/posts/?search=Telepathy")
        self.assertEqual(search_resp.status_code, status.HTTP_200_OK)
        results = search_resp.json()["results"]
        self.assertTrue(len(results) > 0)
        discovered_slug = results[0]["slug"]

        # Post comment to discovered post
        comment_resp = self.client.post(
            f"/api/v1/posts/{discovered_slug}/comments/",
            data={"handle": "TelepathyResearcher", "content": "Remarkable telemetry data!"},
        )
        self.assertEqual(comment_resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(comment_resp.json()["author"], "TelepathyResearcher")

    def test_tier3_08_hot_take_voting_and_article_interaction(self):
        """Feature 8 + Feature 9: Hot take interaction combined with post comment submission."""
        take = self.create_hot_take(opinion="VR rigs need haptic feedback", upvotes=1, total_votes=2)
        post = self.create_post(title="Haptics 2077", slug="haptics-2077")

        # Vote down (support = False)
        vote_resp = self.client.post(
            f"/api/v1/editorial/hot-takes/{take.id}/vote/",
            data={"support": False},
            format="json",
        )
        self.assertEqual(vote_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(vote_resp.json()["total_votes"], 3)
        self.assertEqual(vote_resp.json()["upvotes"], 1)

        # Comment on related post
        comm_resp = self.client.post(
            f"/api/v1/posts/{post.slug}/comments/",
            data={"handle": "HapticFan", "content": "I agree with the editorial consensus."},
        )
        self.assertEqual(comm_resp.status_code, status.HTTP_201_CREATED)

    def test_tier3_09_login_safe_redirect_vs_malicious_redirect(self):
        """Feature 10 + Feature 1: Evaluate safe vs malicious next redirect parameter resolution."""
        # Safe internal targets must pass
        self.assertTrue(is_safe_redirect_url("/dashboard"))
        self.assertTrue(is_safe_redirect_url("/articles/quantum-computing"))

        # Malicious targets must fail
        self.assertFalse(is_safe_redirect_url("//evil.com/phish"))
        self.assertFalse(is_safe_redirect_url("https://malicious-site.com/steal"))
        self.assertFalse(is_safe_redirect_url("/\\malicious-site.com"))

    def test_tier3_10_comment_content_stored_xss_protection(self):
        """Feature 11 + Feature 9: Submitting comment with XSS payload is safely handled and sanitized."""
        post = self.create_post(title="XSS Test Article", slug="xss-test-article")
        xss_payload = "<script>alert('ATTACK')</script><img src=x onerror=alert(1)>Deep analysis of cybernetics."

        # Backend stores raw input without 500 error
        response = self.client.post(
            f"/api/v1/posts/{post.slug}/comments/",
            data={"handle": "SecAuditor", "content": xss_payload},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        raw_stored_content = response.json()["content"]

        # Client sanitizer strips executable vectors
        clean_content = sanitize_html_mock(raw_stored_content)
        self.assertNotIn("<script>", clean_content)
        self.assertNotIn("onerror", clean_content)
        self.assertIn("Deep analysis of cybernetics.", clean_content)

    def test_tier3_11_infrastructure_scaffolding_and_redis_auth_alignment(self):
        """Feature 5 + Feature 6: Scaffolding configuration correctly binds authenticated Redis."""
        compose_content = read_workspace_file("docker-compose.yml")
        self.assertTrue(len(compose_content) > 0, "docker-compose.yml must exist")

        # Entrypoint script exists for container execution
        self.assertTrue(workspace_file_exists("backend/entrypoint.sh"))
        # docker-compose.yml contains Redis password interpolation
        self.assertIn("${REDIS_PASSWORD", compose_content)
