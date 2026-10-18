# utils/emails.py
"""
Transactional email. Uses Resend when RESEND_API_KEY is set, otherwise Django's
EMAIL_BACKEND (the console backend in local development).
"""
import logging
import os

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)

# Resend only delivers from a verified domain; its sandbox sender reaches the account owner only.
DEFAULT_RESEND_FROM = 'LogiFlow <onboarding@resend.dev>'


def send_email(to: str, subject: str, html: str, text: str) -> bool:
    """Send one email. Returns False (and logs) on failure instead of raising."""
    api_key = os.environ.get('RESEND_API_KEY')
    try:
        if api_key:
            import resend

            resend.api_key = api_key
            resend.Emails.send({
                'from': os.environ.get('RESEND_FROM_EMAIL', DEFAULT_RESEND_FROM),
                'to': [to],
                'subject': subject,
                'html': html,
                'text': text,
            })
        else:
            send_mail(subject, text, settings.DEFAULT_FROM_EMAIL, [to], html_message=html)
        return True
    except Exception:
        logger.exception('Failed to send email "%s" to %s', subject, to)
        return False
