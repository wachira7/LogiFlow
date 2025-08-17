# utils/exceptions.py
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)

def custom_exception_handler(exc, context):
    """
    Custom exception handler for consistent error responses.
    """
    response = exception_handler(exc, context)
    
    if response is not None:
        custom_response_data = {
            'error': True,
            'message': 'An error occurred',
            'details': response.data,
            'status_code': response.status_code
        }
        
        # Log the error
        logger.error(f"API Error: {exc} - Context: {context}")
        
        response.data = custom_response_data
    
    return response

class CompanyMismatchError(Exception):
    """Raised when trying to access data from different company."""
    pass

class InsufficientStockError(Exception):
    """Raised when trying to allocate more stock than available."""
    pass

class InvalidTransferError(Exception):
    """Raised when warehouse transfer is invalid."""
    pass