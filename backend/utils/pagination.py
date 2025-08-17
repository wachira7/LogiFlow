# utils/pagination.py
from rest_framework.pagination import PageNumberPagination, CursorPagination
from rest_framework.response import Response
from collections import OrderedDict
from django.core.paginator import InvalidPage
from rest_framework.exceptions import NotFound


class StandardPagination(PageNumberPagination):
    """
    Standard pagination for most list views.
    Provides consistent pagination across the platform.
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100
    page_query_param = 'page'

    def get_paginated_response(self, data):
        """
        Return a paginated style Response object with additional metadata.
        """
        return Response(OrderedDict([
            ('count', self.page.paginator.count),
            ('total_pages', self.page.paginator.num_pages),
            ('current_page', self.page.number),
            ('page_size', self.get_page_size(self.request)),
            ('next', self.get_next_link()),
            ('previous', self.get_previous_link()),
            ('results', data)
        ]))

    def get_paginated_response_schema(self, schema):
        """
        Schema for OpenAPI documentation.
        """
        return {
            'type': 'object',
            'properties': {
                'count': {
                    'type': 'integer',
                    'example': 123,
                    'description': 'Total number of items'
                },
                'total_pages': {
                    'type': 'integer',
                    'example': 7,
                    'description': 'Total number of pages'
                },
                'current_page': {
                    'type': 'integer',
                    'example': 1,
                    'description': 'Current page number'
                },
                'page_size': {
                    'type': 'integer',
                    'example': 20,
                    'description': 'Number of items per page'
                },
                'next': {
                    'type': 'string',
                    'nullable': True,
                    'format': 'uri',
                    'example': 'http://api.example.org/accounts/?page=4'
                },
                'previous': {
                    'type': 'string',
                    'nullable': True,
                    'format': 'uri',
                    'example': 'http://api.example.org/accounts/?page=2'
                },
                'results': schema,
            },
        }


class LargePagination(PageNumberPagination):
    """
    Pagination for large datasets like transaction logs or audit logs.
    Smaller page size for better performance.
    """
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200
    page_query_param = 'page'

    def get_paginated_response(self, data):
        return Response(OrderedDict([
            ('count', self.page.paginator.count),
            ('total_pages', self.page.paginator.num_pages),
            ('current_page', self.page.number),
            ('page_size', self.get_page_size(self.request)),
            ('next', self.get_next_link()),
            ('previous', self.get_previous_link()),
            ('results', data)
        ]))


class SmallPagination(PageNumberPagination):
    """
    Pagination for smaller datasets like companies, warehouses.
    Larger page size for fewer requests.
    """
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50
    page_query_param = 'page'

    def get_paginated_response(self, data):
        return Response(OrderedDict([
            ('count', self.page.paginator.count),
            ('total_pages', self.page.paginator.num_pages),
            ('current_page', self.page.number),
            ('page_size', self.get_page_size(self.request)),
            ('next', self.get_next_link()),
            ('previous', self.get_previous_link()),
            ('results', data)
        ]))


class RealTimeCursorPagination(CursorPagination):
    """
    Cursor-based pagination for real-time data that changes frequently.
    Perfect for inventory movements, order updates, notifications.
    """
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 100
    ordering = '-created_at'  # Most recent first
    cursor_query_param = 'cursor'

    def get_paginated_response(self, data):
        return Response(OrderedDict([
            ('next', self.get_next_link()),
            ('previous', self.get_previous_link()),
            ('results', data)
        ]))


class DashboardPagination(PageNumberPagination):
    """
    Special pagination for dashboard widgets.
    Small page size for quick loading.
    """
    page_size = 5
    page_size_query_param = 'page_size'
    max_page_size = 20
    page_query_param = 'page'

    def get_paginated_response(self, data):
        return Response(OrderedDict([
            ('count', self.page.paginator.count),
            ('has_more', self.get_next_link() is not None),
            ('results', data)
        ]))


class SearchPagination(PageNumberPagination):
    """
    Pagination optimized for search results.
    Moderate page size with search metadata.
    """
    page_size = 15
    page_size_query_param = 'page_size'
    max_page_size = 75
    page_query_param = 'page'

    def get_paginated_response(self, data):
        search_query = self.request.GET.get('search', '')
        return Response(OrderedDict([
            ('count', self.page.paginator.count),
            ('total_pages', self.page.paginator.num_pages),
            ('current_page', self.page.number),
            ('page_size', self.get_page_size(self.request)),
            ('search_query', search_query),
            ('next', self.get_next_link()),
            ('previous', self.get_previous_link()),
            ('results', data)
        ]))


# Helper function for manual pagination
def paginate_queryset(queryset, request, paginator_class=StandardPagination):
    """
    Helper function to manually paginate a queryset.
    
    Usage:
        paginated_data = paginate_queryset(my_queryset, request)
        return Response(paginated_data)
    """
    paginator = paginator_class()
    page = paginator.paginate_queryset(queryset, request)
    if page is not None:
        return paginator.get_paginated_response(page).data
    return {'results': list(queryset.values())}


# Mixin for views that need custom pagination logic
class PaginationMixin:
    """
    Mixin that provides pagination utilities for ViewSets.
    """
    
    def get_pagination_class(self):
        """
        Override this method to use different pagination based on conditions.
        """
        if hasattr(self, 'pagination_class'):
            return self.pagination_class
        return StandardPagination
    
    def paginate_response(self, queryset, serializer_class=None):
        """
        Paginate a queryset and return the response data.
        """
        paginator = self.get_pagination_class()()
        page = paginator.paginate_queryset(queryset, self.request, view=self)
        
        if page is not None:
            if serializer_class:
                serializer = serializer_class(page, many=True, context={'request': self.request})
                return paginator.get_paginated_response(serializer.data)
            return paginator.get_paginated_response(page)
        
        if serializer_class:
            serializer = serializer_class(queryset, many=True, context={'request': self.request})
            return Response(serializer.data)
        return Response(queryset)