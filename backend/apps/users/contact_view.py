#backend/apps/users/contact_view.py
import resend
import os
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny


class ContactFormView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        name = data.get("name", "")
        email = data.get("email", "")
        company = data.get("company", "")
        phone = data.get("phone", "")
        inquiry_type = data.get("inquiryType", "")
        message = data.get("message", "")

        if not all([name, email, message]):
            return Response(
                {"error": "Name, email and message are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        resend.api_key = os.environ.get("RESEND_API_KEY")
        contact_email = os.environ.get("CONTACT_EMAIL", "hello@logiflow.com")

        try:
            # Email to LogiFlow team
            resend.Emails.send({
                "from": "LogiFlow Contact <onboarding@resend.dev>",
                "to": ["warumanu254@gmail.com"],
                "subject": f"New Contact Form Submission - {inquiry_type or 'General'}",
                "html": f"""
                    <h2>New Contact Form Submission</h2>
                    <p><strong>Name:</strong> {name}</p>
                    <p><strong>Email:</strong> {email}</p>
                    <p><strong>Company:</strong> {company or 'N/A'}</p>
                    <p><strong>Phone:</strong> {phone or 'N/A'}</p>
                    <p><strong>Inquiry Type:</strong> {inquiry_type or 'N/A'}</p>
                    <hr/>
                    <p><strong>Message:</strong></p>
                    <p>{message}</p>
                """,
            })
        except Exception as e:
            return Response(
                {"error": f"Failed to send message: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Auto-reply — don't fail the whole request if this fails
        try:
            resend.Emails.send({
                "from": "LogiFlow <onboarding@resend.dev>",
                "to": ["warumanu254@gmail.com"],  # dev only
                "subject": f"Auto-reply: We received your message - LogiFlow",
                "html": f"""
                    <h2>Hi {name},</h2>
                    <p>Thank you for reaching out! We'll get back to you within 1 business day.</p>
                    <blockquote style="border-left: 3px solid #ccc; padding-left: 16px; color: #555;">
                        {message}
                    </blockquote>
                    <p>Best regards,<br/>The LogiFlow Team</p>
                """,
            })
        except Exception:
            pass  # Auto-reply failure shouldn't affect success response

        return Response(
            {"success": "Message sent successfully!"},
            status=status.HTTP_200_OK,
        )

     