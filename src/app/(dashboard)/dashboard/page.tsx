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
  role: 'admin' | 'worker';
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
      if (profile.role === 'admin') {
        fetchDashboardStats();
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
        
      console.log(`Found ${totalBookings} total bookings and ${activeRentals} active rentals`);

      // Get total income and pending payments
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('booking_amount, paid_amount')
        .in('status', ['confirmed', 'in_use', 'completed']);

      if (bookingsError) throw bookingsError;

      const totalIncome = bookings?.reduce((sum, booking) => sum + (booking.paid_amount || 0), 0) || 0;
      const pendingPayments = bookings?.reduce((sum, booking) => {
        const pending = booking.booking_amount - (booking.paid_amount || 0);
        return sum + (pending > 0 ? pending : 0);
      }, 0) || 0;

      setStats({
        totalBookings: totalBookings || 0,
        activeRentals: activeRentals || 0,
        totalIncome,
        pendingPayments,
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
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
            <button
              onClick={fetchDashboardStats}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Bookings */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Bookings</dt>
                      <dd className="text-lg font-semibold text-gray-900">{stats.totalBookings}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Rentals */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Active Rentals</dt>
                      <dd className="text-lg font-semibold text-gray-900">{stats.activeRentals}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Income */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <IndianRupee className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Income</dt>
                      <dd className="text-lg font-semibold text-gray-900">{formatCurrency(stats.totalIncome)}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Pending Payments */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Clock className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Pending Payments</dt>
                      <dd className="text-lg font-semibold text-gray-900">{formatCurrency(stats.pendingPayments)}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Vehicle Returns */}
          <div>
            <VehicleReturns />
          </div>

          {/* Pending Payments */}
          <div>
            <PendingPayments />
          </div>
        </div>
      </div>
    </div>
  );
} 