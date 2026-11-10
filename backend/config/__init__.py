"""
Graviblog Configuration Package.
Ensures Celery app is loaded on Django startup.
"""
try:
    from .celery import app as celery_app

    __all__ = ("celery_app",)
except ImportError:
    # Graceful fallback when Celery is not installed in local development environment
    pass
