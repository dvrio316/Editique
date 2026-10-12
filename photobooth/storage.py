import cloudinary
import cloudinary.uploader
from django.core.files.storage import Storage
from django.utils.deconstruct import deconstructible


@deconstructible
class CloudinaryStorage(Storage):
    """Stores uploaded images on Cloudinary. Reads credentials from CLOUDINARY_URL."""

    def _save(self, name, content):
        content.seek(0)
        result = cloudinary.uploader.upload(content, folder='strips', resource_type='image')
        # keep "public_id.format" in the database, e.g. strips/abc123.png
        return f"{result['public_id']}.{result['format']}"

    def exists(self, name):
        return False  # Cloudinary generates a unique name for every upload

    def url(self, name):
        return f"https://res.cloudinary.com/{cloudinary.config().cloud_name}/image/upload/{name}"

    def delete(self, name):
        public_id = name.rsplit('.', 1)[0]
        cloudinary.uploader.destroy(public_id, resource_type='image')

    def _open(self, name, mode='rb'):
        raise NotImplementedError('Files are served by Cloudinary, not opened by Django.')
