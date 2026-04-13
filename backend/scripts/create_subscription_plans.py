"""
Run with: python manage.py shell < scripts/create_subscription_plans.py
Safe to run multiple times — uses update_or_create to prevent duplicates
"""

from apps.payments.models import SubscriptionPlan

starter_features = {
    "inventory_management": "Basic inventory management",
    "order_processing": "Order processing",
    "email_support": "Email support",
    "mobile_app": "Mobile app access",
    "api_access": "API access",
    "reporting": "Limited reporting",
    "integrations": "Basic integrations only"
}

professional_features = {
    "inventory_management": "Full inventory management",
    "distribution_routing": "Advanced distribution & routing",
    "production_planning": "Production planning",
    "payment_processing": "Multi-payment processing",
    "priority_support": "Priority support",
    "api_access": "API access",
    "analytics": "Real-time analytics",
    "integrations": "Custom integrations",
    "reporting": "Advanced reporting"
}

enterprise_features = {
    "inventory_management": "Advanced inventory management",
    "analytics_reporting": "Advanced analytics & reporting",
    "custom_integrations": "Custom integrations",
    "account_manager": "Dedicated account manager",
    "sla_guarantees": "SLA guarantees",
    "white_label": "White-label options",
    "audit_logging": "Advanced audit logging",
    "multi_tenant": "Multi-tenant management",
    "custom_development": "Custom development",
    "phone_support": "24/7 phone support"
}

plans = [
    # Monthly
    dict(name="Starter", billing_cycle="MONTHLY", price=69.00,
         description="Perfect for small businesses starting their logistics journey",
         features=starter_features, max_users=5, max_warehouses=2, max_products=1000),

    dict(name="Professional", billing_cycle="MONTHLY", price=159.00,
         description="Complete logistics solution for growing businesses",
         features=professional_features, max_users=25, max_warehouses=5, max_products=10000),

    dict(name="Enterprise", billing_cycle="MONTHLY", price=269.00,
         description="Advanced features for large-scale operations",
         features=enterprise_features, max_users=999999, max_warehouses=999999, max_products=999999),

    # Quarterly (10% discount)
    dict(name="Starter", billing_cycle="QUARTERLY", price=round(69.00 * 3 * 0.9, 2),
         description="Perfect for small businesses starting their logistics journey",
         features=starter_features, max_users=5, max_warehouses=2, max_products=1000),

    dict(name="Professional", billing_cycle="QUARTERLY", price=round(159.00 * 3 * 0.9, 2),
         description="Complete logistics solution for growing businesses",
         features=professional_features, max_users=25, max_warehouses=5, max_products=10000),

    dict(name="Enterprise", billing_cycle="QUARTERLY", price=round(269.00 * 3 * 0.9, 2),
         description="Advanced features for large-scale operations",
         features=enterprise_features, max_users=999999, max_warehouses=999999, max_products=999999),

    # Annual (20% discount)
    dict(name="Starter", billing_cycle="ANNUAL", price=round(69.00 * 12 * 0.8, 2),
         description="Perfect for small businesses starting their logistics journey",
         features=starter_features, max_users=5, max_warehouses=2, max_products=1000),

    dict(name="Professional", billing_cycle="ANNUAL", price=round(159.00 * 12 * 0.8, 2),
         description="Complete logistics solution for growing businesses",
         features=professional_features, max_users=25, max_warehouses=5, max_products=10000),

    dict(name="Enterprise", billing_cycle="ANNUAL", price=round(269.00 * 12 * 0.8, 2),
         description="Advanced features for large-scale operations",
         features=enterprise_features, max_users=999999, max_warehouses=999999, max_products=999999),
]

for plan_data in plans:
    obj, created = SubscriptionPlan.objects.update_or_create(
        name=plan_data['name'],
        billing_cycle=plan_data['billing_cycle'],
        defaults={
            'description': plan_data['description'],
            'price': plan_data['price'],
            'features': plan_data['features'],
            'is_active': True,
            'max_users': plan_data['max_users'],
            'max_warehouses': plan_data['max_warehouses'],
            'max_products': plan_data['max_products'],
            'stripe_price_id': '',
        }
    )
    status = '✅ Created' if created else '🔄 Updated'
    print(f"{status}: {obj.name} {obj.billing_cycle} — ${obj.price}")

print(f"\n🎉 Done! Total plans: {SubscriptionPlan.objects.count()}")