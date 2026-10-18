# utils/exceptions.py
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)

def readable_error_message(data):
    """
    First human-readable message in a DRF error payload, e.g. "Passwords do not match." or
    "Email: Enter a valid email address." (field name added only to generic field messages).
    """
    if isinstance(data, (list, tuple)):
        return readable_error_message(data[0]) if data else 'An error occurred'
    if isinstance(data, dict):
        if 'detail' in data:
            return str(data['detail'])
        for field, value in data.items():
            message = readable_error_message(value)
            if field != 'non_field_errors' and message.startswith(('This field', 'Ensure this field', 'Enter a valid')):
                return f"{field.replace('_', ' ').capitalize()}: {message}"
            return message
        return 'An error occurred'
    return str(data)


def custom_exception_handler(exc, context):
    """
    Custom exception handler for consistent error responses.
    """
    
    if isinstance(exc, CompanyMismatchError):
        logger.warning(f"CompanyMismatchError: {exc} - Context: {context}")
        return Response(
            {
                'error': True,
                'message': str(exc),
                'details': {
                    'requested_company': exc.requested_company,
                    'user_company': exc.user_company,
                },
                'status_code': status.HTTP_403_FORBIDDEN,
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    if isinstance(exc, InsufficientStockError):
        logger.warning(f"InsufficientStockError: {exc} - Context: {context}")
        return Response(
            {
                'error': True,
                'message': str(exc),
                'details': {
                    'product': exc.product,
                    'requested': exc.requested,
                    'available': exc.available,
                },
                'status_code': status.HTTP_400_BAD_REQUEST,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if isinstance(exc, InvalidTransferError):
        logger.warning(f"InvalidTransferError: {exc} - Context: {context}")
        return Response(
            {
                'error': True,
                'message': str(exc),
                'details': {
                    'reason': exc.reason,
                    'source': exc.source,
                    'destination': exc.destination,
                },
                'status_code': status.HTTP_400_BAD_REQUEST,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Fall back to DRF default handler for everything else
    response = exception_handler(exc, context)

    if response is not None:
        response.data = {
            'error': True,
            'message': readable_error_message(response.data),
            'details': response.data,
            'status_code': response.status_code,
        }
        logger.error(f"API Error: {exc} - Context: {context}")

    return response


class CompanyMismatchError(Exception):
    """Raised when trying to access data from a different company."""

    def __init__(self, requested_company=None, user_company=None):
        self.requested_company = requested_company
        self.user_company = user_company
        if requested_company and user_company:
            message = (
                f"Access denied: you belong to '{user_company}' "
                f"but requested data from '{requested_company}'."
            )
        else:
            message = "Access denied: company mismatch."
        super().__init__(message)


class InsufficientStockError(Exception):
    """Raised when trying to allocate more stock than available."""

    def __init__(self, product=None, requested=None, available=None):
        self.product = product
        self.requested = requested
        self.available = available
        if product and requested is not None and available is not None:
            message = (
                f"Insufficient stock for '{product}': "
                f"requested {requested}, only {available} available."
            )
        else:
            message = "Insufficient stock to complete this operation."
        super().__init__(message)


class InvalidTransferError(Exception):
    """Raised when a warehouse transfer is invalid."""

    def __init__(self, reason=None, source=None, destination=None):
        self.reason = reason
        self.source = source
        self.destination = destination
        if source and destination:
            base = f"Invalid transfer from '{source}' to '{destination}'"
            message = f"{base}: {reason}." if reason else f"{base}."
        elif reason:
            message = f"Invalid transfer: {reason}."
        else:
            message = "Invalid warehouse transfer."
        super().__init__(message)