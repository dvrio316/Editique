import secrets
from django.conf import settings
from django.db import models
from django.utils import timezone


def default_access_token():
    return secrets.token_urlsafe(32)


class Strip(models.Model):
    """A finished photo strip saved by a logged-in user or guest."""

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='strips',
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=120, blank=True)
    image = models.ImageField(upload_to='strips/')
    access_token = models.CharField(
        max_length=64,
        unique=True,
        null=True,
        blank=True,
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Strip {self.id} - {self.created_at}"

    def save(self, *args, **kwargs):
        if not self.access_token:
            self.access_token = default_access_token()
        super().save(*args, **kwargs)

    def is_expired(self):
        if not self.expires_at:
            return False
        return timezone.now() > self.expires_at
