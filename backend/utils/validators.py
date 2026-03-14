# utils/validators.py
import re
import phonenumbers
from decimal import Decimal, InvalidOperation
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers
import uuid
from datetime import datetime, date


# ==================== PHONE NUMBER VALIDATORS ====================

def validate_kenyan_phone(phone_number):
    """
    Validate Kenyan phone numbers for M-Pesa integration.
    Accepts formats: +254XXXXXXXXX, 254XXXXXXXXX, 07XXXXXXXX, 01XXXXXXXX
    """
    if not phone_number:
        raise ValidationError(_("Phone number is required."))
    
    # Remove spaces and special characters
    cleaned = re.sub(r'[\s\-\(\)]', '', str(phone_number))
    
    # Convert to standard format
    if cleaned.startswith('+254'):
        cleaned = cleaned[1:]
    elif cleaned.startswith('0'):
        cleaned = '254' + cleaned[1:]
    elif not cleaned.startswith('254'):
        raise ValidationError(_("Invalid phone number format. Use +254XXXXXXXXX or 07XXXXXXXX"))
    
    # Validate format
    if not re.match(r'^254[0-9]{9}$', cleaned):
        raise ValidationError(_("Invalid Kenyan phone number format."))
    
    return cleaned


def validate_international_phone(phone_number):
    """
    Validate international phone numbers using phonenumbers library.
    """
    if not phone_number:
        raise ValidationError(_("Phone number is required."))
    
    try:
        parsed = phonenumbers.parse(phone_number, None)
        if not phonenumbers.is_valid_number(parsed):
            raise ValidationError(_("Invalid phone number."))
        return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
    except phonenumbers.NumberParseException:
        raise ValidationError(_("Invalid phone number format."))


# ==================== FINANCIAL VALIDATORS ====================

def validate_positive_amount(value):
    """
    Validate that amount is positive and reasonable for financial transactions.
    """
    try:
        amount = Decimal(str(value))
    except (InvalidOperation, ValueError):
        raise ValidationError(_("Invalid amount format."))
    
    if amount <= 0:
        raise ValidationError(_("Amount must be greater than zero."))
    
    if amount > Decimal('1000000'):  # 1 million limit
        raise ValidationError(_("Amount exceeds maximum limit of 1,000,000."))
    
    # Check decimal places (max 2 for currencies)
    if amount.as_tuple().exponent < -2:
        raise ValidationError(_("Amount cannot have more than 2 decimal places."))
    
    return amount


def validate_currency_code(value):
    """
    Validate ISO 4217 currency codes.
    """
    valid_currencies = {
        'USD', 'EUR', 'GBP', 'KES', 'UGX', 'TZS', 'RWF', 'ETB',
        'BTC', 'ETH', 'USDT', 'USDC', 'LTC', 'XRP', 'ADA', 'DOT'
    }
    
    if value.upper() not in valid_currencies:
        raise ValidationError(_(f"Invalid currency code. Supported: {', '.join(valid_currencies)}"))
    
    return value.upper()


def validate_mpesa_amount(value):
    """
    Validate M-Pesa specific amount limits.
    """
    amount = validate_positive_amount(value)
    
    if amount < Decimal('1'):
        raise ValidationError(_("M-Pesa minimum amount is 1 KES."))
    
    if amount > Decimal('300000'):  # M-Pesa daily limit
        raise ValidationError(_("Amount exceeds M-Pesa daily limit of 300,000 KES."))
    
    return amount


# ==================== BUSINESS LOGIC VALIDATORS ====================

def validate_sku_format(value):
    """
    Validate SKU format: PREFIX-CATEGORY-NUMBER (e.g., LF-ELEC-001234)
    """
    if not value:
        raise ValidationError(_("SKU is required."))
    
    # Allow alphanumeric, hyphens, and underscores
    if not re.match(r'^[A-Z0-9\-_]{3,20}$', value.upper()):
        raise ValidationError(_(
            "SKU must be 3-20 characters, contain only letters, numbers, hyphens, and underscores."
        ))
    
    return value.upper()


