'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import RoleGuard from '@/components/RoleGuard';
import { AuthService } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// Dynamically import map component (client-side only)
const FieldMap = dynamic(() => import('@/components/FieldMap'), {
  ssr: false,
  loading: () => <div className="h-full flex items-center justify-center">Loading map...</div>
});

interface GPSPosition {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

type CollectionStatus = 'idle' | 'confirming' | 'recording' | 'saving';

const LOCAL_STORAGE_KEY = 'field_collection_session';

interface SavedSession {
  sampleId: string;
  status: CollectionStatus;
  startPosition: GPSPosition | null;
  currentPosition: GPSPosition | null;
  trackingPoints: GPSPosition[];
  startTime: number;
  startLocationName?: string;
  endLocationName?: string;
}

export default function CollectTab() {
  const router = useRouter();
  const [status, setStatus] = useState<CollectionStatus>('idle');
  const [sampleId, setSampleId] = useState('');
  const [startLocationName, setStartLocationName] = useState('');
  const [endLocationName, setEndLocationName] = useState('');
  const [currentPosition, setCurrentPosition] = useState<GPSPosition | null>(null);
  const [startPosition, setStartPosition] = useState<GPSPosition | null>(null);
  const [trackingPoints, setTrackingPoints] = useState<GPSPosition[]>([]);
  const [error, setError] = useState('');
  const [gpsError, setGpsError] = useState('');
  const [useManualEntry, setUseManualEntry] = useState(false);
  const [sessionRecovered, setSessionRecovered] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get current user
  const user = AuthService.getCurrentUser();

  // Recover session on mount - but only if explicitly in recording state
  useEffect(() => {
    const savedSession = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedSession) {
      try {
        const session: SavedSession = JSON.parse(savedSession);
        // Only recover if it's an active recording session with valid data
        if (
          session.status === 'recording' &&
          session.sampleId?.trim() &&
          session.trackingPoints.length > 0
        ) {
          // Ask user if they want to continue
          const shouldRecover = confirm(
            `You have an active sampling session for "${session.sampleId}" with ${session.trackingPoints.length} GPS points. Do you want to continue this session?`
          );

          if (shouldRecover) {
            setSampleId(session.sampleId);
            setStartLocationName(session.startLocationName || '');
            setEndLocationName(session.endLocationName || '');
            setStatus('recording');
            setStartPosition(session.startPosition);
            setCurrentPosition(session.currentPosition);
            setTrackingPoints(session.trackingPoints);
            setSessionRecovered(true);
            console.log('Session recovered:', session.trackingPoints.length, 'points');
          } else {
            // User chose not to continue - clear the session
            localStorage.removeItem(LOCAL_STORAGE_KEY);
          }
        } else {
          // Not a valid recording session - clear it
          console.log('Clearing invalid session:', session);
          localStorage.removeItem(LOCAL_STORAGE_KEY);
        }
      } catch (e) {
        console.error('Failed to recover session:', e);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    }
  }, []);

  // Auto-save session to localStorage
  useEffect(() => {
    if (status === 'recording') {
      const saveSession = () => {
        const session: SavedSession = {
          sampleId,
          status,
          startPosition,
          currentPosition,
          trackingPoints,
          startTime: Date.now(),
          startLocationName,
          endLocationName
        };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(session));
        console.log(`Session saved: ${trackingPoints.length} points`);
      };

      // Save immediately
      saveSession();

      // Then save every 10 seconds
      saveIntervalRef.current = setInterval(saveSession, 10000);

      return () => {
        if (saveIntervalRef.current) {
          clearInterval(saveIntervalRef.current);
        }
      };
    }
  }, [status, sampleId, startPosition, currentPosition, trackingPoints, startLocationName, endLocationName]);

