'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface GPSPosition {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

interface FieldMapProps {
  currentPosition: GPSPosition | null;
  startPosition: GPSPosition | null;
  trackingPoints: GPSPosition[];
  isRecording: boolean;
  onManualPosition?: (lat: number, lng: number, isStart: boolean) => void;
}

// Fix Leaflet default marker icons
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const startIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const currentIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = defaultIcon;

function MapClickHandler({ onManualPosition, isStart }: { onManualPosition?: (lat: number, lng: number, isStart: boolean) => void; isStart: boolean }) {
  useMapEvents({
    click(e) {
      if (onManualPosition) {
        onManualPosition(e.latlng.lat, e.latlng.lng, isStart);
      }
    },
  });
  return null;
}

function MapCenterControl({ center }: { center: [number, number] | null }) {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);

  return null;
}

export default function FieldMap({
  currentPosition,
  startPosition,
  trackingPoints,
  isRecording,
  onManualPosition
}: FieldMapProps) {
  const [mapCenter, setMapCenter] = useState<[number, number]>([-31.9505, 115.8605]); // Perth default
  const [mapZoom] = useState(13);

  // Update map center when position changes
  useEffect(() => {
    if (currentPosition) {
      setMapCenter([currentPosition.latitude, currentPosition.longitude]);
    } else if (startPosition) {
      setMapCenter([startPosition.latitude, startPosition.longitude]);
    }
  }, [currentPosition, startPosition]);

  // Generate polyline from tracking points
  const pathCoordinates: [number, number][] = trackingPoints.map(point => [
    point.latitude,
    point.longitude
  ]);

  const needsStartPosition = isRecording && !startPosition;
  const needsEndPosition = isRecording && startPosition && !currentPosition;

  return (
    <div className="h-full w-full relative">
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Map controls */}
        <MapCenterControl center={currentPosition ? [currentPosition.latitude, currentPosition.longitude] : null} />

        {onManualPosition && (
          <MapClickHandler
            onManualPosition={onManualPosition}
            isStart={needsStartPosition}
          />
        )}

        {/* Start marker */}
        {startPosition && (
          <Marker
            position={[startPosition.latitude, startPosition.longitude]}
            icon={startIcon}
          />
        )}

        {/* Current position marker */}
        {currentPosition && currentPosition !== startPosition && (
          <Marker
            position={[currentPosition.latitude, currentPosition.longitude]}
            icon={currentIcon}
          />
        )}

        {/* Path line */}
        {pathCoordinates.length > 1 && (
          <Polyline
            positions={pathCoordinates}
            color="#3b82f6"
            weight={3}
            opacity={0.7}
          />
        )}
      </MapContainer>

      {/* Instructions overlay */}
      {onManualPosition && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-white rounded-lg shadow-lg p-3 max-w-xs">
          <p className="text-sm text-gray-700 text-center">
            {needsStartPosition && (
              <span className="font-medium text-green-600">📍 Tap map to set start position</span>
            )}
            {needsEndPosition && (
              <span className="font-medium text-blue-600">📍 Tap map to set end position</span>
            )}
          </p>
        </div>
      )}

      {/* Recording indicator */}
      {isRecording && (
        <div className="absolute bottom-4 left-4 z-[1000] bg-red-600 text-white rounded-lg shadow-lg px-4 py-2 flex items-center gap-2">
          <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
          <span className="text-sm font-medium">Recording GPS</span>
        </div>
      )}
    </div>
  );
}
