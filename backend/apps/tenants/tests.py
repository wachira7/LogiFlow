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


@patch.dict('os.environ', {'EMAIL_PROVIDER': 'smtp'})
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

    def test_full_invitation_journey(self):
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

    def test_invitation_cannot_be_reused_or_used_after_expiry(self):
        invitation = self.invite()
        self.assertEqual(self.accept(invitation.token).status_code, 200)
        self.assertEqual(self.accept(invitation.token, first_name='Again').status_code, 400)

        self.authenticate(self.user)
        expired = self.invite('late@duka.co.ke')
        CompanyInvitation.objects.filter(pk=expired.pk).update(expires_at=timezone.now() - timedelta(days=1))
        self.assertEqual(self.accept(expired.token).status_code, 400)

    def test_weak_password_is_rejected(self):
        invitation = self.invite()
        r = self.accept(invitation.token, password='12345678', password_confirm='12345678')
        self.assertEqual(r.status_code, 400)
        self.assertFalse(User.objects.filter(email='kamau@duka.co.ke').exists())

    def test_members_cannot_invite(self):
        member = User.objects.create_user(email='m@duka.co.ke', username='m@duka.co.ke', password='x' * 12,
                                          first_name='M', last_name='M', company=self.company)
        self.authenticate(member)
        r = self.client.post('/api/v1/tenants/invitations/', {'email': 'x@duka.co.ke', 'role': 'manager'}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_other_company_cannot_see_invitations(self):
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


@patch.dict('os.environ', {'EMAIL_PROVIDER': 'smtp'})
class InvitationDeliveryTests(AuthenticatedAPITestCase):
    """Inviters are told whether the email went out, and always get a link they can share."""

    def invite(self):
        return self.client.post('/api/v1/tenants/invitations/', {'email': 'wanjiku@duka.co.ke', 'role': 'manager'}, format='json')

    def test_email_sent_and_link_returned(self):
        from django.core import mail

        r = self.invite()
        self.assertEqual(r.status_code, 201, r.content)
        self.assertTrue(r.json()['email_sent'])
        link = r.json()['invitation_url']
        self.assertIn('/auth/accept-invitation?token=', link)
        self.assertEqual(mail.outbox[-1].to, ['wanjiku@duka.co.ke'])
        self.assertIn(link, mail.outbox[-1].body)

    def test_failed_email_is_reported_but_invitation_still_usable(self):
        with patch('utils.emails.EmailMultiAlternatives.send', side_effect=OSError('SMTP down')):
            r = self.invite()
        self.assertEqual(r.status_code, 201)
        self.assertFalse(r.json()['email_sent'])
        token = r.json()['invitation_url'].split('token=')[1]
        self.assertEqual(self.client.get('/api/v1/tenants/invitations/validate/', {'token': token}).status_code, 200)

    def test_resend_reports_delivery_and_link(self):
        invitation_id = self.invite().json()['id']
        with patch('utils.emails.EmailMultiAlternatives.send', side_effect=OSError('SMTP down')):
            r = self.client.post(f'/api/v1/tenants/invitations/{invitation_id}/resend/')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertFalse(r.json()['email_sent'])
        self.assertIn('token=', r.json()['invitation_url'])

    def test_list_includes_shareable_link(self):
        self.invite()
        rows = self.results(self.client.get('/api/v1/tenants/invitations/'))
        self.assertIn('/auth/accept-invitation?token=', rows[0]['invitation_url'])

    def test_personal_message_is_included_and_escaped(self):
        from django.core import mail

        self.client.post('/api/v1/tenants/invitations/', {
            'email': 'otieno@duka.co.ke', 'role': 'manager', 'message': 'Karibu! <i>See you Monday</i>',
        }, format='json')
        self.assertIn('Karibu!', mail.outbox[-1].body)
        self.assertIn('&lt;i&gt;See you Monday&lt;/i&gt;', mail.outbox[-1].alternatives[0][0])

    def test_existing_users_and_duplicate_invites_are_rejected(self):
        r = self.client.post('/api/v1/tenants/invitations/', {'email': self.user.email, 'role': 'manager'}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('already has a LogiFlow account', r.json()['message'])
        self.invite()
        r = self.invite()
        self.assertEqual(r.status_code, 400)
        self.assertIn('pending invitation', r.json()['message'])

    def test_email_content_is_escaped(self):
        from django.core import mail

        self.company.name = '<script>alert(1)</script> Ltd'
        self.company.save()
        self.invite()
        html = mail.outbox[-1].alternatives[0][0]
        self.assertNotIn('<script>', html)
        self.assertIn('&lt;script&gt;', html)



class TeamManagementTests(AuthenticatedAPITestCase):
    """Roles, seats, member management, settings validation."""

    def setUp(self):
        super().setUp()
        self.user.is_company_owner = True
        self.user.save()
        self.send = patch('apps.tenants.views.send_invitation_email', return_value=True)
        self.send.start()
        self.addCleanup(self.send.stop)

    def invite(self, email, role):
        return self.client.post('/api/v1/tenants/invitations/', {'email': email, 'role': role}, format='json')

    def accept(self, email):
        token = CompanyInvitation.objects.get(email=email).token
        return self.client.post('/api/v1/tenants/invitations/accept/', {
            'token': token, 'password': PASSWORD, 'password_confirm': PASSWORD, 'first_name': 'Juma', 'last_name': 'K',
        }, format='json')

    def test_invited_role_is_applied_exactly(self):
        self.assertEqual(self.invite('driver@duka.co.ke', 'driver').status_code, 201)
        self.assertEqual(self.invite('x@duka.co.ke', 'wizard').status_code, 400)
        self.assertEqual(self.accept('driver@duka.co.ke').status_code, 200)
        driver = User.objects.get(email='driver@duka.co.ke')
        self.assertEqual((driver.role, driver.is_company_owner, driver.company), ('driver', False, self.company))

    def test_plan_seat_limit(self):
        from decimal import Decimal
        from apps.payments.models import SubscriptionPlan, UserSubscription
        plan = SubscriptionPlan.objects.create(name='Tiny', price=Decimal('5'), billing_cycle='MONTHLY', max_users=2)
        UserSubscription.objects.create(company=self.company, user=self.user, plan=plan, status='ACTIVE',
                                        start_date=timezone.now(), end_date=timezone.now() + timedelta(days=30))
        self.assertEqual(self.invite('one@duka.co.ke', 'member').status_code, 201)
        r = self.invite('two@duka.co.ke', 'member')
        self.assertEqual(r.status_code, 400)
        self.assertIn('2 users', r.json()['message'])
        company = self.client.get('/api/v1/tenants/company/').json()
        self.assertEqual((company['seats_used'], company['seats_limit'], company['subscription_plan']), (2, 2, 'Tiny'))

    def test_owner_manages_members_with_guards(self):
        from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken
        from rest_framework_simplejwt.tokens import RefreshToken
        member = User.objects.create_user(email='m@duka.co.ke', username='m', password=PASSWORD, company=self.company)
        RefreshToken.for_user(member)
        url = f'/api/v1/tenants/members/{member.id}/'
        r = self.client.patch(url, {'role': 'inventory_manager'}, format='json')
        self.assertEqual((r.status_code, r.json()['role']), (200, 'inventory_manager'))
        r = self.client.patch(url, {'is_active': False}, format='json')
        self.assertEqual(r.status_code, 200)
        member.refresh_from_db()
        self.assertFalse(member.is_active)
        self.assertTrue(BlacklistedToken.objects.filter(token__user=member).exists())
        # can't change yourself; can't remove the last owner
        self.assertEqual(self.client.patch(f'/api/v1/tenants/members/{self.user.id}/', {'role': 'member'}, format='json').status_code, 400)
        other_owner = User.objects.create_user(email='o@duka.co.ke', username='o', password=PASSWORD, company=self.company, is_company_owner=True)
        self.client.force_authenticate(other_owner)
        self.assertEqual(self.client.patch(f'/api/v1/tenants/members/{self.user.id}/', {'role': 'member'}, format='json').status_code, 200)
        self.user.refresh_from_db()
        self.client.force_authenticate(self.user)  # now a member: can't manage the team
        self.assertEqual(self.client.patch(f'/api/v1/tenants/members/{other_owner.id}/', {'role': 'member'}, format='json').status_code, 403)
        self.client.force_authenticate(other_owner)  # the last owner can't be demoted
        self.assertEqual(self.client.patch(f'/api/v1/tenants/members/{self.user.id}/', {'role': 'company_owner'}, format='json').status_code, 200)
        self.client.force_authenticate(self.user)
        self.user.refresh_from_db()
        # other companies' people are invisible
        stranger = User.objects.create_user(email='s@x.co', username='s', password=PASSWORD, company=make_company())
        self.client.force_authenticate(other_owner)
        self.assertEqual(self.client.patch(f'/api/v1/tenants/members/{stranger.id}/', {'role': 'member'}, format='json').status_code, 404)
        members = self.client.get('/api/v1/tenants/members/').json()
        members = members.get('results', members) if isinstance(members, dict) else members
        self.assertNotIn('s@x.co', [m['email'] for m in members])

    def test_settings_are_validated_and_currency_reaches_users(self):
        r = self.client.patch('/api/v1/tenants/settings/', {'currency': 'XYZ'}, format='json')
        self.assertEqual(r.status_code, 400)
        r = self.client.patch('/api/v1/tenants/settings/', {'timezone': 'Mars/Base'}, format='json')
        self.assertEqual(r.status_code, 400)
        r = self.client.patch('/api/v1/tenants/settings/', {'currency': 'kes', 'timezone': 'Africa/Nairobi', 'working_days': ['friday', 'monday']}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual((r.json()['currency'], r.json()['working_days']), ('KES', ['monday', 'friday']))
        self.assertEqual(self.client.get('/api/v1/auth/profile/').json()['company_currency'], 'KES')
        self.company.refresh_from_db()
        self.assertEqual(self.company.timezone, 'Africa/Nairobi')

    def test_logo_must_be_a_real_raster_image(self):
        from io import BytesIO
        from django.core.files.uploadedfile import SimpleUploadedFile
        svg = SimpleUploadedFile('logo.svg', b'<svg onload="alert(1)"></svg>', content_type='image/svg+xml')
        self.assertEqual(self.client.post('/api/v1/tenants/company/logo/', {'logo': svg}, format='multipart').status_code, 400)
        fake = SimpleUploadedFile('logo.png', b'not really a png', content_type='image/png')
        self.assertEqual(self.client.post('/api/v1/tenants/company/logo/', {'logo': fake}, format='multipart').status_code, 400)

    def test_account_without_company_gets_a_clear_404(self):
        admin = User.objects.create_user(email='pa@logiflow.app', username='pa', password=PASSWORD, is_platform_admin=True)
        self.client.force_authenticate(admin)
        self.assertEqual(self.client.get('/api/v1/tenants/settings/').status_code, 404)

    def test_changing_password_signs_out_other_sessions(self):
        from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken
        from rest_framework_simplejwt.tokens import RefreshToken
        self.user.set_password(PASSWORD)
        self.user.save()
        old = RefreshToken.for_user(self.user)
        new_password = strong_password()
        r = self.client.post('/api/v1/auth/change-password/', {
            'old_password': PASSWORD, 'new_password': new_password, 'new_password_confirm': new_password,
        }, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertTrue(BlacklistedToken.objects.filter(token__jti=old['jti']).exists())
