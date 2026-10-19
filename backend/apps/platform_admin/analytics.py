# apps/platform_admin/analytics.py
"""Platform-wide figures for admins, computed in the database. Money is reported per currency (never summed across)."""
from collections import defaultdict
from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, Max, OuterRef, Q, Subquery, Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone

MONTHS_PER_CYCLE = {'MONTHLY': 1, 'QUARTERLY': 3, 'ANNUAL': 12}


def _month_starts(n=12):
    now = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    months = []
    y, m = now.year, now.month
    for _ in range(n):
        months.append(now.replace(year=y, month=m))
        m -= 1
        if m == 0:
            y, m = y - 1, 12
    return list(reversed(months))


def get_platform_overview():
    from apps.payments.billing import LIVE
    from apps.payments.models import PaymentTransaction, UserSubscription
    from apps.tenants.models import Company
    from apps.users.models import User

    from .models import PlatformAuditLog

    now = timezone.now()
    month_ago = now - timedelta(days=30)
    months = _month_starts(12)

    completed = PaymentTransaction.objects.filter(status='COMPLETED')
    revenue_total = {r['currency']: float(r['t'] or 0) for r in completed.values('currency').annotate(t=Sum('amount'))}
    revenue_30d = {r['currency']: float(r['t'] or 0) for r in completed.filter(created_at__gte=month_ago).values('currency').annotate(t=Sum('amount'))}

    by_month = defaultdict(dict)
    for r in completed.filter(created_at__gte=months[0]).annotate(m=TruncMonth('created_at')).values('m', 'currency').annotate(t=Sum('amount')):
        by_month[r['m'].strftime('%Y-%m')][r['currency']] = float(r['t'] or 0)
    signups = {r['m'].strftime('%Y-%m'): r['n'] for r in Company.objects.filter(created_at__gte=months[0])
               .annotate(m=TruncMonth('created_at')).values('m').annotate(n=Count('id'))}

    # Monthly recurring revenue: paying (not trial) live subscriptions, plan price spread per month, in USD
    paying = UserSubscription.objects.filter(status__in=('ACTIVE', 'PAST_DUE'), is_trial=False).select_related('plan')
    mrr = sum((s.plan.price / MONTHS_PER_CYCLE.get(s.plan.billing_cycle, 1) for s in paying), Decimal('0'))

    subs = UserSubscription.objects
    return {
        'total_companies': Company.objects.count(),
        'active_companies': Company.objects.filter(is_active=True).count(),
        'suspended_companies': Company.objects.filter(is_active=False).count(),
        'engaged_companies_30d': Company.objects.filter(users__last_login__gte=month_ago).distinct().count(),
        'new_companies_30d': Company.objects.filter(created_at__gte=month_ago).count(),
        'total_users': User.objects.filter(is_platform_admin=False).count(),
        'active_users': User.objects.filter(is_platform_admin=False, is_active=True).count(),
        'users_signed_in_30d': User.objects.filter(is_platform_admin=False, last_login__gte=month_ago).count(),
        'revenue_total': revenue_total,
        'revenue_30d': revenue_30d,
        'mrr_usd': float(round(mrr, 2)),
        'paying_subscriptions': paying.count(),
        'trials': subs.filter(status='TRIALING').count(),
        'churned_30d': subs.filter(status__in=('CANCELLED', 'EXPIRED'), updated_at__gte=month_ago).count(),
        'subscription_breakdown': {k.lower(): subs.filter(status=k).count() for k, _ in UserSubscription.STATUS_CHOICES},
        'plan_breakdown': [
            {'plan': r['plan__name'], 'cycle': r['plan__billing_cycle'], 'count': r['n']}
            for r in subs.filter(status__in=LIVE).values('plan__name', 'plan__billing_cycle').annotate(n=Count('id')).order_by('-n')
        ],
        'monthly': [{'month': m.strftime('%Y-%m'), 'revenue': by_month.get(m.strftime('%Y-%m'), {}),
                     'signups': signups.get(m.strftime('%Y-%m'), 0)} for m in months],
        # Kept for older clients
        'total_revenue': sum(revenue_total.values()),
        'monthly_revenue': [{'month': m.strftime('%Y-%m'), 'revenue': sum(by_month.get(m.strftime('%Y-%m'), {}).values())} for m in months],
        'recent_activity': [
            {'action': a.action, 'admin': a.admin_user.email, 'description': a.description, 'timestamp': a.created_at,
             'company': a.target_company.name if a.target_company else None}
            for a in PlatformAuditLog.objects.select_related('admin_user', 'target_company').order_by('-created_at')[:10]
        ],
    }


