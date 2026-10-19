# apps/production/serializers.py
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.inventory.models import Product, Warehouse
from apps.users.models import User

from .models import ProductionMaterial, ProductionOrder, ProductionStep

OPEN = ('PLANNED', 'IN_PROGRESS')


def company_of(serializer):
    return serializer.context['request'].user.company


class CompanyScopedPK(serializers.PrimaryKeyRelatedField):
    """A primary-key field whose choices are limited to the requesting user's company."""

    default_error_messages = {
        'does_not_exist': 'Not found in your company.',
        'incorrect_type': 'Not a valid id.',
    }

    def __init__(self, model, company_path='company', **kwargs):
        self.model = model
        self.company_path = company_path
        super().__init__(**kwargs)

    def get_queryset(self):
        request = self.context.get('request')
        if not request or not getattr(request.user, 'company', None):
            return self.model.objects.none()
        return self.model.objects.filter(**{self.company_path: request.user.company})

    def to_representation(self, value):
        return str(value.pk)


# --- steps -----------------------------------------------------------------

class ProductionStepSerializer(serializers.ModelSerializer):
    """Steps of an order. Status moves only through start/complete/skip."""
    id = serializers.UUIDField(read_only=True)
    production_order_id = CompanyScopedPK(ProductionOrder, source='production_order', required=False)
    assigned_to_id = CompanyScopedPK(User, source='assigned_to', required=False, allow_null=True)
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True, default=None)
    order_number = serializers.CharField(source='production_order.order_number', read_only=True)
    order_status = serializers.CharField(source='production_order.status', read_only=True)
    product_name = serializers.CharField(source='production_order.product.name', read_only=True)
    duration_hours = serializers.DecimalField(max_digits=6, decimal_places=2, min_value=0, required=False, allow_null=True)
    actual_duration_hours = serializers.ReadOnlyField()
    is_overdue = serializers.ReadOnlyField()

    class Meta:
        model = ProductionStep
        fields = [
            'id', 'production_order_id', 'order_number', 'order_status', 'product_name', 'name', 'description', 'duration_hours',
            'status', 'start_time', 'end_time', 'assigned_to_id', 'assigned_to_name',
            'actual_duration_hours', 'is_overdue', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'status', 'start_time', 'end_time', 'created_at', 'updated_at']

    def validate(self, attrs):
        order = attrs.get('production_order') or getattr(self.instance, 'production_order', None)
        if self.instance is None and order is None:
            raise serializers.ValidationError({'production_order_id': 'Choose the production order this step belongs to.'})
        if self.instance is not None and 'production_order' in attrs and attrs['production_order'] != self.instance.production_order:
            raise serializers.ValidationError({'production_order_id': 'A step can’t be moved to another order.'})
        if order is not None and order.status not in OPEN:
            raise serializers.ValidationError('Steps can’t be changed on a completed or cancelled order.')
        return attrs


class NestedStepSerializer(serializers.ModelSerializer):
    """Steps sent together with a new order."""
    assigned_to_id = CompanyScopedPK(User, source='assigned_to', required=False, allow_null=True)
    duration_hours = serializers.DecimalField(max_digits=6, decimal_places=2, min_value=0, required=False, allow_null=True)

    class Meta:
        model = ProductionStep
        fields = ['name', 'description', 'duration_hours', 'assigned_to_id']


# --- materials -------------------------------------------------------------

