import base64
from django.core.files.base import ContentFile
from django.http import JsonResponse, Http404
from django.shortcuts import render, get_object_or_404

def home(request):
    return render(request, 'photobooth/home.html')

