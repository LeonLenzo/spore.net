'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import RoleGuard from '@/components/RoleGuard';
import { AuthService } from '@/lib/auth';

interface PathogenSpecies {
  id: string;
  species_name: string;
  common_name: string;
  disease_type: string;
  created_at: string;
}

export default function PathogenManagement() {
  const handleLogout = () => {
    AuthService.logout();
    window.location.href = '/admin/login';
  };
  const [pathogens, setPathogens] = useState<PathogenSpecies[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPathogen, setEditingPathogen] = useState<PathogenSpecies | null>(null);
  const [diseaseTypes, setDiseaseTypes] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    species_name: '',
    common_name: '',
    disease_type: ''
  });
  const [newDiseaseType, setNewDiseaseType] = useState('');

  // Load pathogens and disease types
  useEffect(() => {
    loadPathogens();
    loadDiseaseTypes();
  }, []);

  const loadPathogens = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pathogen_species')
        .select('*')
        .order('disease_type, species_name');

      if (error) throw error;
      setPathogens(data || []);
    } catch (error) {
      console.error('Error loading pathogens:', error);
      alert('Failed to load pathogens');
    } finally {
      setLoading(false);
    }
  };

  const loadDiseaseTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('pathogen_species')
        .select('disease_type')
        .order('disease_type');

      if (error) throw error;

      // Get unique disease types
      const uniqueTypes = [...new Set(data?.map(item => item.disease_type) || [])];
      setDiseaseTypes(uniqueTypes);
    } catch (error) {
      console.error('Error loading disease types:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.species_name.trim() || !formData.common_name.trim() || !formData.disease_type.trim()) {
      alert('Please fill in all fields');
      return;
    }

    try {
      if (editingPathogen) {
        // Update existing pathogen
        const { error } = await supabase
          .from('pathogen_species')
          .update({
            species_name: formData.species_name.trim(),
            common_name: formData.common_name.trim(),
            disease_type: formData.disease_type.trim()
          })
          .eq('id', editingPathogen.id);

        if (error) throw error;
        alert('Pathogen updated successfully');
      } else {
        // Add new pathogen
        const { error } = await supabase
          .from('pathogen_species')
          .insert({
            species_name: formData.species_name.trim(),
            common_name: formData.common_name.trim(),
            disease_type: formData.disease_type.trim()
          });

        if (error) throw error;
        alert('Pathogen added successfully');
      }

      // Reset form and reload data
      setFormData({ species_name: '', common_name: '', disease_type: '' });
      setShowAddForm(false);
      setEditingPathogen(null);
      loadPathogens();
      loadDiseaseTypes();
    } catch (error) {
      console.error('Error saving pathogen:', error);
      const err = error as { code?: string; message?: string };
      if (err.code === '23505') {
        alert('A pathogen with this species name already exists');
      } else {
        alert('Failed to save pathogen: ' + (err.message || 'Unknown error'));
      }
    }
  };

  const handleEdit = (pathogen: PathogenSpecies) => {
    setEditingPathogen(pathogen);
    setFormData({
      species_name: pathogen.species_name,
      common_name: pathogen.common_name,
      disease_type: pathogen.disease_type
    });
    setShowAddForm(true);
  };

  const handleDelete = async (pathogen: PathogenSpecies) => {
    if (!confirm(`Are you sure you want to delete "${pathogen.species_name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('pathogen_species')
        .delete()
        .eq('id', pathogen.id);

      if (error) throw error;
      alert('Pathogen deleted successfully');
      loadPathogens();
    } catch (error) {
      console.error('Error deleting pathogen:', error);
      const err = error as { code?: string; message?: string };
      if (err.code === '23503') {
        alert('Cannot delete this pathogen because it has associated detection data');
      } else {
        alert('Failed to delete pathogen: ' + (err.message || 'Unknown error'));
      }
    }
  };

  const resetForm = () => {
    setFormData({ species_name: '', common_name: '', disease_type: '' });
    setShowAddForm(false);
    setEditingPathogen(null);
  };

  const addNewDiseaseType = () => {
    if (newDiseaseType.trim() && !diseaseTypes.includes(newDiseaseType.trim())) {
      const updatedTypes = [...diseaseTypes, newDiseaseType.trim()].sort();
      setDiseaseTypes(updatedTypes);
      setFormData({ ...formData, disease_type: newDiseaseType.trim() });
      setNewDiseaseType('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading pathogens...</p>
        </div>
      </div>
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
                <Link href="/" className="text-blue-600 hover:text-blue-700 mr-4">
                  ← Home
                </Link>
                <h1 className="text-3xl font-bold text-gray-900">Pathogen Species Management</h1>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowAddForm(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Add New Pathogen
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

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingPathogen ? 'Edit Pathogen' : 'Add New Pathogen'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label htmlFor="species_name" className="block text-sm font-medium text-gray-700">
                      Species Name (Scientific)
                    </label>
                    <input
                      type="text"
                      id="species_name"
                      value={formData.species_name}
                      onChange={(e) => setFormData({ ...formData, species_name: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      placeholder="e.g., Puccinia striiformis"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="common_name" className="block text-sm font-medium text-gray-700">
                      Common Name
                    </label>
                    <input
                      type="text"
                      id="common_name"
                      value={formData.common_name}
                      onChange={(e) => setFormData({ ...formData, common_name: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      placeholder="e.g., Stripe Rust"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="disease_type" className="block text-sm font-medium text-gray-700">
                      Disease Type
                    </label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                      <select
                        id="disease_type"
                        value={formData.disease_type}
                        onChange={(e) => setFormData({ ...formData, disease_type: e.target.value })}
                        className="flex-1 border-gray-300 rounded-l-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        required
                      >
                        <option value="">Select type...</option>
                        {diseaseTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Add new disease type */}
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Add New Disease Type
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newDiseaseType}
                      onChange={(e) => setNewDiseaseType(e.target.value)}
                      className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      placeholder="e.g., Blight, Rot, Wilt"
                    />
                    <button
                      type="button"
                      onClick={addNewDiseaseType}
                      className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                    >
                      Add Type
                    </button>
                  </div>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700"
                  >
                    {editingPathogen ? 'Update' : 'Add'} Pathogen
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Pathogens List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg font-medium text-gray-900">
              Current Pathogen Species ({pathogens.length})
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Manage the pathogen species database for spore.net
            </p>
          </div>
          <ul className="divide-y divide-gray-200">
            {pathogens.reduce((acc, pathogen) => {
              const diseaseType = pathogen.disease_type;
              if (!acc.find(item => item.type === diseaseType)) {
                acc.push({
                  type: diseaseType,
                  pathogens: pathogens.filter(p => p.disease_type === diseaseType)
                });
              }
              return acc;
            }, [] as Array<{type: string, pathogens: PathogenSpecies[]}>).map(group => (
              <li key={group.type} className="bg-gray-50">
                <div className="px-4 py-3 bg-gray-100">
                  <h4 className="text-md font-semibold text-gray-800">{group.type}</h4>
                </div>
                {group.pathogens.map((pathogen) => (
                  <div key={pathogen.id} className="px-4 py-4 sm:px-6 bg-white border-l-4 border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {pathogen.species_name}
                          </p>
                          <span className="ml-2 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            {pathogen.common_name}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          Added: {new Date(pathogen.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(pathogen)}
                          className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(pathogen)}
                          className="text-red-600 hover:text-red-900 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </li>
            ))}
          </ul>

          {pathogens.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No pathogen species found.</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Add the first pathogen
              </button>
            </div>
          )}
        </div>
      </main>
      </div>
    </RoleGuard>
  );
}