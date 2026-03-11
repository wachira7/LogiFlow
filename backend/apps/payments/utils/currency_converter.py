# backend/apps/payments/utils/currency_converter.py
"""
Currency conversion utility for multi-currency payment support.
Uses exchangerate-api.com v6 for real-time exchange rates.
"""

import requests
import logging
from decimal import Decimal
from django.core.cache import cache
from django.conf import settings

logger = logging.getLogger(__name__)

class CurrencyConverter:
    """Handle currency conversions with caching."""
    
    # Default exchange rates (fallback if API fails)
    DEFAULT_RATES = {
        'KES': 129.50,
        'EUR': 0.92,
        'GBP': 0.79,
        'JPY': 110.0,
        'CNY': 6.5,
        'INR': 83.0,
        'SAR': 3.75,
        'RUB': 90.0,
        'NGN': 1580.0,
        'UGX': 3750.0,
        'TZS': 2550.0,
        'ZAR': 18.50,
    }
    
    def __init__(self):
        self.api_key = getattr(settings, 'EXCHANGE_RATE_API_KEY', None)
        self.cache_duration = 86400  # 1 day cache
    
    def get_exchange_rates(self, base_currency='USD'):
        """
        Get exchange rates from API with caching.
        Returns dict of currency: rate pairs.
        """
        cache_key = f'exchange_rates_{base_currency}'
        
        # Try to get from cache first
        cached_rates = cache.get(cache_key)
        if cached_rates:
            logger.info(f"Using cached exchange rates for {base_currency}")
            return cached_rates
        
        try:
            url = f"https://v6.exchangerate-api.com/v6/{self.api_key}/latest/{base_currency}"
            response = requests.get(url, timeout=5)
            response.raise_for_status()
            
            data = response.json()

            if data.get('result') != 'success':
                raise ValueError(f"API error: {data.get('error-type', 'unknown')}")

            rates = data.get('conversion_rates', {})
            
            # Cache the rates
            cache.set(cache_key, rates, self.cache_duration)
            
            logger.info(f"✅ Fetched and cached exchange rates for {base_currency}")
            return rates
            
        except Exception as e:
            logger.error(f"Failed to fetch exchange rates: {str(e)}")
            logger.info("Using default fallback exchange rates")
            return {**{'USD': 1.0}, **self.DEFAULT_RATES}
    
    def convert(self, amount, from_currency='USD', to_currency='KES'):
        """
        Convert amount from one currency to another.
        
        Args:
            amount: Amount to convert (Decimal or float)
            from_currency: Source currency code (e.g., 'USD')
            to_currency: Target currency code (e.g., 'KES')
        
        Returns:
            Decimal: Converted amount
        """
        try:
            amount = Decimal(str(amount))
            
            # No conversion needed
            if from_currency == to_currency:
                return amount
            
            # Get exchange rates
            rates = self.get_exchange_rates(from_currency)
            
            # Get the rate for target currency
            rate = rates.get(to_currency)
            
            if not rate:
                logger.warning(f"No rate found for {to_currency}, using default")
                rate = self.DEFAULT_RATES.get(to_currency, 1.0)
            
            converted_amount = amount * Decimal(str(rate))
            
            logger.info(f"Converted {amount} {from_currency} → {converted_amount:.2f} {to_currency}")
            return converted_amount
            
        except Exception as e:
            logger.error(f"Currency conversion error: {str(e)}")
            return Decimal(str(amount))
    
    def usd_to_kes(self, amount):
        """Quick helper: Convert USD to KES."""
        return self.convert(amount, 'USD', 'KES')
    
    def usd_to_eur(self, amount):
        """Quick helper: Convert USD to EUR."""
        return self.convert(amount, 'USD', 'EUR')
    
    def get_crypto_equivalent(self, amount_usd, crypto_currency='btc'):
        """
        Get crypto equivalent of USD amount.
        Actual conversion handled by NOWPayments API.
        """
        return Decimal(str(amount_usd))


# Global converter instance
currency_converter = CurrencyConverter()


# ── Utility functions ─────────────────────────────────────────────────────────

def convert_usd_to_kes(amount_usd):
    """Convert USD to KES using current exchange rate."""
    return currency_converter.usd_to_kes(amount_usd)


def convert_currency(amount, from_currency, to_currency):
    """Convert between any two currencies."""
    return currency_converter.convert(amount, from_currency, to_currency)


def get_exchange_rate(from_currency: str, to_currency: str) -> float:
    """
    Get exchange rate between two currencies.
    Used by the exchange rate API endpoint.
    """
    rates = currency_converter.get_exchange_rates(from_currency)
    return float(rates.get(to_currency, currency_converter.DEFAULT_RATES.get(to_currency, 1.0)))


def get_payment_amount_display(amount_usd, payment_provider):
    """
    Get display amount for a given payment provider.
    
    Args:
        amount_usd: Amount in USD
        payment_provider: 'STRIPE', 'MPESA', or 'CRYPTO'
    
    Returns:
        dict with 'amount', 'currency', 'display',
        'original_amount', 'original_currency' keys
    """
    amount_usd = Decimal(str(amount_usd))
    
    if payment_provider == 'MPESA':
        kes_amount = currency_converter.usd_to_kes(amount_usd)
        return {
            'amount': float(kes_amount),
            'currency': 'KES',
            'display': f'KES {kes_amount:,.0f}',
            'original_amount': float(amount_usd),
            'original_currency': 'USD',
        }
    
    elif payment_provider == 'CRYPTO':
        return {
            'amount': float(amount_usd),
            'currency': 'USD',
            'display': f'${amount_usd:.2f} (in crypto)',
            'original_amount': float(amount_usd),
            'original_currency': 'USD',
        }
    
    else:  # STRIPE or default
        return {
            'amount': float(amount_usd),
            'currency': 'USD',
            'display': f'${amount_usd:.2f}',
            'original_amount': float(amount_usd),
            'original_currency': 'USD',
        }