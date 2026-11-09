from django.urls import path, include
from rest_framework.routers import DefaultRouter
from editorial.views import HotTakeViewSet, TipFeedbackCreateView

app_name = "editorial"

router = DefaultRouter()
router.register(r"hot-takes", HotTakeViewSet, basename="hot-take")

urlpatterns = [
    path("", include(router.urls)),
    path("tips/", TipFeedbackCreateView.as_view(), name="tip-create"),
]

