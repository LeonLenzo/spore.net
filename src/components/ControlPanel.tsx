'use client';

import { useState } from 'react';
import { pathogens, pathogenColors } from '@/data/sampleData';

interface ControlPanelProps {
  selectedYear: number;
  selectedPathogens: string[];
  availableYears: number[];
  availablePathogens: string[];
  onYearChange: (year: number) => void;
  onPathogenToggle: (pathogen: string) => void;
  onClearAll: () => void;
  onSelectAll: () => void;
}

export default function ControlPanel({
  selectedYear,
  selectedPathogens,
  availableYears,
  availablePathogens,
  onYearChange,
  onPathogenToggle,
  onClearAll,
  onSelectAll
}: ControlPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Only include pathogens that are available in the current dataset
  const groupedPathogens = pathogens
    .filter(pathogen => availablePathogens.includes(pathogen.species))
    .reduce((acc, pathogen) => {
      if (!acc[pathogen.category]) {
        acc[pathogen.category] = [];
      }
      acc[pathogen.category].push(pathogen);
      return acc;
    }, {} as Record<string, typeof pathogens>);

  return (
    <>
      {/* Mobile: Absolute positioned overlay */}
      <div className={`md:hidden absolute top-0 left-0 z-10 bg-white shadow-lg transition-all duration-300 ${
        isCollapsed ? 'w-12' : 'w-[85vw] max-w-xs'
      } h-full overflow-hidden`}>
        <div className="p-3 border-b bg-white">
          <div className="flex items-center justify-between">
            {!isCollapsed && <h2 className="text-base font-bold text-black">Controls</h2>}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 hover:bg-gray-100 rounded text-gray-900 font-bold text-lg"
            >
              {isCollapsed ? '→' : '←'}
            </button>
          </div>
        </div>

        {!isCollapsed && (
          <div className="p-3 space-y-4 overflow-y-auto" style={{ height: 'calc(100% - 60px)' }}>
            {/* Year Selection */}
            <div>
              <label className="block text-sm font-bold mb-2 text-black">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => onYearChange(Number(e.target.value))}
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
                    onClick={onSelectAll}
                    className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200 font-medium"
                  >
                    All
                  </button>
                  <button
                    onClick={onClearAll}
                    className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded hover:bg-gray-200 font-medium"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {Object.entries(groupedPathogens).map(([category, categoryPathogens]) => (
                  <div key={category}>
                    <h4 className="text-xs font-bold text-black mb-1">{category}</h4>
                    <div className="space-y-1">
                      {categoryPathogens.map(pathogen => (
                        <label key={pathogen.species} className="flex items-start gap-2 text-xs cursor-pointer hover:bg-gray-50 p-1 rounded">
                          <input
                            type="checkbox"
                            checked={selectedPathogens.includes(pathogen.species)}
                            onChange={() => onPathogenToggle(pathogen.species)}
                            className="mt-1 rounded"
                          />
                          <div className="flex-1 rounded px-2 py-1" style={{backgroundColor: pathogenColors[pathogen.species] + '20'}}>
                            <div className="font-bold text-gray-900">{pathogen.commonName}</div>
                            <div className="text-gray-800 text-[10px] italic font-semibold">{pathogen.species}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Desktop: Normal sidebar */}
      <div className={`hidden md:block bg-white shadow-lg transition-all duration-300 ${
        isCollapsed ? 'w-12' : 'w-80'
      } h-full overflow-hidden`}>
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            {!isCollapsed && <h2 className="text-lg font-bold text-black">Controls</h2>}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 hover:bg-gray-100 rounded text-gray-900 font-bold text-lg"
            >
              {isCollapsed ? '→' : '←'}
            </button>
          </div>
        </div>

        {!isCollapsed && (
          <div className="p-4 space-y-6 overflow-y-auto h-full">
            {/* Year Selection */}
            <div>
              <label className="block text-sm font-bold mb-2 text-black">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => onYearChange(Number(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-md text-gray-900 font-medium"
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
                    onClick={onSelectAll}
                    className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200 font-medium"
                  >
                    All
                  </button>
                  <button
                    onClick={onClearAll}
                    className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded hover:bg-gray-200 font-medium"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {Object.entries(groupedPathogens).map(([category, categoryPathogens]) => (
                  <div key={category}>
                    <h4 className="text-sm font-bold text-black mb-2">{category}</h4>
                    <div className="space-y-1">
                      {categoryPathogens.map(pathogen => (
                        <label key={pathogen.species} className="flex items-start gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded">
                          <input
                            type="checkbox"
                            checked={selectedPathogens.includes(pathogen.species)}
                            onChange={() => onPathogenToggle(pathogen.species)}
                            className="mt-1 rounded"
                          />
                          <div className="flex-1 rounded px-2 py-1" style={{backgroundColor: pathogenColors[pathogen.species] + '20'}}>
                            <div className="font-bold text-gray-900">{pathogen.commonName}</div>
                            <div className="text-gray-800 text-xs italic font-semibold">{pathogen.species}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </>
  );
}