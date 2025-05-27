'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import {
  Users,
  CalendarCheck,
  Receipt,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface DashboardMetrics {
  totalBookings: number;
  activeBookings: number;
  totalIncome: number;
  pendingPayments: number;
}

const DashboardPage = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalBookings: 0,
    activeBookings: 0,
    totalIncome: 0,
    pendingPayments: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();

      // Fetch total bookings
      const { count: totalBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true });

      if (bookingsError) {
        console.error('Error fetching total bookings:', bookingsError);
        throw new Error(`Failed to fetch total bookings: ${bookingsError.message}`);
      }

      // Fetch active bookings
      const { count: activeBookings, error: activeError } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'in_use');

      if (activeError) {
        console.error('Error fetching active bookings:', activeError);
        throw new Error(`Failed to fetch active bookings: ${activeError.message}`);
      }

      // Fetch total income from completed payments
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount')
        .eq('payment_status', 'completed');
      
      if (paymentsError) {
        console.error('Error fetching completed payments:', paymentsError);
        throw new Error(`Failed to fetch completed payments: ${paymentsError.message}`);
      }
      
      const totalIncome = payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

      // Fetch pending payments
      const { data: pendingPayments, error: pendingError } = await supabase
        .from('payments')
        .select('amount')
        .eq('payment_status', 'pending');

      if (pendingError) {
        console.error('Error fetching pending payments:', pendingError);
        throw new Error(`Failed to fetch pending payments: ${pendingError.message}`);
      }

      const totalPending = pendingPayments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

      setMetrics({
        totalBookings: totalBookings || 0,
        activeBookings: activeBookings || 0,
        totalIncome,
        pendingPayments: totalPending
      });
    } catch (error) {
      console.error('Error fetching metrics:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const stats = [
    {
      name: 'Total Bookings',
      value: metrics.totalBookings,
      icon: CalendarCheck,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      name: 'Active Rentals',
      value: metrics.activeBookings,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      name: 'Total Income',
      value: `₹${metrics.totalIncome.toLocaleString()}`,
      icon: Receipt,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      name: 'Pending Payments',
      value: `₹${metrics.pendingPayments.toLocaleString()}`,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        {error ? (
          <div className="flex items-center">
            <span className="text-sm text-red-600 mr-2">{error}</span>
            <button
              onClick={fetchMetrics}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry
            </button>
          </div>
        ) : (
          <button
            onClick={fetchMetrics}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="relative overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:px-6"
          >
            <dt>
              <div className={`absolute rounded-md ${stat.bgColor} p-3`}>
                <stat.icon
                  className={`h-6 w-6 ${stat.color}`}
                  aria-hidden="true"
                />
              </div>
              <p className="ml-16 truncate text-sm font-medium text-gray-500">
                {stat.name}
              </p>
            </dt>
            <dd className="ml-16 flex items-baseline">
              <p className="text-2xl font-semibold text-gray-900">
                {stat.value}
              </p>
            </dd>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardPage; 