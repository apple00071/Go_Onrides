'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import {
  BarChart as BarChartIcon,
  TrendingUp,
  Calendar,
  DollarSign,
  RefreshCw
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface RevenueData {
  month: string;
  revenue: number;
}

interface BookingStats {
  total: number;
  active: number;
  completed: number;
  cancelled: number;
}

interface VehicleUtilization {
  make: string;
  model: string;
  bookings: number;
  revenue: number;
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [bookingStats, setBookingStats] = useState<BookingStats>({
    total: 0,
    active: 0,
    completed: 0,
    cancelled: 0
  });
  const [vehicleUtilization, setVehicleUtilization] = useState<VehicleUtilization[]>([]);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();

      // Fetch monthly revenue data
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount, created_at, payment_status')
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end)
        .eq('payment_status', 'completed');

      if (paymentsError) {
        console.error('Payments query error:', paymentsError);
        throw new Error(`Failed to fetch payments: ${paymentsError.message}`);
      }

      const monthlyRevenue = (payments || []).reduce((acc: { [key: string]: number }, payment) => {
        const month = new Date(payment.created_at).toLocaleString('default', { month: 'short', year: 'numeric' });
        acc[month] = (acc[month] || 0) + Number(payment.amount);
        return acc;
      }, {});

      setRevenueData(
        Object.entries(monthlyRevenue).map(([month, revenue]) => ({
          month,
          revenue
        }))
      );

      // Fetch booking statistics
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('status');

      if (bookingsError) {
        console.error('Bookings query error:', bookingsError);
        throw new Error(`Failed to fetch bookings: ${bookingsError.message}`);
      }

      const stats = (bookings || []).reduce((acc: BookingStats, booking) => {
        acc.total++;
        if (booking.status === 'in_use') acc.active++;
        if (booking.status === 'completed') acc.completed++;
        if (booking.status === 'cancelled') acc.cancelled++;
        return acc;
      }, { total: 0, active: 0, completed: 0, cancelled: 0 });

      setBookingStats(stats);

      // Fetch vehicle utilization data
      const { data: vehicleBookings, error: vehicleError } = await supabase
        .from('bookings')
        .select(`
          vehicle_details,
          booking_amount,
          status
        `)
        .in('status', ['completed', 'in_use']);

      if (vehicleError) {
        console.error('Vehicle bookings query error:', vehicleError);
        throw new Error(`Failed to fetch vehicle bookings: ${vehicleError.message}`);
      }

      const vehicleStats = (vehicleBookings || []).reduce((acc: { [key: string]: VehicleUtilization }, booking) => {
        const vehicle = `${booking.vehicle_details.make} ${booking.vehicle_details.model}`;
        if (!acc[vehicle]) {
          acc[vehicle] = {
            make: booking.vehicle_details.make,
            model: booking.vehicle_details.model,
            bookings: 0,
            revenue: 0
          };
        }
        acc[vehicle].bookings++;
        acc[vehicle].revenue += Number(booking.booking_amount);
        return acc;
      }, {});

      setVehicleUtilization(Object.values(vehicleStats));
    } catch (error) {
      console.error('Error details:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      setError(error instanceof Error ? error.message : 'Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const stats = [
    {
      name: 'Total Bookings',
      value: bookingStats.total,
      icon: Calendar,
      change: ((bookingStats.completed / bookingStats.total) * 100).toFixed(1) + '% completion rate',
      changeType: 'positive'
    },
    {
      name: 'Active Rentals',
      value: bookingStats.active,
      icon: TrendingUp,
      change: ((bookingStats.active / bookingStats.total) * 100).toFixed(1) + '% utilization rate',
      changeType: 'neutral'
    },
    {
      name: 'Total Revenue',
      value: `$${revenueData.reduce((sum, month) => sum + month.revenue, 0).toLocaleString()}`,
      icon: DollarSign,
      change: 'From all completed bookings',
      changeType: 'positive'
    },
    {
      name: 'Cancellation Rate',
      value: ((bookingStats.cancelled / bookingStats.total) * 100).toFixed(1) + '%',
      icon: BarChartIcon,
      change: `${bookingStats.cancelled} cancelled bookings`,
      changeType: bookingStats.cancelled === 0 ? 'positive' : 'negative'
    }
  ];

  const totalRevenue = revenueData.reduce((sum, month) => sum + month.revenue, 0);
  const averageBookingValue = totalRevenue / bookingStats.total;
  const outstandingPayments = 0; // Assuming outstandingPayments is 0
  const pendingPayments = 0; // Assuming pendingPayments is 0
  const monthlyRevenue = revenueData.reduce((sum, month) => sum + month.revenue, 0);
  const revenueByVehicleType = vehicleUtilization.map(vehicle => ({
    type: `${vehicle.make} ${vehicle.model}`,
    revenue: vehicle.revenue
  }));
  const monthlyRevenueTrend = revenueData.map(month => ({
    month: month.month,
    revenue: month.revenue
  }));

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>
          <p className="mt-2 text-sm text-gray-700">
            View detailed analytics and reports
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => {
              setDateRange(prev => ({ ...prev, start: e.target.value }));
              setError(null);
            }}
            className="block w-full sm:text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => {
              setDateRange(prev => ({ ...prev, end: e.target.value }));
              setError(null);
            }}
            className="block w-full sm:text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={fetchReportData}
            disabled={loading}
            className={`inline-flex items-center px-3 py-2 border rounded-md text-sm font-medium ${
              error
                ? 'border-transparent text-white bg-red-600 hover:bg-red-700'
                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading...' : error ? 'Retry' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading reports</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="mt-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-600">Loading report data...</p>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.name}
              className="relative overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:px-6"
            >
              <dt>
                <div className={`absolute rounded-md p-3 ${
                  stat.changeType === 'positive'
                    ? 'bg-green-100'
                    : stat.changeType === 'negative'
                    ? 'bg-red-100'
                    : 'bg-gray-100'
                }`}>
                  <stat.icon
                    className={`h-6 w-6 ${
                      stat.changeType === 'positive'
                        ? 'text-green-600'
                        : stat.changeType === 'negative'
                        ? 'text-red-600'
                        : 'text-gray-600'
                    }`}
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
                <p className="ml-2 flex items-baseline text-sm text-gray-500">
                  {stat.change}
                </p>
              </dd>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900">Total Revenue</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {formatCurrency(totalRevenue)}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Last updated: {formatDate(new Date().toISOString())}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900">Average Booking Value</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {formatCurrency(averageBookingValue)}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Based on {bookingStats.total} bookings
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900">Outstanding Payments</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {formatCurrency(outstandingPayments)}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            From {pendingPayments} pending payments
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900">Monthly Revenue</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {formatCurrency(monthlyRevenue)}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {formatDate(new Date().toISOString()).split(',')[0]}
          </p>
        </div>
      </div>

      {/* Revenue by Vehicle Type */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900">Revenue by Vehicle Type</h3>
          <div className="mt-4">
            {revenueByVehicleType.map((item) => (
              <div key={item.type} className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-500">{item.type}</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(item.revenue)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly Revenue Trend */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900">Monthly Revenue Trend</h3>
          <div className="mt-4">
            {monthlyRevenueTrend.map((item) => (
              <div key={item.month} className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-500">{item.month}</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(item.revenue)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Monthly Revenue Chart */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900">Monthly Revenue</h3>
          <div className="mt-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="relative h-64">
                <div className="absolute inset-0 flex items-end space-x-2">
                  {revenueData.map((month) => (
                    <div
                      key={month.month}
                      className="flex-1 bg-blue-100 rounded-t"
                      style={{
                        height: `${(month.revenue / Math.max(...revenueData.map(d => d.revenue))) * 100}%`
                      }}
                    >
                      <div className="px-2 py-1 text-xs text-blue-700 font-medium">
                        {formatCurrency(month.revenue)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-4 grid grid-cols-6 gap-2 text-xs text-gray-600">
              {revenueData.map((month) => (
                <div key={month.month} className="text-center">
                  {month.month}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Vehicle Utilization */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900">Vehicle Utilization</h3>
          <div className="mt-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {vehicleUtilization.map((vehicle) => (
                  <div key={`${vehicle.make}-${vehicle.model}`} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">
                          {vehicle.make} {vehicle.model}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {vehicle.bookings} bookings
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(vehicle.revenue)}
                        </p>
                        <p className="text-sm text-gray-500">
                          Total Revenue
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${(vehicle.bookings / Math.max(...vehicleUtilization.map(v => v.bookings))) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 