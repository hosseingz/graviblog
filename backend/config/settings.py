from datetime import timedelta
from pathlib import Path
import environ
import sys
import os

# ------------------------------------------------------------------------------
# 1. Path & Dynamic Syspath Injection
# ------------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent

# Inject apps/ directory into sys.path to enable direct imports without 'apps.' prefix
sys.path.insert(0, os.path.join(BASE_DIR, "apps"))

# ------------------------------------------------------------------------------
# 2. Environment Initialization
# ------------------------------------------------------------------------------
env = environ.Env(
    DEBUG=(bool, True),
    SECRET_KEY=(str, ""),
    JWT_SIGNING_KEY=(str, ""),
    ENVIRONMENT=(str, "development"),
    ALLOWED_HOSTS=(list, []),
    CORS_ALLOWED_ORIGINS=(list, []),
    CSRF_TRUSTED_ORIGINS=(list, []),
)

env_file = BASE_DIR / ".env"
if env_file.is_file():
    environ.Env.read_env(str(env_file))

# ------------------------------------------------------------------------------
# 3. Core Security & Environment
# ------------------------------------------------------------------------------
DEBUG = env("DEBUG")
ENVIRONMENT = env("ENVIRONMENT").lower()

SECRET_KEY = env("SECRET_KEY")
if not SECRET_KEY and not DEBUG:
    raise ValueError("FATAL: SECRET_KEY environment variable must be set in non-debug environments.")
elif not SECRET_KEY:
    SECRET_KEY = "django-insecure-graviblog-dev-key-change-in-production-only"

# Dedicated JWT Signing Key (Cryptographic Isolation)
JWT_SIGNING_KEY = env("JWT_SIGNING_KEY")
if not JWT_SIGNING_KEY and not DEBUG:
    raise ValueError("FATAL: JWT_SIGNING_KEY environment variable must be set in non-debug environments.")
elif not JWT_SIGNING_KEY:
    JWT_SIGNING_KEY = "django-insecure-graviblog-dev-jwt-key-never-use-in-production"

INSECURE_DEV_JWT_KEYS = {
    "django-insecure-graviblog-dev-jwt-key-never-use-in-production",
    "django-insecure-dev-jwt-key-never-use-in-production",
}
if not DEBUG and JWT_SIGNING_KEY in INSECURE_DEV_JWT_KEYS:
    raise ValueError("FATAL: Insecure JWT_SIGNING_KEY configured in production.")

if JWT_SIGNING_KEY and SECRET_KEY and JWT_SIGNING_KEY == SECRET_KEY:
    raise ValueError("FATAL: JWT_SIGNING_KEY must not be identical to SECRET_KEY.")

# Dynamic host resolution
raw_allowed_hosts = env("ALLOWED_HOSTS")
fallback_hosts = ["localhost", "127.0.0.1", "backend", "django-app", "testserver"]
ALLOWED_HOSTS = list(dict.fromkeys(raw_allowed_hosts + fallback_hosts))

# Dynamic CORS & CSRF origin handling
raw_cors_origins = env("CORS_ALLOWED_ORIGINS")
raw_csrf_origins = env("CSRF_TRUSTED_ORIGINS")

if ENVIRONMENT in ["development", "local"]:
    local_dev_origins = [
        "http://localhost:3000",
        "http://localhost:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8080",
    ]
    CORS_ALLOWED_ORIGINS = list(dict.fromkeys(raw_cors_origins + local_dev_origins))
    CSRF_TRUSTED_ORIGINS = list(dict.fromkeys(raw_csrf_origins + local_dev_origins))
else:
    CORS_ALLOWED_ORIGINS = raw_cors_origins
    CSRF_TRUSTED_ORIGINS = raw_csrf_origins

CORS_ALLOW_CREDENTIALS = True

# ------------------------------------------------------------------------------
# 4. Reverse Proxy & Cookie Hardening
# ------------------------------------------------------------------------------
USE_X_FORWARDED_HOST = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = False  # Allows frontend JS to read CSRF token if needed
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"

# ------------------------------------------------------------------------------
# 5. Application Definition
# ------------------------------------------------------------------------------
DJANGO_CORE_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "whitenoise.runserver_nostatic",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "corsheaders",
]

LOCAL_APPS = [
    "users.apps.UsersConfig",
    "posts.apps.PostsConfig",
    "editorial.apps.EditorialConfig",
]

INSTALLED_APPS = DJANGO_CORE_APPS + THIRD_PARTY_APPS + LOCAL_APPS

AUTH_USER_MODEL = "users.User"

# ------------------------------------------------------------------------------
# 6. Optimal Middleware Sequencing
# ------------------------------------------------------------------------------
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",  # MUST sit immediately below SecurityMiddleware
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# ------------------------------------------------------------------------------
# 7. Database Configuration
# ------------------------------------------------------------------------------
postgres_user = env.str("POSTGRES_USER", default="django_user")
postgres_password = env.str("POSTGRES_PASSWORD", default="")
postgres_host = env.str("POSTGRES_HOST", default="db")
postgres_port = env.str("POSTGRES_PORT", default="5432")
postgres_db = env.str("POSTGRES_DB", default="django_db")

if postgres_password:
    postgres_fallback = (
        f"postgres://{postgres_user}:{postgres_password}@{postgres_host}:{postgres_port}/{postgres_db}"
    )
else:
    postgres_fallback = f"sqlite:///{BASE_DIR / 'db.sqlite3'}"

DATABASES = {
    "default": env.db("DATABASE_URL", default=postgres_fallback),
}

# ------------------------------------------------------------------------------
# 8. Cache & Redis Configuration
# ------------------------------------------------------------------------------
REDIS_URL = env("REDIS_URL", default="redis://127.0.0.1:6379/1")

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache" if DEBUG else "django.core.cache.backends.redis.RedisCache",
        "LOCATION": "unique-graviblog-cache" if DEBUG else REDIS_URL,
    }
}

# ------------------------------------------------------------------------------
# 9. Password Validation
# ------------------------------------------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ------------------------------------------------------------------------------
# 10. Internationalization
# ------------------------------------------------------------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# ------------------------------------------------------------------------------
# 11. Static & Media Asset Handling
# ------------------------------------------------------------------------------
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "static"

STATICFILES_DIRS = []
assets_dir = BASE_DIR / "assets"
if assets_dir.is_dir():
    STATICFILES_DIRS.append(assets_dir)

STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# ------------------------------------------------------------------------------
# 12. Django REST Framework & JWT Configuration
# ------------------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "users.authentication.CookieJWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 9,
    "DEFAULT_RENDERER_CLASSES": (
        "rest_framework.renderers.JSONRenderer",
    ) if not DEBUG else (
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ),
}

JWT_AUTH = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ACCESS_COOKIE_NAME": "pod_access_token",
    "REFRESH_COOKIE_NAME": "pod_refresh_token",
    "ALGORITHM": "HS256",
}
AUTH_COOKIE_PATH = "/"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

