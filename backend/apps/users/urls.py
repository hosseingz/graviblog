from django.urls import path
from users.views import LoginAPIView, RefreshTokenView, LogoutAPIView, MeAPIView, RegisterAPIView

app_name = "users"

urlpatterns = [
    path("login/", LoginAPIView.as_view(), name="auth-login"),
    path("token/refresh/", RefreshTokenView.as_view(), name="token-refresh"),
    path("logout/", LogoutAPIView.as_view(), name="auth-logout"),
    path("me/", MeAPIView.as_view(), name="auth-me"),
    path("register/", RegisterAPIView.as_view(), name="auth-register"),
]

