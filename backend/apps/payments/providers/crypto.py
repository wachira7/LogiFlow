# apps/payments/providers/crypto.py 
# Better error handling and logging
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
    """NOWPayments crypto payment processing service."""
    
    def __init__(self):
        self.api_key = settings.NOWPAYMENTS_API_KEY
        self.ipn_secret = settings.NOWPAYMENTS_IPN_SECRET
        
        if settings.NOWPAYMENTS_ENVIRONMENT == "sandbox":
            self.base_url = settings.NOWPAYMENTS_SANDBOX_URL
        else:
            self.base_url = settings.NOWPAYMENTS_BASE_URL
        
        # ✅ Log initialization
        logger.info(f"CryptoService initialized - Environment: {settings.NOWPAYMENTS_ENVIRONMENT}, URL: {self.base_url}")
    
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
            if hasattr(e.response, 'text'):
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
            
            currencies = response.json()
            # Return list of currency codes
            return [currency.get('name', '').lower() for currency in currencies.get('currencies', [])]
        except Exception as e:
            logger.error(f"Failed to get supported currencies: {str(e)}")
            return settings.SUPPORTED_CRYPTOCURRENCIES  # Fallback to settings
    
    def create_payment(self, amount, currency='USD', pay_currency=None, order_id=None, order_description=None, user=None, company=None):
        """Create a crypto payment with NOWPayments."""
        try:
            # ✅ Log the attempt
            logger.info(f"Creating crypto payment - Amount: {amount} {currency}, Pay Currency: {pay_currency}")
            
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
                payment_data['success_url'] = f"{settings.FRONTEND_URL}/payment/success"
                payment_data['cancel_url'] = f"{settings.FRONTEND_URL}/payment/cancel"
            
            # Add specific crypto currency if requested
            if pay_currency and pay_currency != 'auto':
                payment_data['pay_currency'] = pay_currency.lower()
            
            headers = self.get_headers()
            
            # ✅ Log the request
            logger.debug(f"Sending request to: {self.base_url}/payment")
            logger.debug(f"Request data: {json.dumps(payment_data, indent=2)}")
            
            response = requests.post(
                f"{self.base_url}/payment",
                json=payment_data,
                headers=headers,
                timeout=30
            )
            
            # Log response status
            logger.info(f"NOWPayments response status: {response.status_code}")
            
            # Better error handling
            if response.status_code not in [200, 201]:
                error_msg = f"NOWPayments API error: {response.status_code}"
                try:
                    error_data = response.json()
                    error_msg = f"{error_msg} - {error_data.get('message', 'Unknown error')}"
                    logger.error(f"Error response: {json.dumps(error_data, indent=2)}")
                except:
                    logger.error(f"Response text: {response.text}")
                
                raise Exception(error_msg)
            
            response.raise_for_status()
            payment_response = response.json()
            
            logger.info(f"✅ Created NOWPayments payment: {payment_response.get('payment_id', payment_response.get('id'))}")
            
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
                    provider_transaction_id=payment_response.get('payment_id', payment_response.get('id', '')),
                    description=order_description or 'Crypto payment',
                    receipt_url=payment_response.get('invoice_url', payment_response.get('payment_url', ''))
                )
                
                logger.info(f"Created pending crypto transaction: {transaction.id}")
            
            return payment_response
            
        except requests.exceptions.Timeout:
            error_msg = "NOWPayments API request timeout"
            logger.error(f"❌ {error_msg}")
            raise Exception(error_msg)
        except requests.exceptions.RequestException as e:
            error_msg = f"NOWPayments payment creation failed: {str(e)}"
            logger.error(f"❌ {error_msg}")
            if hasattr(e, 'response') and e.response is not None:
                try:
                    error_details = e.response.json()
                    logger.error(f"Error details: {json.dumps(error_details, indent=2)}")
                    # ✅ Return more specific error message
                    if 'message' in error_details:
                        error_msg = f"NOWPayments error: {error_details['message']}"
                except:
                    logger.error(f"Error response text: {e.response.text}")
            raise Exception(error_msg)
        except Exception as e:
            error_msg = f"Crypto payment error: {str(e)}"
            logger.error(f"❌ {error_msg}")
            raise Exception(error_msg)
    
    def get_payment_status(self, payment_id):
        """Get payment status from NOWPayments."""
        try:
            headers = self.get_headers()
            
            response = requests.get(
                f"{self.base_url}/payment/{payment_id}",
                headers=headers,
                timeout=10
            )
            response.raise_for_status()
            
            payment_data = response.json()
            
            logger.info(f"Retrieved NOWPayments payment status: {payment_id}")
            return payment_data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to get payment status {payment_id}: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Error getting payment status: {str(e)}")
            raise
    
    def verify_webhook_signature(self, payload, signature):
        """Verify NOWPayments IPN signature."""
        try:
            # NOWPayments uses HMAC-SHA512
            expected_signature = hmac.new(
                self.ipn_secret.encode('utf-8'),
                payload,
                hashlib.sha512
            ).hexdigest()
            
            return hmac.compare_digest(signature, expected_signature)
            
        except Exception as e:
            logger.error(f"Webhook signature verification failed: {str(e)}")
            return False
    
    def handle_webhook(self, payload, signature=None):
        """Handle NOWPayments IPN webhook."""
        try:
            # Verify signature if provided
            if signature and not self.verify_webhook_signature(payload, signature):
                logger.error("Invalid NOWPayments webhook signature")
                return False
            
            # Parse webhook data
            if isinstance(payload, bytes):
                webhook_data = json.loads(payload.decode('utf-8'))
            else:
                webhook_data = json.loads(payload) if isinstance(payload, str) else payload
            
            logger.info(f"Processing NOWPayments webhook: {webhook_data}")
            
            payment_id = webhook_data.get('payment_id', webhook_data.get('id'))
            payment_status = webhook_data.get('payment_status')
            
            if not payment_id:
                logger.warning("No payment ID in webhook data")
                return False
            
            # Find the transaction
            try:
                transaction = PaymentTransaction.objects.get(
                    provider_transaction_id=payment_id,
                    provider='CRYPTO'
                )
            except PaymentTransaction.DoesNotExist:
                logger.warning(f"Transaction not found for payment ID: {payment_id}")
                return False
            
            # Update transaction based on status
            if payment_status == 'finished':
                transaction.status = 'COMPLETED'
                transaction.provider_payment_method = f"Crypto {webhook_data.get('pay_currency', 'Unknown')}"
                
                # Add transaction hash if available
                if webhook_data.get('payment_id'):
                    transaction.description = f"{transaction.description} - Payment ID: {webhook_data.get('payment_id')}"
                    
            elif payment_status in ['failed', 'expired']:
                transaction.status = 'FAILED'
                transaction.description = f"{transaction.description} - Status: {payment_status}"
                
            elif payment_status in ['waiting', 'confirming', 'confirmed', 'sending']:
                transaction.status = 'PENDING'
                # Keep as pending, no change needed
                
            else:
                logger.info(f"Unhandled payment status: {payment_status}")
                return True
            
            transaction.save()
            logger.info(f"Updated transaction {transaction.id} to status {transaction.status}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error processing NOWPayments webhook: {str(e)}")
            return False