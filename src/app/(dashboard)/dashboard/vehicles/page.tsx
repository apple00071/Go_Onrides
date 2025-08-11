'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Search, Plus, RefreshCw, Settings, AlertTriangle, CheckCircle, Clock, Ban, Edit, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import VehicleModal from '@/components/vehicles/VehicleModal';

interface Vehicle {
  id: string;
  model: string;
  registration: string;
  status: 'available' | 'in_use' | 'maintenance' | 'retired';
  added_date: string;
  last_maintenance_date: string | null;
  next_maintenance_date: string | null;
  total_bookings: number;
  total_revenue: number;
  maintenance_history: Array<{
    date: string;
    type: string;
    description: string;
    cost: number;
  }>;
  notes: string | null;
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showMaintenanceWarning, setShowMaintenanceWarning] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | undefined>();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        setUserRole(profile?.role || null);
      }
    };

    fetchUserRole();
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const supabase = getSupabaseClient();
      
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('added_date', { ascending: false });

      if (error) throw error;

      setVehicles(data || []);

      // Check for vehicles needing maintenance
      const needsMaintenance = (data || []).some(vehicle => {
        if (!vehicle.next_maintenance_date) return false;
        const maintenanceDate = new Date(vehicle.next_maintenance_date);
        const today = new Date();
        const daysUntilMaintenance = Math.ceil((maintenanceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilMaintenance <= 7;
      });

      setShowMaintenanceWarning(needsMaintenance);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toast.error('Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVehicle = async (vehicle: Vehicle) => {
    if (!confirm(`Are you sure you want to delete vehicle ${vehicle.registration}? This action cannot be undone.`)) {
      return;
    }

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', vehicle.id);

      if (error) throw error;

      toast.success('Vehicle deleted successfully');
      fetchVehicles(); // Refresh the list
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      toast.error('Failed to delete vehicle');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'in_use':
        return 'bg-blue-100 text-blue-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'retired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="h-4 w-4" />;
      case 'in_use':
        return <Clock className="h-4 w-4" />;
      case 'maintenance':
        return <Settings className="h-4 w-4" />;
      case 'retired':
        return <Ban className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = 
      vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.registration.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || vehicle.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleAddVehicle = () => {
    setSelectedVehicle(undefined);
    setIsModalOpen(true);
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsModalOpen(true);
  };

  const handleVehicleUpdated = () => {
    fetchVehicles();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white p-6 rounded-lg shadow">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Vehicles</h1>
          {userRole === 'admin' && (
            <button
              onClick={handleAddVehicle}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Vehicle
            </button>
          )}
        </div>

        {showMaintenanceWarning && (
          <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-100">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2" />
              <p className="text-sm text-yellow-700">
                Some vehicles are due for maintenance soon. Please check the maintenance schedule.
              </p>
            </div>
          </div>
        )}

        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search vehicles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="all">All Status</option>
              <option value="available">Available</option>
              <option value="in_use">In Use</option>
              <option value="maintenance">Maintenance</option>
              <option value="retired">Retired</option>
            </select>
          </div>

          <button
            onClick={fetchVehicles}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>

        <div className="mt-8 flex flex-col">
          <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Model
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Registration
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Status
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Added Date
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Next Maintenance
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Total Bookings
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Revenue
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredVehicles.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                          No vehicles found. Add a vehicle or check your search filters.
                        </td>
                      </tr>
                    ) : (
                      filteredVehicles.map((vehicle) => (
                        <tr key={vehicle.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {vehicle.model}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            #{vehicle.registration}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(vehicle.status)}`}>
                              {getStatusIcon(vehicle.status)}
                              <span className="ml-1 capitalize">{vehicle.status}</span>
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(vehicle.added_date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {vehicle.next_maintenance_date ? formatDate(vehicle.next_maintenance_date) : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {vehicle.total_bookings}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(vehicle.total_revenue)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center space-x-4">
                              {userRole === 'admin' && (
                                <>
                                  <button
                                    onClick={() => handleEditVehicle(vehicle)}
                                    className="text-blue-600 hover:text-blue-900"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteVehicle(vehicle)}
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <VehicleModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onVehicleUpdated={handleVehicleUpdated}
          vehicle={selectedVehicle}
        />
      )}
    </div>
  );
} 