# apps/ops/serializers.py
from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from apps.distribution.models import DeliveryException, DeliveryRoute, Shipment, Vehicle
from apps.users.models import User


class CompanyScoped:
    @property
    def company(self):
        return self.context['request'].user.company

    def _owned(self, model, value, message, **extra):
        if value is None:
            return None
        obj = model.objects.filter(id=value, company=self.company, **extra).first()
        if obj is None:
            raise serializers.ValidationError(message)
        return obj


class VehicleSerializer(CompanyScoped, serializers.ModelSerializer):
    id = serializers.UUIDField(read_only=True)
    default_driver_id = serializers.UUIDField(required=False, allow_null=True)
    default_driver_name = serializers.CharField(source='default_driver.get_full_name', read_only=True, default=None)
    type_label = serializers.CharField(source='get_vehicle_type_display', read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Vehicle
        fields = ['id', 'registration', 'name', 'vehicle_type', 'type_label', 'status', 'status_label', 'capacity_kg', 'capacity_m3',
                  'default_driver_id', 'default_driver_name', 'notes', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_registration(self, value):
        value = ' '.join(value.upper().split())
        qs = Vehicle.objects.filter(company=self.company, registration__iexact=value)
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('A vehicle with this registration already exists.')
        return value

    def validate_default_driver_id(self, value):
        if value is not None and not User.objects.filter(id=value, company=self.company, is_active=True).exists():
            raise serializers.ValidationError('Driver not found in your company.')
        return value

    def validate_status(self, value):
        if self.instance is not None and value != 'IN_USE' and self.instance.status == 'IN_USE' and \
                DeliveryRoute.objects.filter(fleet_vehicle=self.instance, status='IN_PROGRESS').exists():
            raise serializers.ValidationError('This vehicle is on a running route. Finish the route first.')
        return value


class ExceptionSerializer(CompanyScoped, serializers.ModelSerializer):
    id = serializers.UUIDField(read_only=True)
    shipment_id = serializers.UUIDField(required=False, allow_null=True)
    route_id = serializers.UUIDField(required=False, allow_null=True)
    owner_id = serializers.UUIDField(required=False, allow_null=True)
    route_stop_id = serializers.UUIDField(read_only=True)
    shipment_number = serializers.CharField(source='shipment.shipment_number', read_only=True, default=None)
    route_name = serializers.CharField(source='route.route_name', read_only=True, default=None)
    owner_name = serializers.CharField(source='owner.get_full_name', read_only=True, default=None)
    reported_by_name = serializers.CharField(source='reported_by.get_full_name', read_only=True, default=None)
    resolved_by_name = serializers.CharField(source='resolved_by.get_full_name', read_only=True, default=None)
    type_label = serializers.CharField(source='get_exception_type_display', read_only=True)
    age_minutes = serializers.SerializerMethodField()

    class Meta:
        model = DeliveryException
        fields = ['id', 'exception_type', 'type_label', 'severity', 'status', 'title', 'description', 'cause', 'impact',
                  'recommended_action', 'shipment_id', 'shipment_number', 'route_id', 'route_name', 'route_stop_id',
                  'owner_id', 'owner_name', 'reported_by_name', 'resolved_by_name', 'resolved_at', 'resolution_notes',
                  'age_minutes', 'created_at', 'updated_at']
        read_only_fields = ['id', 'status', 'route_stop_id', 'resolved_at', 'resolution_notes', 'created_at', 'updated_at']

    def get_age_minutes(self, obj):
        end = obj.resolved_at or timezone.now()
        return int((end - obj.created_at).total_seconds() // 60)

    def validate_shipment_id(self, value):
        return value and self._owned(Shipment, value, 'Shipment not found.').id

    def validate_route_id(self, value):
        return value and self._owned(DeliveryRoute, value, 'Route not found.').id

    def validate_owner_id(self, value):
        if value is not None and not User.objects.filter(id=value, company=self.company, is_active=True).exists():
            raise serializers.ValidationError('Owner not found in your company.')
        return value

    def validate(self, attrs):
        if self.instance is not None and not self.instance.is_open:
            changed = [k for k in attrs if k not in ('owner_id',)]
            if changed:
                raise serializers.ValidationError('Closed exceptions can’t be edited. Reopen it first.')
        if self.instance is not None:
            # what it's about stays fixed once raised
            attrs.pop('shipment_id', None)
            attrs.pop('route_id', None)
        return attrs


class PingSerializer(serializers.Serializer):
    latitude = serializers.FloatField(min_value=-90, max_value=90)
    longitude = serializers.FloatField(min_value=-180, max_value=180)
    accuracy_m = serializers.FloatField(min_value=0, required=False, allow_null=True)
    speed_kmh = serializers.FloatField(min_value=0, max_value=400, required=False, allow_null=True)
    heading = serializers.FloatField(min_value=0, max_value=360, required=False, allow_null=True)
    recorded_at = serializers.DateTimeField(required=False)

    def validate_recorded_at(self, value):
        # devices buffer offline, but nothing older than a day is useful, and clocks may run a little fast
        if value < timezone.now() - timedelta(days=1):
            raise serializers.ValidationError('Position is too old.')
        return value


class PingBatchSerializer(serializers.Serializer):
    pings = PingSerializer(many=True, allow_empty=False, max_length=100)
