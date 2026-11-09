from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils.timesince import timesince
from posts.models import Category, Post, Comment

User = get_user_model()


class CategorySerializer(serializers.ModelSerializer):
    count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "color_class", "description", "count"]


class AuthorSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["name", "role", "handle", "avatar", "bio"]

    def get_name(self, obj) -> str:
        if obj.first_name and obj.last_name:
            return f"{obj.first_name} {obj.last_name}".strip().upper()
        return (obj.handle or obj.username).upper()


class CommentSerializer(serializers.ModelSerializer):
    author = serializers.CharField(source="author_name")
    time_ago = serializers.SerializerMethodField()
    editorial_reply = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = [
            "id",
            "author",
            "badge",
            "time_ago",
            "content",
            "upvotes",
            "editorial_reply",
            "created_at",
        ]

    def get_time_ago(self, obj) -> str:
        return f"{timesince(obj.created_at).split(',')[0].upper()} AGO"

    def get_editorial_reply(self, obj):
        if obj.editorial_reply_content:
            return {
                "author": obj.editorial_reply_author or "PIXEL PUNCH EDITORIAL",
                "content": obj.editorial_reply_content,
            }
        return None


class CommentCreateSerializer(serializers.ModelSerializer):
    handle = serializers.CharField(source="author_name")

    class Meta:
        model = Comment
        fields = ["handle", "email", "content"]

    def create(self, validated_data):
        request = self.context.get("request")
        post = self.context.get("post")
        user = request.user if request and request.user.is_authenticated else None

        badge = "CYBER READER"
        if user and user.role in ["ADMIN", "EDITOR"]:
            badge = "EDITORIAL STAFF"

        return Comment.objects.create(
            post=post,
            user=user,
            author_name=validated_data["author_name"],
            email=validated_data.get("email", ""),
            content=validated_data["content"],
            badge=badge,
        )


class PostListSerializer(serializers.ModelSerializer):
    category = serializers.SerializerMethodField()
    author = AuthorSerializer(read_only=True)
    comments_count = serializers.IntegerField(source="comments.count", read_only=True)
    likes = serializers.IntegerField(source="likes_count", read_only=True)
    bookmarks = serializers.IntegerField(source="bookmarks_count", read_only=True)

    class Meta:
        model = Post
        fields = [
            "id",
            "slug",
            "title",
            "subtitle",
            "category",
            "read_time",
            "publish_date",
            "author",
            "cover_image",
            "excerpt",
            "tags",
            "likes",
            "bookmarks",
            "comments_count",
            "featured",
            "issue_number",
        ]

    def get_category(self, obj):
        return {
            "name": obj.category.name,
            "slug": obj.category.slug,
            "color_class": obj.category.color_class,
        }


class SimilarPostSerializer(serializers.ModelSerializer):
    class Meta:
        model = Post
        fields = ["id", "slug", "title", "cover_image"]


class PostDetailSerializer(PostListSerializer):
    comments = serializers.SerializerMethodField()
    similar_posts = serializers.SerializerMethodField()

    class Meta(PostListSerializer.Meta):
        fields = PostListSerializer.Meta.fields + [
            "caption",
            "content_markdown",
            "key_takeaways",
            "benchmark_data",
            "test_bench_rig",
            "comments",
            "similar_posts",
        ]

    def get_comments(self, obj):
        approved = obj.comments.filter(is_approved=True)
        return CommentSerializer(approved, many=True).data

    def get_similar_posts(self, obj):
        similar = (
            Post.objects.filter(status=Post.Status.PUBLISHED, category=obj.category)
            .exclude(pk=obj.pk)[:3]
        )
        return SimilarPostSerializer(similar, many=True).data

