# apps/tenants/emails.py
"""Invitation emails."""
from html import escape

from django.conf import settings

from utils.emails import send_email


def invitation_url(invitation) -> str:
    return f"{settings.FRONTEND_URL.rstrip('/')}/auth/accept-invitation?token={invitation.token}"


def send_invitation_email(invitation, *, reminder: bool = False, message: str = '') -> bool:
    """Email an invitation link. Returns whether the email was handed to the provider."""
    url = invitation_url(invitation)
    inviter = invitation.invited_by.get_full_name() or invitation.invited_by.email
    company = invitation.company.name
    role = invitation.role.replace('_', ' ')
    expires = invitation.expires_at.strftime('%d %B %Y')
    subject = (
        f"Reminder: {inviter} invited you to join {company} on LogiFlow" if reminder
        else f"{inviter} invited you to join {company} on LogiFlow"
    )
    note_text = f'\n{inviter} says: "{message}"\n' if message else ''
    note_html = (
        f'<blockquote style="margin: 16px 0; padding: 8px 14px; border-left: 3px solid #0e7c86; color: #334155;">'
        f'{escape(message)}</blockquote>' if message else ''
    )
    text = (
        f"Hi,\n\n{inviter} has invited you to join {company} on LogiFlow as {role}.\n{note_text}\n"
        f"Accept the invitation here (valid until {expires}):\n{url}\n\n"
        f"If you weren't expecting this, you can ignore this email. No account is created without your action.\n"
    )
    e = {k: escape(v) for k, v in {'inviter': inviter, 'company': company, 'role': role, 'url': url, 'expires': expires}.items()}
    html = f"""
        <div style="font-family: Inter, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #0f172a;">
          <h2 style="margin: 0 0 16px;">{'Reminder: you' if reminder else 'You'}&rsquo;re invited to {e['company']}</h2>
          <p><strong>{e['inviter']}</strong> has invited you to join <strong>{e['company']}</strong> on LogiFlow
             as <strong>{e['role']}</strong>.</p>
          {note_html}
          <p style="margin: 28px 0;">
            <a href="{e['url']}" style="background: #0e7c86; color: #fff; padding: 12px 22px; border-radius: 8px;
               text-decoration: none; font-weight: 600;">Accept invitation</a>
          </p>
          <p style="color: #64748b; font-size: 14px;">This invitation is valid until {e['expires']}.
             Or paste this link into your browser:<br><a href="{e['url']}" style="color: #0e7c86;">{e['url']}</a></p>
          <p style="color: #94a3b8; font-size: 13px;">If you weren&rsquo;t expecting this, you can ignore this email.
             No account is created without your action.</p>
        </div>
    """
    return send_email(invitation.email, subject, html, text)
