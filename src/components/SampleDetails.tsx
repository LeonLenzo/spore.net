'use client';

import { Sample, pathogens } from '@/data/sampleData';

interface SampleDetailsProps {
  sample: Sample | null;
  onClose: () => void;
}

export default function SampleDetails({ sample, onClose }: SampleDetailsProps) {
  if (!sample) return null;

  const getPathogenInfo = (species: string) => {
    return pathogens.find(p => p.species === species);
  };

  // Calculate distance between start and end coordinates using Haversine formula
  const calculateTransectDistance = (startLat: number, startLng: number, endLat: number, endLng: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (endLat - startLat) * Math.PI / 180;
    const dLng = (endLng - startLng) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(startLat * Math.PI / 180) * Math.cos(endLat * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in kilometers
  };

  const transectDistance = calculateTransectDistance(
    sample.startLatitude,
    sample.startLongitude,
    sample.endLatitude,
    sample.endLongitude
  );

  return (
    <div className="fixed top-0 bottom-0 right-0 w-full sm:w-96 sm:max-w-[50vw] bg-white/30 backdrop-blur-md shadow-xl flex flex-col z-[10000] mt-[60px]">
      {/* Header Card */}
      <div className="mx-3 mt-3 mb-2">
        <div className="bg-white rounded-lg p-4 shadow-md flex items-center justify-between">
          <h2 className="text-base sm:text-xl font-bold text-gray-900">Sample Details</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded text-gray-900 font-bold text-xl"
          >
            ×
          </button>
        </div>
      </div>

      {/* Content - scrollable */}
      <div className="flex-1 overflow-y-auto px-3 space-y-3 pb-3">
        {/* Sample Info Card */}
        <div className="bg-white rounded-lg p-3 shadow-md">
          <h3 className="text-lg font-bold mb-3 text-gray-900">{sample.location}</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="font-medium text-gray-900">Sample ID:</span>
              <div className="text-gray-700">{sample.id}</div>
            </div>
            <div>
              <span className="font-medium text-gray-900">Collection Date:</span>
              <div className="text-gray-700">{sample.collectionDate}</div>
            </div>
            <div>
              <span className="font-medium text-gray-900">Season:</span>
              <div className="text-gray-700">{sample.season}</div>
            </div>
            <div>
              <span className="font-medium text-gray-900">Year:</span>
              <div className="text-gray-700">{sample.year}</div>
            </div>
            <div className="col-span-2">
              <span className="font-medium text-gray-900">Sampling Route:</span>
              <div className="text-gray-700 space-y-1 mt-1">
                <div>Start: {sample.startLatitude.toFixed(4)}, {sample.startLongitude.toFixed(4)}</div>
                <div>End: {sample.endLatitude.toFixed(4)}, {sample.endLongitude.toFixed(4)}</div>
                <div className="font-semibold text-gray-900 mt-1">
                  Distance: {transectDistance.toFixed(1)} km
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detected Pathogens Card */}
        <div className="bg-white rounded-lg p-3 shadow-md">
          <h4 className="font-bold mb-3 text-gray-900 text-base">Detected Pathogens ({sample.pathogens.length})</h4>
          <div className="space-y-3">
            {sample.pathogens
              .sort((a, b) => b.relativeAbundance - a.relativeAbundance)
              .map((pathogen, idx) => {
                const info = getPathogenInfo(pathogen.species);
                return (
                  <div key={idx} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-semibold text-gray-900">{pathogen.commonName}</div>
                        <div className="text-sm text-gray-700 italic font-medium">{pathogen.species}</div>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs font-semibold ${
                        pathogen.severity === 'high' ? 'bg-red-100 text-red-800' :
                        pathogen.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {pathogen.severity}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                      <div>
                        <span className="text-gray-800 font-medium">Abundance:</span>
                        <div className="font-semibold text-gray-900">{pathogen.relativeAbundance.toFixed(1)}%</div>
                      </div>
                      <div>
                        <span className="text-gray-800 font-medium">Read Count:</span>
                        <div className="font-semibold text-gray-900">{pathogen.readCount.toLocaleString()}</div>
                      </div>
                    </div>

                    {info && (
                      <div className="text-sm text-gray-700">
                        <div className="mb-1">
                          <span className="font-semibold text-gray-900">Category:</span> <span className="font-medium">{info.category}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-900">Crops Affected:</span> <span className="font-medium">{info.cropAffected.join(', ')}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>

        {/* Summary Statistics Card */}
        <div className="bg-white rounded-lg p-3 shadow-md">
          <h4 className="font-bold mb-3 text-gray-900 text-base">Summary Statistics</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-2">
              <span className="text-xs text-gray-700 font-medium">Total Reads</span>
              <div className="font-semibold text-gray-900 text-lg">
                {sample.pathogens.reduce((sum, p) => sum + p.readCount, 0).toLocaleString()}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <span className="text-xs text-gray-700 font-medium">Total Abundance</span>
              <div className="font-semibold text-gray-900 text-lg">
                {sample.pathogens.reduce((sum, p) => sum + p.relativeAbundance, 0).toFixed(1)}%
              </div>
            </div>
            <div className="bg-red-50 rounded-lg p-2">
              <span className="text-xs text-red-700 font-medium">High Severity</span>
              <div className="font-semibold text-red-800 text-lg">
                {sample.pathogens.filter(p => p.severity === 'high').length}
              </div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-2">
              <span className="text-xs text-yellow-700 font-medium">Medium Severity</span>
              <div className="font-semibold text-yellow-800 text-lg">
                {sample.pathogens.filter(p => p.severity === 'medium').length}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}