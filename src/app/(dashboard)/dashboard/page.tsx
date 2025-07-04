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

interface UserProfile {
  role: 'admin' | 'worker';
  id: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    activeRentals: 0,
    totalIncome: 0,
    pendingPayments: 0
  });
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (userProfile) {
      fetchDashboardStats();
      
      // Listen for dashboard refresh events from other pages
      const handleDashboardRefresh = () => {
        console.log('Dashboard refresh event received, refreshing stats...');
        fetchDashboardStats();
      };
      
      window.addEventListener('dashboard:refresh', handleDashboardRefresh);
      
      return () => {
        window.removeEventListener('dashboard:refresh', handleDashboardRefresh);
      };
    }
  }, [userProfile]);

  const fetchUserProfile = async () => {
    try {
      const supabase = getSupabaseClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;

      if (!user) {
        throw new Error('No authenticated user found');
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      if (profile) {
        setUserProfile({ role: profile.role, id: user.id });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchDashboardStats = async () => {
    if (!userProfile) return;

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
        
      console.log(`Found ${totalBookings} total bookings and ${activeRentals} active rentals`);

      let totalIncome = 0;
      let pendingPayments = 0;

      // Only fetch total income for admins
      if (userProfile.role === 'admin') {
        // Get total income from completed payments
        console.log('Fetching payments for total income calculation...');
        const { data: completedPayments, error: paymentsError } = await supabase
          .from('payments')
          .select('amount')
          .eq('payment_status', 'completed');

        if (paymentsError) {
          console.error('Error fetching payments:', paymentsError);
          throw paymentsError;
        }

        // Calculate total income from completed payments
        if (completedPayments && completedPayments.length > 0) {
          totalIncome = completedPayments.reduce((sum, payment) => {
            const amount = typeof payment.amount === 'string' 
              ? parseFloat(payment.amount) 
              : payment.amount;
            return !isNaN(amount) ? sum + amount : sum;
          }, 0);
        }
      }

      // Get pending payments total - visible to all
      const { data: pendingBookings } = await supabase
        .from('bookings')
        .select('id, booking_amount, security_deposit_amount, paid_amount')
        .or('payment_status.eq.pending,payment_status.eq.partial')
        .not('status', 'eq', 'cancelled');

      const { data: allPayments } = await supabase
        .from('payments')
        .select('booking_id, amount')
        .eq('payment_status', 'completed');
      
      // Create a map of booking_id to total paid amount
      const paymentTotals = new Map<string, number>();
      if (allPayments) {
        allPayments.forEach(payment => {
          const currentTotal = paymentTotals.get(payment.booking_id) || 0;
          const amount = typeof payment.amount === 'string' 
            ? parseFloat(payment.amount) 
            : payment.amount;
          if (!isNaN(amount)) {
            paymentTotals.set(payment.booking_id, currentTotal + amount);
          }
        });
      }
      
      pendingPayments = pendingBookings?.reduce((sum, booking) => {
        try {
          const bookingAmount = Number(booking.booking_amount) || 0;
          const securityDeposit = Number(booking.security_deposit_amount) || 0;
          const total = bookingAmount + securityDeposit;
          const actualPaidAmount = paymentTotals.get(booking.id) || Number(booking.paid_amount) || 0;
          const remaining = total - actualPaidAmount;
          return sum + (remaining > 0 ? remaining : 0);
        } catch (err) {
          console.error('Error calculating pending payments for booking:', booking.id, err);
          return sum;
        }
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

  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchDashboardStats}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 border rounded-md text-sm font-medium border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Bookings - visible to all */}
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

        {/* Active Rentals - visible to all */}
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

        {/* Total Income - admin only */}
        {userProfile.role === 'admin' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <div className="ml-4">
                <h2 className="text-sm font-medium text-gray-600">Total Income</h2>
                <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.totalIncome)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Pending Payments - visible to all */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

      {/* Vehicle Returns and Pending Payments components - visible to all */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VehicleReturns />
        <PendingPayments />
      </div>
    </div>
  );
} 