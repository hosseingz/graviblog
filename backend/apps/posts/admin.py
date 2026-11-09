from django.contrib import admin
from posts.models import Category, Post, PostLike, PostBookmark, Comment


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "color_class", "created_at"]
    search_fields = ["name", "slug"]
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "slug",
        "category",
        "author",
        "status",
        "featured",
        "likes_count",
        "publish_date",
    ]
    list_filter = ["status", "featured", "category", "publish_date"]
    search_fields = ["title", "slug", "excerpt", "content_markdown"]
    prepopulated_fields = {"slug": ("title",)}
    raw_id_fields = ["author"]


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ["author_name", "post", "badge", "is_approved", "upvotes", "created_at"]
    list_filter = ["is_approved", "badge", "created_at"]
    search_fields = ["author_name", "email", "content", "post__title"]
    actions = ["approve_comments"]

    def approve_comments(self, request, queryset):
        queryset.update(is_approved=True)
    approve_comments.short_description = "Approve selected comments"


@admin.register(PostLike)
class PostLikeAdmin(admin.ModelAdmin):
    list_display = ["post", "user", "session_id", "created_at"]
    raw_id_fields = ["post", "user"]


@admin.register(PostBookmark)
class PostBookmarkAdmin(admin.ModelAdmin):
    list_display = ["post", "user", "created_at"]
    raw_id_fields = ["post", "user"]

