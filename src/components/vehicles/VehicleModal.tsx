'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getSupabaseClient } from '@/lib/supabase';
import { usePermissions } from '@/lib/usePermissions';
import type { Permission } from '@/types/database';

interface VehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVehicleUpdated: () => void;
  vehicle?: {
    id: string;
    model: string;
    registration: string;
    status: string;
    next_maintenance_date: string | null;
    notes: string | null;
  };
}

export default function VehicleModal({ isOpen, onClose, onVehicleUpdated, vehicle }: VehicleModalProps) {
  const [formData, setFormData] = useState({
    model: '',
    registration: '',
    status: 'available',
    next_maintenance_date: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { hasPermission } = usePermissions();

  useEffect(() => {
    if (vehicle) {
      setFormData({
        model: vehicle.model,
        registration: vehicle.registration,
        status: vehicle.status,
        next_maintenance_date: vehicle.next_maintenance_date || '',
        notes: vehicle.notes || ''
      });
    }
  }, [vehicle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if user has appropriate permissions
    const canCreate = hasPermission('createVehicle');
    const canUpdate = hasPermission('manageVehicles');
    
    if (vehicle && !canUpdate) {
      setError('Unauthorized - You do not have permission to modify vehicles');
      return;
    }
    
    if (!vehicle && !canCreate) {
      setError('Unauthorized - You do not have permission to create vehicles');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();

      if (vehicle?.id) {
        // Update existing vehicle
        const { error: updateError } = await supabase
          .from('vehicles')
          .update({
            model: formData.model,
            registration: formData.registration.toUpperCase(),
            status: formData.status,
            next_maintenance_date: formData.next_maintenance_date || null,
            notes: formData.notes || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', vehicle.id);

        if (updateError) throw updateError;
        toast.success('Vehicle updated successfully');
      } else {
        // Check if vehicle already exists
        const { data: existingVehicle } = await supabase
          .from('vehicles')
          .select('id')
          .eq('registration', formData.registration.toUpperCase())
          .single();

        if (existingVehicle) {
          setError('A vehicle with this registration number already exists');
          return;
        }

        // Create new vehicle
        const { error: insertError } = await supabase
          .from('vehicles')
          .insert({
            model: formData.model,
            registration: formData.registration.toUpperCase(),
            status: formData.status,
            next_maintenance_date: formData.next_maintenance_date || null,
            notes: formData.notes || null
          });

        if (insertError) throw insertError;
        toast.success('Vehicle added successfully');
      }

      onVehicleUpdated();
      onClose();
    } catch (error) {
      console.error('Error saving vehicle:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while saving the vehicle');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {vehicle ? 'Edit Vehicle' : 'Add Vehicle'}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="model" className="block text-sm font-medium text-gray-700">
                    Model *
                  </label>
                  <input
                    type="text"
                    id="model"
                    required
                    value={formData.model}
                    onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="registration" className="block text-sm font-medium text-gray-700">
                    Registration Number *
                  </label>
                  <input
                    type="text"
                    id="registration"
                    required
                    value={formData.registration}
                    onChange={(e) => setFormData(prev => ({ ...prev, registration: e.target.value.toUpperCase() }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm uppercase"
                  />
                </div>

                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                    Status *
                  </label>
                  <select
                    id="status"
                    required
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="available">Available</option>
                    <option value="in_use">In Use</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="retired">Retired</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="next_maintenance_date" className="block text-sm font-medium text-gray-700">
                    Next Maintenance Date
                  </label>
                  <input
                    type="date"
                    id="next_maintenance_date"
                    value={formData.next_maintenance_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, next_maintenance_date: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>

              <div className="mt-5 sm:mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm disabled:opacity-50"
                >
                  {loading ? 'Saving...' : vehicle ? 'Update Vehicle' : 'Add Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 