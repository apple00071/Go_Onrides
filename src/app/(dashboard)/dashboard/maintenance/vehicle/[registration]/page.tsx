'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { ArrowLeft, Plus } from 'lucide-react';

interface MaintenanceRecord {
  id: string;
  maintenance_date: string;
  maintenance_type: string;
  description: string;
  cost: number;
  next_due_date: string;
  odometer_reading: number;
  performed_by: string;
  notes: string;
}

interface Vehicle {
  registration: string;
  model: string;
  status: string;
}

export default function VehicleMaintenancePage({ params }: { params: { registration: string } }) {
  const router = useRouter();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [maintenanceHistory, setMaintenanceHistory] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVehicleAndHistory();
  }, [params.registration]);

  const fetchVehicleAndHistory = async () => {
    try {
      const supabase = getSupabaseClient();
      
      // Fetch vehicle details
      const { data: vehicleData, error: vehicleError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('registration', params.registration)
        .single();

      if (vehicleError) throw vehicleError;
      setVehicle(vehicleData);

      // Fetch maintenance history
      const { data: historyData, error: historyError } = await supabase
        .from('vehicle_maintenance')
        .select('*')
        .eq('vehicle_registration', params.registration)
        .order('maintenance_date', { ascending: false });

      if (historyError) throw historyError;
      setMaintenanceHistory(historyData || []);
    } catch (error) {
      console.error('Error fetching vehicle data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getMaintenanceTypeLabel = (type: string) => {
    const types: { [key: string]: string } = {
      'engine_oil': 'Engine Oil Change',
      'oil_filter': 'Oil Filter',
      'air_filter': 'Air Filter',
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
      <div className="p-6">
        <div className="text-center">
          <p className="text-gray-500">Loading vehicle details...</p>
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-red-500">Vehicle not found</p>
          <button
            onClick={() => router.push('/dashboard/maintenance')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Maintenance
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={() => router.push('/dashboard/maintenance')}
            className="mr-4 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {vehicle.model} ({vehicle.registration})
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Vehicle Maintenance History
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push(`/dashboard/maintenance/add?vehicle=${vehicle.registration}`)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Maintenance Record
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Vehicle Details</h3>
          <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-gray-500">Registration</p>
              <p className="mt-1 text-sm text-gray-900">{vehicle.registration}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Status</p>
              <p className="mt-1 text-sm text-gray-900 capitalize">{vehicle.status || 'Active'}</p>
            </div>
          </div>
        </div>

        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Maintenance History</h3>
          {maintenanceHistory.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No maintenance records found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(record.maintenance_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getMaintenanceTypeLabel(record.maintenance_type)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {record.description || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${record.cost.toFixed(2)}
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
  );
} 