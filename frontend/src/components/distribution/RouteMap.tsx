// src/components/distribution/RouteMap.tsx
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { 
  MapPin, 
  Navigation, 
  Clock, 
  Truck,
  CheckCircle,
  AlertCircle,
  Maximize2,
  Route
} from 'lucide-react';
import type { DeliveryRouteDetail, RouteStop } from '@/types/distribution.types';

interface RouteMapProps {
  route?: DeliveryRouteDetail;
  stops?: RouteStop[];
  height?: string;
  interactive?: boolean;
  showControls?: boolean;
  className?: string;
}

interface MapStop {
  id: string;
  address: string;
  customerName?: string;
  sequence: number;
  status: string;
  coordinates?: { lat: number; lng: number };
}

export const RouteMap: React.FC<RouteMapProps> = ({
  route,
  stops = [],
  height = '400px',
  interactive = true,
  showControls = true,
  className
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapStops, setMapStops] = useState<MapStop[]>([]);
  const [selectedStop, setSelectedStop] = useState<MapStop | null>(null);
  const [totalDistance, setTotalDistance] = useState<number>(0);
  const [estimatedTime, setEstimatedTime] = useState<number>(0);

  // Mock coordinates for demo purposes - in real implementation, use geocoding API
  const getMockCoordinates = (address: string, index: number) => {
    // Generate mock coordinates around a central point
    const baseLat = -1.2921; // Nairobi coordinates
    const baseLng = 36.8219;
    const offset = 0.05;
    
    return {
      lat: baseLat + (Math.random() - 0.5) * offset + (index * 0.01),
      lng: baseLng + (Math.random() - 0.5) * offset + (index * 0.01)
    };
  };

  useEffect(() => {
    // Process route stops
    const processedStops: MapStop[] = [];
    
    // Add start location if available
    if (route?.start_location) {
      processedStops.push({
        id: 'start',
        address: route.start_location,
        customerName: 'Start Location',
        sequence: 0,
        status: 'START',
        coordinates: getMockCoordinates(route.start_location, 0)
      });
    }

    // Add route stops
    const routeStops = route?.route_stops || stops;
    routeStops.forEach((stop, index) => {
      processedStops.push({
        id: stop.id || `stop-${index}`,
        address: stop.address,
        customerName: stop.customer_name,
        sequence: stop.sequence_order || index + 1,
        status: stop.status || 'PENDING',
        coordinates: getMockCoordinates(stop.address, index + 1)
      });
    });

    setMapStops(processedStops);

    // Calculate mock distance and time
    if (processedStops.length > 1) {
      const distance = processedStops.length * 5.2; // Mock: ~5km per stop
      const time = distance * 0.08; // Mock: ~5 minutes per km
      setTotalDistance(Math.round(distance));
      setEstimatedTime(Math.round(time));
    }

    // Simulate map loading
    setTimeout(() => setIsMapLoaded(true), 1000);
  }, [route, stops]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      START: 'bg-blue-500',
      PENDING: 'bg-gray-400',
      ARRIVED: 'bg-yellow-500',
      COMPLETED: 'bg-green-500',
      FAILED: 'bg-red-500'
    };
    return colors[status] || 'bg-gray-400';
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, React.ComponentType<{ className?: string }>> = {
      START: Navigation,
      PENDING: Clock,
      ARRIVED: Truck,
      COMPLETED: CheckCircle,
      FAILED: AlertCircle
    };
    const IconComponent = icons[status] || MapPin;
    return IconComponent;
  };

  const handleStopClick = (stop: MapStop) => {
    setSelectedStop(stop);
  };

  const handleOptimizeRoute = () => {
    // Mock route optimization - in real implementation, call routing API
    console.log('Optimizing route for', mapStops.length, 'stops');
    // You could integrate with Google Maps Directions API, MapBox, etc.
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Route className="h-5 w-5 mr-2" />
              Route Map
              {route && (
                <Badge variant="outline" className="ml-2">
                  {route.route_name}
                </Badge>
              )}
            </CardTitle>
            {showControls && (
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleOptimizeRoute}
                >
                  Optimize Route
                </Button>
                <Button variant="ghost" size="sm">
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          
          {/* Route Statistics */}
          <div className="flex items-center space-x-6 text-sm text-muted-foreground">
            <div className="flex items-center">
              <MapPin className="h-4 w-4 mr-1" />
              {mapStops.length} stops
            </div>
            <div className="flex items-center">
              <Route className="h-4 w-4 mr-1" />
              {totalDistance} km
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              {estimatedTime} min
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {/* Map Container */}
            <div 
              ref={mapRef}
              className="relative border rounded-lg overflow-hidden bg-gray-50"
              style={{ height }}
            >
              {!isMapLoaded ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <LoadingSpinner size="lg" />
                    <p className="text-sm text-muted-foreground mt-2">
                      Loading map...
                    </p>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-green-50">
                  {/* Mock Map Visualization */}
                  <div className="relative w-full h-full">
                    {/* Route path visualization */}
                    <svg className="absolute inset-0 w-full h-full">
                      {mapStops.map((stop, index) => {
                        if (index === 0) return null;
                        const prevStop = mapStops[index - 1];
                        const x1 = (prevStop.coordinates?.lng || 0) * 10 + 200;
                        const y1 = (prevStop.coordinates?.lat || 0) * -10 + 200;
                        const x2 = (stop.coordinates?.lng || 0) * 10 + 200;
                        const y2 = (stop.coordinates?.lat || 0) * -10 + 200;
                        
                        return (
                          <line
                            key={`path-${index}`}
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke="#3b82f6"
                            strokeWidth="3"
                            strokeDasharray="5,5"
                          />
                        );
                      })}
                    </svg>

                    {/* Stop markers */}
                    {mapStops.map((stop) => {
                      const x = (stop.coordinates?.lng || 0) * 10 + 200;
                      const y = (stop.coordinates?.lat || 0) * -10 + 200;
                      
                      return (
                        <div
                          key={stop.id}
                          className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                          style={{ left: x, top: y }}
                          onClick={() => handleStopClick(stop)}
                        >
                          <div 
                            className={`w-8 h-8 rounded-full ${getStatusColor(stop.status)} 
                              flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform`}
                          >
                            {stop.status === 'START' ? (
                              <Navigation className="h-4 w-4" />
                            ) : (
                              <span className="text-xs font-bold">{stop.sequence}</span>
                            )}
                          </div>
                          
                          {/* Stop label */}
                          <div className="absolute top-10 left-1/2 transform -translate-x-1/2 
                            bg-white px-2 py-1 rounded shadow-md text-xs whitespace-nowrap z-10">
                            {stop.customerName || `Stop ${stop.sequence}`}
                          </div>
                        </div>
                      );
                    })}

                    {/* Selected stop details */}
                    {selectedStop && (
                        <div className="absolute top-4 left-4 bg-white p-4 rounded-lg shadow-lg max-w-xs">
                          {(() => {
                            const StopIcon = getStatusIcon(selectedStop.status);
                            return (
                              <>
                                <h4 className="font-medium">{selectedStop.customerName || 'Stop Details'}</h4>
                                <p className="text-sm text-muted-foreground">{selectedStop.address}</p>
                                <div className="flex items-center mt-2">
                                  <StopIcon className="h-4 w-4 mr-2" />
                                  <Badge className={`${getStatusColor(selectedStop.status)} text-white`}>
                                    {selectedStop.status}
                                  </Badge>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="mt-2 w-full"
                                  onClick={() => setSelectedStop(null)}
                                >
                                  Close
                                </Button>
                              </>
                            );
                          })()}
                        </div>
                      )}
                  </div>
                </div>
              )}
            </div>

            {/* Interactive Controls */}
            {interactive && showControls && (
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                    Start
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
                    Pending
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    Completed
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  Click markers for details
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};