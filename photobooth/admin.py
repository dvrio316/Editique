from django.contrib import admin

from .models import Strip


@admin.register(Strip)
class StripAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'owner', 'created_at')
    list_filter = ('owner',)
