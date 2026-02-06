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
    <div className="absolute inset-y-0 right-0 w-full sm:w-96 max-w-[50vw] bg-white/95 backdrop-blur-md shadow-xl overflow-y-auto">
      <div className="p-3 sm:p-4 border-b bg-gray-50 bg-opacity-90">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-xl font-bold text-black">Sample Details</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded text-gray-900 font-bold text-lg"
          >
            ×
          </button>
        </div>
      </div>

      <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
        <div>
          <h3 className="text-lg font-bold mb-2 text-black">{sample.location}</h3>
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
              <div className="text-gray-700 space-y-1">
                <div>Start: {sample.startLatitude.toFixed(4)}, {sample.startLongitude.toFixed(4)}</div>
                <div>End: {sample.endLatitude.toFixed(4)}, {sample.endLongitude.toFixed(4)}</div>
                <div className="font-semibold text-gray-900 mt-1">
                  Distance: {transectDistance.toFixed(1)} km
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-bold mb-3 text-black text-base">Detected Pathogens ({sample.pathogens.length})</h4>
          <div className="space-y-3">
            {sample.pathogens
              .sort((a, b) => b.relativeAbundance - a.relativeAbundance)
              .map((pathogen, idx) => {
                const info = getPathogenInfo(pathogen.species);
                return (
                  <div key={idx} className="border rounded-lg p-3">
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

        <div>
          <h4 className="font-bold mb-2 text-black text-base">Summary Statistics</h4>
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-gray-800 font-medium">Total Reads:</span>
                <div className="font-semibold text-gray-900">
                  {sample.pathogens.reduce((sum, p) => sum + p.readCount, 0).toLocaleString()}
                </div>
              </div>
              <div>
                <span className="text-gray-800 font-medium">Total Abundance:</span>
                <div className="font-semibold text-gray-900">
                  {sample.pathogens.reduce((sum, p) => sum + p.relativeAbundance, 0).toFixed(1)}%
                </div>
              </div>
              <div>
                <span className="text-gray-800 font-medium">High Severity:</span>
                <div className="font-semibold text-red-700">
                  {sample.pathogens.filter(p => p.severity === 'high').length}
                </div>
              </div>
              <div>
                <span className="text-gray-800 font-medium">Medium Severity:</span>
                <div className="font-semibold text-yellow-700">
                  {sample.pathogens.filter(p => p.severity === 'medium').length}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}