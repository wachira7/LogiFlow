// src/components/distribution/RouteMap.tsx
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { MapPin, Navigation, Clock, Truck, CheckCircle, AlertCircle, Maximize2, Route } from 'lucide-react';
import type { DeliveryRouteDetail, RouteStop } from '@/types/distribution.types';

  // ADD — prevents SSR crash since Leaflet needs window:
  const MapContainer = dynamic(
    () => import('react-leaflet').then(m => m.MapContainer),
    { ssr: false }
  );
  const TileLayer = dynamic(
    () => import('react-leaflet').then(m => m.TileLayer),
    { ssr: false }
  );
  const Marker = dynamic(
    () => import('react-leaflet').then(m => m.Marker),
    { ssr: false }
  );
  const Polyline = dynamic(
    () => import('react-leaflet').then(m => m.Polyline),
    { ssr: false }
  );
  const Popup = dynamic(
    () => import('react-leaflet').then(m => m.Popup),
    { ssr: false }
  );

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
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapStops, setMapStops] = useState<MapStop[]>([]);
  const [totalDistance, setTotalDistance] = useState<number>(0);
  const [estimatedTime, setEstimatedTime] = useState<number>(0);

  
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
        coordinates: undefined // In real implementation, geocode the address to get coordinates
      });
    }

    // Add route stops
    const routeStops = route?.route_stops || stops;
    routeStops.forEach((stop, index) => {
      processedStops.push({
        id: stop.id || `stop-${index}`,
        address: stop.address,
        customerName: stop.customer_name,
        sequence: stop.stop_number || index + 1,
        status: stop.status || 'PENDING',
        coordinates: (stop.latitude && stop.longitude)
          ? { lat: Number(stop.latitude), lng: Number(stop.longitude) }
          : undefined
      });
    });

    setMapStops(processedStops);

    // Calculate total distance and estimated time from route details
    if (route?.total_distance) {
      setTotalDistance(Number(route.total_distance));
    }
    if (route?.estimated_duration) {
      setEstimatedTime(Math.round(Number(route.estimated_duration) * 60));
    }

    // Simulate map loading
     setIsMapLoaded(true);
  }, [route, stops]);

  
 
  const handleOptimizeRoute = () => {
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
                <MapContainer
                  center={[-1.2921, 36.8219]}
                  zoom={12}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
                  />

                  {/* Route path */}
                  {mapStops.filter(s => s.coordinates).length > 1 && (
                    <Polyline
                      positions={mapStops
                        .filter(s => s.coordinates)
                        .map(s => [s.coordinates!.lat, s.coordinates!.lng])}
                      color="#3b82f6"
                      dashArray="8,8"
                    />
                  )}

                  {/* Stop markers */}
                  {mapStops.filter(s => s.coordinates).map((stop) => (
                    <Marker
                      key={stop.id}
                      position={[stop.coordinates!.lat, stop.coordinates!.lng]}
                    >
                      <Popup>
                        <div className="text-sm space-y-1">
                          <p className="font-medium">{stop.customerName || `Stop ${stop.sequence}`}</p>
                          <p className="text-gray-500">{stop.address}</p>
                          <div className="flex items-center mt-1 space-x-1">
                            {stop.status === 'START' && <Navigation className="h-3 w-3 text-blue-500" />}
                            {stop.status === 'PENDING' && <Clock className="h-3 w-3 text-gray-400" />}
                            {stop.status === 'ARRIVED' && <Truck className="h-3 w-3 text-yellow-500" />}
                            {stop.status === 'COMPLETED' && <CheckCircle className="h-3 w-3 text-green-500" />}
                            {stop.status === 'FAILED' && <AlertCircle className="h-3 w-3 text-red-500" />}
                            <span className="text-gray-600">{stop.status}</span>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
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