import json

from django.contrib.auth import authenticate, get_user_model, login, logout
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_http_methods, require_POST
from PIL import Image

from .models import Strip

User = get_user_model()
MAX_UPLOAD = 10 * 1024 * 1024  # 10 MB


def home(request):
    return render(request, 'photobooth/home.html')


def _err(message, status=400):
    return JsonResponse({'error': message}, status=status)


def _user(u):
    return {'id': u.id, 'username': u.username}


def _strip(s):
    return {'id': s.id, 'title': s.title, 'url': s.image.url, 'created_at': s.created_at.isoformat()}


def _body(request):
    try:
        return json.loads(request.body or b'{}')
    except ValueError:
        return {}


# ---------- auth ----------

@ensure_csrf_cookie
@require_GET
def csrf(request):
    """Sets the csrftoken cookie. The frontend calls this once on load."""
    return JsonResponse({'ok': True})


@require_GET
def me(request):
    return JsonResponse({'user': _user(request.user) if request.user.is_authenticated else None})


@require_POST
def register(request):
    data = _body(request)
    username = (data.get('username') or '').strip()
    password = data.get('password') or ''
    if not username or not password:
        return _err('Username and password are required.')
    if User.objects.filter(username__iexact=username).exists():
        return _err('That username is taken.', 409)
    try:
        validate_password(password)
    except ValidationError as e:
        return _err(' '.join(e.messages))
    user = User.objects.create_user(username=username, password=password)
    login(request, user)
    return JsonResponse({'user': _user(user)}, status=201)


@require_POST
def login_view(request):
    data = _body(request)
    user = authenticate(request, username=(data.get('username') or '').strip(), password=data.get('password') or '')
    if user is None:
        return _err('Wrong username or password.', 401)
    login(request, user)
    return JsonResponse({'user': _user(user)})


@require_POST
def logout_view(request):
    logout(request)
    return JsonResponse({'ok': True})


# ---------- strips ----------

@require_http_methods(['GET', 'POST'])
def strips(request):
    if not request.user.is_authenticated:
        return _err('Please log in.', 401)

    if request.method == 'GET':
        return JsonResponse({'strips': [_strip(s) for s in request.user.strips.all()]})

    image = request.FILES.get('image')
    if not image:
        return _err('No image uploaded.')
    if image.size > MAX_UPLOAD:
        return _err('Image is too large (max 10 MB).', 413)
    try:
        Image.open(image).verify()  # make sure it really is an image
    except Exception:
        return _err('The file must be a valid image.')
    image.seek(0)
    strip = Strip.objects.create(owner=request.user, title=(request.POST.get('title') or '')[:120], image=image)
    return JsonResponse({'strip': _strip(strip)}, status=201)


@require_http_methods(['DELETE'])
def strip_detail(request, pk):
    if not request.user.is_authenticated:
        return _err('Please log in.', 401)
    strip = request.user.strips.filter(pk=pk).first()
    if strip is None:
        return _err('Strip not found.', 404)
    strip.image.delete(save=False)
    strip.delete()
    return JsonResponse({'ok': True})
