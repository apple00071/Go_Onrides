'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowLeft, Calendar, Wrench, TrendingUp, Phone } from 'lucide-react';

interface VehicleDetails {
  id: string;
  registration: string;
  model: string;
  status: string;
  added_date: string;
  last_maintenance_date: string | null;
  next_maintenance_date: string | null;
  total_bookings: number;
  total_revenue: number;
  total_maintenance_cost: number;
}

interface MaintenanceRecord {
  id: string;
  maintenance_date: string;
  next_due_date: string | null;
  description: string;
}

interface BookingRecord {
  id: string;
  booking_id: string;  // Add booking_id to interface
  customer_name: string;
  start_date: string;
  end_date: string;
  status: string;
  total_amount: number;
}

export default function VehicleDetailsPage({ params }: { params: { registration: string } }) {
  const router = useRouter();
  const [vehicle, setVehicle] = useState<VehicleDetails | null>(null);
  const [recentMaintenance, setRecentMaintenance] = useState<MaintenanceRecord[]>([]);
  const [recentBookings, setRecentBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVehicleDetails();
  }, []);

  const fetchVehicleDetails = async () => {
    try {
      setLoading(true);
      const supabase = getSupabaseClient();
      const decodedRegistration = decodeURIComponent(params.registration);

      // Fetch vehicle details
      const { data: vehicleData, error: vehicleError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('registration', decodedRegistration)
        .single();

      if (vehicleError) throw vehicleError;

      // Calculate total maintenance cost and get recent records
      const { data: maintenanceData, error: maintenanceError } = await supabase
        .from('vehicle_maintenance')
        .select('*')
        .eq('vehicle_registration', decodedRegistration)
        .order('maintenance_date', { ascending: false })
        .limit(3);

      if (maintenanceError) throw maintenanceError;

      const totalMaintenanceCost = (maintenanceData || []).reduce((sum, record) => sum + (record.cost || 0), 0);
      setRecentMaintenance(maintenanceData || []);

      // Get recent bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .order('start_date', { ascending: false });

      if (bookingsError) throw bookingsError;

      // Filter and process bookings
      const vehicleBookings = (bookingsData || [])
        .filter(booking => {
          try {
            const vehicleDetails = typeof booking.vehicle_details === 'string'
              ? JSON.parse(booking.vehicle_details)
              : booking.vehicle_details;
            return vehicleDetails?.registration === decodedRegistration;
          } catch (e) {
            return false;
          }
        })
        .map(booking => ({
          id: booking.id,
          booking_id: booking.booking_id,
          customer_name: booking.customer_name,
          start_date: booking.start_date,
          end_date: booking.end_date,
          status: booking.status,
          total_amount: booking.total_amount || booking.booking_amount || 0
        }));

      setRecentBookings(vehicleBookings.slice(0, 3));

      setVehicle({
        ...vehicleData,
        total_maintenance_cost: totalMaintenanceCost,
        total_bookings: vehicleBookings.length,
        total_revenue: vehicleBookings.reduce((sum, booking) => sum + booking.total_amount, 0)
      });
    } catch (error) {
      console.error('Error fetching vehicle details:', error);
      setError('Failed to load vehicle details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="text-center">Loading vehicle details...</div>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="text-center text-red-600">{error || 'Vehicle not found'}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="mr-4 text-gray-400 hover:text-gray-500"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-2xl font-semibold text-gray-900">
                {vehicle.model} - {vehicle.registration}
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Revenue Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingUp className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                    <dd className="text-lg font-semibold text-gray-900">{formatCurrency(vehicle.total_revenue)}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Maintenance Cost Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Wrench className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Maintenance Cost</dt>
                    <dd className="text-lg font-semibold text-gray-900">{formatCurrency(vehicle.total_maintenance_cost)}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Bookings Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Calendar className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Bookings</dt>
                    <dd className="text-lg font-semibold text-gray-900">{vehicle.total_bookings}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Vehicle Details */}
        <div className="mt-8 bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900">Vehicle Information</h3>
            <div className="mt-5 border-t border-gray-200">
              <dl className="grid grid-cols-2 gap-4 py-4">
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1 text-sm text-gray-900 capitalize">{vehicle.status}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Added Date</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(vehicle.added_date)}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Last Maintenance</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {vehicle.last_maintenance_date ? formatDate(vehicle.last_maintenance_date) : 'No maintenance record'}
                  </dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Next Maintenance Due</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {vehicle.next_maintenance_date ? formatDate(vehicle.next_maintenance_date) : 'Not scheduled'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* History Sections */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Maintenance History */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Maintenance History</h3>
                <Link 
                  href={`/dashboard/maintenance/vehicle/${params.registration}/history`}
                  className="text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  View All
                </Link>
              </div>
            </div>
            <div className="px-4 py-5 sm:p-6">
              {recentMaintenance.length === 0 ? (
                <p className="text-gray-500 text-center">No maintenance records found</p>
              ) : (
                <div className="space-y-4">
                  {recentMaintenance.map((record) => {
                    const isOverdue = record.next_due_date && new Date(record.next_due_date) < new Date();
                    return (
                      <div 
                        key={record.id} 
                        className={`p-4 rounded-lg ${
                          isOverdue ? 'bg-red-50 border border-red-100' : 'bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">
                              {formatDate(record.maintenance_date)}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">{record.description}</p>
                          </div>
                          {record.next_due_date && (
                            <div className={`text-sm ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
                              Next Due: {formatDate(record.next_due_date)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Booking History */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Recent Bookings</h3>
                <Link 
                  href={`/dashboard/bookings/vehicle/${params.registration}`}
                  className="text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  View All
                </Link>
              </div>
            </div>
            <div className="px-4 py-5 sm:p-6">
              {recentBookings.length === 0 ? (
                <p className="text-gray-500 text-center">No booking records found</p>
              ) : (
                <div className="space-y-4">
                  {recentBookings.map((booking) => {
                    const isOngoing = booking.status === 'in_use';
                    const isOverdue = new Date(booking.end_date) < new Date() && booking.status === 'in_use';
                    return (
                      <div 
                        key={booking.id} 
                        className={`p-4 rounded-lg ${
                          isOverdue ? 'bg-red-50 border border-red-100' : 
                          isOngoing ? 'bg-blue-50 border border-blue-100' : 
                          'bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900">
                                {booking.customer_name}
                              </p>
                              <span className="text-sm text-gray-500">
                                #{booking.booking_id}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                              ${
                                booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                                booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                booking.status === 'in_use' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }
                            `}>
                              {booking.status}
                            </span>
                            <p className="text-sm font-medium text-gray-900 mt-1">
                              {formatCurrency(booking.total_amount)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 