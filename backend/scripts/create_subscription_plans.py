# backend/scripts/create_subscription_plans.py
"""
Run this script to create subscription plans in the database
Usage: python manage.py shell < scripts/create_subscription_plans.py
"""

from apps.payments.models import SubscriptionPlan

# Delete existing plans (optional - remove if you want to keep existing)
# SubscriptionPlan.objects.all().delete()

# Create Starter Plan - Monthly
starter_monthly = SubscriptionPlan.objects.create(
    name="Starter",
    description="Perfect for small businesses starting their logistics journey",
    price=69.00,
    billing_cycle="MONTHLY",
    features={
        "inventory_management": "Basic inventory management",
        "order_processing": "Order processing",
        "email_support": "Email support",
        "mobile_app": "Mobile app access",
        "api_access": "API access",
        "reporting": "Limited reporting",
        "integrations": "Basic integrations only"
    },
    is_active=True,
    max_users=5,
    max_warehouses=2,
    max_products=1000,
    stripe_price_id=""  # Add your Stripe price ID here
)

# Create Professional Plan - Monthly
professional_monthly = SubscriptionPlan.objects.create(
    name="Professional",
    description="Complete logistics solution for growing businesses",
    price=159.00,
    billing_cycle="MONTHLY",
    features={
        "inventory_management": "Full inventory management",
        "distribution_routing": "Advanced distribution & routing",
        "production_planning": "Production planning",
        "payment_processing": "Multi-payment processing",
        "priority_support": "Priority support",
        "api_access": "API access",
        "analytics": "Real-time analytics",
        "integrations": "Custom integrations",
        "reporting": "Advanced reporting"
    },
    is_active=True,
    max_users=25,
    max_warehouses=5,
    max_products=10000,
    stripe_price_id=""  # Add your Stripe price ID here
)

# Create Enterprise Plan - Monthly
enterprise_monthly = SubscriptionPlan.objects.create(
    name="Enterprise",
    description="Advanced features for large-scale operations",
    price=269.00,
    billing_cycle="MONTHLY",
    features={
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
    },
    is_active=True,
    max_users=999999,  # Unlimited
    max_warehouses=999999,  # Unlimited
    max_products=999999,  # Unlimited
    stripe_price_id=""  # Add your Stripe price ID here
)

print("✅ Successfully created 3 monthly subscription plans!")
print(f"   - {starter_monthly.name}: ${starter_monthly.price}/month")
print(f"   - {professional_monthly.name}: ${professional_monthly.price}/month")
print(f"   - {enterprise_monthly.name}: ${enterprise_monthly.price}/month")

# Optional: Create Quarterly Plans
quarterly_discount = 0.10  # 10% discount

starter_quarterly = SubscriptionPlan.objects.create(
    name="Starter",
    description="Perfect for small businesses starting their logistics journey",
    price=round(69.00 * 3 * (1 - quarterly_discount), 2),
    billing_cycle="QUARTERLY",
    features=starter_monthly.features,
    is_active=True,
    max_users=5,
    max_warehouses=2,
    max_products=1000,
)

professional_quarterly = SubscriptionPlan.objects.create(
    name="Professional",
    description="Complete logistics solution for growing businesses",
    price=round(159.00 * 3 * (1 - quarterly_discount), 2),
    billing_cycle="QUARTERLY",
    features=professional_monthly.features,
    is_active=True,
    max_users=25,
    max_warehouses=5,
    max_products=10000,
)

enterprise_quarterly = SubscriptionPlan.objects.create(
    name="Enterprise",
    description="Advanced features for large-scale operations",
    price=round(269.00 * 3 * (1 - quarterly_discount), 2),
    billing_cycle="QUARTERLY",
    features=enterprise_monthly.features,
    is_active=True,
    max_users=999999,
    max_warehouses=999999,
    max_products=999999,
)

print("\n✅ Successfully created 3 quarterly subscription plans!")
print(f"   - {starter_quarterly.name}: ${starter_quarterly.price}/quarter (10% discount)")
print(f"   - {professional_quarterly.name}: ${professional_quarterly.price}/quarter (10% discount)")
print(f"   - {enterprise_quarterly.name}: ${enterprise_quarterly.price}/quarter (10% discount)")

# Optional: Create Annual Plans
annual_discount = 0.20  # 20% discount

starter_annual = SubscriptionPlan.objects.create(
    name="Starter",
    description="Perfect for small businesses starting their logistics journey",
    price=round(69.00 * 12 * (1 - annual_discount), 2),
    billing_cycle="ANNUAL",
    features=starter_monthly.features,
    is_active=True,
    max_users=5,
    max_warehouses=2,
    max_products=1000,
)

professional_annual = SubscriptionPlan.objects.create(
    name="Professional",
    description="Complete logistics solution for growing businesses",
    price=round(159.00 * 12 * (1 - annual_discount), 2),
    billing_cycle="ANNUAL",
    features=professional_monthly.features,
    is_active=True,
    max_users=25,
    max_warehouses=5,
    max_products=10000,
)

enterprise_annual = SubscriptionPlan.objects.create(
    name="Enterprise",
    description="Advanced features for large-scale operations",
    price=round(269.00 * 12 * (1 - annual_discount), 2),
    billing_cycle="ANNUAL",
    features={
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
    },
    is_active=True,
    max_users=999999,
    max_warehouses=999,
    max_products=999999,
)
print("\n✅ Successfully created 3 annual subscription plans!")
print(f"   - {starter_annual.name}: ${starter_annual.price}/year (20% discount)")
print(f"   - {professional_annual.name}: ${professional_annual.price}/year (20% discount)")
print(f"   - {enterprise_annual.name}: ${enterprise_annual.price}/year (20% discount)")

print("\n🎉 ALL DONE! Created 9 subscription plans total (3 billing cycles × 3 tiers)")