from datetime import timedelta
from unittest.mock import patch

from django.utils import timezone
from rest_framework.test import APITestCase

from apps.tenants.models import CompanyInvitation
from apps.users.models import User
from utils.testing import AuthenticatedAPITestCase, make_company, strong_password

PASSWORD = strong_password()


class SignUpJourneyTests(APITestCase):
    """Register → company setup, as the frontend does it."""

    payload = {
        'email': 'amina@duka.co.ke', 'password': PASSWORD, 'password_confirm': PASSWORD,
        'first_name': 'Amina', 'last_name': 'Otieno', 'company_name': 'Duka Distributors', 'company_industry': 'Retail',
    }

    def test_register_creates_owner_and_company_and_returns_tokens(self):
        r = self.client.post('/api/v1/auth/register/', self.payload, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        user = User.objects.get(email='amina@duka.co.ke')
        self.assertTrue(user.is_company_owner)
        self.assertFalse(user.is_platform_admin)
        self.assertEqual(user.company.name, 'Duka Distributors')
        self.assertIn('access', r.json()['tokens'])

    def test_duplicate_email_gets_a_readable_error(self):
        self.client.post('/api/v1/auth/register/', self.payload, format='json')
        r = self.client.post('/api/v1/auth/register/', {**self.payload, 'company_name': 'Other'}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertNotEqual(r.json()['message'], 'An error occurred')
        self.assertIn('email', r.json()['details'])

    def test_company_setup_updates_profile_and_settings(self):
        r = self.client.post('/api/v1/auth/register/', self.payload, format='json')
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {r.json()['tokens']['access']}")
        r = self.client.patch('/api/v1/tenants/company/', {
            'address': 'Industrial Area, Nairobi, Kenya', 'phone': '+254700000000', 'onboarding_completed': True,
        }, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        company = User.objects.get(email='amina@duka.co.ke').company
        self.assertTrue(company.onboarding_completed)
        self.assertEqual(company.address, 'Industrial Area, Nairobi, Kenya')
        self.assertEqual(self.client.patch('/api/v1/tenants/settings/', {}, format='json').status_code, 200)


@patch('apps.tenants.views.resend.Emails.send')
class InvitationJourneyTests(AuthenticatedAPITestCase):
    """Owner invites a teammate → teammate validates link → accepts → signs in."""

    def invite(self, email='kamau@duka.co.ke', role='manager'):
        r = self.client.post('/api/v1/tenants/invitations/', {'email': email, 'role': role}, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        return CompanyInvitation.objects.get(email=email)

    def accept(self, token, **extra):
        self.client.credentials()
        data = {'token': token, 'password': PASSWORD, 'password_confirm': PASSWORD,
                'first_name': 'Kamau', 'last_name': 'Njoroge', **extra}
        return self.client.post('/api/v1/tenants/invitations/accept/', data, format='json')

    def test_full_invitation_journey(self, _send):
        invitation = self.invite()

        r = self.client.get('/api/v1/tenants/invitations/validate/', {'token': invitation.token})
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()['email'], 'kamau@duka.co.ke')

        r = self.accept(invitation.token)
        self.assertEqual(r.status_code, 200, r.content)
        member = User.objects.get(email='kamau@duka.co.ke')
        self.assertEqual(member.company, self.company)
        self.assertTrue(member.is_warehouse_manager)

        r = self.client.post('/api/v1/auth/login/', {'email': 'kamau@duka.co.ke', 'password': PASSWORD})
        self.assertEqual(r.status_code, 200, r.content)

    def test_invitation_cannot_be_reused_or_used_after_expiry(self, _send):
        invitation = self.invite()
        self.assertEqual(self.accept(invitation.token).status_code, 200)
        self.assertEqual(self.accept(invitation.token, first_name='Again').status_code, 400)

        self.authenticate(self.user)
        expired = self.invite('late@duka.co.ke')
        CompanyInvitation.objects.filter(pk=expired.pk).update(expires_at=timezone.now() - timedelta(days=1))
        self.assertEqual(self.accept(expired.token).status_code, 400)

    def test_weak_password_is_rejected(self, _send):
        invitation = self.invite()
        r = self.accept(invitation.token, password='12345678', password_confirm='12345678')
        self.assertEqual(r.status_code, 400)
        self.assertFalse(User.objects.filter(email='kamau@duka.co.ke').exists())

    def test_members_cannot_invite(self, _send):
        member = User.objects.create_user(email='m@duka.co.ke', username='m@duka.co.ke', password='x' * 12,
                                          first_name='M', last_name='M', company=self.company)
        self.authenticate(member)
        r = self.client.post('/api/v1/tenants/invitations/', {'email': 'x@duka.co.ke', 'role': 'manager'}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_other_company_cannot_see_invitations(self, _send):
        self.invite()
        other_owner = User.objects.create_user(email='o@other.co', username='o@other.co', password='x' * 12,
                                               first_name='O', last_name='O', company=make_company(), is_company_owner=True)
        self.authenticate(other_owner)
        r = self.client.get('/api/v1/tenants/invitations/')
        self.assertEqual(self.results(r), [])


class CompanyProfilePermissionTests(AuthenticatedAPITestCase):
    def test_members_can_read_but_not_edit_company(self):
        member = User.objects.create_user(email='m2@duka.co.ke', username='m2@duka.co.ke', password='x' * 12,
                                          first_name='M', last_name='M', company=self.company)
        self.authenticate(member)
        self.assertEqual(self.client.get('/api/v1/tenants/company/').status_code, 200)
        self.assertEqual(self.client.patch('/api/v1/tenants/company/', {'name': 'Hijacked'}, format='json').status_code, 403)
        self.company.refresh_from_db()
        self.assertNotEqual(self.company.name, 'Hijacked')
