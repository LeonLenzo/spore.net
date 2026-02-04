'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
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

export default function FieldCollectionPage() {
  const router = useRouter();
  const [status, setStatus] = useState<CollectionStatus>('idle');
  const [sampleId, setSampleId] = useState('');
  const [currentPosition, setCurrentPosition] = useState<GPSPosition | null>(null);
  const [startPosition, setStartPosition] = useState<GPSPosition | null>(null);
  const [trackingPoints, setTrackingPoints] = useState<GPSPosition[]>([]);
  const [error, setError] = useState('');
  const [gpsError, setGpsError] = useState('');
  const [useManualEntry, setUseManualEntry] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  // Get current user
  const user = AuthService.getCurrentUser();

  // Start GPS tracking
  useEffect(() => {
    if (status === 'recording' && !useManualEntry) {
      if (!navigator.geolocation) {
        setGpsError('GPS not supported on this device');
        setUseManualEntry(true);
        return;
      }

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
              return [...prev, gpsPos];
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
      };
    }
  }, [status, useManualEntry]);

  const handleStartSample = () => {
    setStatus('confirming');
    setError('');
  };

  const handleConfirmStart = async () => {
    if (!sampleId.trim()) {
      setError('Please enter a sample ID');
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

    // Try to get initial GPS position
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
          setStatus('recording');
        },
        (error) => {
          console.error('GPS error:', error);
          setGpsError(`Could not get GPS: ${error.message}`);
          setUseManualEntry(true);
          setStatus('recording');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setStatus('recording');
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

    setStatus('saving');

    try {
      const now = new Date().toISOString();

      // Insert sampling route
      const { data: route, error: routeError } = await supabase
        .from('sampling_routes')
        .insert({
          sample_id: sampleId.trim(),
          start_name: 'Field Location',
          end_name: 'Field Location',
          start_latitude: startPosition.latitude,
          start_longitude: startPosition.longitude,
          end_latitude: currentPosition.latitude,
          end_longitude: currentPosition.longitude,
          collection_date: now.split('T')[0],
          collection_start_time: new Date(startPosition.timestamp).toISOString(),
          collection_end_time: now,
          created_by: user?.id
        })
        .select()
        .single();

      if (routeError) throw routeError;

      // Insert GPS tracking points
      if (trackingPoints.length > 0 && route) {
        const points = trackingPoints.map(point => ({
          route_id: route.id,
          latitude: point.latitude,
          longitude: point.longitude,
          accuracy: point.accuracy,
          recorded_at: new Date(point.timestamp).toISOString(),
          recorded_by: user?.id
        }));

        const { error: pointsError } = await supabase
          .from('gps_tracking_points')
          .insert(points);

        if (pointsError) {
          console.error('Error saving GPS points:', pointsError);
          // Don't fail the whole operation for this
        }
      }

      // Reset and redirect
      alert(`Sample ${sampleId} saved successfully!`);
      setSampleId('');
      setStartPosition(null);
      setCurrentPosition(null);
      setTrackingPoints([]);
      setStatus('idle');
      router.push('/admin/data');
    } catch (err) {
      console.error('Error saving sample:', err);
      setError('Failed to save sample. Please try again.');
      setStatus('recording');
    }
  };

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel this sample collection?')) {
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
    <RoleGuard requiredRole="sampler">
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm z-10">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Field Collection</h1>
              <p className="text-sm text-gray-600">
                {user?.fullName || user?.email}
                {status === 'recording' && sampleId && (
                  <span className="ml-2 text-blue-600 font-medium">
                    • Recording: {sampleId}
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              {user?.role === 'admin' && (
                <button
                  onClick={() => router.push('/admin')}
                  className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-md"
                >
                  Admin
                </button>
              )}
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Map View */}
          <div className="flex-1 relative">
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
          <div className="w-full lg:w-96 bg-white border-t lg:border-t-0 lg:border-l border-gray-200 p-6 overflow-y-auto">
            {status === 'idle' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Ready to Start
                  </h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Begin a new sampling trip. Your location will be tracked automatically.
                  </p>
                </div>

                <button
                  onClick={handleStartSample}
                  className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-lg transition-colors"
                >
                  Begin Sample
                </button>

                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={() => router.push('/')}
                    className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm"
                  >
                    View Map
                  </button>
                </div>
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
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                    <span className="font-semibold text-blue-900">Recording</span>
                  </div>
                  <p className="text-sm text-blue-800 font-mono">{sampleId}</p>
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

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleCancel}
                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEndSample}
                    disabled={!startPosition || !currentPosition}
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
    </RoleGuard>
  );
}
