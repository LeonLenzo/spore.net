'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface SamplingRoute {
  id: string;
  sample_id: string;
  start_name: string;
  end_name: string;
  start_latitude: number;
  start_longitude: number;
  end_latitude: number;
  end_longitude: number;
  collection_date: string;
}

interface RouteMapProps {
  routes: SamplingRoute[];
  selectedRoute?: SamplingRoute | null;
}

// Fix Leaflet default marker icons
const startIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const endIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to handle map bounds
function MapBoundsHandler({ routes }: { routes: SamplingRoute[] }) {
  const map = useMap();

  useEffect(() => {
    if (routes.length > 0) {
      const bounds: L.LatLngBoundsExpression = routes.flatMap(route => [
        [route.start_latitude, route.start_longitude] as [number, number],
        [route.end_latitude, route.end_longitude] as [number, number]
      ]);

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [routes, map]);

  return null;
}

export default function RouteMap({ routes, selectedRoute }: RouteMapProps) {
  const displayRoutes = selectedRoute ? [selectedRoute] : routes;

  // Default center (Perth, WA)
  const defaultCenter: [number, number] = [-31.9505, 115.8605];
  const defaultZoom = 8;

  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      style={{ height: '100%', width: '100%' }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />

      <MapBoundsHandler routes={displayRoutes} />

      {displayRoutes.map((route) => (
        <div key={route.id}>
          {/* Start marker */}
          <Marker
            position={[route.start_latitude, route.start_longitude]}
            icon={startIcon}
            title={`${route.sample_id} - Start: ${route.start_name}`}
          />

          {/* End marker */}
          <Marker
            position={[route.end_latitude, route.end_longitude]}
            icon={endIcon}
            title={`${route.sample_id} - End: ${route.end_name}`}
          />

          {/* Line connecting start and end */}
          <Polyline
            positions={[
              [route.start_latitude, route.start_longitude],
              [route.end_latitude, route.end_longitude]
            ]}
            color={selectedRoute?.id === route.id ? '#3b82f6' : '#6b7280'}
            weight={3}
            opacity={0.7}
          />
        </div>
      ))}
    </MapContainer>
  );
}
