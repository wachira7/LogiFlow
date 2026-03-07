// src/components/distribution/DeliveryStatus.tsx
import { Badge } from '@/components/ui/badge';
import { Package, PackageCheck, Truck, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { formatDate } from '@/utils/dateUtils';
import type { ShipmentStatus } from '@/types/distribution.types';

// CONSTANTS
const statusConfig: Record<ShipmentStatus, {
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  progress: number;
}> = {
  PENDING:   { label: 'Pending',   color: 'bg-gray-100 text-gray-800',     icon: Clock,        progress: 20  },
  PICKED:    { label: 'Picked',    color: 'bg-blue-100 text-blue-800',     icon: Package,      progress: 40  },
  PACKED:    { label: 'Packed',    color: 'bg-yellow-100 text-yellow-800', icon: PackageCheck, progress: 60  },
  SHIPPED:   { label: 'Shipped',   color: 'bg-purple-100 text-purple-800', icon: Truck,        progress: 80  },
  DELIVERED: { label: 'Delivered', color: 'bg-green-100 text-green-800',   icon: CheckCircle,  progress: 100 },
};


// INTERFACES
interface DeliveryStatusProps {
  status: ShipmentStatus;
  isDelayed?: boolean;
  estimatedDelivery?: string;
  actualDelivery?: string;
  trackingNumber?: string;
  compact?: boolean;
}


// COMPONENT
export const DeliveryStatus: React.FC<DeliveryStatusProps> = ({
  status,
  isDelayed = false,
  estimatedDelivery,
  actualDelivery,
  trackingNumber,
  compact = false,
}) => {
  const config = statusConfig[status];
  const StatusIcon = config.icon;

  // ---- Compact mode --------------------------------------------------------
  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <Badge className={config.color}>
          <StatusIcon className="h-3 w-3 mr-1" />
          {config.label}
        </Badge>
        {isDelayed && (
          <AlertTriangle className="h-4 w-4 text-red-500" />
        )}
      </div>
    );
  }

  // ---- Full mode -----------------------------------------------------------
  return (
    <div className="space-y-3">
      {/* Status badge + delay */}
      <div className="flex items-center space-x-2">
        <Badge className={config.color}>
          <StatusIcon className="h-3 w-3 mr-1" />
          {config.label}
        </Badge>
        {isDelayed && (
          <div className="flex items-center text-red-600 text-sm">
            <AlertTriangle className="h-4 w-4 mr-1" />
            Delayed
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Progress</span>
          <span>{config.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${config.progress}%` }}
          />
        </div>
      </div>

      {/* Delivery dates */}
      {status !== 'DELIVERED' && estimatedDelivery && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Est. Delivery:</span>
          <span>{formatDate(estimatedDelivery)}</span>
        </div>
      )}
      {status === 'DELIVERED' && actualDelivery && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Delivered:</span>
          <span className="text-green-600">{formatDate(actualDelivery)}</span>
        </div>
      )}

      {/* Tracking number */}
      {trackingNumber && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Tracking:</span>
          <span className="font-mono text-xs">{trackingNumber}</span>
        </div>
      )}
    </div>
  );
};
