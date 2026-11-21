import base64
import datetime
import io
import json
import qrcode

from django.contrib.auth import authenticate, get_user_model, login, logout
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.http import FileResponse, JsonResponse
from django.shortcuts import render
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
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
    return {
        'id': s.id,
        'title': s.title,
        'url': s.image.url,
        'access_token': s.access_token,
        'created_at': s.created_at.isoformat() if s.created_at else None,
        'expires_at': s.expires_at.isoformat() if s.expires_at else None,
    }


def _body(request):
    try:
        return json.loads(request.body or b'{}')
    except ValueError:
        return {}


def _generate_qr_data_url(data_str):
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=2,
    )
    qr.add_data(data_str)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#151515", back_color="#ffffff")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode('utf-8')


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


# ---------- finish & qr code sharing ----------

@csrf_exempt
@require_POST
def finish_strip(request):
    """
    Finalize a customized photo strip, save it, set 24h expiration,
    and generate a unique QR code.
    Accessible to both logged-in users and guests.
    """
    image = request.FILES.get('image')
    if not image:
        return _err('No image uploaded.')
    if image.size > MAX_UPLOAD:
        return _err('Image is too large (max 10 MB).', 413)
    try:
        Image.open(image).verify()
    except Exception:
        return _err('The file must be a valid image.')
    image.seek(0)

    now = timezone.now()
    expires_at = now + datetime.timedelta(hours=24)
    owner = request.user if request.user.is_authenticated else None
    title = (request.POST.get('title') or '')[:120]

    strip = Strip.objects.create(
        owner=owner,
        title=title,
        image=image,
        expires_at=expires_at,
    )

    # Determine base frontend origin for the QR code URL
    origin = request.POST.get('origin') or request.headers.get('Origin')
    if not origin:
        origin = request.build_absolute_uri('/')[:-1]
    origin = origin.rstrip('/')

    access_url = f"{origin}/?strip={strip.access_token}"
    qr_code_data = _generate_qr_data_url(access_url)

    return JsonResponse({
        'strip': _strip(strip),
        'access_token': strip.access_token,
        'access_url': access_url,
        'qr_code': qr_code_data,
        'expires_at': strip.expires_at.isoformat(),
    }, status=201)


@require_GET
def shared_strip(request, token):
    """
    Retrieve shared customized photo strip metadata by token.
    Validates token and backend 24-hour expiration.
    """
    strip = Strip.objects.filter(access_token=token).first()
    if not strip:
        return _err('Invalid QR code. Photo strip not found.', 404)

    if strip.is_expired():
        return JsonResponse({
            'error': 'This QR code has expired. Please generate a new one to access your photo strip.',
            'expired': True,
        }, status=410)

    return JsonResponse({
        'strip': {
            'id': strip.id,
            'title': strip.title,
            'url': strip.image.url,
            'download_url': f"/api/strips/shared/{token}/download/",
            'created_at': strip.created_at.isoformat() if strip.created_at else None,
            'expires_at': strip.expires_at.isoformat() if strip.expires_at else None,
        }
    })


@require_GET
def download_shared_strip(request, token):
    """
    Direct download endpoint for a shared customized photo strip with expiration check.
    """
    strip = Strip.objects.filter(access_token=token).first()
    if not strip:
        return _err('Invalid QR code. Photo strip not found.', 404)

    if strip.is_expired():
        return JsonResponse({
            'error': 'This QR code has expired. Please generate a new one to access your photo strip.',
            'expired': True,
        }, status=410)

    try:
        response = FileResponse(strip.image.open('rb'), content_type='image/png')
        filename = f"editique-strip-{strip.id}.png"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
    except Exception:
        return _err('Could not read image file.', 500)


def shared_strip_page(request, token):
    """
    HTML fallback view when accessed directly via Django.
    """
    strip = Strip.objects.filter(access_token=token).first()
    if not strip:
        return render(request, 'photobooth/shared_strip.html', {
            'error': 'Invalid QR code. Photo strip not found.',
            'expired': False,
        }, status=404)

    if strip.is_expired():
        return render(request, 'photobooth/shared_strip.html', {
            'error': 'This QR code has expired. Please generate a new one to access your photo strip.',
            'expired': True,
        }, status=410)

    return render(request, 'photobooth/shared_strip.html', {
        'strip': strip,
        'download_url': f"/api/strips/shared/{token}/download/",
    })
