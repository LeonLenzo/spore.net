'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import MetabarcodeUpload from '@/components/MetabarcodeUpload';
import dynamic from 'next/dynamic';

const RouteMap = dynamic(() => import('@/components/RouteMap'), {
  ssr: false,
  loading: () => <div className="h-full flex items-center justify-center bg-gray-100">Loading map...</div>
});

interface SamplingRoute {
  id: string;
  sample_id: string;
  start_name: string;
  end_name: string;
  start_latitude: number;
  start_longitude: number;
  end_latitude: number;
  end_longitude: number;
  collection_date: string;
  year: number;
  created_at: string;
}

interface PathogenDetection {
  id: string;
  route_id: string;
  pathogen_species_id: string;
  read_count: number;
  pathogen_species?: {
    species_name: string;
    common_name: string;
    disease_type: string;
  };
}

interface PathogenSpecies {
  id: string;
  species_name: string;
  common_name: string;
  disease_type: string;
}

interface ManageTabProps {
  readOnly?: boolean;
  sampleId?: string;
}

export default function ManageTab({ readOnly = false, sampleId }: ManageTabProps) {
  const [routes, setRoutes] = useState<SamplingRoute[]>([]);
  const [pathogens, setPathogens] = useState<PathogenSpecies[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState<SamplingRoute | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<SamplingRoute | null>(null);
  const [detections, setDetections] = useState<PathogenDetection[]>([]);

  const [routeFormData, setRouteFormData] = useState({
    sample_id: '',
    start_name: '',
    end_name: '',
    start_latitude: '',
    start_longitude: '',
    end_latitude: '',
    end_longitude: '',
    collection_date: ''
  });

  const [detectionFormData, setDetectionFormData] = useState({
    pathogen_species_id: '',
    read_count: ''
  });

  // Load data
  useEffect(() => {
    loadRoutes();
    loadPathogens();
  }, []);

  // Auto-select route if sampleId is provided
  useEffect(() => {
    if (sampleId && routes.length > 0) {
      const route = routes.find(r => r.sample_id === sampleId);
      if (route) {
        setSelectedRoute(route);
        loadDetections(route.id);
      }
    }
  }, [sampleId, routes]);

  const loadRoutes = async () => {
    try {
      setLoading(true);
      console.log('Loading routes from API...');
      const response = await fetch('/api/samples');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load routes');
      }

      console.log('Routes loaded:', data.routes?.length || 0);
      setRoutes(data.routes || []);
    } catch (error) {
      console.error('Error loading routes:', error);
      alert('Failed to load sampling routes: ' + (error as any)?.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPathogens = async () => {
    try {
      const { data, error } = await supabase
        .from('pathogen_species')
        .select('*')
        .order('disease_type, species_name');

      if (error) throw error;
      setPathogens(data || []);
    } catch (error) {
      console.error('Error loading pathogens:', error);
    }
  };

  const loadDetections = async (routeId: string) => {
    try {
      const { data, error } = await supabase
        .from('pathogen_detections')
        .select(`
          *,
          pathogen_species (
            species_name,
            common_name,
            disease_type
          )
        `)
        .eq('route_id', routeId)
        .order('read_count', { ascending: false });

      if (error) throw error;
      setDetections(data || []);
    } catch (error) {
      console.error('Error loading detections:', error);
      alert('Failed to load pathogen detections');
    }
  };

  const handleRouteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const requiredFields = ['sample_id', 'start_name', 'end_name', 'start_latitude', 'start_longitude', 'end_latitude', 'end_longitude', 'collection_date'];
    for (const field of requiredFields) {
      if (!routeFormData[field as keyof typeof routeFormData]?.toString().trim()) {
        alert(`Please fill in ${field.replace('_', ' ')}`);
        return;
      }
    }

    try {
      const routeData = {
        sample_id: routeFormData.sample_id.trim(),
        start_name: routeFormData.start_name.trim(),
        end_name: routeFormData.end_name.trim(),
        start_latitude: parseFloat(routeFormData.start_latitude),
        start_longitude: parseFloat(routeFormData.start_longitude),
        end_latitude: parseFloat(routeFormData.end_latitude),
        end_longitude: parseFloat(routeFormData.end_longitude),
        collection_date: routeFormData.collection_date
      };

      if (editingRoute) {
        const { error } = await supabase
          .from('sampling_routes')
          .update(routeData)
          .eq('id', editingRoute.id);

        if (error) throw error;
        alert('Sampling route updated successfully');
      } else {
        const { error } = await supabase
          .from('sampling_routes')
          .insert(routeData);

        if (error) throw error;
        alert('Sampling route added successfully');
      }

      resetRouteForm();
      loadRoutes();
    } catch (error) {
      console.error('Error saving route:', error);
      const err = error as { code?: string; message?: string };
      if (err.code === '23505') {
        alert('A sampling route with this sample ID already exists');
      } else {
        alert('Failed to save sampling route: ' + (err.message || 'Unknown error'));
      }
    }
  };

  const handleDetectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRoute || !detectionFormData.pathogen_species_id || !detectionFormData.read_count) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('pathogen_detections')
        .insert({
          route_id: selectedRoute.id,
          pathogen_species_id: detectionFormData.pathogen_species_id,
          read_count: parseInt(detectionFormData.read_count)
        });

      if (error) throw error;

      alert('Pathogen detection added successfully');
      setDetectionFormData({ pathogen_species_id: '', read_count: '' });
      loadDetections(selectedRoute.id);
    } catch (error) {
      console.error('Error saving detection:', error);
      const err = error as { code?: string; message?: string };
      if (err.code === '23505') {
        alert('This pathogen detection already exists for this route');
      } else {
        alert('Failed to save pathogen detection: ' + (err.message || 'Unknown error'));
      }
    }
  };

  const handleEditRoute = (route: SamplingRoute) => {
    setEditingRoute(route);
    setRouteFormData({
      sample_id: route.sample_id,
      start_name: route.start_name,
      end_name: route.end_name,
      start_latitude: route.start_latitude.toString(),
      start_longitude: route.start_longitude.toString(),
      end_latitude: route.end_latitude.toString(),
      end_longitude: route.end_longitude.toString(),
      collection_date: route.collection_date
    });
    setShowAddForm(true);
  };

  const handleDeleteRoute = async (route: SamplingRoute) => {
    if (!confirm(`Are you sure you want to delete route "${route.sample_id}"? This will also delete all associated pathogen detections.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/samples?id=${route.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete route');
      }

      alert('Sampling route deleted successfully');
      loadRoutes();

      if (selectedRoute?.id === route.id) {
        setSelectedRoute(null);
        setDetections([]);
      }
    } catch (error) {
      console.error('Error deleting route:', error);
      const err = error as { message?: string };
      alert('Failed to delete sampling route: ' + (err.message || 'Unknown error'));
    }
  };

  const handleDeleteDetection = async (detection: PathogenDetection) => {
    if (!confirm('Are you sure you want to delete this pathogen detection?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('pathogen_detections')
        .delete()
        .eq('id', detection.id);

      if (error) throw error;
      alert('Pathogen detection deleted successfully');

      if (selectedRoute) {
        loadDetections(selectedRoute.id);
      }
    } catch (error) {
      console.error('Error deleting detection:', error);
      const err = error as { message?: string };
      alert('Failed to delete pathogen detection: ' + (err.message || 'Unknown error'));
    }
  };

  const resetRouteForm = () => {
    setRouteFormData({
      sample_id: '',
      start_name: '',
      end_name: '',
      start_latitude: '',
      start_longitude: '',
      end_latitude: '',
      end_longitude: '',
      collection_date: ''
    });
    setShowAddForm(false);
    setEditingRoute(null);
  };

  const handleRouteSelect = (route: SamplingRoute) => {
    setSelectedRoute(route);
    loadDetections(route.id);
  };

  if (loading) {
    return (
        <div className="h-full bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading sample data...</p>
          </div>
        </div>
    );
  }

  return (
      <div className="h-full flex flex-col">
        {/* Top Section: Map and Sidebar */}
        <div className="flex-1 flex overflow-hidden">
          {/* Map - Left Side */}
          <div className="flex-1 relative">
            <RouteMap
              key={selectedRoute?.id || 'all'}
              routes={routes}
              selectedRoute={selectedRoute}
            />
          </div>

          {/* Sidebar - Right Side */}
          {!readOnly && (
            <div className="w-80 bg-white border-l overflow-y-auto">
              <div className="px-4 py-5 border-b">
                <h3 className="text-lg font-medium text-gray-900">
                  Samples ({routes.length})
                </h3>
              </div>
              <ul className="divide-y divide-gray-200">
                {routes.map((route) => (
                  <li
                    key={route.id}
                    className={`cursor-pointer hover:bg-gray-50 ${selectedRoute?.id === route.id ? 'bg-blue-50 border-l-4 border-blue-400' : ''}`}
                    onClick={() => handleRouteSelect(route)}
                  >
                    <div className="px-4 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{route.sample_id}</p>
                          <p className="text-sm text-gray-500">{route.start_name} → {route.end_name}</p>
                          <p className="text-xs text-gray-400">{new Date(route.collection_date).toLocaleDateString()}</p>
                        </div>
                        <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleDeleteRoute(route)}
                            className="text-red-600 hover:text-red-900 text-sm font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Bottom Section: Upload and Detections */}
        {!readOnly && (
          <div className="h-64 bg-gray-50 border-t overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Upload Section */}
                <div>
                  <MetabarcodeUpload />
                </div>

                {/* Pathogen Detections */}
                <div>
                  {selectedRoute ? (
                    <div className="bg-white shadow overflow-hidden sm:rounded-md">
                      <div className="px-4 py-5 sm:px-6">
                        <h3 className="text-lg font-medium text-gray-900">
                          Pathogen Detections for {selectedRoute.sample_id} ({detections.length})
                        </h3>
                      </div>
                      <ul className="divide-y divide-gray-200 max-h-48 overflow-y-auto">
                        {detections.map((detection) => (
                          <li key={detection.id}>
                            <div className="px-4 py-4 sm:px-6">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900">
                                    {detection.pathogen_species?.species_name}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    {detection.pathogen_species?.common_name}
                                    <span className="ml-2 px-2 py-1 text-xs bg-gray-100 rounded">
                                      {detection.pathogen_species?.disease_type}
                                    </span>
                                  </p>
                                  <p className="text-sm font-semibold text-blue-600">
                                    {detection.read_count.toLocaleString()} reads
                                  </p>
                                </div>
                                <button
                                  onClick={() => handleDeleteDetection(detection)}
                                  className="text-red-600 hover:text-red-900 text-sm font-medium"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="bg-white shadow rounded-lg">
                      <div className="px-4 py-12 text-center">
                        <p className="text-gray-500">Select a sample to view pathogen detections</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Read-only view: Show sample details - max 50% height */}
        {readOnly && selectedRoute && (
          <div className="h-1/2 bg-gray-50 border-t overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Sample Details: {selectedRoute.sample_id}
                  </h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">
                    Collection information and pathogen detections
                  </p>
                </div>
                <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Collection Date</dt>
                      <dd className="mt-1 text-sm text-gray-900">{new Date(selectedRoute.collection_date).toLocaleDateString()}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Sample Route</dt>
                      <dd className="mt-1 text-sm text-gray-900">{selectedRoute.start_name} → {selectedRoute.end_name}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-sm font-medium text-gray-500 mb-3">Detected Pathogens ({detections.length})</dt>
                      <dd className="mt-1">
                        <ul className="border border-gray-200 rounded-md divide-y divide-gray-200 max-h-64 overflow-y-auto">
                          {detections.map((detection) => (
                            <li key={detection.id} className="pl-3 pr-4 py-3 flex items-center justify-between text-sm">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">
                                  {detection.pathogen_species?.species_name}
                                </p>
                                <p className="text-gray-500">
                                  {detection.pathogen_species?.common_name}
                                  <span className="ml-2 px-2 py-1 text-xs bg-gray-100 rounded">
                                    {detection.pathogen_species?.disease_type}
                                  </span>
                                </p>
                              </div>
                              <span className="text-blue-600 font-semibold">
                                {detection.read_count.toLocaleString()} reads
                              </span>
                            </li>
                          ))}
                        </ul>
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}
