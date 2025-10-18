# backend/apps/payments/utils/currency_converter.py
"""
Currency conversion utility for multi-currency payment support.
Uses exchangerate-api.com for real-time exchange rates.
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
        'KES': 150.0,  # 1 USD = 150 KES (approximate)
        'EUR': 0.85,   # 1 USD = 0.85 EUR
        'GBP': 0.73,   # 1 USD = 0.73 GBP
        'yen': 110.0,  # 1 USD = 110 yen
        'yuan': 6.5,   # 1 USD = 6.5 yuan
        'rupee': 50.0, # 1 USD = 50 rupees
        'riyal': 3.67, # 1 USD = 3.67 Riyals
        'rub': 60.0,   # 1 USD = 60 rub
    }
    
    def __init__(self):
        self.api_key = getattr(settings, 'EXCHANGE_RATE_API_KEY', None)
        self.base_url = 'https://api.exchangerate-api.com/v4/latest'
        self.cache_duration = 3600  # 1 hour cache
    
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
            # Fetch from API
            url = f"{self.base_url}/{base_currency}"
            response = requests.get(url, timeout=5)
            response.raise_for_status()
            
            data = response.json()
            rates = data.get('rates', {})
            
            # Cache the rates
            cache.set(cache_key, rates, self.cache_duration)
            
            logger.info(f"Fetched and cached exchange rates for {base_currency}")
            return rates
            
        except Exception as e:
            logger.error(f"Failed to fetch exchange rates: {str(e)}")
            logger.info("Using default exchange rates")
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
            
            logger.info(f"Converted {amount} {from_currency} to {converted_amount:.2f} {to_currency}")
            return converted_amount
            
        except Exception as e:
            logger.error(f"Currency conversion error: {str(e)}")
            # Return original amount as fallback
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
        This is handled by NOWPayments API, so this is just a placeholder.
        
        Returns the USD amount - actual conversion happens in NOWPayments.
        """
        return Decimal(str(amount_usd))


# Global converter instance
currency_converter = CurrencyConverter()


# Utility functions for easy access
def convert_usd_to_kes(amount_usd):
    """Convert USD to KES using current exchange rate."""
    return currency_converter.usd_to_kes(amount_usd)


def convert_currency(amount, from_currency, to_currency):
    """Convert between any two currencies."""
    return currency_converter.convert(amount, from_currency, to_currency)


def get_payment_amount_display(amount_usd, payment_provider):
    """
    Get display amount for a given payment provider.
    
    Args:
        amount_usd: Amount in USD
        payment_provider: 'STRIPE', 'MPESA', or 'CRYPTO'
    
    Returns:
        dict with 'amount', 'currency', and 'display' keys
    """
    amount_usd = Decimal(str(amount_usd))
    
    if payment_provider == 'MPESA':
        kes_amount = currency_converter.usd_to_kes(amount_usd)
        return {
            'amount': float(kes_amount),
            'currency': 'KES',
            'display': f'KES {kes_amount:,.0f}'
        }
    
    elif payment_provider == 'CRYPTO':
        return {
            'amount': float(amount_usd),
            'currency': 'USD',
            'display': f'${amount_usd:.2f} (in crypto)'
        }
    
    else:  # STRIPE or default
        return {
            'amount': float(amount_usd),
            'currency': 'USD',
            'display': f'${amount_usd:.2f}'
        }