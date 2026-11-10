"""E2E Test Harness & Base Fixtures for Graviblog.

Provides:
- Portable environment initialization (Django, REST Framework, models)
- E2ETestBase base test case with isolated APIClient
- Workspace file inspection and validation utilities
- Security policy verification helpers (Open Redirect, XSS)
"""

import os
import sys
import re
from pathlib import Path
from urllib.parse import urljoin, urlparse

# Dynamically resolve workspace root and configure python search paths
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = WORKSPACE_ROOT / "backend"
APPS_DIR = BACKEND_DIR / "apps"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(APPS_DIR) not in sys.path:
    sys.path.insert(0, str(APPS_DIR))

# Ensure Django is configured
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django

try:
    django.setup()
except RuntimeError:
    # Already configured
    pass

from django.test import TestCase, SimpleTestCase
from django.conf import settings
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from posts.models import Category, Post, Comment
from editorial.models import HotTake

User = get_user_model()


def get_workspace_path(relative_path: str) -> Path:
    """Resolve a relative workspace path safely."""
    return WORKSPACE_ROOT / relative_path


def read_workspace_file(relative_path: str) -> str:
    """Read a workspace file using UTF-8 encoding. Returns empty string if not found."""
    target = get_workspace_path(relative_path)
    if not target.exists():
        return ""
    try:
        return target.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return target.read_text(encoding="utf-8-sig")


def workspace_file_exists(relative_path: str) -> bool:
    """Check if a file exists relative to the workspace root."""
    return get_workspace_path(relative_path).exists()


def is_safe_redirect_url(target: str, base_url: str = "http://localhost:3000") -> bool:
    """Validate open redirect safety per CWE-601 specification in PROJECT.md.

    Rules:
    - Target cannot be empty.
    - Target cannot be protocol-relative (cannot start with '//' or '/\\').
    - Target cannot contain backslashes ('\\').
    - Target resolved against base_url must match base_url.origin.
    """
    if not target:
        return False
    if target.startswith("//") or target.startswith("/\\"):
        return False
    if "\\" in target:
        return False

    resolved = urljoin(base_url, target)
    parsed_resolved = urlparse(resolved)
    parsed_base = urlparse(base_url)

    if parsed_resolved.scheme not in ("http", "https"):
        return False

    return parsed_resolved.netloc == parsed_base.netloc


def sanitize_html_mock(html_input: str) -> str:
    """Reference sanitizer behavior expected by isomorphic-dompurify in frontend."""
    if not html_input:
        return ""
    # Strip script tags and content
    cleaned = re.sub(r"(?is)<script.*?>.*?</script>", "", html_input)
    # Strip dangerous attributes (onerror, onload, onclick, onmouseover) including / delimiter
    cleaned = re.sub(r'(?i)[\s/]+on[a-z]+\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)', "", cleaned)
    # Strip javascript: urls in href/src
    cleaned = re.sub(r'(?i)(href|src)\s*=\s*("javascript:[^"]*"|\'javascript:[^\']*\'|javascript:[^\s>]+)', "", cleaned)
    # Strip iframes
    cleaned = re.sub(r"(?is)<iframe.*?>.*?</iframe>", "", cleaned)
    return cleaned


class E2ETestBase(TestCase):
    """Base test case for E2E tests interacting with Django API and database."""

    def setUp(self):
        super().setUp()
        self.client = APIClient()

    def create_user(
        self,
        username: str = "e2e_reader",
        email: str = "e2e_reader@example.com",
        password: str = "ReaderPass123!",
        role: str = "READER",
        handle: str = None,
    ):
        """Create and return a user in the test database."""
        if handle is None:
            handle = f"@{username}"
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            role=role,
            handle=handle,
        )
        return user

    def create_category(
        self,
        name: str = "Cyber Security",
        slug: str = "cyber-security",
        color_class: str = "neon-cyan",
    ):
        """Create and return a category."""
        category, _ = Category.objects.get_or_create(
            slug=slug,
            defaults={"name": name, "color_class": color_class},
        )
        return category

    def create_post(
        self,
        author=None,
        category=None,
        title: str = "Quantum Cryptography in 2077",
        slug: str = "quantum-cryptography-in-2077",
        excerpt: str = "Exploring the edge of post-quantum computing.",
        content_markdown: str = "## Quantum Breakthrough\n\nFull article body.",
        tags=None,
    ):
        """Create and return a published post."""
        if author is None:
            author = self.create_user(username="author_e2e", email="author@example.com")
        if category is None:
            category = self.create_category()
        if tags is None:
            tags = ["quantum", "crypto", "security"]

        post, _ = Post.objects.get_or_create(
            slug=slug,
            defaults={
                "author": author,
                "category": category,
                "title": title,
                "subtitle": "A deep dive into quantum encryption.",
                "excerpt": excerpt,
                "content_markdown": content_markdown,
                "tags": tags,
                "status": "PUBLISHED",
                "read_time": 5,
            },
        )
        return post

    def create_hot_take(
        self,
        author: str = "Morpheus",
        opinion: str = "Physical keyboards are obsolete in VR",
        body: str = "Neural interfaces will completely displace tactile keys.",
        upvotes: int = 10,
        total_votes: int = 20,
        is_active: bool = True,
    ):
        """Create and return a hot take."""
        return HotTake.objects.create(
            author=author,
            opinion=opinion,
            body=body,
            upvotes=upvotes,
            total_votes=total_votes,
            is_active=is_active,
        )


class E2EWorkspaceBase(SimpleTestCase):
    """Base test case for inspecting workspace files and static configurations."""

    pass
