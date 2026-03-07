// src/components/distribution/ShipmentTracker.tsx
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Package, PackageCheck, Truck, CheckCircle, Clock, MapPin, Search, ExternalLink, AlertTriangle, User, Building } from 'lucide-react';
import { formatDate } from '@/utils/dateUtils';
import type { ShipmentDetail } from '@/types/distribution.types';
import { distributionService } from '@/services/distributionService';

interface TrackingEvent {
  id: string;
  timestamp: string;
  status: string;
  description: string;
  location?: string;
  details?: string;
}

interface ShipmentTrackerProps {
  shipment?: ShipmentDetail;
  trackingNumber?: string;
  showSearch?: boolean;
  compact?: boolean;
  customerView?: boolean;
  onTrackingNumberChange?: (trackingNumber: string) => void;
}

export const ShipmentTracker: React.FC<ShipmentTrackerProps> = ({
  shipment,
  trackingNumber: initialTrackingNumber,
  showSearch = true,
  compact = false,
  customerView = false,
  onTrackingNumberChange
}) => {
  const [trackingNumber, setTrackingNumber] = useState(initialTrackingNumber || '');
  const [isLoading, setIsLoading] = useState(false);
  const [trackingEvents, setTrackingEvents] = useState<TrackingEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const statusIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    PENDING: Clock,
    PICKED: Package,
    PACKED: PackageCheck,
    SHIPPED: Truck,
    DELIVERED: CheckCircle,
  };

  const statusColors: Record<string, string> = {
    PENDING: 'bg-gray-100 text-gray-800',
    PICKED: 'bg-blue-100 text-blue-800',
    PACKED: 'bg-yellow-100 text-yellow-800',
    SHIPPED: 'bg-purple-100 text-purple-800',
    DELIVERED: 'bg-green-100 text-green-800',
  };

  // Generate mock tracking events based on shipment data
  const generateTrackingEvents = (shipmentData: ShipmentDetail): TrackingEvent[] => {
    const events: TrackingEvent[] = [];
    const baseTime = new Date(shipmentData.created_at);

    events.push({
      id: '1',
      timestamp: shipmentData.created_at,
      status: 'PENDING',
      description: 'Shipment created',
      location: shipmentData.warehouse_name || 'Warehouse',
      details: `Shipment ${shipmentData.shipment_number} has been created and is awaiting processing.`
    });

    if (['PICKED', 'PACKED', 'SHIPPED', 'DELIVERED'].includes(shipmentData.status)) {
      const pickTime = new Date(baseTime.getTime() + 2 * 60 * 60 * 1000); // +2 hours
      events.push({
        id: '2',
        timestamp: pickTime.toISOString(),
        status: 'PICKED',
        description: 'Items picked from warehouse',
        location: shipmentData.warehouse_name || 'Warehouse',
        details: 'All items have been picked from inventory and prepared for packing.'
      });
    }

    if (['PACKED', 'SHIPPED', 'DELIVERED'].includes(shipmentData.status)) {
      const packTime = new Date(baseTime.getTime() + 4 * 60 * 60 * 1000); // +4 hours
      events.push({
        id: '3',
        timestamp: packTime.toISOString(),
        status: 'PACKED',
        description: 'Package prepared for shipping',
        location: shipmentData.warehouse_name || 'Warehouse',
        details: 'Items have been securely packed and labeled for shipping.'
      });
    }

    if (['SHIPPED', 'DELIVERED'].includes(shipmentData.status)) {
      const shipTime = shipmentData.shipping_date || new Date(baseTime.getTime() + 6 * 60 * 60 * 1000).toISOString();
      events.push({
        id: '4',
        timestamp: shipTime,
        status: 'SHIPPED',
        description: 'Package dispatched for delivery',
        location: 'In Transit',
        details: `Package has been dispatched${shipmentData.carrier ? ` via ${shipmentData.carrier}` : ''}${shipmentData.tracking_number ? ` with tracking number ${shipmentData.tracking_number}` : ''}.`
      });
    }

    if (shipmentData.status === 'DELIVERED') {
      const deliveryTime = shipmentData.actual_delivery || new Date(baseTime.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();
      events.push({
        id: '5',
        timestamp: deliveryTime,
        status: 'DELIVERED',
        description: 'Package delivered successfully',
        location: 'Destination',
        details: 'Package has been delivered to the recipient.'
      });
    }

    return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  useEffect(() => {
    if (shipment) {
      setTrackingEvents(generateTrackingEvents(shipment));
      setError(null);
    }
  }, [shipment]);

  const handleSearch = async () => {
    if (!trackingNumber.trim()) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const result = await distributionService.trackShipment(trackingNumber);
      if (result) {
        setTrackingEvents(generateTrackingEvents(result));
      } else {
        setError('Tracking number not found. Please check and try again.');
        setTrackingEvents([]);
      }
      
    } catch  {
      setError('Failed to fetch tracking information. Please try again.');
    } finally {
      setIsLoading(false);
    }

    onTrackingNumberChange?.(trackingNumber);
  };

  const getCurrentStatus = (): string => {
    if (shipment) return shipment.status;
    if (trackingEvents.length > 0) {
      return trackingEvents[trackingEvents.length - 1].status;
    }
    return 'UNKNOWN';
  };

  const getStatusProgress = (): number => {
    const statusOrder = ['PENDING', 'PICKED', 'PACKED', 'SHIPPED', 'DELIVERED'];
    const currentStatus = getCurrentStatus();
    const currentIndex = statusOrder.indexOf(currentStatus);
    return currentIndex >= 0 ? ((currentIndex + 1) / statusOrder.length) * 100 : 0;
  };

  const renderStatusTimeline = () => {
    const allStatuses = ['PENDING', 'PICKED', 'PACKED', 'SHIPPED', 'DELIVERED'];
    const currentStatus = getCurrentStatus();
    const currentIndex = allStatuses.indexOf(currentStatus);

    return (
      <div className="space-y-4">
        {allStatuses.map((status, index) => {
          const StatusIcon = statusIcons[status];
          const event = trackingEvents.find(e => e.status === status);
          const isCompleted = index <= currentIndex;
          const isCurrent = status === currentStatus;

          return (
            <div key={status} className="flex items-start space-x-4">
              <div className={`
                flex items-center justify-center w-10 h-10 rounded-full border-2 shrink-0
                ${isCurrent 
                  ? 'bg-blue-100 border-blue-500 text-blue-600' 
                  : isCompleted 
                    ? 'bg-green-100 border-green-500 text-green-600'
                    : 'bg-gray-100 border-gray-300 text-gray-400'
                }
              `}>
                <StatusIcon className="w-5 h-5" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <p className={`font-medium ${
                    isCurrent ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    {status.replace('_', ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase())}
                  </p>
                  {event && (
                    <Badge className={statusColors[status]}>
                      {formatDate(event.timestamp)}
                    </Badge>
                  )}
                </div>
                
                {event && (
                  <div className="mt-1 space-y-1">
                    <p className="text-sm text-muted-foreground">{event.description}</p>
                    {event.location && (
                      <p className="text-xs text-muted-foreground flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        {event.location}
                      </p>
                    )}
                    {event.details && !compact && (
                      <p className="text-xs text-muted-foreground">{event.details}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderShipmentInfo = () => {
    if (!shipment && trackingEvents.length === 0) return null;

    const info = shipment || {
      tracking_number: trackingNumber,
      carrier: 'Express Delivery'
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Shipment Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {info.tracking_number && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tracking Number:</span>
              <span className="font-mono text-sm">{info.tracking_number}</span>
            </div>
          )}
          {info.carrier && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Carrier:</span>
              <span>{info.carrier}</span>
            </div>
          )}
          {shipment?.order_number && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Order:</span>
              <span>{shipment.order_number}</span>
            </div>
          )}
          {shipment?.warehouse_name && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Origin:</span>
              <span className="flex items-center">
                <Building className="w-4 h-4 mr-1" />
                {shipment.warehouse_name}
              </span>
            </div>
          )}
          {shipment?.driver_name && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Driver:</span>
              <span className="flex items-center">
                <User className="w-4 h-4 mr-1" />
                {shipment.driver_name}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Search Section */}
      {showSearch && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Search className="h-5 w-5 mr-2" />
              {customerView ? 'Track Your Shipment' : 'Shipment Tracking'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2">
              <div className="flex-1">
                <Input
                  placeholder="Enter tracking number or shipment ID..."
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button onClick={handleSearch} disabled={isLoading || !trackingNumber.trim()}>
                {isLoading ? <LoadingSpinner size="sm" /> : <Search className="h-4 w-4" />}
                Track
              </Button>
            </div>
            {error && (
              <div className="mt-2 flex items-center text-red-600 text-sm">
                <AlertTriangle className="h-4 w-4 mr-2" />
                {error}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Progress Bar */}
      {(shipment || trackingEvents.length > 0) && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(getStatusProgress())}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getStatusProgress()}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <LoadingSpinner size="lg" />
              <p className="text-sm text-muted-foreground mt-2">
                Fetching tracking information...
              </p>
            </div>
          </CardContent>
        </Card>
      ) : trackingEvents.length > 0 ? (
        <div className={compact ? 'space-y-4' : 'grid grid-cols-1 lg:grid-cols-3 gap-6'}>
          {/* Timeline */}
          <div className={compact ? '' : 'lg:col-span-2'}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  Tracking Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderStatusTimeline()}
              </CardContent>
            </Card>
          </div>

          {/* Shipment Info */}
          {!compact && (
            <div className="space-y-4">
              {renderShipmentInfo()}
              
              {/* Additional Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Need Help?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {customerView ? (
                    <>
                      <Button variant="outline" className="w-full">
                        Contact Support
                      </Button>
                      <Button variant="outline" className="w-full">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Track on Carrier Site
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" className="w-full">
                        View Full Details
                      </Button>
                      <Button variant="outline" className="w-full">
                        Update Status
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      ) : !showSearch ? (
        <EmptyState
          icon={<Package />}
          title="No tracking information"
          description="No shipment data available to track"
        />
      ) : null}
    </div>
  );
};
