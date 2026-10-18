# apps/platform_admin/analytics.py
from django.db.models import Sum, Count
from django.utils import timezone
from datetime import datetime, timedelta, timezone as dt_timezone


def get_platform_overview():
    from apps.tenants.models import Company
    from apps.users.models import User
    from apps.payments.models import UserSubscription, PaymentTransaction
    from .models import PlatformAuditLog, SystemHealth

    total_companies = Company.objects.count()
    active_companies = Company.objects.filter(is_active=True).count()
    total_users = User.objects.count()
    active_users = User.objects.filter(is_active=True).count()

    

    total_revenue = PaymentTransaction.objects.filter(
        status='COMPLETED'
    ).aggregate(total=Sum('amount'))['total'] or 0

    # Monthly revenue (last 12 months)
    monthly_revenue = []
    now = timezone.now()

    for i in range(12):
         # Calculate exact month start and end
        month = (now.month - i - 1) % 12 + 1
        year = now.year - ((now.month - i - 1) // 12)
        
        month_start = datetime(year, month, 1, tzinfo=dt_timezone.utc)
        
        # Month end = first day of next month
        if month == 12:
            month_end = datetime(year + 1, 1, 1, tzinfo=dt_timezone.utc)
        else:
            month_end = datetime(year, month + 1, 1, tzinfo=dt_timezone.utc)

        revenue = PaymentTransaction.objects.filter(
            status='COMPLETED',
            created_at__gte=month_start,
            created_at__lt=month_end,
        ).aggregate(total=Sum('amount'))['total'] or 0

        monthly_revenue.append({
            'month': month_start.strftime('%Y-%m'),
            'revenue': float(revenue),
        })

    # Subscription breakdown
    subscription_breakdown = {}
    for status_choice in UserSubscription.STATUS_CHOICES:
        status_key = status_choice[0]
        subscription_breakdown[status_key.lower()] = UserSubscription.objects.filter(
            status=status_key
        ).count()

    # System health status
    if SystemHealth.objects.filter(status='CRITICAL').exists():
        system_health_status = 'CRITICAL'
    elif SystemHealth.objects.filter(status='WARNING').exists():
        system_health_status = 'WARNING'
    else:
        system_health_status = 'HEALTHY'

    # Recent platform activity
    recent_activity = PlatformAuditLog.objects.select_related(
        'admin_user', 'target_company'
    ).order_by('-created_at')[:10]

    return {
        'total_companies': total_companies,
        'active_companies': active_companies,
        'total_users': total_users,
        'active_users': active_users,
        'total_revenue': total_revenue,
        'monthly_revenue': list(reversed(monthly_revenue)),
        'subscription_breakdown': subscription_breakdown,
        'system_health_status': system_health_status,
        'recent_activity': [
            {
                'action': a.action,
                'admin': a.admin_user.email,
                'description': a.description,
                'timestamp': a.created_at,
            }
            for a in recent_activity
        ],
    }


def get_company_overview():
    from apps.tenants.models import Company
    from apps.users.models import User
    from apps.payments.models import UserSubscription, PaymentTransaction

    companies_data = []

    for company in Company.objects.all():
        latest_subscription = UserSubscription.objects.filter(
            company=company
        ).order_by('-created_at').first()

        company_revenue = PaymentTransaction.objects.filter(
            company=company,
            status='COMPLETED',
        ).aggregate(total=Sum('amount'))['total'] or 0

        user_count = User.objects.filter(company=company).count()

        last_active_user = User.objects.filter(
            company=company
        ).order_by('-last_login').first()

        companies_data.append({
            'company_id': company.id,
            'company_name': company.name,
            'is_active': company.is_active,
            'subscription_status': latest_subscription.status if latest_subscription else 'NONE',
            'user_count': user_count,
            'total_revenue': company_revenue,
            'last_activity': (
                last_active_user.last_login
                if last_active_user and last_active_user.last_login
                else company.created_at
            ),
            'created_at': company.created_at,
        })

    return {
        'companies': companies_data,
        'total_count': len(companies_data),
    }