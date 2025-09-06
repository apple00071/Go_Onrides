'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { RefreshCw, ClipboardList, Zap, IndianRupee, Clock } from 'lucide-react';
import VehicleReturns from '@/components/dashboard/VehicleReturns';
import PendingPayments from '@/components/dashboard/PendingPayments';

interface DashboardStats {
  totalBookings: number;
  activeRentals: number;
  totalIncome: number;
  pendingPayments: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    activeRentals: 0,
    totalIncome: 0,
    pendingPayments: 0,
  });

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const supabase = getSupabaseClient();

      // Get total bookings count
      const { count: totalBookings } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true });

      // Get active rentals (in_use status)
      const { count: activeRentals } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'in_use');

      // Get all bookings with payment data for income calculation
      const { data: bookings } = await supabase
        .from('bookings')
        .select('booking_amount, security_deposit_amount, paid_amount');

      let totalBookingAmount = 0;
      let totalSecurityDeposits = 0;
      let totalPaymentsReceived = 0;
      let pendingPayments = 0;

      if (bookings) {
        bookings.forEach(booking => {
          const bookingAmount = booking.booking_amount || 0;
          const securityDeposit = booking.security_deposit_amount || 0;
          const paidAmount = booking.paid_amount || 0;
          const totalRequired = bookingAmount + securityDeposit;

          totalBookingAmount += bookingAmount;
          totalSecurityDeposits += securityDeposit;
          totalPaymentsReceived += paidAmount;

          if (paidAmount < totalRequired) {
            pendingPayments += (totalRequired - paidAmount);
          }
        });
      }

      setStats({
        totalBookings: totalBookings || 0,
        activeRentals: activeRentals || 0,
        pendingPayments,
        totalIncome: totalBookingAmount,
      });

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Dashboard Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-900">Admin Dashboard</h1>
            <button
              onClick={fetchDashboardStats}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Bookings */}
            <div className="bg-white shadow rounded-lg p-5">
              <div className="flex items-center">
                <ClipboardList className="h-6 w-6 text-blue-500 flex-shrink-0" />
                <div className="ml-3">
                  <div className="text-sm font-medium text-gray-500">Total Bookings</div>
                  <div className="text-lg font-semibold text-gray-900">{stats.totalBookings}</div>
                </div>
              </div>
            </div>

            {/* Active Rentals */}
            <div className="bg-white shadow rounded-lg p-5">
              <div className="flex items-center">
                <Zap className="h-6 w-6 text-green-500 flex-shrink-0" />
                <div className="ml-3">
                  <div className="text-sm font-medium text-gray-500">Active Rentals</div>
                  <div className="text-lg font-semibold text-gray-900">{stats.activeRentals}</div>
                </div>
              </div>
            </div>

            {/* Total Income */}
            <div className="bg-white shadow rounded-lg p-5">
              <div className="flex items-center">
                <IndianRupee className="h-6 w-6 text-green-600 flex-shrink-0" />
                <div className="ml-3">
                  <div className="text-sm font-medium text-gray-500">Total Income</div>
                  <div className="text-lg font-semibold text-gray-900">{formatCurrency(stats.totalIncome)}</div>
                </div>
              </div>
            </div>

            {/* Pending Payments */}
            <div className="bg-white shadow rounded-lg p-5">
              <div className="flex items-center">
                <Clock className="h-6 w-6 text-gray-400 flex-shrink-0" />
                <div className="ml-3">
                  <div className="text-sm font-medium text-gray-500">Pending Payments</div>
                  <div className="text-lg font-semibold text-gray-900">{formatCurrency(stats.pendingPayments)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <VehicleReturns />
            </div>
            <div>
              <PendingPayments />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}