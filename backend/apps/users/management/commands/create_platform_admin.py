# apps/users/management/commands/create_platform_admin.py
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
import getpass

User = get_user_model()

class Command(BaseCommand):
    help = 'Creates a platform administrator account'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, help='Admin email address')
        parser.add_argument('--first-name', type=str, help='First name')
        parser.add_argument('--last-name', type=str, help='Last name')
        parser.add_argument('--password', type=str, help='Password')

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('\n🔐 Creating Platform Administrator Account\n'))
        
        email = options.get('email')
        first_name = options.get('first_name')
        last_name = options.get('last_name')
        password = options.get('password')

        # Interactive mode if no arguments
        if not email:
            email = input('Enter admin email: ')
        
        if not first_name:
            first_name = input('Enter first name: ')
        
        if not last_name:
            last_name = input('Enter last name: ')
        
        if not password:
            password = getpass.getpass('Enter password: ')
            password_confirm = getpass.getpass('Confirm password: ')
            
            if password != password_confirm:
                self.stdout.write(self.style.ERROR('❌ Passwords do not match!'))
                return

        # Validation
        if User.objects.filter(email=email).exists():
            self.stdout.write(self.style.ERROR(f'❌ User with email {email} already exists!'))
            return

        if len(password) < 8:
            self.stdout.write(self.style.ERROR('❌ Password must be at least 8 characters long!'))
            return

        # Create platform admin
        admin_user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            is_platform_admin=True,
            is_superuser=True,
            is_staff=True,
            is_active=True,
            company=None,  # Platform admins don't belong to a company
            is_company_owner=False,
        )

        self.stdout.write(
            self.style.SUCCESS(
                f'\n✅ Platform Admin Created Successfully!\n\n'
                f'📧 Email: {email}\n'
                f'👤 Name: {first_name} {last_name}\n'
                f'🔑 Role: Platform Administrator\n'
                f'🏢 Company: None (Platform Level)\n\n'
                f'⚠️  SECURITY REMINDERS:\n'
                f'   • Keep these credentials EXTREMELY secure\n'
                f'   • Enable 2FA as soon as possible\n'
                f'   • Never share with clients/companies\n'
                f'   • Use a password manager\n'
                f'   • Change password regularly\n\n'
                f'🚀 You can now login at: {email}\n'
            )
        )