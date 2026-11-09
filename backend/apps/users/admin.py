from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from users.models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ["username", "email", "handle", "role", "is_staff", "is_active", "date_joined"]
    list_filter = ["role", "is_staff", "is_superuser", "is_active"]
    search_fields = ["username", "email", "handle", "first_name", "last_name"]
    fieldsets = BaseUserAdmin.fieldsets + (
        ("Editorial Metadata", {"fields": ("role", "handle", "avatar", "bio")}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ("Editorial Metadata", {"fields": ("role", "handle", "avatar", "bio")}),
    )

