// src/hooks/useProduction.ts

import { useState, useCallback } from 'react';
import productionService from '@/services/productionService';
import type {
  ProductionOrder,
  ProductionOrderDetail,
  CreateProductionOrderData,
  UpdateProductionOrderData,
  ProductionStep,
  CreateProductionStepData,
  UpdateProductionStepData,
  ProductionMaterial,
  CreateProductionMaterialData,
  UpdateProductionMaterialData,
  ProductionDashboard,
  MaterialRequirementsReport,
  InsufficientStockReport,
  ProductionOrderFilters,
  ProductionStepFilters,
  ProductionMaterialFilters,
} from '@/types/production.types';

// ============================================================================
// PRODUCTION ORDERS HOOK
// ============================================================================

export const useProductionOrders = () => {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [currentOrder, setCurrentOrder] = useState<ProductionOrderDetail | null>(null);
  const [dashboard, setDashboard] = useState<ProductionDashboard | null>(null);
  const [materialRequirements, setMaterialRequirements] = useState<MaterialRequirementsReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async (filters?: ProductionOrderFilters) => {
    setLoading(true);
    setError(null);
    try {
      const data = await productionService.orders.getAll(filters);
      setOrders(data || []);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch production orders';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOrderById = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await productionService.orders.getById(id);
      setCurrentOrder(data || null);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch production order';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createOrder = useCallback(async (data: CreateProductionOrderData) => {
    setLoading(true);
    setError(null);
    try {
      const newOrder = await productionService.orders.create(data);
      if (newOrder) {
        setOrders(prev => [newOrder, ...prev]);
      }
      return newOrder;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create production order';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateOrder = useCallback(async (id: string, data: UpdateProductionOrderData) => {
    setLoading(true);
    setError(null);
    try {
      const updated = await productionService.orders.update(id, data);
      if (updated) {
        setOrders(prev => prev.map(order => order.id === id ? updated : order));
        if (currentOrder?.id === id) {
          setCurrentOrder(updated);
        }
      }
      return updated;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update production order';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentOrder]);

  const deleteOrder = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await productionService.orders.delete(id);
      setOrders(prev => prev.filter(order => order.id !== id));
      if (currentOrder?.id === id) {
        setCurrentOrder(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete production order';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentOrder]);

  const startProduction = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await productionService.orders.startProduction(id);
      await fetchOrderById(id);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start production';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchOrderById]);

  const completeProduction = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await productionService.orders.completeProduction(id);
      await fetchOrderById(id);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to complete production';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchOrderById]);

  const cancelProduction = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await productionService.orders.cancelProduction(id);
      await fetchOrderById(id);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel production';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchOrderById]);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await productionService.orders.getDashboard();
      setDashboard(data || null);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch dashboard';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMaterialRequirements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await productionService.orders.getMaterialRequirements();
      setMaterialRequirements(data || null);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch material requirements';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    orders,
    currentOrder,
    dashboard,
    materialRequirements,
    loading,
    error,
    fetchOrders,
    fetchOrderById,
    createOrder,
    updateOrder,
    deleteOrder,
    startProduction,
    completeProduction,
    cancelProduction,
    fetchDashboard,
    fetchMaterialRequirements,
  };
};

// ============================================================================
// PRODUCTION STEPS HOOK
// ============================================================================

export const useProductionSteps = () => {
  const [steps, setSteps] = useState<ProductionStep[]>([]);
  const [currentStep, setCurrentStep] = useState<ProductionStep | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSteps = useCallback(async (filters?: ProductionStepFilters) => {
    setLoading(true);
    setError(null);
    try {
      const data = await productionService.steps.getAll(filters);
      setSteps(data || []);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch production steps';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStepById = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await productionService.steps.getById(id);
      setCurrentStep(data || null);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch production step';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createStep = useCallback(async (data: CreateProductionStepData) => {
    setLoading(true);
    setError(null);
    try {
      const newStep = await productionService.steps.create(data);
      if (newStep) {
        setSteps(prev => [...prev, newStep]);
      }
      return newStep;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create production step';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStep = useCallback(async (id: string, data: UpdateProductionStepData) => {
    setLoading(true);
    setError(null);
    try {
      const updated = await productionService.steps.update(id, data);
      if (updated) {
        setSteps(prev => prev.map(step => step.id === id ? updated : step));
        if (currentStep?.id === id) {
          setCurrentStep(updated);
        }
      }
      return updated;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update production step';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentStep]);

  const deleteStep = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await productionService.steps.delete(id);
      setSteps(prev => prev.filter(step => step.id !== id));
      if (currentStep?.id === id) {
        setCurrentStep(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete production step';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentStep]);

  const startStep = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await productionService.steps.startStep(id);
      await fetchStepById(id);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start step';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchStepById]);

  const completeStep = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await productionService.steps.completeStep(id);
      await fetchStepById(id);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to complete step';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchStepById]);

  const skipStep = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await productionService.steps.skipStep(id);
      await fetchStepById(id);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to skip step';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchStepById]);

  return {
    steps,
    currentStep,
    loading,
    error,
    fetchSteps,
    fetchStepById,
    createStep,
    updateStep,
    deleteStep,
    startStep,
    completeStep,
    skipStep,
  };
};

// ============================================================================
// PRODUCTION MATERIALS HOOK
// ============================================================================

export const useProductionMaterials = () => {
  const [materials, setMaterials] = useState<ProductionMaterial[]>([]);
  const [currentMaterial, setCurrentMaterial] = useState<ProductionMaterial | null>(null);
  const [insufficientStock, setInsufficientStock] = useState<InsufficientStockReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMaterials = useCallback(async (filters?: ProductionMaterialFilters) => {
    setLoading(true);
    setError(null);
    try {
      const data = await productionService.materials.getAll(filters);
      setMaterials(data || []);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch production materials';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMaterialById = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await productionService.materials.getById(id);
      setCurrentMaterial(data || null);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch production material';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createMaterial = useCallback(async (data: CreateProductionMaterialData) => {
    setLoading(true);
    setError(null);
    try {
      const newMaterial = await productionService.materials.create(data);
      if (newMaterial) {
        setMaterials(prev => [...prev, newMaterial]);
      }
      return newMaterial;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create production material';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateMaterial = useCallback(async (id: string, data: UpdateProductionMaterialData) => {
    setLoading(true);
    setError(null);
    try {
      const updated = await productionService.materials.update(id, data);
      if (updated) {
        setMaterials(prev => prev.map(material => material.id === id ? updated : material));
        if (currentMaterial?.id === id) {
          setCurrentMaterial(updated);
        }
      }
      return updated;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update production material';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentMaterial]);

  const deleteMaterial = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await productionService.materials.delete(id);
      setMaterials(prev => prev.filter(material => material.id !== id));
      if (currentMaterial?.id === id) {
        setCurrentMaterial(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete production material';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentMaterial]);

  const fetchInsufficientStock = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await productionService.materials.getInsufficientStock();
      setInsufficientStock(data || null);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch insufficient stock report';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    materials,
    currentMaterial,
    insufficientStock,
    loading,
    error,
    fetchMaterials,
    fetchMaterialById,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    fetchInsufficientStock,
  };
};

// ============================================================================
// COMBINED PRODUCTION HOOK
// ============================================================================

export const useProduction = () => {
  const orders = useProductionOrders();
  const steps = useProductionSteps();
  const materials = useProductionMaterials();

  return {
    orders,
    steps,
    materials,
  };
};