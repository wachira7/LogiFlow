# apps/production/serializers.py
from rest_framework import serializers
from django.db import transaction
from django.utils import timezone
from .models import ProductionOrder, ProductionStep, ProductionMaterial
from apps.inventory.models import Product, Warehouse
from apps.users.models import User


class ProductionMaterialSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(read_only=True)
    created_at = serializers.DateTimeField(default=timezone.now)
    updated_at = serializers.DateTimeField(default=timezone.now)
    production_order_id = serializers.UUIDField(read_only=True)
    product_id = serializers.UUIDField()
    warehouse_id = serializers.UUIDField()
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    material_cost = serializers.ReadOnlyField()
    available_stock = serializers.ReadOnlyField()
    sufficient_stock = serializers.ReadOnlyField()
    unit_cost = serializers.DecimalField(source='product.cost_price', max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = ProductionMaterial
        fields = [
            'id', 'production_order_id', 'product_id', 'warehouse_id', 'quantity',
            'product_name', 'product_sku', 'warehouse_name', 'unit_cost',
            'material_cost', 'available_stock', 'sufficient_stock',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'production_order_id', 'created_at', 'updated_at']

    def validate(self, attrs):
        company = self.context['request'].user.company
        try:
            product = Product.objects.get(id=attrs['product_id'], company=company)
            warehouse = Warehouse.objects.get(id=attrs['warehouse_id'], company=company)
        except (Product.DoesNotExist, Warehouse.DoesNotExist):
            raise serializers.ValidationError("Product or warehouse not found.")
        attrs['product'] = product
        attrs['warehouse'] = warehouse
        return attrs


class ProductionStepSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(read_only=True)
    production_order_id = serializers.UUIDField(read_only=True)
    assigned_to_id = serializers.UUIDField(required=False, allow_null=True)
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)
    actual_duration_hours = serializers.ReadOnlyField()
    is_overdue = serializers.ReadOnlyField()

    class Meta:
        model = ProductionStep
        fields = [
            'id', 'production_order_id', 'name', 'description', 'duration_hours',
            'status', 'start_time', 'end_time', 'assigned_to_id', 'assigned_to_name',
            'actual_duration_hours', 'is_overdue', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'production_order_id', 'created_at', 'updated_at']

    def validate_assigned_to_id(self, value):
        if value:
            company = self.context['request'].user.company
            try:
                user = User.objects.get(id=value, company=company)
                return user
            except User.DoesNotExist:
                raise serializers.ValidationError("User not found in your company.")
        return None


class ProductionOrderListSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(read_only=True)
    company_id = serializers.UUIDField(read_only=True)
    product_id = serializers.UUIDField(read_only=True)
    created_by_id = serializers.UUIDField(read_only=True)
    output_warehouse_id = serializers.UUIDField(read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    output_warehouse_name = serializers.CharField(source='output_warehouse.name', read_only=True)
    duration_days = serializers.ReadOnlyField()
    progress_percentage = serializers.ReadOnlyField()
    estimated_completion = serializers.ReadOnlyField()

    class Meta:
        model = ProductionOrder
        fields = [
            'id', 'company_id', 'order_number', 'product_id', 'product_name',
            'product_sku', 'quantity', 'status', 'start_date', 'end_date',
            'output_warehouse_id', 'output_warehouse_name',
            'duration_days', 'progress_percentage', 'estimated_completion',
            'created_by_id', 'created_by_name', 'created_at'
        ]


class ProductionOrderDetailSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(read_only=True)
    company_id = serializers.UUIDField(read_only=True)
    product_id = serializers.UUIDField()
    created_by_id = serializers.UUIDField(read_only=True)
    output_warehouse_id = serializers.UUIDField(read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    output_warehouse_name = serializers.CharField(source='output_warehouse.name', read_only=True)
    duration_days = serializers.ReadOnlyField()
    progress_percentage = serializers.ReadOnlyField()
    estimated_completion = serializers.ReadOnlyField()
    production_steps = ProductionStepSerializer(many=True, read_only=True)
    production_materials = ProductionMaterialSerializer(many=True, read_only=True)
    total_material_cost = serializers.SerializerMethodField()
    materials_sufficient = serializers.SerializerMethodField()

    class Meta:
        model = ProductionOrder
        fields = [
            'id', 'company_id', 'order_number', 'product_id', 'product_name',
            'product_sku', 'quantity', 'status', 'start_date', 'end_date',
            'notes', 'output_warehouse_id', 'output_warehouse_name',
            'duration_days', 'progress_percentage', 'estimated_completion',
            'created_by_id', 'created_by_name', 'production_steps', 'production_materials',
            'total_material_cost', 'materials_sufficient', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'company_id', 'created_by_id', 'created_at', 'updated_at']

    def get_total_material_cost(self, obj):
        return sum(material.material_cost for material in obj.production_materials.all())

    def get_materials_sufficient(self, obj):
        return all(material.sufficient_stock for material in obj.production_materials.all())

    def validate_product_id(self, value):
        company = self.context['request'].user.company
        try:
            product = Product.objects.get(id=value, company=company)
            return product
        except Product.DoesNotExist:
            raise serializers.ValidationError("Product not found.")


class CreateProductionOrderSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(read_only=True)
    product_id = serializers.UUIDField()
    output_warehouse_id = serializers.UUIDField(required=False, allow_null=True)
    production_steps = ProductionStepSerializer(many=True, required=False)
    production_materials = ProductionMaterialSerializer(many=True, required=False)

    class Meta:
        model = ProductionOrder
        fields = [
            'id', 'order_number', 'product_id', 'quantity', 'status',
            'start_date', 'end_date', 'notes',
            'output_warehouse_id',
            'production_steps', 'production_materials'
        ]
        read_only_fields = ['id']

    def validate_product_id(self, value):
        company = self.context['request'].user.company
        try:
            Product.objects.get(id=value, company=company)
            return value
        except Product.DoesNotExist:
            raise serializers.ValidationError("Product not found.")

    def validate_output_warehouse_id(self, value):
        if value:
            company = self.context['request'].user.company
            try:
                warehouse = Warehouse.objects.get(id=value, company=company)
                return warehouse
            except Warehouse.DoesNotExist:
                raise serializers.ValidationError("Output warehouse not found.")
        return None

    def validate_order_number(self, value):
        company = self.context['request'].user.company
        if ProductionOrder.objects.filter(company=company, order_number=value).exists():
            raise serializers.ValidationError("Order number already exists.")
        return value

    def create(self, validated_data):
        steps_data = validated_data.pop('production_steps', [])
        materials_data = validated_data.pop('production_materials', [])
        # output_warehouse_id was validated and resolved to a Warehouse instance
        output_warehouse = validated_data.pop('output_warehouse_id', None)

        with transaction.atomic():
            production_order = ProductionOrder.objects.create(
                output_warehouse=output_warehouse,
                **validated_data
            )

            for step_data in steps_data:
                step_data.pop('id', None)
                ProductionStep.objects.create(
                    production_order=production_order,
                    **step_data
                )

            for material_data in materials_data:
                material_data.pop('id', None)
                product = material_data.pop('product', None)
                warehouse = material_data.pop('warehouse', None)
                ProductionMaterial.objects.create(
                    production_order=production_order,
                    product=product,
                    warehouse=warehouse,
                    **material_data
                )

        return production_order