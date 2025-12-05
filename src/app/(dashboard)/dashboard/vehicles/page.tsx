'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Search, Plus, RefreshCw, Settings, AlertTriangle, CheckCircle, Clock, Ban, Edit, Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'react-hot-toast';
import VehicleModal from '@/components/vehicles/VehicleModal';
import { usePermissions } from '@/lib/usePermissions';

interface Booking {
  id: string;
  vehicle_id: string;
  status: 'active' | 'confirmed' | 'completed' | 'cancelled';
  start_date: string;
  end_date: string;
}

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
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showMaintenanceWarning, setShowMaintenanceWarning] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | undefined>();
  const [expandedVehicleId, setExpandedVehicleId] = useState<string | null>(null);
  const [maintenanceHistory, setMaintenanceHistory] = useState<any[]>([]);
  const [bookingHistory, setBookingHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const { hasPermission } = usePermissions();

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const supabase = getSupabaseClient();

      // Get vehicles with their basic info
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('*')
        .order('added_date', { ascending: false });

      if (vehiclesError) throw vehiclesError;

      // Get all bookings to calculate accurate revenue
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*');

      if (bookingsError) throw bookingsError;

      // Process vehicles and calculate total revenue including all fees
      const processedVehicles = vehiclesData.map(vehicle => {
        const vehicleBookings = bookingsData.filter(booking => {
          try {
            const vehicleDetails = typeof booking.vehicle_details === 'string'
              ? JSON.parse(booking.vehicle_details)
              : booking.vehicle_details;
            return vehicleDetails?.registration === vehicle.registration;
          } catch (e) {
            return false;
          }
        });

        const totalRevenue = vehicleBookings.reduce((sum, booking) => {
          // Include all fees in revenue calculation
          const revenue = (booking.booking_amount || 0) +
            (booking.damage_charges || 0) +
            (booking.late_fee || 0) +
            (booking.extension_fee || 0);
          return sum + revenue;
        }, 0);

        return {
          ...vehicle,
          total_bookings: vehicleBookings.length,
          total_revenue: totalRevenue
        };
      });

      setVehicles(processedVehicles);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
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

  const getVehicleDisplayStatus = (vehicle: Vehicle & { has_active_booking?: boolean }) => {
    // First check if vehicle has an active booking
    if (vehicle.has_active_booking) {
      return {
        status: 'in_use',
        label: 'In Use',
        classes: 'bg-blue-100 text-blue-800',
        dotClass: 'bg-blue-400'
      };
    }

    // Then check if maintenance is due
    if (vehicle.next_maintenance_date) {
      const maintenanceDate = new Date(vehicle.next_maintenance_date);
      const today = new Date();
      if (maintenanceDate <= today) {
        return {
          status: 'maintenance_due',
          label: 'Maintenance Due',
          classes: 'bg-orange-100 text-orange-800',
          dotClass: 'bg-orange-400'
        };
      }
    }

    // Finally return status based on vehicle.status
    switch (vehicle.status) {
      case 'available':
        return {
          status: 'available',
          label: 'Available',
          classes: 'bg-green-100 text-green-800',
          dotClass: 'bg-green-400'
        };
      case 'in_use':
        return {
          status: 'in_use',
          label: 'In Use',
          classes: 'bg-blue-100 text-blue-800',
          dotClass: 'bg-blue-400'
        };
      case 'maintenance':
        return {
          status: 'maintenance',
          label: 'In Maintenance',
          classes: 'bg-red-100 text-red-800',
          dotClass: 'bg-red-400'
        };
      case 'retired':
        return {
          status: 'retired',
          label: 'Retired',
          classes: 'bg-gray-100 text-gray-800',
          dotClass: 'bg-gray-400'
        };
      default:
        return {
          status: 'unknown',
          label: 'Unknown',
          classes: 'bg-gray-100 text-gray-800',
          dotClass: 'bg-gray-400'
        };
    }
  };

  const handleRowClick = (vehicle: Vehicle) => {
    const encodedReg = encodeURIComponent(vehicle.registration.trim());
    router.push(`/dashboard/vehicles/${encodedReg}`);
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
      <div className="h-full p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="h-64 bg-gray-100"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1920px] mx-auto p-4">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex-none">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Vehicles</h1>
              <p className="mt-1 text-sm text-gray-600">Manage your vehicle fleet</p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Vehicle
            </button>
          </div>

          {/* Search and Filter Controls */}
          <div className="bg-white p-3 rounded-lg shadow-sm mb-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search vehicles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="all">All Status</option>
                  <option value="available">Available</option>
                  <option value="in_use">In Use</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="retired">Retired</option>
                </select>
                <button
                  onClick={fetchVehicles}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span className="sr-only">Refresh</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="flex-1 bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="max-h-[calc(100vh-16rem)] overflow-y-auto overflow-x-auto">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registration</th>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Added Date</th>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Maintenance</th>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Bookings</th>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                  <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredVehicles.map((vehicle) => (
                  <tr
                    key={vehicle.id}
                    onClick={() => handleRowClick(vehicle)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{vehicle.model}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{vehicle.registration}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {(() => {
                        const statusInfo = getVehicleDisplayStatus(vehicle);
                        return (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusInfo.classes}`}>
                            <span className={`w-2 h-2 mr-1.5 rounded-full ${statusInfo.dotClass}`} />
                            {statusInfo.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{formatDate(vehicle.added_date)}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                      {vehicle.next_maintenance_date ? formatDate(vehicle.next_maintenance_date) : 'Not scheduled'}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{vehicle.total_bookings}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{formatCurrency(vehicle.total_revenue)}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end items-center space-x-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditVehicle(vehicle);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit2 className="h-5 w-5" />
                          <span className="sr-only">Edit</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteVehicle(vehicle);
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-5 w-5" />
                          <span className="sr-only">Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modals */}
        <VehicleModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onVehicleUpdated={handleVehicleUpdated}
          vehicle={selectedVehicle}
        />
      </div>
    </div>
  );
} 