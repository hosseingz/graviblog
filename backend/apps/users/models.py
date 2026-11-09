from django.contrib.auth.models import AbstractUser
from django.db import models


class UserRole(models.TextChoices):
    ADMIN = "ADMIN", "Administrator"
    EDITOR = "EDITOR", "Editor / Writer"
    READER = "READER", "Reader / Community"


class User(AbstractUser):
    """
    Custom user model for Graviblog.
    Supports author roles, custom handles (e.g. VANCE_HW), avatar stamps, and editorial bios.
    """
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.READER,
        help_text="User permission role in the publication pipeline.",
    )
    handle = models.CharField(
        max_length=64,
        blank=True,
        null=True,
        unique=True,
        help_text="Unique author/reader handle (e.g. VANCE_HW, CYBER_NOMAD).",
    )
    avatar = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Avatar initials (e.g. AV) or profile image URL.",
    )
    bio = models.TextField(
        blank=True,
        default="",
        help_text="Short bio shown in article author cards.",
    )

    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"
        ordering = ["-date_joined"]

    def __str__(self) -> str:
        return self.handle or self.username

    def save(self, *args, **kwargs):
        if not self.handle and self.username:
            base_handle = self.username.upper()
        else:
            base_handle = self.handle

        if base_handle:
            base = base_handle[:64]
            candidate = base
            counter = 1
            while User.objects.filter(handle__iexact=candidate).exclude(pk=self.pk).exists():
                suffix = f"_{counter}"
                truncated = base[: 64 - len(suffix)]
                candidate = f"{truncated}{suffix}"
                counter += 1
            self.handle = candidate

        if not self.avatar and self.first_name and self.last_name:
            self.avatar = f"{self.first_name[0]}{self.last_name[0]}".upper()
        elif not self.avatar and self.username:
            self.avatar = self.username[:2].upper()
        super().save(*args, **kwargs)

