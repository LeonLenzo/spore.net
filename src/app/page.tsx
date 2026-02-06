'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SampleDetails from '@/components/SampleDetails';
import { Sample } from '@/data/sampleData';
import { fetchSamples, fetchUniqueYears, fetchUniquePathogens } from '@/lib/dataService';
import { AuthService } from '@/lib/auth';

// Dynamically import the map to avoid SSR issues
const PathogenMap = dynamic(() => import('@/components/PathogenMap'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full">Loading map...</div>
});

export default function Home() {
  const router = useRouter();
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedPathogens, setSelectedPathogens] = useState<string[]>([]);
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);
  const [allSamples, setAllSamples] = useState<Sample[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [availablePathogens, setAvailablePathogens] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(AuthService.getCurrentUser());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const handleLogout = () => {
    AuthService.logout();
    setUser(null);
    router.refresh();
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
    <div className="h-screen flex flex-col relative">
      {/* Header */}
      <header className="bg-white shadow-sm border-b px-3 sm:px-6 py-3 sm:py-4 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Hamburger menu button - all screens */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 hover:bg-gray-100 rounded-md text-gray-900"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">spore.net</h1>
              <p className="text-gray-700 text-xs sm:text-sm font-medium hidden sm:block">Crop Diseases and Where to Find Them</p>
            </div>
          </div>

          {/* User info on desktop only */}
          {user && (
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-gray-900">
                {user.fullName || user.email}
              </p>
              <p className="text-xs text-gray-600 capitalize">{user.role}</p>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
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

      {/* Menu Overlay - portal style at top level */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[9999]">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Menu Panel */}
          <div className="absolute inset-y-0 left-0 w-[85vw] max-w-sm bg-white/95 backdrop-blur-md shadow-2xl flex flex-col">
            {/* Header */}
            <div className="p-4 border-b bg-gray-50 bg-opacity-90 flex items-center justify-between">
              <h2 className="text-lg font-bold text-black">Menu</h2>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 hover:bg-gray-200 rounded text-gray-900 font-bold text-xl"
              >
                ×
              </button>
            </div>

            {/* Content - scrollable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Sample Button at top */}
              {user && (user.role === 'sampler' || user.role === 'admin') && (
                <div>
                  <Link
                    href="/field"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-md text-base font-medium text-center transition-colors"
                  >
                    📍 Sample
                  </Link>
                </div>
              )}

              {/* Year Selection */}
              <div>
                <label className="block text-sm font-bold mb-2 text-black">Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md text-gray-900 font-medium text-sm"
                >
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              {/* Pathogen Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-bold text-black">Pathogens</label>
                  <div className="flex gap-1">
                    <button
                      onClick={handleSelectAll}
                      className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200 font-medium"
                    >
                      All
                    </button>
                    <button
                      onClick={handleClearAll}
                      className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded hover:bg-gray-200 font-medium"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {availablePathogens.map(pathogen => (
                    <label key={pathogen} className="flex items-start gap-2 text-xs cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={selectedPathogens.includes(pathogen)}
                        onChange={() => handlePathogenToggle(pathogen)}
                        className="mt-1 rounded"
                      />
                      <span className="flex-1 font-medium text-gray-900">{pathogen}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Admin links at bottom */}
            {user && user.role === 'admin' && (
              <div className="p-4 border-t bg-gray-50 bg-opacity-90 space-y-2">
                <Link
                  href="/admin/data"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium text-center transition-colors"
                >
                  Manage Data
                </Link>
                <Link
                  href="/admin/pathogens"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium text-center transition-colors"
                >
                  Manage Pathogens
                </Link>
              </div>
            )}

            {/* Logout button */}
            {user && (
              <div className="p-4 border-t">
                <button
                  onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </>
      )}

    </div>
  );
}