  // Start GPS tracking with background support
  useEffect(() => {
    if ((status === 'recording' || status === 'idle') && !useManualEntry) {
      if (!navigator.geolocation) {
        setGpsError('GPS not supported on this device');
        setUseManualEntry(true);
        return;
      }

      // Request wake lock to keep screen on (if supported)
      let wakeLock: any = null;
      const requestWakeLock = async () => {
        try {
          if ('wakeLock' in navigator) {
            wakeLock = await (navigator as any).wakeLock.request('screen');
            console.log('Wake lock activated');
          }
        } catch (err) {
          console.log('Wake lock not supported or denied:', err);
        }
      };
      requestWakeLock();

      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const gpsPos: GPSPosition = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          };
          setCurrentPosition(gpsPos);
          setGpsError('');

          // Add to tracking points every 30 seconds
          setTrackingPoints(prev => {
            const lastPoint = prev[prev.length - 1];
            if (!lastPoint || position.timestamp - lastPoint.timestamp > 30000) {
              const newPoints = [...prev, gpsPos];
              // Also save to localStorage immediately
              const session: SavedSession = {
                sampleId,
                status: 'recording',
                startPosition,
                currentPosition: gpsPos,
                trackingPoints: newPoints,
                startTime: Date.now()
              };
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(session));
              return newPoints;
            }
            return prev;
          });
        },
        (error) => {
          console.error('GPS error:', error);
          setGpsError(`GPS error: ${error.message}`);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 5000
        }
      );

      return () => {
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
        if (wakeLock) {
          wakeLock.release();
          console.log('Wake lock released');
        }
      };
    }
  }, [status, useManualEntry, sampleId, startPosition]);

  const handleStartSample = async () => {
    if (!sampleId.trim()) {
      setError('Please enter a sample ID');
      return;
    }

    if (!startLocationName.trim()) {
      setError('Please enter a start location name');
      return;
    }

    // Check if sample ID already exists
    const { data: existing } = await supabase
      .from('sampling_routes')
      .select('id')
      .eq('sample_id', sampleId.trim())
      .single();

    if (existing) {
      setError('This sample ID already exists. Please use a different ID.');
      return;
    }

    // Try to get initial GPS position and start recording immediately
    if (navigator.geolocation && !useManualEntry) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos: GPSPosition = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          };
          setStartPosition(pos);
          setCurrentPosition(pos);
          setTrackingPoints([pos]);
          setStatus('recording'); // Start recording immediately
          setError('');
        },
        (error) => {
          console.error('GPS error:', error);
          let errorMessage = 'Could not get GPS location. ';
          if (error.code === 1) {
            errorMessage += 'Location permission denied.';
          } else if (error.code === 2) {
            errorMessage += 'Location unavailable.';
          } else if (error.code === 3) {
            errorMessage += 'Location request timed out.';
          } else {
            errorMessage += error.message || 'Unknown error.';
          }
          setGpsError(errorMessage + ' Using manual entry mode.');
          setUseManualEntry(true);
          setStatus('recording');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setStatus('recording'); // Start recording immediately even with manual entry
      setError('');
    }
  };

  const handleManualPosition = (lat: number, lng: number, isStart: boolean) => {
    const pos: GPSPosition = {
      latitude: lat,
      longitude: lng,
      timestamp: Date.now()
    };

    if (isStart) {
      setStartPosition(pos);
      setTrackingPoints([pos]);
    } else {
      setCurrentPosition(pos);
    }
  };

  const handleEndSample = async () => {
    if (!startPosition || !currentPosition) {
      setError('Missing start or end position');
      return;
    }

    if (!endLocationName.trim()) {
      setError('Please enter an end location name');
      setStatus('recording');
      return;
    }

    setStatus('saving');

    try {
      // Call API endpoint instead of directly using Supabase
      const response = await fetch('/api/samples', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sampleId,
          startLocationName,
          endLocationName,
          startPosition,
          currentPosition,
          trackingPoints,
          userId: user?.id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save sample');
      }

      // Clear localStorage after successful save
      localStorage.removeItem(LOCAL_STORAGE_KEY);

      // Reset and redirect
      alert(`Sample ${sampleId} saved successfully! ${trackingPoints.length} GPS points recorded.`);
      setSampleId('');
      setStartLocationName('');
      setEndLocationName('');
      setStartPosition(null);
      setCurrentPosition(null);
      setTrackingPoints([]);
      setStatus('idle');
      // Stay on the Collect tab, don't redirect
    } catch (err: any) {
      console.error('Error saving sample:', err);
      setError(err.message || 'Failed to save sample. Please try again. Data is saved locally.');
      setStatus('recording');
    }
  };

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel this sample collection? All tracking data will be lost.')) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setSampleId('');
      setStartPosition(null);
      setCurrentPosition(null);
      setTrackingPoints([]);
      setStatus('idle');
      setError('');
      setGpsError('');
    }
  };

  const handleLogout = () => {
    AuthService.logout();
    router.push('/login');
  };

  return (
        <div className="h-full flex flex-col overflow-hidden bg-gray-50">
          {/* Start Sampling Form - Only show in idle state */}
          {status === 'idle' && (
            <div className="bg-white border-b px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sample ID *</label>
                  <input
                    type="text"
                    value={sampleId}
                    onChange={(e) => setSampleId(e.target.value)}
                    placeholder="e.g., 25_01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Location *</label>
                  <input
                    type="text"
                    value={startLocationName}
                    onChange={(e) => setStartLocationName(e.target.value)}
                    placeholder="e.g., Lake Grace"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                  />
                </div>
                <button
                  onClick={handleStartSample}
                  disabled={!sampleId.trim() || !startLocationName.trim()}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Start Recording
                </button>
              </div>
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Map View */}
          <div className="flex-1 relative min-h-[50vh] lg:min-h-0">
            <FieldMap
              currentPosition={currentPosition}
              startPosition={startPosition}
              trackingPoints={trackingPoints}
              isRecording={status === 'recording'}
              onManualPosition={useManualEntry ? handleManualPosition : undefined}
            />

            {gpsError && (
              <div className="absolute top-4 left-4 right-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">{gpsError}</p>
                {!useManualEntry && (
                  <button
                    onClick={() => setUseManualEntry(true)}
                    className="mt-2 text-sm text-yellow-900 underline"
                  >
                    Switch to manual entry
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Control Panel */}
          <div className="lg:w-96 bg-white border-t lg:border-t-0 lg:border-l border-gray-200 p-4 sm:p-6 overflow-y-auto max-h-[40vh] lg:max-h-none">
            {status === 'idle' && (
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                    Current Location
                  </h2>
                </div>

                {currentPosition ? (
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                    <p className="text-xs sm:text-sm font-medium text-gray-700 mb-2">GPS Coordinates</p>
                    <p className="text-base sm:text-lg font-mono text-gray-900">
                      {currentPosition.latitude.toFixed(6)}
                    </p>
                    <p className="text-base sm:text-lg font-mono text-gray-900">
                      {currentPosition.longitude.toFixed(6)}
                    </p>
                    {currentPosition.accuracy && (
                      <p className="text-xs text-gray-500 mt-2">
                        Accuracy: ±{currentPosition.accuracy.toFixed(1)}m
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4 text-center">
                    <p className="text-xs sm:text-sm text-gray-600">Getting GPS location...</p>
                    <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-gray-600 mx-auto mt-2"></div>
                  </div>
                )}
              </div>
            )}

            {status === 'confirming' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Enter Sample ID
                  </h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Enter a unique identifier for this sampling route.
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sample ID
                  </label>
                  <input
                    type="text"
                    value={sampleId}
                    onChange={(e) => setSampleId(e.target.value)}
                    placeholder="e.g., 26_01"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 text-lg font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStatus('idle')}
                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmStart}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                  >
                    Start Recording
                  </button>
                </div>
              </div>
            )}

            {status === 'recording' && (
              <div className="space-y-4">
                {sessionRecovered && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-800">
                      ✓ Session recovered! Continuing from {trackingPoints.length} saved points.
                    </p>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                    <span className="font-semibold text-blue-900">Recording</span>
                    <span className="text-xs text-blue-700 ml-auto">Auto-saving...</span>
                  </div>
                  <p className="text-sm text-blue-800 font-mono">{sampleId}</p>
                  <p className="text-xs text-blue-600 mt-1">
                    Safe to close browser - data saves automatically
                  </p>
                </div>

                {startPosition && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Start Position</h3>
                    <p className="text-xs font-mono text-gray-600">
                      {startPosition.latitude.toFixed(6)}, {startPosition.longitude.toFixed(6)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(startPosition.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                )}

                {currentPosition && currentPosition !== startPosition && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Current Position</h3>
                    <p className="text-xs font-mono text-gray-600">
                      {currentPosition.latitude.toFixed(6)}, {currentPosition.longitude.toFixed(6)}
                    </p>
                    {currentPosition.accuracy && (
                      <p className="text-xs text-gray-500 mt-1">
                        Accuracy: ±{currentPosition.accuracy.toFixed(1)}m
                      </p>
                    )}
                  </div>
                )}

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Tracking points:</span> {trackingPoints.length}
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                {/* End Location Input */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    End Location *
                  </label>
                  <input
                    type="text"
                    value={endLocationName}
                    onChange={(e) => setEndLocationName(e.target.value)}
                    placeholder="e.g., Kondinin"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Enter end location before finishing
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleCancel}
                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEndSample}
                    disabled={!startPosition || !currentPosition || !endLocationName.trim()}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    End Sample
                  </button>
                </div>
              </div>
            )}

            {status === 'saving' && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600">Saving sample data...</p>
              </div>
            )}
          </div>
        </div>
        </div>
  );
}
