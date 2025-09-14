'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { RefreshCw, ClipboardList, Zap, IndianRupee, Clock } from 'lucide-react';
import VehicleReturns from '@/components/dashboard/VehicleReturns';
import PendingPayments from '@/components/dashboard/PendingPayments';
import WorkerDashboard from '@/components/dashboard/WorkerDashboard';

interface DashboardStats {
  totalBookings: number;
  activeRentals: number;
  totalIncome: number;
  pendingPayments: number;
}

interface UserProfile {
  id: string;
  role: 'admin' | 'worker' | 'manager';
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    activeRentals: 0,
    totalIncome: 0,
    pendingPayments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const supabase = getSupabaseClient();
      
      const { data: { user }, error: sessionError } = await supabase.auth.getUser();
      if (sessionError) throw sessionError;

      if (!user) {
        console.error('No user found');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      setUserProfile(profile);
      
      // Immediately fetch stats if admin
      if (profile.role === 'admin') {
        await fetchDashboardStats();
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      console.log('Fetching dashboard stats...');
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

      // Get all bookings with their payments
      const { data: allBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_id,
          booking_amount,
          security_deposit_amount,
          paid_amount,
          damage_charges,
          late_fee,
          extension_fee,
          payment_status,
          status,
          payments (
            amount
          ),
          booking_extensions (
            additional_amount
          )
        `)
        .in('status', ['completed', 'in_use', 'confirmed']);

      if (bookingsError) throw bookingsError;

      // Calculate total income and pending payments
      let totalBookingAmount = 0;  // Only booking amount + charges
      let totalSecurityDeposits = 0;  // Only security deposits
      let totalPaymentsReceived = 0;  // Actual payments received
      let pendingPayments = 0;

      allBookings?.forEach(booking => {
        // Calculate base charges (always included)
        const baseCharges = Number(booking.booking_amount || 0);
        const securityDeposit = Number(booking.security_deposit_amount || 0);
        
        // Sum up all extension amounts from booking_extensions
        const extensionAmounts = booking.booking_extensions?.reduce((sum, ext) => 
          sum + Number(ext.additional_amount || 0), 0) || 0;

        // Calculate total charges based on booking status
        let totalCharges = baseCharges + securityDeposit + extensionAmounts;

        // Only include these charges for completed bookings
        if (booking.status === 'completed') {
          totalCharges += (
            Number(booking.extension_fee || 0) +    // Extension fees
            Number(booking.late_fee || 0) +         // Late fees
            Number(booking.damage_charges || 0)     // Damage charges
          );
        }
        
        // Calculate total payments
        const initialPayment = Number(booking.paid_amount || 0);
        const additionalPayments = booking.payments?.reduce((sum, payment) => 
          sum + Number(payment.amount || 0), 0) || 0;
        const totalPaid = initialPayment + additionalPayments;

        // Add to respective totals based on booking status
        if (booking.status === 'completed' || booking.status === 'in_use') {
          // Include booking amount and any additional charges in income
          totalBookingAmount += (
            baseCharges +
            (booking.status === 'completed' ? (
              Number(booking.extension_fee || 0) +
              Number(booking.late_fee || 0) +
              Number(booking.damage_charges || 0)
            ) : 0)
          );
          totalSecurityDeposits += securityDeposit;
        }
        
        // Add to total payments received
        totalPaymentsReceived += totalPaid;

        // Calculate pending payments for in_use and confirmed bookings
        if ((booking.status === 'in_use' || booking.status === 'confirmed') && 
            ['pending', 'partial'].includes(booking.payment_status)) {
          const pendingAmount = Math.max(0, totalCharges - totalPaid);
          console.log('Pending calculation for booking:', {
            id: booking.booking_id,
            baseCharges,
            securityDeposit,
            extensionAmounts,
            totalCharges,
            totalPaid,
            pendingAmount
          });
          pendingPayments += pendingAmount;
        }
      });

      // For dashboard display, we'll show total booking amount
      setStats({
        totalBookings: totalBookings || 0,
        activeRentals: activeRentals || 0,
        pendingPayments,  // Should be 1,500 now
        totalIncome: totalBookingAmount,  // Total booking amount (8,700)
      });

      // Log the breakdown for verification
      console.log('Income Breakdown:', {
        totalBookingAmount,      // Should be 8,700
        totalSecurityDeposits,   // Should be 13,000
        totalPaymentsReceived,   // Should be 17,500
        pendingPayments         // Should be 1,500
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
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

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-900">Error</h2>
            <p className="mt-2 text-sm text-gray-600">Could not load user profile</p>
          </div>
        </div>
      </div>
    );
  }

  if (userProfile.role === 'worker') {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <WorkerDashboard />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Dashboard Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
            <button
              onClick={fetchDashboardStats}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Bookings */}
            <div className="bg-white shadow rounded-lg p-5">
              <div className="flex items-center">
                <ClipboardList className="h-6 w-6 text-gray-400 flex-shrink-0" />
                <div className="ml-3">
                  <div className="text-sm font-medium text-gray-500">Total Bookings</div>
                  <div className="text-lg font-semibold text-gray-900">{stats.totalBookings}</div>
                </div>
              </div>
            </div>

            {/* Active Rentals */}
            <div className="bg-white shadow rounded-lg p-5">
              <div className="flex items-center">
                <Zap className="h-6 w-6 text-gray-400 flex-shrink-0" />
                <div className="ml-3">
                  <div className="text-sm font-medium text-gray-500">Active Rentals</div>
                  <div className="text-lg font-semibold text-gray-900">{stats.activeRentals}</div>
                </div>
              </div>
            </div>

            {/* Total Income */}
            <div className="bg-white shadow rounded-lg p-5">
              <div className="flex items-center">
                <IndianRupee className="h-6 w-6 text-gray-400 flex-shrink-0" />
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