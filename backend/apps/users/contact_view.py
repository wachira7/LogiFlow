# backend/apps/users/contact_view.py
"""Public contact form: emails the LogiFlow team and sends the visitor a short confirmation."""
import logging
import os
from html import escape

from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from utils.emails import send_email

logger = logging.getLogger(__name__)


class ContactSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    email = serializers.EmailField()
    company = serializers.CharField(max_length=150, required=False, allow_blank=True)
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True)
    inquiryType = serializers.CharField(max_length=30, required=False, allow_blank=True)
    message = serializers.CharField(max_length=5000)


class ContactFormView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    # Public endpoint that sends email: rate limited so it can't be used to spam anyone
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'contact'

    def post(self, request):
        serializer = ContactSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        team_inbox = os.environ.get('CONTACT_EMAIL')
        if not team_inbox:
            logger.error('CONTACT_EMAIL is not set; contact form message from %s was not delivered', d['email'])
            return Response(
                {'error': 'The contact form is temporarily unavailable. Please email us directly.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        topic = d.get('inquiryType') or 'General'
        rows = [('Name', d['name']), ('Email', d['email']), ('Company', d.get('company') or '—'),
                ('Phone', d.get('phone') or '—'), ('Topic', topic)]
        text = '\n'.join(f'{k}: {v}' for k, v in rows) + f"\n\n{d['message']}\n"
        html = (
            '<div style="font-family: Inter, Arial, sans-serif; color: #0f172a;">'
            '<h2 style="margin: 0 0 12px;">New contact form message</h2>'
            + ''.join(f'<p style="margin: 4px 0;"><strong>{k}:</strong> {escape(v)}</p>' for k, v in rows)
            + f'<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;">'
              f'<p style="white-space: pre-wrap;">{escape(d["message"])}</p></div>'
        )
        sent = send_email(
            team_inbox, f'Contact form: {topic} from {d["name"]}', html, text, reply_to=d['email'],
        )
        if not sent:
            return Response(
                {'error': 'We couldn’t send your message. Please try again or email us directly.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        # Confirmation to the visitor. Deliberately short and doesn't echo their message,
        # so the form can't be used to send arbitrary text to other people.
        first_name = escape(d['name'].split()[0])
        send_email(
            d['email'],
            'We received your message',
            f'<div style="font-family: Inter, Arial, sans-serif; color: #0f172a;"><p>Hi {first_name},</p>'
            '<p>Thanks for contacting LogiFlow. We&rsquo;ve received your message and will get back to you '
            'as soon as we can.</p><p>The LogiFlow team</p></div>',
            f"Hi {d['name'].split()[0]},\n\nThanks for contacting LogiFlow. We've received your message "
            "and will get back to you as soon as we can.\n\nThe LogiFlow team\n",
        )
        return Response({'success': 'Message sent successfully!'}, status=status.HTTP_200_OK)
