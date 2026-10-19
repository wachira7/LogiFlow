# apps/tenants/roles.py
"""Company roles: what an invitation grants and how a member's role is stored on the User flags."""
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

ROLE_FLAGS = {
    'company_owner': 'is_company_owner',
    'warehouse_manager': 'is_warehouse_manager',
    'production_manager': 'is_production_manager',
    'logistics_coordinator': 'is_logistics_coordinator',
    'inventory_manager': 'is_inventory_manager',
    'driver': 'is_driver',
    'member': None,
}

ROLE_CHOICES = [
    ('company_owner', 'Owner (full access, billing and team)'),
    ('warehouse_manager', 'Warehouse manager'),
    ('production_manager', 'Production manager'),
    ('logistics_coordinator', 'Logistics coordinator'),
    ('inventory_manager', 'Inventory manager'),
    ('driver', 'Driver'),
    ('member', 'Member'),
]

# Older invitations used these names
LEGACY = {'admin': 'company_owner', 'owner': 'company_owner', 'manager': 'warehouse_manager', 'user': 'member'}


def normalize_role(role):
    role = (role or 'member').strip().lower()
    return LEGACY.get(role, role)


def apply_role(user, role):
    """Set exactly one role flag on the user (member = none)."""
    role = normalize_role(role)
    for flag in filter(None, ROLE_FLAGS.values()):
        setattr(user, flag, False)
    flag = ROLE_FLAGS.get(role)
    if flag:
        setattr(user, flag, True)
    return user


def sign_out_everywhere(user, keep_jti=None):
    """Blacklist every refresh token the user holds (optionally except one)."""
    for token in OutstandingToken.objects.filter(user=user):
        if keep_jti and token.jti == keep_jti:
            continue
        BlacklistedToken.objects.get_or_create(token=token)


def seats(company):
    """(used, limit) where used = active members + pending invitations; limit None when no plan caps it."""
    from django.utils import timezone

    from apps.payments.billing import live_subscription

    used = company.users.filter(is_active=True).count() + company.invitations.filter(
        accepted_at__isnull=True, expires_at__gt=timezone.now()).count()
    sub = live_subscription(company)
    limit = sub.plan.max_users if sub and sub.plan.max_users < 999 else None
    return used, limit
