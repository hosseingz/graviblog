"""
Root URL Configuration for Django project.
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def healthcheck_view(request):
    """
    Lightweight health check endpoint used by Docker, Kubernetes, and reverse proxies.
    """
    return JsonResponse(
        {
            "status": "healthy",
            "environment": getattr(settings, "ENVIRONMENT", "unknown"),
        },
        status=200,
    )


urlpatterns = [
    # Admin Panel
    path("admin/", admin.site.urls),
    # Infrastructure Health Check
    path("api/health/", healthcheck_view, name="healthcheck"),
    # Domain APIs
    path("api/v1/auth/", include("users.urls")),
    path("api/v1/editorial/", include("editorial.urls")),
    path("api/v1/", include("posts.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

