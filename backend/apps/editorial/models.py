from django.db import models


class HotTake(models.Model):
    """
    Spicy editorial critique and controversial hot takes matching the HotTakeDeck component.
    """
    author = models.CharField(max_length=120, default="PIXEL PUNCH STAFF")
    opinion = models.CharField(
        max_length=255,
        help_text="Punchy quote headline, e.g. 'PHOTOREALISM IS A CREATIVE DEAD END.'",
    )
    body = models.TextField()
    upvotes = models.PositiveIntegerField(default=0)
    total_votes = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Hot Take"
        verbose_name_plural = "Hot Takes"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.opinion[:50]}... ({self.author})"

    @property
    def upvote_percent(self) -> int:
        if self.total_votes > 0:
            return round((self.upvotes / self.total_votes) * 100)
        return 0


class TipFeedback(models.Model):
    """
    Hardware leaks and tips submitted from the About manifesto terminal.
    """
    handle = models.CharField(max_length=120)
    message = models.TextField()
    gpu_info = models.CharField(max_length=120, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Tip / Feedback"
        verbose_name_plural = "Tips & Feedback"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Tip from {self.handle} ({self.created_at.strftime('%Y-%m-%d')})"

