from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from .models import CustomUser

# Create custom permission for user creation view
content_type = ContentType.objects.get_for_model(CustomUser)  # CustomUser model
permission = Permission.objects.create(
    codename='can_create_user',
    name='Can create user',
    content_type=content_type,
)