def validate_warehouse_code(value):
    """
    Validate warehouse code format: 2-3 letter code (e.g., WH1, NYC, LAX)
    """
    if not value:
        raise ValidationError(_("Warehouse code is required."))
    
    if not re.match(r'^[A-Z0-9]{2,5}$', value.upper()):
        raise ValidationError(_(
            "Warehouse code must be 2-5 characters, letters and numbers only."
        ))
    
    return value.upper()


def validate_order_number(value):
    """
    Validate order number format: ORD-YYYYMMDD-XXXXX
    """
    if not value:
        raise ValidationError(_("Order number is required."))
    
    if not re.match(r'^ORD-\d{8}-\d{5}$', value.upper()):
        raise ValidationError(_(
            "Order number must follow format: ORD-YYYYMMDD-XXXXX"
        ))
    
    return value.upper()


def validate_inventory_quantity(value):
    """
    Validate inventory quantities (non-negative integers or decimals).
    """
    try:
        qty = Decimal(str(value))
    except (InvalidOperation, ValueError):
        raise ValidationError(_("Invalid quantity format."))
    
    if qty < 0:
        raise ValidationError(_("Quantity cannot be negative."))
    
    if qty > Decimal('1000000'):
        raise ValidationError(_("Quantity exceeds maximum limit of 1,000,000."))
    
    return qty


# ==================== CRYPTO VALIDATORS ====================

def validate_bitcoin_address(value):
    """
    Validate Bitcoin address format (basic validation).
    """
    if not value:
        raise ValidationError(_("Bitcoin address is required."))
    
    # Basic Bitcoin address validation (Legacy, SegWit, Bech32)
    if not re.match(r'^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$', value):
        raise ValidationError(_("Invalid Bitcoin address format."))
    
    return value


def validate_ethereum_address(value):
    """
    Validate Ethereum address format.
    """
    if not value:
        raise ValidationError(_("Ethereum address is required."))
    
    if not re.match(r'^0x[a-fA-F0-9]{40}$', value):
        raise ValidationError(_("Invalid Ethereum address format."))
    
    return value.lower()


def validate_crypto_amount(value, currency='BTC'):
    """
    Validate cryptocurrency amounts with appropriate decimal places.
    """
    amount = validate_positive_amount(value)
    
    # Set decimal precision based on currency
    max_decimals = {
        'BTC': 8, 'ETH': 10, 'LTC': 8, 'XRP': 6,
        'USDT': 8, 'USDC': 6, 'ADA': 6, 'DOT': 10
    }
    
    precision = max_decimals.get(currency.upper(), 8)
    
    if amount.as_tuple().exponent < -precision:
        raise ValidationError(_(
            f"{currency} amount cannot have more than {precision} decimal places."
        ))
    
    return amount


# ==================== DATE/TIME VALIDATORS ====================

def validate_future_date(value):
    """
    Validate that date is in the future.
    """
    if isinstance(value, datetime):
        value = value.date()
    
    if value <= date.today():
        raise ValidationError(_("Date must be in the future."))
    
    return value


def validate_business_hours(value):
    """
    Validate time is within business hours (8 AM - 6 PM).
    """
    if not value:
        raise ValidationError(_("Time is required."))
    
    if isinstance(value, str):
        try:
            value = datetime.strptime(value, '%H:%M').time()
        except ValueError:
            raise ValidationError(_("Invalid time format. Use HH:MM."))
    
    if value.hour < 8 or value.hour >= 18:
        raise ValidationError(_("Time must be within business hours (8 AM - 6 PM)."))
    
    return value


# ==================== COMPANY/TENANT VALIDATORS ====================

def validate_company_slug(value):
    """
    Validate company slug for subdomain usage.
    """
    if not value:
        raise ValidationError(_("Company slug is required."))
    
    # Must be URL-safe and reasonable length
    if not re.match(r'^[a-z0-9\-]{3,30}$', value.lower()):
        raise ValidationError(_(
            "Company slug must be 3-30 characters, lowercase letters, numbers, and hyphens only."
        ))
    
    # Reserved slugs
    reserved = {'api', 'www', 'admin', 'app', 'mail', 'ftp', 'localhost', 'staging', 'dev'}
    if value.lower() in reserved:
        raise ValidationError(_("This company slug is reserved."))
    
    return value.lower()


