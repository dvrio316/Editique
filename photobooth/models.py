from django.conf import settings
from django.db import models


class Strip(models.Model):
    """A finished photo strip saved by a logged-in user."""

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='strips')
    title = models.CharField(max_length=120, blank=True)
    image = models.ImageField(upload_to='strips/')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Strip {self.id} - {self.created_at}"
