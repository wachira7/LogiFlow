# utils/emails.py
"""
Transactional email, sent through one place so the provider is configuration only.

EMAIL_PROVIDER chooses how mail goes out:
  - "resend": Resend API (needs RESEND_API_KEY; RESEND_FROM_EMAIL must be on a verified domain,
    otherwise Resend's sandbox sender only reaches the account owner)
  - "smtp":   Django's EMAIL_BACKEND / EMAIL_HOST settings (e.g. a Gmail account with an app password;
    the console backend in local development)
Default: "resend" when RESEND_API_KEY is set, otherwise "smtp".
"""
import logging
import os

from django.conf import settings
from django.core.mail import EmailMultiAlternatives

logger = logging.getLogger(__name__)

DEFAULT_RESEND_FROM = 'LogiFlow <onboarding@resend.dev>'


def email_provider() -> str:
    provider = os.environ.get('EMAIL_PROVIDER', '').strip().lower()
    if provider in ('resend', 'smtp'):
        return provider
    return 'resend' if os.environ.get('RESEND_API_KEY') else 'smtp'


def send_email(to: str, subject: str, html: str, text: str, reply_to: str | None = None) -> bool:
    """Send one email. Returns False (and logs) on failure instead of raising."""
    provider = email_provider()
    try:
        if provider == 'resend':
            import resend

            resend.api_key = os.environ.get('RESEND_API_KEY')
            payload = {
                'from': os.environ.get('RESEND_FROM_EMAIL', DEFAULT_RESEND_FROM),
                'to': [to],
                'subject': subject,
                'html': html,
                'text': text,
            }
            if reply_to:
                payload['reply_to'] = reply_to
            resend.Emails.send(payload)
        else:
            message = EmailMultiAlternatives(
                subject, text, settings.DEFAULT_FROM_EMAIL, [to], reply_to=[reply_to] if reply_to else None,
            )
            message.attach_alternative(html, 'text/html')
            message.send()
        return True
    except Exception:
        logger.exception('Failed to send email "%s" to %s via %s', subject, to, provider)
        return False
