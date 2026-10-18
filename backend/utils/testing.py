# utils/testing.py
"""
Shared test helpers: minimal object builders and an authenticated API test case.
"""
import itertools
import secrets
from decimal import Decimal

from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.tenants.models import Company
from apps.users.models import User

_seq = itertools.count(1)


def strong_password():
    """A random password that passes Django's validators, generated per test run."""
    return f"Lf{secrets.token_hex(6)}A1!"


def make_company(**kwargs):
    n = next(_seq)
    defaults = {'name': f'Company {n}', 'slug': f'company-{n}', 'email': f'company{n}@example.com'}
    defaults.update(kwargs)
    return Company.objects.create(**defaults)


def make_user(company=None, **kwargs):
    n = next(_seq)
    defaults = {
        'email': f'user{n}@example.com',
        'username': f'user{n}',
        'first_name': 'Test',
        'last_name': f'User{n}',
        'password': 'testpass123',
        'company': company,
    }
    defaults.update(kwargs)
    return User.objects.create_user(**defaults)


def make_warehouse(company, **kwargs):
    from apps.inventory.models import Warehouse
    n = next(_seq)
    defaults = {'company': company, 'name': f'Warehouse {n}', 'address': f'{n} Depot Road, Nairobi'}
    defaults.update(kwargs)
    return Warehouse.objects.create(**defaults)


def make_product(company, **kwargs):
    from apps.inventory.models import Product
    n = next(_seq)
    defaults = {
        'company': company,
        'name': f'Product {n}',
        'sku': f'SKU-{n}',
        'unit_price': Decimal('100.00'),
        'cost_price': Decimal('60.00'),
    }
    defaults.update(kwargs)
    return Product.objects.create(**defaults)


def make_order(company, **kwargs):
    from apps.distribution.models import CustomerOrder
    n = next(_seq)
    defaults = {
        'company': company,
        'order_number': f'ORD-{n}',
        'customer_name': f'Customer {n}',
        'customer_email': f'customer{n}@example.com',
        'shipping_address': f'{n} Moi Avenue, Mombasa',
        'total_amount': Decimal('250.00'),
    }
    defaults.update(kwargs)
    return CustomerOrder.objects.create(**defaults)


def make_shipment(company, warehouse=None, **kwargs):
    from apps.distribution.models import Shipment
    n = next(_seq)
    defaults = {
        'company': company,
        'shipment_number': f'SH-{n}',
        'warehouse': warehouse or make_warehouse(company),
    }
    defaults.update(kwargs)
    return Shipment.objects.create(**defaults)


class AuthenticatedAPITestCase(APITestCase):
    """APITestCase with a company, a company member, and JWT auth already set up."""

    def setUp(self):
        self.company = make_company()
        self.user = make_user(company=self.company, is_company_owner=True)
        self.authenticate(self.user)

    def authenticate(self, user):
        token = RefreshToken.for_user(user).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    @staticmethod
    def results(response):
        """Return list items from a paginated or plain list response."""
        data = response.json()
        return data['results'] if isinstance(data, dict) and 'results' in data else data
