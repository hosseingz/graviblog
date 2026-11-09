from django.urls import path, include
from rest_framework.routers import DefaultRouter
from posts.views import CategoryViewSet, PostViewSet

app_name = "posts"

router = DefaultRouter()
router.register(r"categories", CategoryViewSet, basename="category")
router.register(r"posts", PostViewSet, basename="post")

urlpatterns = [
    path("", include(router.urls)),
]

