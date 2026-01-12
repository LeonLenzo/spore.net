'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import ControlPanel from '@/components/ControlPanel';
import SampleDetails from '@/components/SampleDetails';
import { Sample } from '@/data/sampleData';
import { fetchSamples, fetchUniqueYears, fetchUniquePathogens } from '@/lib/dataService';

// Dynamically import the map to avoid SSR issues
const PathogenMap = dynamic(() => import('@/components/PathogenMap'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full">Loading map...</div>
});

export default function Home() {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedPathogens, setSelectedPathogens] = useState<string[]>([]);
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);
  const [allSamples, setAllSamples] = useState<Sample[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [availablePathogens, setAvailablePathogens] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        // Load data in parallel
        const [samples, years, pathogens] = await Promise.all([
          fetchSamples(),
          fetchUniqueYears(),
          fetchUniquePathogens()
        ]);

        setAllSamples(samples);
        setAvailableYears(years);
        setAvailablePathogens(pathogens);

        // Set initial year to the most recent
        if (years.length > 0) {
          setSelectedYear(years[0]);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handlePathogenToggle = (pathogen: string) => {
    setSelectedPathogens(prev =>
      prev.includes(pathogen)
        ? prev.filter(p => p !== pathogen)
        : [...prev, pathogen]
    );
  };

  const handleSelectAll = () => {
    setSelectedPathogens(availablePathogens);
  };

  const handleClearAll = () => {
    setSelectedPathogens([]);
  };


  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading pathogen data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">spore.net</h1>
            <p className="text-gray-700 text-sm font-medium">Crop Diseases and Where to Find Them</p>
          </div>
          <Link
            href="/admin"
            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Admin
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
        <ControlPanel
          selectedYear={selectedYear}
          selectedPathogens={selectedPathogens}
          availableYears={availableYears}
          availablePathogens={availablePathogens}
          onYearChange={setSelectedYear}
          onPathogenToggle={handlePathogenToggle}
          onClearAll={handleClearAll}
          onSelectAll={handleSelectAll}
        />

        <div className="flex-1 relative">
          <PathogenMap
            selectedYear={selectedYear}
            selectedPathogens={selectedPathogens}
            onSampleSelect={setSelectedSample}
            samples={allSamples}
            selectedSample={selectedSample}
          />

          {selectedSample && (
            <SampleDetails
              sample={selectedSample}
              onClose={() => setSelectedSample(null)}
            />
          )}
        </div>
      </div>

    </div>
  );
}