class ProductionMaterialSerializer(serializers.ModelSerializer):
    """Raw materials an order uses. They can change only while the order is planned (before stock is taken)."""
    id = serializers.UUIDField(read_only=True)
    production_order_id = CompanyScopedPK(ProductionOrder, source='production_order', required=False)
    product_id = CompanyScopedPK(Product, source='product')
    warehouse_id = CompanyScopedPK(Warehouse, source='warehouse')
    quantity = serializers.IntegerField(min_value=1)
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    unit_of_measure = serializers.CharField(source='product.unit_of_measure', read_only=True)
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    material_cost = serializers.ReadOnlyField()
    available_stock = serializers.ReadOnlyField()
    sufficient_stock = serializers.ReadOnlyField()
    unit_cost = serializers.DecimalField(source='product.cost_price', max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = ProductionMaterial
        fields = [
            'id', 'production_order_id', 'product_id', 'warehouse_id', 'quantity',
            'product_name', 'product_sku', 'unit_of_measure', 'warehouse_name', 'unit_cost',
            'material_cost', 'available_stock', 'sufficient_stock',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, attrs):
        order = attrs.get('production_order') or getattr(self.instance, 'production_order', None)
        if self.instance is None and order is None:
            raise serializers.ValidationError({'production_order_id': 'Choose the production order this material is for.'})
        if self.instance is not None and 'production_order' in attrs and attrs['production_order'] != self.instance.production_order:
            raise serializers.ValidationError({'production_order_id': 'A material can’t be moved to another order.'})
        if order.status != 'PLANNED':
            raise serializers.ValidationError('Materials can only be changed while the order is planned; once started, they have left stock.')
        product = attrs.get('product') or self.instance.product
        warehouse = attrs.get('warehouse') or self.instance.warehouse
        clash = order.production_materials.filter(product=product, warehouse=warehouse)
        if self.instance is not None:
            clash = clash.exclude(pk=self.instance.pk)
        if clash.exists():
            raise serializers.ValidationError('This material from that warehouse is already on the order; change its quantity instead.')
        if product == order.product:
            raise serializers.ValidationError({'product_id': 'An order can’t use the product it makes as a material.'})
        return attrs


class NestedMaterialSerializer(serializers.ModelSerializer):
    """Materials sent together with a new order."""
    product_id = CompanyScopedPK(Product, source='product')
    warehouse_id = CompanyScopedPK(Warehouse, source='warehouse')
    quantity = serializers.IntegerField(min_value=1)

    class Meta:
        model = ProductionMaterial
        fields = ['product_id', 'warehouse_id', 'quantity']


# --- orders ----------------------------------------------------------------

class ProductionOrderListSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(read_only=True)
    company_id = serializers.UUIDField(read_only=True)
    product_id = serializers.UUIDField(read_only=True)
    created_by_id = serializers.UUIDField(read_only=True)
    output_warehouse_id = serializers.UUIDField(read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    unit_of_measure = serializers.CharField(source='product.unit_of_measure', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True, default=None)
    output_warehouse_name = serializers.CharField(source='output_warehouse.name', read_only=True, default=None)
    duration_days = serializers.ReadOnlyField()
    progress_percentage = serializers.ReadOnlyField()
    estimated_completion = serializers.ReadOnlyField()
    steps_total = serializers.SerializerMethodField()
    steps_done = serializers.SerializerMethodField()

    class Meta:
        model = ProductionOrder
        fields = [
            'id', 'company_id', 'order_number', 'product_id', 'product_name',
            'product_sku', 'unit_of_measure', 'quantity', 'status', 'start_date', 'end_date', 'notes',
            'output_warehouse_id', 'output_warehouse_name', 'materials_consumed',
            'duration_days', 'progress_percentage', 'estimated_completion', 'steps_total', 'steps_done',
            'created_by_id', 'created_by_name', 'created_at', 'updated_at'
        ]

    def get_steps_total(self, obj):
        return len(obj.production_steps.all())

    def get_steps_done(self, obj):
        return sum(1 for s in obj.production_steps.all() if s.status in ('COMPLETED', 'SKIPPED'))


class ProductionOrderDetailSerializer(ProductionOrderListSerializer):
    production_steps = ProductionStepSerializer(many=True, read_only=True)
    production_materials = ProductionMaterialSerializer(many=True, read_only=True)
    total_material_cost = serializers.SerializerMethodField()
    materials_sufficient = serializers.SerializerMethodField()

    class Meta(ProductionOrderListSerializer.Meta):
        fields = ProductionOrderListSerializer.Meta.fields + [
            'production_steps', 'production_materials', 'total_material_cost', 'materials_sufficient',
        ]

    def get_total_material_cost(self, obj):
        return sum(m.material_cost for m in obj.production_materials.all())

    def get_materials_sufficient(self, obj):
        # Once started, the materials have already been taken from stock
        if obj.materials_consumed or obj.status not in OPEN:
            return True
        return all(m.sufficient_stock for m in obj.production_materials.all())


def next_order_number(company):
    """PO-YYYYMMDD-NNN, unique within the company."""
    prefix = f"PO-{timezone.now():%Y%m%d}-"
    taken = set(ProductionOrder.objects.filter(company=company, order_number__startswith=prefix)
                .values_list('order_number', flat=True))
    n = len(taken) + 1
    while f"{prefix}{n:03d}" in taken:
        n += 1
    return f"{prefix}{n:03d}"


class _OrderFieldsMixin:
    def validate_order_number(self, value):
        value = (value or '').strip()
        clash = ProductionOrder.objects.filter(company=company_of(self), order_number__iexact=value)
        if self.instance is not None:
            clash = clash.exclude(pk=self.instance.pk)
        if value and clash.exists():
            raise serializers.ValidationError('Order number already exists.')
        return value

    def _check_dates(self, attrs):
        start = attrs.get('start_date', getattr(self.instance, 'start_date', None))
        end = attrs.get('end_date', getattr(self.instance, 'end_date', None))
        if start and end and end < start:
            raise serializers.ValidationError({'end_date': 'The target end date must be after the start date.'})


class CreateProductionOrderSerializer(_OrderFieldsMixin, serializers.ModelSerializer):
    """New orders always start as planned; steps and materials can be sent along."""
    id = serializers.UUIDField(read_only=True)
    order_number = serializers.CharField(max_length=100, required=False, allow_blank=True)
    product_id = CompanyScopedPK(Product, source='product')
    output_warehouse_id = CompanyScopedPK(Warehouse, source='output_warehouse', required=False, allow_null=True)
    quantity = serializers.IntegerField(min_value=1)
    production_steps = NestedStepSerializer(many=True, required=False)
    production_materials = NestedMaterialSerializer(many=True, required=False)

    class Meta:
        model = ProductionOrder
        fields = [
            'id', 'order_number', 'product_id', 'quantity', 'start_date', 'end_date', 'notes',
            'output_warehouse_id', 'production_steps', 'production_materials'
        ]

    def validate(self, attrs):
        self._check_dates(attrs)
        materials = attrs.get('production_materials', [])
        pairs = [(m['product'].pk, m['warehouse'].pk) for m in materials]
        if len(pairs) != len(set(pairs)):
            raise serializers.ValidationError({'production_materials': 'Each material can only be listed once per warehouse; combine the quantities.'})
        if any(m['product'] == attrs['product'] for m in materials):
            raise serializers.ValidationError({'production_materials': 'An order can’t use the product it makes as a material.'})
        return attrs

    def create(self, validated_data):
        steps = validated_data.pop('production_steps', [])
        materials = validated_data.pop('production_materials', [])
        request = self.context['request']
        if not validated_data.get('order_number'):
            validated_data['order_number'] = next_order_number(request.user.company)
        with transaction.atomic():
            order = ProductionOrder.objects.create(company=request.user.company, created_by=request.user, **validated_data)
            for step in steps:
                ProductionStep.objects.create(production_order=order, **step)
            for material in materials:
                ProductionMaterial.objects.create(production_order=order, **material)
        return order


class UpdateProductionOrderSerializer(_OrderFieldsMixin, serializers.ModelSerializer):
    """
    Planned orders: everything is editable. In progress: only the target end date, output warehouse and notes
    (product and quantity are locked because materials have been taken). Finished orders: notes only.
    """
    product_id = CompanyScopedPK(Product, source='product', required=False)
    output_warehouse_id = CompanyScopedPK(Warehouse, source='output_warehouse', required=False, allow_null=True)
    quantity = serializers.IntegerField(min_value=1, required=False)

    EDITABLE = {
        'PLANNED': {'order_number', 'product', 'quantity', 'start_date', 'end_date', 'notes', 'output_warehouse'},
        'IN_PROGRESS': {'end_date', 'notes', 'output_warehouse'},
        'COMPLETED': {'notes'},
        'CANCELLED': {'notes'},
    }

    class Meta:
        model = ProductionOrder
        fields = ['order_number', 'product_id', 'quantity', 'start_date', 'end_date', 'notes', 'output_warehouse_id']

    def validate(self, attrs):
        allowed = self.EDITABLE[self.instance.status]
        locked = [f for f in attrs if f not in allowed and attrs[f] != getattr(self.instance, f)]
        if locked:
            state = self.instance.get_status_display().lower()
            names = ', '.join(sorted(f.replace('_', ' ') for f in locked))
            raise serializers.ValidationError(f'These can’t be changed once the order is {state}: {names}.')
        if attrs.get('order_number') == '':
            raise serializers.ValidationError({'order_number': 'Order number can’t be blank.'})
        product = attrs.get('product')
        if product and self.instance.production_materials.filter(product=product).exists():
            raise serializers.ValidationError({'product_id': 'This product is listed as one of the order’s materials.'})
        self._check_dates(attrs)
        return attrs
