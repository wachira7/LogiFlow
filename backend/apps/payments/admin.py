from django.contrib import admin
from .models import SubscriptionPlan, UserSubscription, PaymentTransaction, PaymentMethod


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ['name', 'price', 'billing_cycle', 'max_users', 'max_warehouses', 'max_products', 'is_active', 'created_at']
    list_filter = ['billing_cycle', 'is_active', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(UserSubscription)
class UserSubscriptionAdmin(admin.ModelAdmin):
    list_display = ['id', 'company_id', 'user_id', 'status', 'payment_provider', 'start_date', 'end_date', 'is_trial']
    list_filter = ['status', 'payment_provider', 'is_trial', 'start_date', 'end_date']
    search_fields = ['company_id', 'user_id']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    list_display = ['company', 'amount', 'currency', 'status', 'payment_type', 'provider', 'created_at']
    list_filter = ['status', 'payment_type', 'provider', 'currency', 'created_at']
    search_fields = ['company__name', 'user__email', 'provider_transaction_id', 'invoice_number']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    list_display = ['company', 'user', 'type', 'provider', 'is_default', 'get_display_info', 'created_at']
    list_filter = ['type', 'provider', 'is_default', 'created_at']
    search_fields = ['company__name', 'user__email', 'last_four', 'phone_number']
    readonly_fields = ['created_at', 'updated_at']
    
    def get_display_info(self, obj):
        if obj.type == 'CARD':
            return f"{obj.card_brand} ****{obj.last_four}"
        elif obj.type == 'MPESA':
            return obj.phone_number
        elif obj.type == 'CRYPTO':
            return f"{obj.currency} wallet"
        return "-"
    get_display_info.short_description = 'Payment Info'