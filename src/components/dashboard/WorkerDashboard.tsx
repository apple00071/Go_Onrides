import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { Calendar, Car, RefreshCw, RotateCcw, Clock, IndianRupee } from 'lucide-react';
import VehicleReturns from '@/components/dashboard/VehicleReturns';
import PendingPayments from '@/components/dashboard/PendingPayments';
import { formatCurrency } from '@/lib/utils';

interface WorkerStats {
  totalBookings: number;
  activeRentals: number;
  returnsToday: number;
  pendingReturns: number;
  pendingAmount: number;
}

export default function WorkerDashboard() {
  const [stats, setStats] = useState<WorkerStats>({
    totalBookings: 0,
    activeRentals: 0,
    returnsToday: 0,
    pendingReturns: 0,
    pendingAmount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkerData();
  }, []);

  const fetchWorkerData = async () => {
    try {
      const supabase = getSupabaseClient();
      
      // Get total bookings - RLS will automatically filter for the worker
      const { count: totalBookings } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true });

      // Get active rentals
      const { count: activeRentals } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'in_use');

      // Get returns due today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: returnsToday } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('end_date', today.toISOString().split('T')[0])
        .in('status', ['confirmed', 'in_use']);

      // Get pending payments
      const { data: pendingPayments, error: pendingError } = await supabase
        .from('bookings')
        .select('booking_amount, security_deposit_amount, paid_amount')
        .or('payment_status.eq.pending,payment_status.eq.partial')
        .in('status', ['confirmed', 'in_use', 'pending']);

      if (pendingError) throw pendingError;

      // Calculate total pending amount
      const pendingAmount = pendingPayments?.reduce((total, booking) => {
        const totalRequired = Number(booking.booking_amount) + Number(booking.security_deposit_amount);
        const paid = Number(booking.paid_amount) || 0;
        return total + Math.max(0, totalRequired - paid);
      }, 0) || 0;

      setStats({
        totalBookings: totalBookings || 0,
        activeRentals: activeRentals || 0,
        returnsToday: returnsToday || 0,
        pendingReturns: pendingPayments?.length || 0,
        pendingAmount,
      });
    } catch (error) {
      console.error('Error fetching worker data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
            <button
              onClick={fetchWorkerData}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {/* Total Bookings */}
            <div className="bg-white rounded-lg p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <Calendar className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.totalBookings}</p>
                </div>
              </div>
            </div>

            {/* Active Rentals */}
            <div className="bg-white rounded-lg p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <Car className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Rentals</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.activeRentals}</p>
                </div>
              </div>
            </div>

            {/* Returns Today */}
            <div className="bg-white rounded-lg p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <RotateCcw className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Returns Today</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.returnsToday}</p>
                </div>
              </div>
            </div>

            {/* Payment Pending */}
            <div className="bg-white rounded-lg p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <IndianRupee className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Payment Pending</p>
                  <p className="text-2xl font-semibold text-yellow-600">{formatCurrency(stats.pendingAmount)}</p>
                </div>
              </div>
            </div>

            {/* Pending Returns */}
            <div className="bg-white rounded-lg p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <Clock className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending Returns</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.pendingReturns}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Vehicle Returns and Pending Payments Section */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Vehicle Returns Section */}
            <div>
              <VehicleReturns />
            </div>

            {/* Pending Payments Section */}
            <div>
              <PendingPayments />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}