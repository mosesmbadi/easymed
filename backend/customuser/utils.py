from django.contrib.auth.hashers import check_password
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.conf import settings
from django.core.mail import send_mail
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.urls import reverse

from .models import PasswordHistory


def check_recent_passwords(user, new_password):
    """Checks if the new password is the same as any of the last 5 passwords."""
    recent_passwords = PasswordHistory.objects.filter(user=user)[:5]
    for past_password in recent_passwords:
        if check_password(new_password, past_password.password_hash):
            return True 
    return False 


def send_password_reset_email(request, user, subject_prefix="Password Reset Request"):
    """
    Sends an email to the user with a link to reset their password."""
    token = PasswordResetTokenGenerator().make_token(user)
    uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
    # password_reset_confirm_url = reverse(
    #     'customuser:password_reset_confirm',
    #     kwargs={'uidb64': uidb64, 'token': token}
    # )

    reset_link= f"http://127.0.0.1:3000/auth/reset/{uidb64}/{token}"

    message = f"Click the link below to reset your password:\n{reset_link}\n\nThis link will expire in 10 minutes. If you do not reset your password within this time, you will need to request a new password reset."

    send_mail(
        subject=f"{subject_prefix}",  
        message=message,
        from_email=settings.EMAIL_HOST_USER,
        recipient_list=[user.email],
        fail_silently=True,
    )
  