def company_rows(search='', status=''):
    """Every company with its plan, people and activity, in a fixed number of queries."""
    from apps.payments.billing import LIVE
    from apps.payments.models import UserSubscription
    from apps.tenants.models import Company
    from apps.users.models import User

    live = UserSubscription.objects.filter(company=OuterRef('pk'), status__in=LIVE).order_by('-created_at')
    owner = User.objects.filter(company=OuterRef('pk'), is_company_owner=True).order_by('date_joined')
    qs = Company.objects.annotate(
        user_count=Count('users', filter=Q(users__is_active=True), distinct=True),
        last_login=Max('users__last_login'),
        plan_name=Subquery(live.values('plan__name')[:1]),
        plan_status=Subquery(live.values('status')[:1]),
        owner_email=Subquery(owner.values('email')[:1]),
    ).order_by('-created_at')
    if search:
        qs = qs.filter(Q(name__icontains=search) | Q(email__icontains=search) | Q(users__email__icontains=search)).distinct()
    if status == 'suspended':
        qs = qs.filter(is_active=False)
    elif status == 'active':
        qs = qs.filter(is_active=True)
    elif status in ('trialing', 'active_plan', 'past_due', 'none'):
        qs = qs.filter(**{'trialing': {'plan_status': 'TRIALING'}, 'active_plan': {'plan_status': 'ACTIVE'},
                          'past_due': {'plan_status': 'PAST_DUE'}, 'none': {'plan_status__isnull': True}}[status])
    return qs


def get_company_overview(search='', status=''):
    rows = [
        {
            'company_id': c.id, 'company_name': c.name, 'email': c.email, 'industry': c.industry,
            'is_active': c.is_active, 'subscription_status': c.plan_status or 'NONE', 'plan_name': c.plan_name,
            'owner_email': c.owner_email, 'user_count': c.user_count,
            'last_activity': c.last_login or c.created_at, 'created_at': c.created_at,
        }
        for c in company_rows(search, status)
    ]
    return {'companies': rows, 'total_count': len(rows)}


def get_company_detail(company):
    """One company in depth: people, subscriptions, payments and how much they use LogiFlow."""
    from apps.distribution.models import CustomerOrder, Shipment
    from apps.inventory.models import Product, Warehouse
    from apps.payments.models import PaymentTransaction, UserSubscription
    from apps.production.models import ProductionOrder
    from apps.warehousing.models import WarehouseTransfer

    from .models import PlatformAuditLog

    subs = UserSubscription.objects.filter(company=company).select_related('plan').order_by('-created_at')
    payments = PaymentTransaction.objects.filter(company=company).order_by('-created_at')
    settings_obj = getattr(company, 'settings', None)
    return {
        'id': str(company.id), 'name': company.name, 'email': company.email, 'phone': company.phone,
        'industry': company.industry, 'company_size': company.company_size, 'address': company.address,
        'website': company.website, 'is_active': company.is_active, 'created_at': company.created_at,
        'currency': getattr(settings_obj, 'currency', 'USD'), 'timezone': getattr(settings_obj, 'timezone', company.timezone),
        'users': [
            {'id': str(u.id), 'name': u.get_full_name() if (u.first_name or u.last_name) else u.email, 'email': u.email,
             'role': u.role, 'is_active': u.is_active, 'last_login': u.last_login, 'date_joined': u.date_joined}
            for u in company.users.order_by('-is_company_owner', 'date_joined')
        ],
        'subscriptions': [
            {'id': str(s.id), 'plan': s.plan.name, 'cycle': s.plan.billing_cycle, 'status': s.status, 'provider': s.payment_provider,
             'start_date': s.start_date, 'end_date': s.end_date, 'is_trial': s.is_trial, 'auto_renew': s.auto_renew}
            for s in subs
        ],
        'payments': [
            {'id': str(p.id), 'amount': float(p.amount), 'currency': p.currency, 'status': p.status, 'provider': p.provider,
             'description': p.description, 'created_at': p.created_at}
            for p in payments[:20]
        ],
        'paid_total': {r['currency']: float(r['t'] or 0) for r in payments.filter(status='COMPLETED').values('currency').annotate(t=Sum('amount'))},
        'usage': {
            'products': Product.objects.filter(company=company).count(),
            'warehouses': Warehouse.objects.filter(company=company).count(),
            'orders': CustomerOrder.objects.filter(company=company).count(),
            'shipments': Shipment.objects.filter(company=company).count(),
            'production_orders': ProductionOrder.objects.filter(company=company).count(),
            'transfers': WarehouseTransfer.objects.filter(company=company).count(),
        },
        'admin_history': [
            {'action': a.action, 'description': a.description, 'admin': a.admin_user.email, 'timestamp': a.created_at}
            for a in PlatformAuditLog.objects.filter(target_company=company).select_related('admin_user').order_by('-created_at')[:20]
        ],
    }
