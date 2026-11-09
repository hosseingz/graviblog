from rest_framework import serializers
from editorial.models import HotTake, TipFeedback


class HotTakeSerializer(serializers.ModelSerializer):
    upvote_percent = serializers.IntegerField(read_only=True)

    class Meta:
        model = HotTake
        fields = [
            "id",
            "author",
            "opinion",
            "body",
            "upvotes",
            "total_votes",
            "upvote_percent",
            "created_at",
        ]


class TipFeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipFeedback
        fields = ["id", "handle", "message", "gpu_info", "created_at"]
        read_only_fields = ["id", "created_at"]