def validate_tax_id(value, country='US'):
    """
    Validate tax ID numbers for different countries.
    """
    if not value:
        return value  # Optional field

    patterns = {
        'US': r'^\d{2}-\d{7}$',  # EIN format
        'KE': r'^[A-Z]\d{9}[A-Z]$',  # KRA PIN
        'GB': r'^\d{10}$',
        'UK': r'^\d{2} \d{3} \d{3} \d{2}$', # UK UTR
        'DE': r'^\d{9}$',
        'FR': r'^\d{11}$',
        'IN': r'^[A-Z]{5}\d{4}[A-Z]$',  # PAN format
        'ES': r'^\d{9}$',
        'IT': r'^\d{11}$',
        'CA': r'^\d{9}$',
    }
    
    pattern = patterns.get(country.upper())
    if pattern and not re.match(pattern, value):
        raise ValidationError(_(f"Invalid tax ID format for {country}."))
    
    return value.upper()


# ==================== SERIALIZER FIELD VALIDATORS ====================

class PhoneNumberField(serializers.CharField):
    """
    Custom serializer field for phone number validation.
    """
    def __init__(self, country_code=None, **kwargs):
        self.country_code = country_code
        super().__init__(**kwargs)
    
    def to_internal_value(self, data):
        value = super().to_internal_value(data)
        if self.country_code == 'KE':
            return validate_kenyan_phone(value)
        return validate_international_phone(value)


class PositiveAmountField(serializers.DecimalField):
    """
    Custom serializer field for positive monetary amounts.
    """
    def __init__(self, **kwargs):
        kwargs.setdefault('max_digits', 10)
        kwargs.setdefault('decimal_places', 2)
        super().__init__(**kwargs)
    
    def to_internal_value(self, data):
        value = super().to_internal_value(data)
        return validate_positive_amount(value)


class CryptoAmountField(serializers.DecimalField):
    """
    Custom serializer field for cryptocurrency amounts.
    """
    def __init__(self, currency='BTC', **kwargs):
        self.currency = currency
        kwargs.setdefault('max_digits', 20)
        kwargs.setdefault('decimal_places', 8)
        super().__init__(**kwargs)
    
    def to_internal_value(self, data):
        value = super().to_internal_value(data)
        return validate_crypto_amount(value, self.currency)


# ==================== REGEX VALIDATORS ====================

# Pre-compiled regex validators for performance
alpha_numeric_validator = RegexValidator(
    regex=r'^[a-zA-Z0-9]*$',
    message=_('Only alphanumeric characters are allowed.')
)

slug_validator = RegexValidator(
    regex=r'^[-a-zA-Z0-9_]+$',
    message=_('Only letters, numbers, hyphens and underscores are allowed.')
)

numeric_string_validator = RegexValidator(
    regex=r'^\d+$',
    message=_('Only numeric characters are allowed.')
)


# ==================== UTILITY FUNCTIONS ====================

def clean_phone_number(phone_number, country_code='KE'):
    """
    Clean and format phone numbers consistently.
    """
    if country_code == 'KE':
        return validate_kenyan_phone(phone_number)
    return validate_international_phone(phone_number)


def validate_file_size(file, max_size_mb=5):
    """
    Validate file size limits.
    """
    if file.size > max_size_mb * 1024 * 1024:
        raise ValidationError(_(f"File size cannot exceed {max_size_mb}MB."))
    return file


def validate_image_dimensions(image, max_width=1920, max_height=1080):
    """
    Validate image dimensions.
    """
    if image.width > max_width or image.height > max_height:
        raise ValidationError(_(
            f"Image dimensions cannot exceed {max_width}x{max_height} pixels."
        ))
    return image