from django.db import models
from django.conf import settings
from django.utils import timezone
from django.utils.text import slugify


class Category(models.Model):
    """
    Taxonomy category for dispatches (e.g., HARDWARE, GAMING, RETRO, TECH, CRITIQUE).
    Includes tailored neo-brutalist badge color classes.
    """
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    color_class = models.CharField(
        max_length=100,
        default="bg-[#FF8A3D] text-black",
        help_text="Tailwind styling classes for category pill badge.",
    )
    description = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Category"
        verbose_name_plural = "Categories"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Post(models.Model):
    """
    Core Dispatch / Article model matching Graviblog's editorial layout.
    """
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        PUBLISHED = "PUBLISHED", "Published"

    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    subtitle = models.CharField(max_length=255, blank=True, default="")
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="posts",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="posts",
    )
    read_time = models.CharField(max_length=32, default="5 MIN READ")
    publish_date = models.DateTimeField(default=timezone.now)
    cover_image = models.CharField(
        max_length=500,
        help_text="Cover image URL or asset path.",
    )
    caption = models.TextField(blank=True, default="")
    excerpt = models.TextField(blank=True, default="")
    content_markdown = models.TextField(blank=True, default="")
    featured = models.BooleanField(
        default=False,
        help_text="Designates this post as the hero Cover Dispatch on the homepage.",
    )
    issue_number = models.CharField(
        max_length=64,
        blank=True,
        default="ISSUE NO. 084 // FALL EDIT",
    )
    tags = models.JSONField(
        default=list,
        blank=True,
        help_text="List of tag strings, e.g. ['HARDWARE', '120HZ'].",
    )
    likes_count = models.PositiveIntegerField(default=0)
    bookmarks_count = models.PositiveIntegerField(default=0)
    key_takeaways = models.JSONField(
        default=list,
        blank=True,
        help_text="Punchy 3-bullet key takeaways displayed in callout block.",
    )
    benchmark_data = models.JSONField(
        default=dict,
        blank=True,
        help_text="Structured benchmark frame-time matrix table data.",
    )
    test_bench_rig = models.JSONField(
        default=dict,
        blank=True,
        help_text="Hardware testbench specifications (cpu, gpu, display, sensor, os).",
    )
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.PUBLISHED,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Post"
        verbose_name_plural = "Posts"
        ordering = ["-publish_date"]

    def __str__(self) -> str:
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)


class PostLike(models.Model):
    """
    Tracks article upvotes/likes for both authenticated users and guest sessions.
    """
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="likes")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="liked_posts",
    )
    session_id = models.CharField(max_length=128, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Post Like"
        verbose_name_plural = "Post Likes"


class PostBookmark(models.Model):
    """
    Tracks saved articles for authenticated users.
    """
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="bookmarks")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="bookmarked_posts",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Post Bookmark"
        verbose_name_plural = "Post Bookmarks"
        unique_together = ("post", "user")


class Comment(models.Model):
    """
    Comments thread on articles including editorial badge & replies.
    """
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="comments")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="comments",
    )
    author_name = models.CharField(max_length=120)
    badge = models.CharField(max_length=64, default="CYBER READER")
    email = models.EmailField(blank=True, default="")
    content = models.TextField()
    upvotes = models.PositiveIntegerField(default=1)
    editorial_reply_author = models.CharField(max_length=120, blank=True, default="")
    editorial_reply_content = models.TextField(blank=True, default="")
    is_approved = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Comment"
        verbose_name_plural = "Comments"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.author_name} on {self.post.title}"

