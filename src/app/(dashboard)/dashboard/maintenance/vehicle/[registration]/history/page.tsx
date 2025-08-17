'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { ArrowLeft, Plus } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface MaintenanceRecord {
  id: string;
  maintenance_date: string;
  maintenance_type: string;
  description: string;
  cost: number;
  next_due_date: string | null;
  odometer_reading: number;
  performed_by: string;
  notes: string;
}

interface Vehicle {
  registration: string;
  model: string;
  status: string;
}

export default function VehicleMaintenanceHistoryPage({ params }: { params: { registration: string } }) {
  const router = useRouter();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [maintenanceHistory, setMaintenanceHistory] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVehicleAndHistory();
  }, []);

  const fetchVehicleAndHistory = async () => {
    try {
      const rawRegistration = decodeURIComponent(params.registration.replace(/\+/g, ' '));
      const supabase = getSupabaseClient();
      
      // Fetch vehicle details
      const { data: vehicleData, error: vehicleError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('registration', rawRegistration)
        .single();

      if (vehicleError) {
        if (vehicleError.code === 'PGRST116') {
          setError('Vehicle not found');
          return;
        }
        throw vehicleError;
      }
      
      setVehicle(vehicleData);

      // Fetch maintenance history
      const { data: historyData, error: historyError } = await supabase
        .from('vehicle_maintenance')
        .select('*')
        .eq('vehicle_registration', rawRegistration)
        .order('maintenance_date', { ascending: false });

      if (historyError) throw historyError;
      setMaintenanceHistory(historyData || []);
    } catch (error) {
      console.error('Error fetching vehicle data:', error);
      setError('Failed to fetch vehicle details');
    } finally {
      setLoading(false);
    }
  };

  const getMaintenanceTypeLabel = (type: string) => {
    const types: { [key: string]: string } = {
      'engine_oil': 'Engine Oil Change',
      'oil_filter': 'Oil Filter',
      'air_filter': 'Air Filter',
      'battery': 'Battery',
      'tyre_change': 'Tyre Change',
      'tyre_rotation': 'Tyre Rotation',
      'brake_pads': 'Brake Pads',
      'chain_sprocket': 'Chain & Sprocket',
      'general_service': 'General Service',
      'other': 'Other'
    };
    return types[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center">
          <div className="inline-block p-4 rounded-full bg-red-50 mb-4">
            <svg className="h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Vehicle not found</h2>
          <p className="text-gray-600 mb-6">
            The vehicle with registration number "{decodeURIComponent(params.registration.replace(/\+/g, ' '))}" could not be found in the system.
          </p>
          <button
            onClick={() => router.push('/dashboard/maintenance')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Maintenance
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/dashboard/maintenance')}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {vehicle.model} ({vehicle.registration})
            </h1>
            <p className="text-sm text-gray-600">
              Vehicle Maintenance History
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push(`/dashboard/maintenance/add?vehicle=${encodeURIComponent(vehicle.registration)}`)}
          className="inline-flex items-center px-6 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Maintenance Record
        </button>
      </div>

      <div className="space-y-6">
        {/* Vehicle Details Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-5">
            <h3 className="text-lg font-semibold text-gray-900">Vehicle Details</h3>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-500">Registration</p>
                <p className="mt-1 text-sm font-medium text-gray-900">{vehicle.registration}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-500">Model</p>
                <p className="mt-1 text-sm font-medium text-gray-900">{vehicle.model}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-500">Status</p>
                <p className="mt-1 text-sm font-medium text-gray-900 capitalize">{vehicle.status}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Maintenance History Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Maintenance History</h3>
            {maintenanceHistory.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <p className="text-gray-500 mb-4">No maintenance records found</p>
                <button
                  onClick={() => router.push(`/dashboard/maintenance/add?vehicle=${encodeURIComponent(vehicle.registration)}`)}
                  className="inline-flex items-center px-6 py-2.5 border border-transparent text-sm font-medium rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add First Maintenance Record
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cost
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Next Due
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Odometer
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Performed By
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {maintenanceHistory.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatDate(record.maintenance_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {getMaintenanceTypeLabel(record.maintenance_type)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {record.description || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{record.cost.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.next_due_date ? formatDate(record.next_due_date) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.odometer_reading.toLocaleString()} km
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.performed_by || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 