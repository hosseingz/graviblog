from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from posts.models import Category, Post, Comment

User = get_user_model()


class PostAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="author_user",
            password="testpassword123",
            handle="AUTHOR_1",
            role="EDITOR",
        )
        self.category = Category.objects.create(
            name="HARDWARE",
            slug="hardware",
            color_class="bg-[#FF8A3D] text-black",
        )
        self.post = Post.objects.create(
            title="The Death of 60FPS",
            slug="the-death-of-60fps",
            category=self.category,
            author=self.user,
            cover_image="/assets/image.png",
            content_markdown="# Markdown content",
            featured=True,
            tags=["HARDWARE", "120HZ"],
        )

    def test_healthcheck_endpoint(self):
        response = self.client.get("/api/health/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["status"], "healthy")

    def test_list_categories(self):
        response = self.client.get("/api/v1/categories/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["slug"], "hardware")
        self.assertEqual(data[0]["count"], 1)

    def test_list_posts(self):
        response = self.client.get("/api/v1/posts/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn("results", data)
        self.assertEqual(data["count"], 1)
        self.assertEqual(data["results"][0]["slug"], "the-death-of-60fps")

    def test_post_detail(self):
        response = self.client.get(f"/api/v1/posts/{self.post.slug}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["title"], "The Death of 60FPS")
        self.assertEqual(data["content_markdown"], "# Markdown content")

    def test_like_toggle(self):
        # Like
        response = self.client.post(f"/api/v1/posts/{self.post.slug}/like/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.json()["has_liked"])
        self.assertEqual(response.json()["likes"], 1)

        # Unlike
        response = self.client.post(f"/api/v1/posts/{self.post.slug}/like/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.json()["has_liked"])
        self.assertEqual(response.json()["likes"], 0)

    def test_comments_flow(self):
        # Post comment
        payload = {
            "handle": "CYBER_NOMAD",
            "email": "reader@graviblog.dev",
            "content": "Incredible benchmark analysis!",
        }
        res_post = self.client.post(f"/api/v1/posts/{self.post.slug}/comments/", data=payload)
        self.assertEqual(res_post.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res_post.json()["author"], "CYBER_NOMAD")

        # Get comments
        res_get = self.client.get(f"/api/v1/posts/{self.post.slug}/comments/")
        self.assertEqual(res_get.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_get.json()), 1)

