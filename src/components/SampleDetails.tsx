'use client';

import { Sample, pathogens } from '@/data/sampleData';
import Link from 'next/link';
import { AuthService } from '@/lib/auth';

interface SampleDetailsProps {
  sample: Sample | null;
  onClose: () => void;
  position?: { x: number; y: number };
}

export default function SampleDetails({ sample, onClose, position }: SampleDetailsProps) {
  if (!sample) return null;

  const getPathogenCategory = (species: string): string => {
    const speciesLower = species.toLowerCase();
    if (speciesLower.includes('puccinia')) return 'Rust';
    if (speciesLower.includes('fusarium')) return 'Fusarium';
    if (speciesLower.includes('septoria') || speciesLower.includes('pyrenophora') || speciesLower.includes('rhynchosporium')) return 'Leaf Spot';
    return 'Unknown';
  };

  // Group pathogens by category
  const pathogensByCategory = sample.pathogens.reduce((acc, pathogen) => {
    const category = getPathogenCategory(pathogen.species);
    if (!acc[category]) {
      acc[category] = { count: 0, totalReads: 0, species: [] };
    }
    acc[category].count++;
    acc[category].totalReads += pathogen.readCount;
    acc[category].species.push(pathogen.species);
    return acc;
  }, {} as Record<string, { count: number; totalReads: number; species: string[] }>);

  const categoryColors: Record<string, string> = {
    'Rust': 'bg-orange-100 text-orange-800',
    'Fusarium': 'bg-purple-100 text-purple-800',
    'Leaf Spot': 'bg-green-100 text-green-800',
    'Unknown': 'bg-gray-100 text-gray-800'
  };

  // Calculate positioning
  let positionStyle: React.CSSProperties = {};
  if (position) {
    const tooltipWidth = 320;
    const tooltipHeight = 250;
    const padding = 16;

    // Try to position to the right of the marker
    let left = position.x + padding;
    let top = position.y - tooltipHeight / 2;

    // If it would go off the right edge, position to the left
    if (left + tooltipWidth > window.innerWidth - padding) {
      left = position.x - tooltipWidth - padding;
    }

    // If it would go off the left edge, center horizontally
    if (left < padding) {
      left = Math.max(padding, Math.min(window.innerWidth - tooltipWidth - padding, position.x - tooltipWidth / 2));
    }

    // Keep it within vertical bounds
    top = Math.max(padding, Math.min(window.innerHeight - tooltipHeight - padding, top));

    positionStyle = {
      position: 'fixed',
      left: `${left}px`,
      top: `${top}px`,
      width: `${tooltipWidth}px`
    };
  } else {
    // Fallback position (top right)
    positionStyle = {
      position: 'fixed',
      top: '1rem',
      right: '1rem',
      width: '20rem',
      maxWidth: 'calc(100vw - 2rem)'
    };
  }

  return (
    <div className="bg-white rounded-lg shadow-xl z-[10000] border-2 border-gray-200" style={positionStyle}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-gray-50 rounded-t-lg">
        <h3 className="font-bold text-gray-900 text-sm">{sample.id}</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-200 rounded text-gray-600 font-bold text-lg"
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        {/* Location and Date */}
        <div className="text-sm">
          <div className="font-bold text-gray-900">{sample.location}</div>
          <div className="text-gray-600">{sample.collectionDate}</div>
        </div>

        {/* Pathogen Categories */}
        <div>
          <h4 className="text-xs font-semibold text-gray-700 mb-1">Detected Pathogens</h4>
          <div className="flex flex-wrap gap-1">
            {Object.entries(pathogensByCategory).map(([category, data]) => (
              <div
                key={category}
                className={`px-2 py-1 rounded text-xs font-semibold ${categoryColors[category]}`}
                title={`${data.species.join(', ')}`}
              >
                {category} ({data.count})
              </div>
            ))}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            Total reads: {sample.pathogens.reduce((sum, p) => sum + p.readCount, 0).toLocaleString()}
          </div>
        </div>

        {/* Link to sample details - visible to all users */}
        <Link
          href={`/sample?id=${sample.id}`}
          className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-2 px-3 rounded"
        >
          View Details
        </Link>
      </div>
    </div>
  );
}