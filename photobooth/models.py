from django.db import models

class Strip(models.Model):
    image = models.ImageField(upload_to='strips/')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Strip {self.id} - {self.created_at}"
