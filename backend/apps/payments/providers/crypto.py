# apps/payments/providers/crypto.py - IMPROVED VERSION
import requests
import json
import logging
import hashlib
import hmac
from datetime import datetime
from django.conf import settings
from django.utils import timezone
from ..models import PaymentTransaction

logger = logging.getLogger(__name__)

class CryptoService:  
    """NOWPayments crypto payment processing service - IMPROVED."""
    
    def __init__(self):
        self.api_key = settings.NOWPAYMENTS_API_KEY
        self.ipn_secret = settings.NOWPAYMENTS_IPN_SECRET
        
        if settings.NOWPAYMENTS_ENVIRONMENT == "sandbox":
            self.base_url = settings.NOWPAYMENTS_SANDBOX_URL
        else:
            self.base_url = settings.NOWPAYMENTS_BASE_URL
        
        logger.info(f"✅ CryptoService initialized - Environment: {settings.NOWPAYMENTS_ENVIRONMENT}")
    
    def get_headers(self):
        """Get headers for NOWPayments API."""
        return {
            'x-api-key': self.api_key,
            'Content-Type': 'application/json'
        }
    
    def test_connection(self):
        """Test NOWPayments API connection."""
        try:
            headers = self.get_headers()
            response = requests.get(f"{self.base_url}/status", headers=headers, timeout=10)
            response.raise_for_status()
            
            logger.info("✅ NOWPayments connection test successful")
            return True
        except requests.exceptions.Timeout:
            logger.error("❌ NOWPayments connection timeout")
            return False
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ NOWPayments connection test failed: {str(e)}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Response: {e.response.text}")
            return False
        except Exception as e:
            logger.error(f"❌ Unexpected error in connection test: {str(e)}")
            return False
    
    def get_supported_currencies(self):
        """Get list of supported cryptocurrencies."""
        try:
            headers = self.get_headers()
            response = requests.get(f"{self.base_url}/currencies", headers=headers, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            # NOWPayments returns either 'currencies' array or direct array
            currencies_list = data.get('currencies', data) if isinstance(data, dict) else data
            
            # Extract currency codes
            supported = []
            for currency in currencies_list:
                if isinstance(currency, dict):
                    code = currency.get('code') or currency.get('name') or currency.get('currency')
                else:
                    code = str(currency)
                
                if code:
                    supported.append(code.lower())
            
            logger.info(f"✅ Retrieved {len(supported)} supported currencies")
            return supported
            
        except Exception as e:
            logger.error(f"❌ Failed to get supported currencies: {str(e)}")
            # Fallback to common cryptocurrencies
            return ['btc', 'eth', 'usdt', 'ltc', 'bch', 'xrp', 'ada', 'dot', 'matic']
    
    def normalize_response(self, payment_data):
        """
        ✅ NEW: Normalize NOWPayments response to consistent format.
        Handles different field names returned by the API.
        """
        return {
            'payment_id': payment_data.get('payment_id') or payment_data.get('id'),
            'payment_status': payment_data.get('payment_status') or payment_data.get('status'),
            'pay_address': payment_data.get('pay_address') or payment_data.get('payment_address'),
            'payment_url': payment_data.get('invoice_url') or payment_data.get('payment_url'),
            'pay_amount': payment_data.get('pay_amount'),
            'pay_currency': payment_data.get('pay_currency'),
            'price_amount': payment_data.get('price_amount'),
            'price_currency': payment_data.get('price_currency'),
            'order_id': payment_data.get('order_id'),
            'order_description': payment_data.get('order_description'),
            'created_at': payment_data.get('created_at'),
            'updated_at': payment_data.get('updated_at'),
            'expiration_estimate_date': payment_data.get('expiration_estimate_date'),
            # Keep raw response for debugging
            '_raw': payment_data
        }
    
    def create_payment(self, amount, currency='USD', pay_currency=None, order_id=None, order_description=None, user=None, company=None):
        """
        ✅ IMPROVED: Create a crypto payment with better error handling.
        """
        try:
            logger.info(f"🚀 Creating crypto payment - Amount: {amount} {currency}, Pay Currency: {pay_currency}")
            
            # Validate amount
            if float(amount) <= 0:
                raise ValueError("Payment amount must be greater than 0")
            
            # Prepare payment data
            payment_data = {
                'price_amount': float(amount),
                'price_currency': currency.upper(),
                'order_id': order_id or f"logiflow-{int(datetime.now().timestamp())}",
                'order_description': order_description or 'LogiFlow Payment',
                'ipn_callback_url': settings.NOWPAYMENTS_CALLBACK_URL,
            }
            
            # Add URLs if available
            if hasattr(settings, 'FRONTEND_URL'):
                payment_data['success_url'] = f"{settings.FRONTEND_URL}/billing/crypto-success"
                payment_data['cancel_url'] = f"{settings.FRONTEND_URL}/billing/crypto-cancel"
            
            # Add specific crypto currency if requested
            if pay_currency and pay_currency.lower() != 'auto':
                # Validate currency is supported
                supported = self.get_supported_currencies()
                if pay_currency.lower() not in supported:
                    logger.warning(f"⚠️ Currency {pay_currency} not in supported list, attempting anyway")
                
                payment_data['pay_currency'] = pay_currency.lower()
            
            headers = self.get_headers()
            
            logger.debug(f"📤 Sending request to: {self.base_url}/payment")
            logger.debug(f"📋 Request data: {json.dumps(payment_data, indent=2)}")
            
            response = requests.post(
                f"{self.base_url}/payment",
                json=payment_data,
                headers=headers,
                timeout=30
            )
            
            logger.info(f"📥 NOWPayments response status: {response.status_code}")
            
            # Handle error responses
            if response.status_code not in [200, 201]:
                error_msg = f"NOWPayments API error ({response.status_code})"
                
                try:
                    error_data = response.json()
                    error_message = error_data.get('message') or error_data.get('error') or 'Unknown error'
                    error_msg = f"{error_msg}: {error_message}"
                    
                    logger.error(f"❌ Error response: {json.dumps(error_data, indent=2)}")
                    
                    # Provide user-friendly error messages
                    if 'currency' in error_message.lower():
                        error_msg = f"Unsupported cryptocurrency: {pay_currency}. Please choose a different currency."
                    elif 'api key' in error_message.lower():
                        error_msg = "Payment gateway configuration error. Please contact support."
                    elif 'amount' in error_message.lower():
                        error_msg = f"Invalid payment amount: {amount}. Please check the amount and try again."
                    
                except:
                    logger.error(f"❌ Response text: {response.text}")
                
                raise Exception(error_msg)
            
            response.raise_for_status()
            payment_response = response.json()
            
            # ✅ Normalize response
            normalized = self.normalize_response(payment_response)
            
            logger.info(f"✅ Created NOWPayments payment: {normalized['payment_id']}")
            logger.debug(f"📋 Normalized response: {json.dumps({k:v for k,v in normalized.items() if k != '_raw'}, indent=2)}")
            
            # Create pending payment transaction
            if user and company:
                transaction = PaymentTransaction.objects.create(
                    company=company,
                    user=user,
                    amount=amount,
                    currency=currency,
                    status='PENDING',
                    payment_type='ONE_TIME',
                    provider='CRYPTO',
                    provider_transaction_id=normalized['payment_id'],
                    description=f"{order_description or 'Crypto payment'} - {normalized['pay_currency'] or 'Auto'}",
                    receipt_url=normalized['payment_url'] or ''
                )
                
                logger.info(f"💾 Created pending crypto transaction: {transaction.id}")
            
            return normalized
            
        except ValueError as e:
            logger.error(f"❌ Validation error: {str(e)}")
            raise
        except requests.exceptions.Timeout:
            error_msg = "Payment gateway timeout. Please try again."
            logger.error(f"❌ {error_msg}")
            raise Exception(error_msg)
        except requests.exceptions.RequestException as e:
            error_msg = "Payment gateway connection error. Please try again."
            logger.error(f"❌ NOWPayments request failed: {str(e)}")
            
            if hasattr(e, 'response') and e.response is not None:
                try:
                    error_details = e.response.json()
                    logger.error(f"Error details: {json.dumps(error_details, indent=2)}")
                    
                    if 'message' in error_details:
                        error_msg = f"Payment error: {error_details['message']}"
                except:
                    logger.error(f"Error response text: {e.response.text}")
            
            raise Exception(error_msg)
        except Exception as e:
            error_msg = f"Crypto payment error: {str(e)}"
            logger.error(f"❌ {error_msg}")
            raise
    
    def get_payment_status(self, payment_id):
        """
        ✅ IMPROVED: Get payment status with better error handling.
        """
        try:
            headers = self.get_headers()
            
            logger.info(f"🔍 Checking payment status: {payment_id}")
            
            response = requests.get(
                f"{self.base_url}/payment/{payment_id}",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 404:
                raise Exception(f"Payment {payment_id} not found")
            
            response.raise_for_status()
            payment_data = response.json()
            
            # ✅ Normalize response
            normalized = self.normalize_response(payment_data)
            
            logger.info(f"✅ Retrieved payment status: {normalized['payment_id']} - Status: {normalized['payment_status']}")
            
            return normalized
            
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Failed to get payment status {payment_id}: {str(e)}")
            raise Exception(f"Failed to check payment status: {str(e)}")
        except Exception as e:
            logger.error(f"❌ Error getting payment status: {str(e)}")
            raise
    
    def get_min_payment_amount(self, currency_from='usd', currency_to='btc'):
        """
        ✅ NEW: Get minimum payment amount for a currency pair.
        """
        try:
            headers = self.get_headers()
            
            response = requests.get(
                f"{self.base_url}/min-amount",
                params={
                    'currency_from': currency_from.lower(),
                    'currency_to': currency_to.lower()
                },
                headers=headers,
                timeout=10
            )
            response.raise_for_status()
            
            data = response.json()
            min_amount = data.get('min_amount', 0)
            
            logger.info(f"Min amount for {currency_from} to {currency_to}: {min_amount}")
            return float(min_amount)
            
        except Exception as e:
            logger.error(f"Failed to get min amount: {str(e)}")
            return 1.0  # Default minimum
    
    def verify_webhook_signature(self, payload, signature):
        """Verify NOWPayments IPN signature."""
        try:
            if not self.ipn_secret:
                logger.warning("⚠️ IPN secret not configured, skipping signature verification")
                return True
            
            # NOWPayments uses HMAC-SHA512
            expected_signature = hmac.new(
                self.ipn_secret.encode('utf-8'),
                payload if isinstance(payload, bytes) else payload.encode('utf-8'),
                hashlib.sha512
            ).hexdigest()
            
            is_valid = hmac.compare_digest(signature, expected_signature)
            
            if is_valid:
                logger.info("✅ Webhook signature verified")
            else:
                logger.error("❌ Invalid webhook signature")
            
            return is_valid
            
        except Exception as e:
            logger.error(f"❌ Webhook signature verification failed: {str(e)}")
            return False
    
    def handle_webhook(self, payload, signature=None):
        """
        ✅ IMPROVED: Handle NOWPayments IPN webhook.
        """
        try:
            # Verify signature if provided
            if signature:
                if not self.verify_webhook_signature(payload, signature):
                    logger.error("❌ Invalid NOWPayments webhook signature")
                    return False
            else:
                logger.warning("⚠️ Webhook received without signature")
            
            # Parse webhook data
            if isinstance(payload, bytes):
                webhook_data = json.loads(payload.decode('utf-8'))
            else:
                webhook_data = json.loads(payload) if isinstance(payload, str) else payload
            
            logger.info(f"📥 Processing NOWPayments webhook")
            logger.debug(f"Webhook data: {json.dumps(webhook_data, indent=2)}")
            
            # ✅ Normalize webhook data
            normalized = self.normalize_response(webhook_data)
            payment_id = normalized['payment_id']
            payment_status = normalized['payment_status']
            
            if not payment_id:
                logger.warning("⚠️ No payment ID in webhook data")
                return False
            
            # Find the transaction
            try:
                transaction = PaymentTransaction.objects.get(
                    provider_transaction_id=payment_id,
                    provider='CRYPTO'
                )
            except PaymentTransaction.DoesNotExist:
                logger.warning(f"⚠️ Transaction not found for payment ID: {payment_id}")
                return False
            
            # Map NOWPayments status to our status
            status_mapping = {
                'finished': 'COMPLETED',
                'partially_paid': 'PENDING',
                'confirmed': 'PENDING',
                'sending': 'PENDING',
                'waiting': 'PENDING',
                'failed': 'FAILED',
                'refunded': 'REFUNDED',
                'expired': 'FAILED',
            }
            
            new_status = status_mapping.get(payment_status, transaction.status)
            
            # Update transaction
            old_status = transaction.status
            transaction.status = new_status
            
            # Update payment method info
            if normalized['pay_currency']:
                transaction.provider_payment_method = f"Crypto {normalized['pay_currency'].upper()}"
            
            # Update description with payment details
            if payment_status == 'finished' and normalized['pay_amount']:
                transaction.description = (
                    f"{transaction.description} - "
                    f"Paid: {normalized['pay_amount']} {normalized['pay_currency'].upper()}"
                )
            
            transaction.save()
            
            logger.info(
                f"✅ Updated transaction {transaction.id}: "
                f"{old_status} → {new_status} "
                f"(NOWPayments: {payment_status})"
            )
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Error processing NOWPayments webhook: {str(e)}")
            return False