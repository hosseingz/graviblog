from django.db.models import Count, Q, F
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAuthenticatedOrReadOnly
from posts.models import Category, Post, PostLike, PostBookmark, Comment
from posts.serializers import (
    CategorySerializer,
    PostListSerializer,
    PostDetailSerializer,
    CommentSerializer,
    CommentCreateSerializer,
)


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.annotate(
        count=Count("posts", filter=Q(posts__status=Post.Status.PUBLISHED))
    ).order_by("name")
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]
    lookup_field = "slug"
    pagination_class = None  # Returns all categories as a clean array for filter tabs


class PostViewSet(viewsets.ReadOnlyModelViewSet):
    lookup_field = "slug"
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = (
            Post.objects.filter(status=Post.Status.PUBLISHED)
            .select_related("category", "author")
            .prefetch_related("comments")
        )

        # 1. Filter by category
        cat_param = self.request.query_params.get("category")
        if cat_param and cat_param.upper() != "ALL":
            queryset = queryset.filter(category__slug__iexact=cat_param)

        # 2. Search query
        search_query = self.request.query_params.get("search")
        if search_query:
            q = search_query.strip()
            queryset = queryset.filter(
                Q(title__icontains=q)
                | Q(excerpt__icontains=q)
                | Q(content_markdown__icontains=q)
                | Q(tags__icontains=q)
            )

        # 3. Filter by featured / cover dispatch
        featured_param = self.request.query_params.get("featured")
        if featured_param is not None:
            is_featured = featured_param.lower() in ["true", "1"]
            queryset = queryset.filter(featured=is_featured)

        # 4. Ordering
        ordering = self.request.query_params.get("ordering", "-publish_date")
        if ordering in ["popular", "-likes", "-likes_count"]:
            queryset = queryset.order_by("-likes_count", "-publish_date")
        else:
            queryset = queryset.order_by("-publish_date")

        return queryset

    def get_serializer_class(self):
        if self.action == "retrieve":
            return PostDetailSerializer
        return PostListSerializer

    @action(detail=True, methods=["post"], permission_classes=[AllowAny])
    def like(self, request, slug=None):
        """
        Toggles like for an article. Supports authenticated users and guest sessions.
        """
        post = self.get_object()
        user = request.user if request.user.is_authenticated else None
        if not user:
            if not request.session.session_key:
                request.session.save()
            session_id = request.session.session_key
        else:
            session_id = ""

        existing_like = None
        if user:
            existing_like = PostLike.objects.filter(post=post, user=user).first()
        elif session_id:
            existing_like = PostLike.objects.filter(post=post, session_id=session_id).first()

        if existing_like:
            existing_like.delete()
            Post.objects.filter(pk=post.pk, likes_count__gt=0).update(likes_count=F("likes_count") - 1)
            post.refresh_from_db(fields=["likes_count"])
            return Response({"likes": post.likes_count, "has_liked": False}, status=status.HTTP_200_OK)
        else:
            PostLike.objects.create(post=post, user=user, session_id=session_id)
            Post.objects.filter(pk=post.pk).update(likes_count=F("likes_count") + 1)
            post.refresh_from_db(fields=["likes_count"])
            return Response({"likes": post.likes_count, "has_liked": True}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def bookmark(self, request, slug=None):
        """
        Toggles bookmark for authenticated users.
        """
        post = self.get_object()
        user = request.user

        existing_bookmark = PostBookmark.objects.filter(post=post, user=user).first()
        if existing_bookmark:
            existing_bookmark.delete()
            Post.objects.filter(pk=post.pk, bookmarks_count__gt=0).update(bookmarks_count=F("bookmarks_count") - 1)
            post.refresh_from_db(fields=["bookmarks_count"])
            return Response({"bookmarks": post.bookmarks_count, "bookmarked": False}, status=status.HTTP_200_OK)
        else:
            PostBookmark.objects.create(post=post, user=user)
            Post.objects.filter(pk=post.pk).update(bookmarks_count=F("bookmarks_count") + 1)
            post.refresh_from_db(fields=["bookmarks_count"])
            return Response({"bookmarks": post.bookmarks_count, "bookmarked": True}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get", "post"], permission_classes=[AllowAny])
    def comments(self, request, slug=None):
        """
        GET /api/v1/posts/{slug}/comments/ -> list approved comments
        POST /api/v1/posts/{slug}/comments/ -> create new comment
        """
        post = self.get_object()

        if request.method == "POST":
            serializer = CommentCreateSerializer(
                data=request.data,
                context={"request": request, "post": post},
            )
            serializer.is_valid(raise_exception=True)
            comment = serializer.save()
            return Response(CommentSerializer(comment).data, status=status.HTTP_201_CREATED)

        # GET method
        approved = post.comments.filter(is_approved=True)
        return Response(CommentSerializer(approved, many=True).data, status=status.HTTP_200_OK)
