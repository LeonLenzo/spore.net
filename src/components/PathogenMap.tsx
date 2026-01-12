'use client';

import { MapContainer, TileLayer, Circle } from 'react-leaflet';
import L from 'leaflet';
import * as turf from '@turf/turf';
import 'leaflet/dist/leaflet.css';
import { Sample, pathogenColors } from '@/data/sampleData';

// Fix for default markers in Next.js
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface PathogenMapProps {
  selectedYear: number;
  selectedPathogens: string[];
  onSampleSelect: (sample: Sample | null) => void;
  samples?: Sample[];
  selectedSample?: Sample | null;
}


interface PathogenCircle {
  pathogenSpecies: string;
  center: [number, number];
  radius: number; // radius in meters
  color: string;
  opacity: number;
  sample: Sample;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pathogenData: any;
  position: 'start' | 'end' | 'midpoint';
}

function createPathogenCircles(sample: Sample, selectedPathogens: string[], selectedSample: Sample | null): PathogenCircle[] {
  const circles: PathogenCircle[] = [];

  // Calculate midpoint (center of circle)
  const midpointLat = (sample.startLatitude + sample.endLatitude) / 2;
  const midpointLng = (sample.startLongitude + sample.endLongitude) / 2;

  // Calculate distance between start and end points to get radius
  const startPoint = turf.point([sample.startLongitude, sample.startLatitude]);
  const endPoint = turf.point([sample.endLongitude, sample.endLatitude]);
  const distance = turf.distance(startPoint, endPoint, { units: 'kilometers' });
  const radius = (distance / 2) * 1000; // Convert to meters for radius

  const isSelected = selectedSample?.id === sample.id;
  const hasFilters = selectedPathogens.length > 0;

  // Always show a base circle for the sample
  circles.push({
    pathogenSpecies: 'base',
    center: [midpointLat, midpointLng],
    radius,
    color: isSelected ? '#3b82f6' : '#6b7280',
    opacity: isSelected ? 0.4 : 0, // Filled if selected, hollow otherwise
    sample,
    pathogenData: null,
    position: 'midpoint'
  });

  // If filters are active, add colored circles for matching pathogens
  if (hasFilters) {
    const visiblePathogens = sample.pathogens.filter(pathogen =>
      selectedPathogens.includes(pathogen.species)
    );

    visiblePathogens.forEach((pathogen) => {
      // Get pathogen color
      const color = pathogenColors[pathogen.species] || '#6b7280';

      // Calculate opacity based on severity
      let opacity = 0.2; // low severity
      if (pathogen.severity === 'medium') opacity = 0.4;
      if (pathogen.severity === 'high') opacity = 0.6;

      circles.push({
        pathogenSpecies: pathogen.species,
        center: [midpointLat, midpointLng],
        radius,
        color,
        opacity,
        sample,
        pathogenData: pathogen,
        position: 'midpoint'
      });
    });
  }

  return circles;
}


export default function PathogenMap({ selectedYear, selectedPathogens, onSampleSelect, samples: propSamples, selectedSample }: PathogenMapProps) {
  const samplesData = propSamples || samples;

  const handleSampleClick = (sample: Sample) => {
    const newSelection = selectedSample?.id === sample.id ? null : sample;
    onSampleSelect(newSelection);
  };

  // Calculate everything in render instead of useEffect to ensure immediate updates
  const filteredSamples = samplesData.filter(sample => sample.year === selectedYear);

  const allPathogenCircles: PathogenCircle[] = [];
  filteredSamples.forEach(sample => {
    const sampleCircles = createPathogenCircles(sample, selectedPathogens, selectedSample);
    allPathogenCircles.push(...sampleCircles);
  });

  return (
    <div className="h-full w-full">
      <MapContainer
        center={[-30.5, 118.5]} // Centered on WA wheat belt
        zoom={6}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />


        {/* Render pathogen spread circles - each pathogen gets its own colored, semi-transparent circles */}
        {allPathogenCircles.map((circle, idx) => (
          <Circle
            key={`${circle.sample.id}-${circle.pathogenSpecies}-${circle.position}-${selectedSample?.id || 'none'}-${idx}`}
            center={circle.center}
            radius={circle.radius}
            color={circle.color}
            weight={1} // Thin consistent border for all circles
            fillOpacity={circle.opacity}
            opacity={circle.opacity === 0 ? 0.8 : circle.opacity + 0.2} // Clearer border for hollow circles
            eventHandlers={{
              click: () => handleSampleClick(circle.sample),
            }}
          />
        ))}
      </MapContainer>
    </div>
  );
}