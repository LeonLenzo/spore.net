'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import RoleGuard from '@/components/RoleGuard';
import MetabarcodeUpload from '@/components/MetabarcodeUpload';
import { AuthService } from '@/lib/auth';

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

export default function DataManagement() {
  const handleLogout = () => {
    AuthService.logout();
    window.location.href = '/admin/login';
  };
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

  const loadRoutes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sampling_routes')
        .select('*')
        .order('collection_date', { ascending: false });

      if (error) throw error;
      setRoutes(data || []);
    } catch (error) {
      console.error('Error loading routes:', error);
      alert('Failed to load sampling routes');
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
      const { error } = await supabase
        .from('sampling_routes')
        .delete()
        .eq('id', route.id);

      if (error) throw error;
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
      <RoleGuard requiredRole="admin">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading sample data...</p>
          </div>
        </div>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard requiredRole="admin">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <Link href="/admin" className="text-blue-600 hover:text-blue-700 mr-4">
                  ← Back to Admin
                </Link>
                <h1 className="text-3xl font-bold text-gray-900">Sample Data Management</h1>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowAddForm(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Add New Route
                </button>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* CSV Upload Section */}
        <div className="mb-6">
          <MetabarcodeUpload />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Left Column: Sampling Routes */}
          <div className="space-y-6">

            {/* Add/Edit Route Form */}
            {showAddForm && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {editingRoute ? 'Edit Sampling Route' : 'Add New Sampling Route'}
                  </h3>
                  <form onSubmit={handleRouteSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Sample ID</label>
                        <input
                          type="text"
                          value={routeFormData.sample_id}
                          onChange={(e) => setRouteFormData({ ...routeFormData, sample_id: e.target.value })}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                          placeholder="e.g., 25_01"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Collection Date</label>
                        <input
                          type="date"
                          value={routeFormData.collection_date}
                          onChange={(e) => setRouteFormData({ ...routeFormData, collection_date: e.target.value })}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Start Location</label>
                        <input
                          type="text"
                          value={routeFormData.start_name}
                          onChange={(e) => setRouteFormData({ ...routeFormData, start_name: e.target.value })}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                          placeholder="e.g., Perth"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">End Location</label>
                        <input
                          type="text"
                          value={routeFormData.end_name}
                          onChange={(e) => setRouteFormData({ ...routeFormData, end_name: e.target.value })}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                          placeholder="e.g., Bindoon"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Start Lat</label>
                        <input
                          type="number"
                          step="any"
                          value={routeFormData.start_latitude}
                          onChange={(e) => setRouteFormData({ ...routeFormData, start_latitude: e.target.value })}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                          placeholder="-31.95"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Start Lng</label>
                        <input
                          type="number"
                          step="any"
                          value={routeFormData.start_longitude}
                          onChange={(e) => setRouteFormData({ ...routeFormData, start_longitude: e.target.value })}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                          placeholder="115.86"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">End Lat</label>
                        <input
                          type="number"
                          step="any"
                          value={routeFormData.end_latitude}
                          onChange={(e) => setRouteFormData({ ...routeFormData, end_latitude: e.target.value })}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                          placeholder="-31.39"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">End Lng</label>
                        <input
                          type="number"
                          step="any"
                          value={routeFormData.end_longitude}
                          onChange={(e) => setRouteFormData({ ...routeFormData, end_longitude: e.target.value })}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                          placeholder="116.09"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={resetRouteForm}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700"
                      >
                        {editingRoute ? 'Update' : 'Add'} Route
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Sampling Routes List */}
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg font-medium text-gray-900">
                  Sampling Routes ({routes.length})
                </h3>
              </div>
              <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                {routes.map((route) => (
                  <li
                    key={route.id}
                    className={`cursor-pointer hover:bg-gray-50 ${selectedRoute?.id === route.id ? 'bg-blue-50 border-l-4 border-blue-400' : ''}`}
                    onClick={() => handleRouteSelect(route)}
                  >
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{route.sample_id}</p>
                          <p className="text-sm text-gray-500">{route.start_name} → {route.end_name}</p>
                          <p className="text-xs text-gray-400">{new Date(route.collection_date).toLocaleDateString()}</p>
                        </div>
                        <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleEditRoute(route)}
                            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                          >
                            Edit
                          </button>
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
          </div>

          {/* Right Column: Pathogen Detections */}
          <div className="space-y-6">
            {selectedRoute ? (
              <>
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Add Pathogen Detection to {selectedRoute.sample_id}
                    </h3>
                    <form onSubmit={handleDetectionSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Pathogen Species</label>
                        <select
                          value={detectionFormData.pathogen_species_id}
                          onChange={(e) => setDetectionFormData({ ...detectionFormData, pathogen_species_id: e.target.value })}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                          required
                        >
                          <option value="">Select pathogen...</option>
                          {pathogens.map(pathogen => (
                            <option key={pathogen.id} value={pathogen.id}>
                              {pathogen.species_name} ({pathogen.common_name})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Read Count</label>
                        <input
                          type="number"
                          min="0"
                          value={detectionFormData.read_count}
                          onChange={(e) => setDetectionFormData({ ...detectionFormData, read_count: e.target.value })}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                          placeholder="e.g., 3146"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full px-4 py-2 bg-green-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-green-700"
                      >
                        Add Detection
                      </button>
                    </form>
                  </div>
                </div>

                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                  <div className="px-4 py-5 sm:px-6">
                    <h3 className="text-lg font-medium text-gray-900">
                      Pathogen Detections ({detections.length})
                    </h3>
                  </div>
                  <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
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
              </>
            ) : (
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-12 text-center">
                  <p className="text-gray-500">Select a sampling route to view and manage pathogen detections</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      </div>
    </RoleGuard>
  );
}