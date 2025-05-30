'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';
import VehicleReturns from '@/components/dashboard/VehicleReturns';
import PendingPayments from '@/components/dashboard/PendingPayments';

interface DashboardStats {
  totalBookings: number;
  activeRentals: number;
  totalIncome: number;
  pendingPayments: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    activeRentals: 0,
    totalIncome: 0,
    pendingPayments: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const supabase = getSupabaseClient();

      // Get total bookings
      const { count: totalBookings } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true });

      // Get active rentals
      const { count: activeRentals } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'in_use');

      // Get total income from completed bookings
      const { data: completedBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_amount,
          paid_amount,
          payment_status
        `)
        .eq('payment_status', 'full');

      if (bookingsError) {
        console.error('Error fetching completed bookings:', bookingsError);
        throw bookingsError;
      }

      // Calculate total income from booking amounts only (excluding security deposits)
      const totalIncome = completedBookings?.reduce((sum, booking) => {
        const amount = typeof booking.booking_amount === 'string'
          ? parseFloat(booking.booking_amount)
          : booking.booking_amount;
        
        return !isNaN(amount) ? sum + amount : sum;
      }, 0) || 0;

      console.log('Total income from bookings:', totalIncome);

      // Get pending payments total
      const { data: pendingBookings } = await supabase
        .from('bookings')
        .select('booking_amount, security_deposit_amount, paid_amount')
        .in('payment_status', ['pending', 'partial']);

      const pendingPayments = pendingBookings?.reduce((sum, booking) => {
        const total = booking.booking_amount + booking.security_deposit_amount;
        return sum + (total - booking.paid_amount);
      }, 0) || 0;

      setStats({
        totalBookings: totalBookings || 0,
        activeRentals: activeRentals || 0,
        totalIncome,
        pendingPayments
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <button
          onClick={fetchDashboardStats}
          disabled={loading}
          className="inline-flex items-center px-3 py-2 border rounded-md text-sm font-medium border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Bookings */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM16 2v4M8 2v4M3 10h18" />
              </svg>
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-gray-600">Total Bookings</h2>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalBookings}</p>
            </div>
          </div>
        </div>

        {/* Active Rentals */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 3h5v5M8 3H3v5M3 16v5h5m13-5v5h-5" />
              </svg>
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-gray-600">Active Rentals</h2>
              <p className="text-2xl font-semibold text-gray-900">{stats.activeRentals}</p>
            </div>
          </div>
        </div>

        {/* Total Income */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.418 0-8-3.582-8-8s3.582-8 8-8 8 3.582 8 8-3.582 8-8 8zm-1-13v2h2v1h-2v1h2v1h-2v3h-1v-3H9v-1h1v-1H9v-1h1V7h1zm3 0v2h1v5h-1V7z" />
              </svg>
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-gray-600">Total Income</h2>
              <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.totalIncome)}</p>
            </div>
          </div>
        </div>

        {/* Pending Payments */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-gray-600">Pending Payments</h2>
              <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.pendingPayments)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VehicleReturns />
        <PendingPayments />
      </div>
    </div>
  );
} 