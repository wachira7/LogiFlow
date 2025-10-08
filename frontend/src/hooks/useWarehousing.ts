// src/hooks/useWarehousing.ts

import { useState, useCallback } from 'react';
import warehousingService from '@/services/warehousingService';
import type {
  WarehouseTransfer,
  WarehouseTransferDetail,
  CreateWarehouseTransferData,
  UpdateWarehouseTransferData,
  TransferItem,
  CreateTransferItemData,
  UpdateTransferItemData,
  WarehousingDashboard,
  StockMovementsReport,
  InsufficientStockReport,
  PopularTransfersReport,
  WarehouseTransferFilters,
  TransferItemFilters,
} from '@/types/warehousing.types';

// ============================================================================
// WAREHOUSE TRANSFERS HOOK
// ============================================================================

export const useWarehouseTransfers = () => {
  const [transfers, setTransfers] = useState<WarehouseTransfer[]>([]);
  const [currentTransfer, setCurrentTransfer] = useState<WarehouseTransferDetail | null>(null);
  const [dashboard, setDashboard] = useState<WarehousingDashboard | null>(null);
  const [stockMovements, setStockMovements] = useState<StockMovementsReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransfers = useCallback(async (filters?: WarehouseTransferFilters) => {
    setLoading(true);
    setError(null);
    try {
      const data = await warehousingService.transfers.getAll(filters);
      setTransfers(data || []);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch warehouse transfers';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTransferById = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await warehousingService.transfers.getById(id);
      setCurrentTransfer(data || null);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch warehouse transfer';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createTransfer = useCallback(async (data: CreateWarehouseTransferData) => {
    setLoading(true);
    setError(null);
    try {
      const newTransfer = await warehousingService.transfers.create(data);
      if (newTransfer) {
        setTransfers(prev => [newTransfer, ...prev]);
      }
      return newTransfer;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create warehouse transfer';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateTransfer = useCallback(async (id: string, data: UpdateWarehouseTransferData) => {
    setLoading(true);
    setError(null);
    try {
      const updated = await warehousingService.transfers.update(id, data);
      if (updated) {
        setTransfers(prev => prev.map(transfer => transfer.id === id ? updated : transfer));
        if (currentTransfer?.id === id) {
          setCurrentTransfer(updated);
        }
      }
      return updated;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update warehouse transfer';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentTransfer]);

  const deleteTransfer = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await warehousingService.transfers.delete(id);
      setTransfers(prev => prev.filter(transfer => transfer.id !== id));
      if (currentTransfer?.id === id) {
        setCurrentTransfer(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete warehouse transfer';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentTransfer]);

  const approveTransfer = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await warehousingService.transfers.approveTransfer(id);
      await fetchTransferById(id);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to approve transfer';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchTransferById]);

  const startTransfer = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await warehousingService.transfers.startTransfer(id);
      await fetchTransferById(id);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start transfer';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchTransferById]);

  const completeTransfer = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await warehousingService.transfers.completeTransfer(id);
      await fetchTransferById(id);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to complete transfer';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchTransferById]);

  const cancelTransfer = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await warehousingService.transfers.cancelTransfer(id);
      await fetchTransferById(id);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel transfer';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchTransferById]);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await warehousingService.transfers.getDashboard();
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

  const fetchStockMovements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await warehousingService.transfers.getStockMovements();
      setStockMovements(data || null);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch stock movements';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    transfers,
    currentTransfer,
    dashboard,
    stockMovements,
    loading,
    error,
    fetchTransfers,
    fetchTransferById,
    createTransfer,
    updateTransfer,
    deleteTransfer,
    approveTransfer,
    startTransfer,
    completeTransfer,
    cancelTransfer,
    fetchDashboard,
    fetchStockMovements,
  };
};

// ============================================================================
// TRANSFER ITEMS HOOK
// ============================================================================

export const useTransferItems = () => {
  const [items, setItems] = useState<TransferItem[]>([]);
  const [currentItem, setCurrentItem] = useState<TransferItem | null>(null);
  const [insufficientStock, setInsufficientStock] = useState<InsufficientStockReport | null>(null);
  const [popularTransfers, setPopularTransfers] = useState<PopularTransfersReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async (filters?: TransferItemFilters) => {
    setLoading(true);
    setError(null);
    try {
      const data = await warehousingService.items.getAll(filters);
      setItems(data || []);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch transfer items';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchItemById = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await warehousingService.items.getById(id);
      setCurrentItem(data || null);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch transfer item';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createItem = useCallback(async (data: CreateTransferItemData) => {
    setLoading(true);
    setError(null);
    try {
      const newItem = await warehousingService.items.create(data);
      if (newItem) {
        setItems(prev => [...prev, newItem]);
      }
      return newItem;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create transfer item';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateItem = useCallback(async (id: string, data: UpdateTransferItemData) => {
    setLoading(true);
    setError(null);
    try {
      const updated = await warehousingService.items.update(id, data);
      if (updated) {
        setItems(prev => prev.map(item => item.id === id ? updated : item));
        if (currentItem?.id === id) {
          setCurrentItem(updated);
        }
      }
      return updated;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update transfer item';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentItem]);

  const deleteItem = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await warehousingService.items.delete(id);
      setItems(prev => prev.filter(item => item.id !== id));
      if (currentItem?.id === id) {
        setCurrentItem(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete transfer item';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentItem]);

  const fetchInsufficientStockReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await warehousingService.items.getInsufficientStockReport();
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

  const fetchPopularTransfers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await warehousingService.items.getPopularTransfers();
      setPopularTransfers(data || null);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch popular transfers';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    items,
    currentItem,
    insufficientStock,
    popularTransfers,
    loading,
    error,
    fetchItems,
    fetchItemById,
    createItem,
    updateItem,
    deleteItem,
    fetchInsufficientStockReport,
    fetchPopularTransfers,
  };
};

// ============================================================================
// COMBINED WAREHOUSING HOOK
// ============================================================================

export const useWarehousing = () => {
  const transfers = useWarehouseTransfers();
  const items = useTransferItems();

  return {
    transfers,
    items,
  };
};