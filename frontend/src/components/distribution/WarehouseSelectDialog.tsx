// src/components/distribution/WarehouseSelectDialog.tsx
import { useState } from 'react';
import { useWarehouses } from '@/hooks/useInventory';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface WarehouseSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (warehouseId: string) => void;
}

export const WarehouseSelectDialog: React.FC<WarehouseSelectDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
}) => {
  const { warehouses } = useWarehouses();
  const [selectedId, setSelectedId] = useState('');

  const handleConfirm = () => {
    if (!selectedId) return;
    onConfirm(selectedId);
    setSelectedId('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select Warehouse</DialogTitle>
        </DialogHeader>
        <Select onValueChange={setSelectedId} value={selectedId}>
          <SelectTrigger>
            <SelectValue placeholder="Select warehouse to ship from" />
          </SelectTrigger>
          <SelectContent>
            {warehouses.map((w) => (
              <SelectItem key={w.id} value={w.id}>
                {w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedId}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};