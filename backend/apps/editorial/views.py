from django.db.models import F
from rest_framework import viewsets, generics, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from editorial.models import HotTake, TipFeedback
from editorial.serializers import HotTakeSerializer, TipFeedbackSerializer


class HotTakeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = HotTake.objects.filter(is_active=True).order_by("-created_at")
    serializer_class = HotTakeSerializer
    permission_classes = [AllowAny]
    pagination_class = None

    @action(detail=True, methods=["post"], permission_classes=[AllowAny])
    def vote(self, request, pk=None):
        """
        Records a community vote on a hot take.
        """
        take = self.get_object()
        support = request.data.get("support", True)

        if support:
            HotTake.objects.filter(pk=take.pk).update(
                total_votes=F("total_votes") + 1,
                upvotes=F("upvotes") + 1,
            )
        else:
            HotTake.objects.filter(pk=take.pk).update(
                total_votes=F("total_votes") + 1,
            )

        take.refresh_from_db()
        return Response(HotTakeSerializer(take).data, status=status.HTTP_200_OK)


class TipFeedbackCreateView(generics.CreateAPIView):
    queryset = TipFeedback.objects.all()
    serializer_class = TipFeedbackSerializer
    permission_classes = [AllowAny]

