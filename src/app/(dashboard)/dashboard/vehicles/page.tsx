'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Search, Plus, RefreshCw, Settings, AlertTriangle, CheckCircle, Clock, Ban, Edit } from 'lucide-react';
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

  useEffect(() => {
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
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Vehicles</h1>
              <p className="mt-2 text-sm text-gray-600">
                Manage your vehicle fleet and track performance
              </p>
            </div>
            <button
              onClick={handleAddVehicle}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Vehicle
            </button>
          </div>
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

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul role="list" className="divide-y divide-gray-200">
            {filteredVehicles.length === 0 ? (
              <li className="px-4 py-6 text-center text-gray-500">
                No vehicles found. Add a vehicle or check your search filters.
              </li>
            ) : (
              filteredVehicles.map((vehicle) => (
                <li key={vehicle.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleEditVehicle(vehicle)}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900">{vehicle.model}</p>
                        <p className="ml-2 text-sm text-gray-500">#{vehicle.registration}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(vehicle.status)}`}>
                          {getStatusIcon(vehicle.status)}
                          <span className="ml-1 capitalize">{vehicle.status}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditVehicle(vehicle);
                          }}
                          className="text-gray-400 hover:text-gray-500"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          Added {formatDate(vehicle.added_date)}
                        </p>
                        {vehicle.next_maintenance_date && (
                          <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                            <Settings className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                            Next maintenance: {formatDate(vehicle.next_maintenance_date)}
                          </p>
                        )}
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <p className="mr-6">
                          Total Bookings: {vehicle.total_bookings}
                        </p>
                        <p>
                          Revenue: {formatCurrency(vehicle.total_revenue)}
                        </p>
                      </div>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      <VehicleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onVehicleUpdated={handleVehicleUpdated}
        vehicle={selectedVehicle}
      />
    </div>
  );
} 