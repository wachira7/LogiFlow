# apps/payments/providers/mpesa.py
import requests
import json
import base64
import logging
from datetime import datetime
from django.conf import settings
from django.utils import timezone
from ..models import PaymentTransaction, UserSubscription

logger = logging.getLogger(__name__)

class MPesaService:
    """M-Pesa payment processing service using Safaricom Daraja API."""
    
    def __init__(self):
        self.consumer_key = settings.MPESA_CONSUMER_KEY
        self.consumer_secret = settings.MPESA_CONSUMER_SECRET
        self.base_url = settings.MPESA_BASE_URL
        self.shortcode = settings.MPESA_SHORTCODE
        self.passkey = settings.MPESA_PASSKEY
        self.environment = settings.MPESA_ENVIRONMENT
        
    def get_access_token(self):
        """Get OAuth access token from Safaricom."""
        try:
            # Create basic auth header
            auth_string = f"{self.consumer_key}:{self.consumer_secret}"
            auth_bytes = auth_string.encode('ascii')
            auth_b64 = base64.b64encode(auth_bytes).decode('ascii')
            
            headers = {
                'Authorization': f'Basic {auth_b64}',
                'Content-Type': 'application/json'
            }
            
            response = requests.get(settings.MPESA_AUTH_URL, headers=headers)
            response.raise_for_status()
            
            token_data = response.json()
            access_token = token_data.get('access_token')
            
            if not access_token:
                raise Exception("Failed to get access token from M-Pesa API")
            
            logger.info("Successfully obtained M-Pesa access token")
            return access_token
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to get M-Pesa access token: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Error getting M-Pesa access token: {str(e)}")
            raise
    
    def generate_password(self, timestamp=None):
        """Generate password for STK Push."""
        if timestamp is None:
            timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        
        # Password = Base64(Shortcode + Passkey + Timestamp)
        password_string = f"{self.shortcode}{self.passkey}{timestamp}"
        password_bytes = password_string.encode('ascii')
        password_b64 = base64.b64encode(password_bytes).decode('ascii')
        
        return password_b64, timestamp
    
    def initiate_stk_push(self, phone_number, amount, account_reference, transaction_desc, user=None, company=None):
        """Initiate STK Push payment."""
        try:
            # Get access token
            access_token = self.get_access_token()
            
            # Generate password and timestamp
            password, timestamp = self.generate_password()
            
            # Format phone number (ensure it starts with 254)
            if phone_number.startswith('0'):
                phone_number = '254' + phone_number[1:]
            elif phone_number.startswith('+254'):
                phone_number = phone_number[1:]
            elif not phone_number.startswith('254'):
                phone_number = '254' + phone_number
            
            # Prepare request payload
            payload = {
                'BusinessShortCode': self.shortcode,
                'Password': password,
                'Timestamp': timestamp,
                'TransactionType': 'CustomerPayBillOnline',
                'Amount': int(amount),
                'PartyA': phone_number,  # Customer phone number
                'PartyB': self.shortcode,  # Business shortcode
                'PhoneNumber': phone_number,  # Customer phone number
                'CallBackURL': settings.MPESA_CALLBACK_URL,
                'AccountReference': account_reference,
                'TransactionDesc': transaction_desc
            }
            
            # Add metadata for tracking
            if user and company:
                payload['CallBackURL'] = f"{settings.MPESA_CALLBACK_URL}?user_id={user.id}&company_id={company.id}"
            
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            response = requests.post(
                settings.MPESA_STK_PUSH_URL,
                json=payload,
                headers=headers
            )
            response.raise_for_status()
            
            response_data = response.json()
            
            logger.info(f"STK Push initiated: {response_data}")
            
            # Create pending payment transaction
            if user and company:
                transaction = PaymentTransaction.objects.create(
                    company=company,
                    user=user,
                    amount=amount,
                    currency='KES',
                    status='PENDING',
                    payment_type='ONE_TIME',
                    provider='MPESA',
                    provider_transaction_id=response_data.get('CheckoutRequestID', ''),
                    description=transaction_desc
                )
                
                logger.info(f"Created pending M-Pesa transaction: {transaction.id}")
            
            return response_data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"STK Push request failed: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"STK Push error: {str(e)}")
            raise
    
    def check_transaction_status(self, checkout_request_id):
        """Check the status of an STK Push transaction."""
        try:
            access_token = self.get_access_token()
            password, timestamp = self.generate_password()

            stk_query_url = f"{self.base_url}/mpesa/stkpushquery/v1/query"
            
            payload = {
                'BusinessShortCode': self.shortcode,
                'Password': password,
                'Timestamp': timestamp,
                'CheckoutRequestID': checkout_request_id
            }
            
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            logger.info(f"Checking STK Push status for: {checkout_request_id}")
            logger.info(f"Using endpoint: {stk_query_url}")
            logger.info(f"Payload: {payload}")
            
            response = requests.post(
                stk_query_url,
                json=payload,
                headers=headers
            )
            
            logger.info(f"Status check response status: {response.status_code}")
            logger.info(f"Status check response: {response.text}")
            
            response.raise_for_status()
            
            response_data = response.json()
            logger.info(f"Transaction status check: {response_data}")
            
            return response_data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Transaction status check failed: {str(e)}")
            logger.error(f"Response content: {e.response.text if hasattr(e, 'response') else 'No response'}")
            raise
        except Exception as e:
            logger.error(f"Transaction status error: {str(e)}")
            raise
    
    def handle_callback(self, callback_data):
        """Handle M-Pesa callback/webhook."""
        try:
            logger.info(f"Processing M-Pesa callback: {callback_data}")
            
            # Extract relevant data
            stk_callback = callback_data.get('Body', {}).get('stkCallback', {})
            result_code = stk_callback.get('ResultCode')
            result_desc = stk_callback.get('ResultDesc', '')
            checkout_request_id = stk_callback.get('CheckoutRequestID', '')
            
            # Find the transaction
            try:
                transaction = PaymentTransaction.objects.get(
                    provider_transaction_id=checkout_request_id,
                    provider='MPESA'
                )
            except PaymentTransaction.DoesNotExist:
                logger.warning(f"Transaction not found for CheckoutRequestID: {checkout_request_id}")
                return False
            
            # Update transaction based on result
            if result_code == 0:  # Success
                # Extract payment details from callback metadata
                callback_metadata = stk_callback.get('CallbackMetadata', {}).get('Item', [])
                
                mpesa_receipt_number = None
                phone_number = None
                amount = None
                transaction_date = None
                
                for item in callback_metadata:
                    name = item.get('Name', '')
                    value = item.get('Value')
                    
                    if name == 'MpesaReceiptNumber':
                        mpesa_receipt_number = value
                    elif name == 'PhoneNumber':
                        phone_number = value
                    elif name == 'Amount':
                        amount = value
                    elif name == 'TransactionDate':
                        transaction_date = value
                
                # Update transaction as successful
                transaction.status = 'COMPLETED'
                transaction.provider_payment_method = f"M-Pesa {phone_number}" if phone_number else "M-Pesa"
                transaction.receipt_url = f"M-Pesa Receipt: {mpesa_receipt_number}" if mpesa_receipt_number else ""
                transaction.save()
                
                logger.info(f"M-Pesa payment completed: {transaction.id} - Receipt: {mpesa_receipt_number}")
                
                return True
                
            else:  # Failed
                transaction.status = 'FAILED'
                transaction.description = f"{transaction.description} - {result_desc}"
                transaction.save()
                
                logger.error(f"M-Pesa payment failed: {transaction.id} - {result_desc}")
                
                return False
                
        except Exception as e:
            logger.error(f"Error processing M-Pesa callback: {str(e)}")
            return False
    
    def get_account_balance(self):
        """Get M-Pesa account balance."""
        try:
            access_token = self.get_access_token()
            
            payload = {
                'Initiator': 'testapi',  # Use your initiator name
                'SecurityCredential': 'your_security_credential',  # Generate this
                'CommandID': 'AccountBalance',
                'PartyA': self.shortcode,
                'IdentifierType': '4',  # Organization shortcode
                'Remarks': 'Account balance check',
                'QueueTimeOutURL': settings.MPESA_TIMEOUT_URL,
                'ResultURL': settings.MPESA_RESULT_URL
            }
            
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            response = requests.post(
                settings.MPESA_ACCOUNT_BALANCE_URL,
                json=payload,
                headers=headers
            )
            response.raise_for_status()
            
            response_data = response.json()
            logger.info(f"Account balance request: {response_data}")
            
            return response_data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Account balance check failed: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Account balance error: {str(e)}")
            raise
    
    def test_connection(self):
        """Test M-Pesa API connection."""
        try:
            access_token = self.get_access_token()
            logger.info("M-Pesa connection test successful")
            return True
        except Exception as e:
            logger.error(f"M-Pesa connection test failed: {str(e)}")
            return False
        