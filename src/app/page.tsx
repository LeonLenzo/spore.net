'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SampleDetails from '@/components/SampleDetails';
import { Sample, pathogens } from '@/data/sampleData';
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
  const [selectedDiseaseTypes, setSelectedDiseaseTypes] = useState<string[]>(['Rust', 'Fusarium', 'Leaf Spot']);
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

  const handleDiseaseTypeToggle = (diseaseType: string) => {
    setSelectedDiseaseTypes(prev =>
      prev.includes(diseaseType)
        ? prev.filter(t => t !== diseaseType)
        : [...prev, diseaseType]
    );
  };

  const handleLogout = () => {
    AuthService.logout();
    setUser(null);
    router.refresh();
  };

  // Group pathogens by category
  const groupedPathogens = pathogens.reduce((acc, pathogen) => {
    if (!acc[pathogen.category]) {
      acc[pathogen.category] = [];
    }
    acc[pathogen.category].push(pathogen.species);
    return acc;
  }, {} as Record<string, string[]>);


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

            <Link href="/" className="cursor-pointer hover:opacity-80 transition-opacity">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">spore.net</h1>
              <p className="text-gray-700 text-xs sm:text-sm font-medium hidden sm:block">Crop Diseases and Where to Find Them</p>
            </Link>
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
      <div className="flex-1 flex flex-col">
        <div className="flex-1 relative">
          <PathogenMap
            selectedYear={selectedYear}
            selectedPathogens={selectedPathogens}
            selectedDiseaseTypes={selectedDiseaseTypes}
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

        {/* Disease Type Filter - Bottom */}
        <div className="bg-white border-t px-6 py-3">
          <div className="flex items-center justify-center gap-4">
            <span className="text-sm font-medium text-gray-700">Filter by type:</span>
            <button
              onClick={() => handleDiseaseTypeToggle('Rust')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedDiseaseTypes.includes('Rust')
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Rust
            </button>
            <button
              onClick={() => handleDiseaseTypeToggle('Fusarium')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedDiseaseTypes.includes('Fusarium')
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Fusarium
            </button>
            <button
              onClick={() => handleDiseaseTypeToggle('Leaf Spot')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedDiseaseTypes.includes('Leaf Spot')
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Leaf Spot
            </button>
          </div>
        </div>
      </div>

      {/* Menu Panel - no backdrop, map remains clickable */}
      {mobileMenuOpen && (
          <div className="fixed top-0 bottom-0 left-0 w-[85vw] max-w-sm bg-white/30 backdrop-blur-md shadow-2xl flex flex-col z-[9999] mt-[60px]">
            {/* Header Card */}
            <div className="mx-3 mt-3 mb-2">
              <div className="bg-white rounded-lg p-4 shadow-md flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Menu</h2>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded text-gray-900 font-bold text-xl"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Content - scrollable */}
            <div className="flex-1 overflow-y-auto px-3 space-y-3">
              {/* Sample Button */}
              {user && (user.role === 'sampler' || user.role === 'admin') && (
                <div className="bg-white rounded-lg p-3 shadow-md">
                  <Link
                    href="/sample"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-md text-base font-medium text-center transition-colors"
                  >
                    📍 Samples
                  </Link>
                </div>
              )}

              {/* Year Selection Card */}
              <div className="bg-white rounded-lg p-3 shadow-md">
                <label className="block text-sm font-bold mb-2 text-gray-900">Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md text-gray-900 font-medium text-sm bg-white"
                >
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              {/* Pathogen Selection Card */}
              <div className="bg-white rounded-lg p-3 shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-bold text-gray-900">Pathogens</label>
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

                <div className="space-y-4">
                  {Object.entries(groupedPathogens).map(([category, pathogenList]) => (
                    <div key={category}>
                      <h3 className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">{category}</h3>
                      <div className="space-y-2">
                        {pathogenList.filter(p => availablePathogens.includes(p)).map(pathogen => {
                          const pathogenInfo = pathogens.find(p => p.species === pathogen);
                          return (
                            <label key={pathogen} className="flex items-start gap-2 text-xs cursor-pointer hover:bg-gray-50 p-2 rounded">
                              <input
                                type="checkbox"
                                checked={selectedPathogens.includes(pathogen)}
                                onChange={() => handlePathogenToggle(pathogen)}
                                className="mt-1 rounded"
                              />
                              <span className="flex-1 font-medium text-gray-900">{pathogenInfo?.commonName || pathogen}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Admin links Card */}
              {user && user.role === 'admin' && (
                <div className="bg-white rounded-lg p-3 shadow-md space-y-2">
                  <Link
                    href="/pathogens"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium text-center transition-colors"
                  >
                    Manage Pathogens
                  </Link>
                </div>
              )}
            </div>

            {/* Logout or Login button - fixed at bottom */}
            <div className="p-3 mb-3">
              <div className="bg-white rounded-lg p-3 shadow-md">
                {user ? (
                  <button
                    onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Logout
                  </button>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium text-center transition-colors"
                  >
                    Login
                  </Link>
                )}
              </div>
            </div>
          </div>
      )}

    </div>
  );
}