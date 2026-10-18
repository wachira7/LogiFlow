# backend/utils/mixins.py
from rest_framework import viewsets, status
from rest_framework.response import Response
from django.db import transaction, models
from django.http import Http404
from django.shortcuts import get_object_or_404
from .permissions import IsSameCompany, IsCompanyMember
import uuid

class TimeStampedModel(models.Model):
    """
    Abstract base class that provides self-updating 
    'created_at' and 'updated_at' fields.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
class UUIDMixin:
    """Mixin to handle UUID conversion in views."""
    
    def get_object(self):
        """Override to handle UUID lookup."""
        queryset = self.filter_queryset(self.get_queryset())
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        lookup_value = self.kwargs[lookup_url_kwarg]
        
        # Convert string to UUID if needed
        if isinstance(lookup_value, str):
            try:
                lookup_value = uuid.UUID(lookup_value)
            except ValueError:
                raise Http404
        
        filter_kwargs = {self.lookup_field: lookup_value}
        # 404 (not 500) for missing or other-company objects
        obj = get_object_or_404(queryset, **filter_kwargs)
        
        # May raise a permission denied
        self.check_object_permissions(self.request, obj)
        return obj

class TenantQuerysetMixin:
    """
    Mixin to filter queryset by user's company automatically.
    """
    def get_queryset(self):
        queryset = super().get_queryset()
        if hasattr(self.request.user, 'company') and self.request.user.company:
            if hasattr(queryset.model, 'company'):
                return queryset.filter(company=self.request.user.company)
        return queryset

class TenantViewSetMixin(TenantQuerysetMixin, UUIDMixin):
    """
    Complete mixin for tenant-aware ViewSets.
    """
    permission_classes = [IsCompanyMember, IsSameCompany]
    
    def perform_create(self, serializer):
        """Automatically set company when creating objects."""
        if hasattr(serializer.Meta.model, 'company'):
            save_kwargs = {}
            
            # Only add company if not already in validated_data
            if 'company' not in serializer.validated_data:
                save_kwargs['company'] = self.request.user.company
            
            # Only add user if field exists and not already set
            if (hasattr(serializer.Meta.model, 'user') and 
                'user' not in serializer.validated_data):
                save_kwargs['user'] = self.request.user
            
            # Only add created_by if field exists and not already set
            if (hasattr(serializer.Meta.model, 'created_by') and 
                'created_by' not in serializer.validated_data):
                save_kwargs['created_by'] = self.request.user
            
            serializer.save(**save_kwargs)
        else:
            serializer.save()
        

class BulkActionMixin:
    """
    Mixin to add bulk operations to ViewSets.
    """
    def bulk_delete(self, request):
        """Bulk delete objects by IDs."""
        ids = request.data.get('ids', [])
        if not ids:
            return Response(
                {'error': 'No IDs provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        queryset = self.get_queryset().filter(id__in=ids)
        count = queryset.count()
        
        with transaction.atomic():
            queryset.delete()
        
        return Response({
            'message': f'Successfully deleted {count} items',
            'deleted_count': count
        })