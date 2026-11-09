from django.contrib import admin
from editorial.models import HotTake, TipFeedback


@admin.register(HotTake)
class HotTakeAdmin(admin.ModelAdmin):
    list_display = ["opinion", "author", "upvotes", "total_votes", "upvote_percent", "is_active", "created_at"]
    list_filter = ["is_active", "created_at"]
    search_fields = ["opinion", "body", "author"]


@admin.register(TipFeedback)
class TipFeedbackAdmin(admin.ModelAdmin):
    list_display = ["handle", "gpu_info", "created_at"]
    search_fields = ["handle", "message", "gpu_info"]

