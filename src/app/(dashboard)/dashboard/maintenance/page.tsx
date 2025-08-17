'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { Plus, Search } from 'lucide-react';

export default function MaintenancePage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const supabase = getSupabaseClient();
      const today = new Date();
      
      // Fetch both vehicles in maintenance and vehicles due for maintenance
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .or(`status.eq.maintenance,next_maintenance_date.lte.${today.toISOString()}`)
        .order('registration');

      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredVehicles = vehicles.filter(vehicle =>
    vehicle.registration.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vehicle.model.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Vehicle Maintenance</h1>
          <p className="mt-1 text-sm text-gray-600">
            Track and manage vehicle maintenance records
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard/maintenance/add')}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Maintenance Record
        </button>
      </div>

      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search vehicles in maintenance..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-4">
          <p className="text-gray-500">Loading vehicles...</p>
        </div>
      ) : filteredVehicles.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-gray-500">No vehicles in maintenance</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredVehicles.map((vehicle) => (
            <div
              key={vehicle.registration}
              onClick={() => {
                const encodedReg = encodeURIComponent(vehicle.registration.trim());
                router.push(`/dashboard/maintenance/vehicle/${encodedReg}/history`);
              }}
              className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{vehicle.model}</h3>
                  <p className="text-sm text-gray-500">{vehicle.registration}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Status: <span className={`capitalize ${vehicle.status === 'maintenance' ? 'text-red-500' : 'text-orange-500'}`}>
                      {vehicle.status === 'maintenance' ? 'In Maintenance' : 'Due for Maintenance'}
                    </span>
                  </p>
                  {vehicle.next_maintenance_date && (
                    <p className="text-sm text-gray-500">
                      Next Maintenance: {new Date(vehicle.next_maintenance_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const encodedReg = encodeURIComponent(vehicle.registration.trim());
                    router.push(`/dashboard/maintenance/add?vehicle=${encodedReg}`);
                  }}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add Maintenance
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 