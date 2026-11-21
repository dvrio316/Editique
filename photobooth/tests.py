import datetime
import io
from PIL import Image

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.utils import timezone

from .models import Strip


def create_test_image():
    buf = io.BytesIO()
    img = Image.new('RGB', (100, 100), color='red')
    img.save(buf, format='PNG')
    buf.seek(0)
    return SimpleUploadedFile('test.png', buf.read(), content_type='image/png')


class FinishAndQrCodeTests(TestCase):
    def test_finish_strip_success(self):
        img_file = create_test_image()
        response = self.client.post('/api/strips/finish/', {
            'image': img_file,
            'title': 'My Test Strip',
            'origin': 'https://editique.vercel.app',
        })
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertIn('strip', data)
        self.assertIn('access_token', data)
        self.assertIn('access_url', data)
        self.assertIn('qr_code', data)
        self.assertIn('expires_at', data)
        self.assertTrue(data['access_url'].startswith('https://editique.vercel.app/?strip='))
        self.assertTrue(data['qr_code'].startswith('data:image/png;base64,'))

        # Check DB
        strip = Strip.objects.get(access_token=data['access_token'])
        self.assertEqual(strip.title, 'My Test Strip')
        self.assertFalse(strip.is_expired())

        # Expiration should be ~24 hours from created_at
        diff = strip.expires_at - strip.created_at
        self.assertAlmostEqual(diff.total_seconds(), 24 * 3600, delta=10)

    def test_finish_strip_no_image(self):
        response = self.client.post('/api/strips/finish/', {})
        self.assertEqual(response.status_code, 400)
        self.assertIn('No image uploaded', response.json().get('error', ''))

    def test_shared_strip_valid(self):
        img_file = create_test_image()
        strip = Strip.objects.create(
            title='Shared Strip',
            image=img_file,
            expires_at=timezone.now() + datetime.timedelta(hours=24),
        )
        response = self.client.get(f'/api/strips/shared/{strip.access_token}/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['strip']['id'], strip.id)
        self.assertIn('url', data['strip'])

    def test_shared_strip_not_found(self):
        response = self.client.get('/api/strips/shared/nonexistent_token_123/')
        self.assertEqual(response.status_code, 404)

    def test_shared_strip_expired(self):
        img_file = create_test_image()
        strip = Strip.objects.create(
            title='Expired Strip',
            image=img_file,
            expires_at=timezone.now() - datetime.timedelta(minutes=5),
        )
        self.assertTrue(strip.is_expired())
        response = self.client.get(f'/api/strips/shared/{strip.access_token}/')
        self.assertEqual(response.status_code, 410)
        data = response.json()
        self.assertTrue(data.get('expired'))
        self.assertEqual(
            data.get('error'),
            'This QR code has expired. Please generate a new one to access your photo strip.'
        )

    def test_download_shared_strip_valid_and_expired(self):
        img_file = create_test_image()
        strip = Strip.objects.create(
            title='Download Strip',
            image=img_file,
            expires_at=timezone.now() + datetime.timedelta(hours=24),
        )
        response = self.client.get(f'/api/strips/shared/{strip.access_token}/download/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'image/png')
        self.assertIn('attachment', response['Content-Disposition'])

        # Now test when expired
        strip.expires_at = timezone.now() - datetime.timedelta(minutes=10)
        strip.save()
        response_expired = self.client.get(f'/api/strips/shared/{strip.access_token}/download/')
        self.assertEqual(response_expired.status_code, 410)
        self.assertTrue(response_expired.json().get('expired'))
