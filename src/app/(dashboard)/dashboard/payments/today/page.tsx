'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { Search, Filter, Plus, CreditCard, RefreshCw } from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { format } from 'date-fns';

interface PaymentWithBooking {
  id: string;
  booking_id: string;
  amount: number;
  payment_mode: 'cash' | 'upi' | 'card' | 'bank_transfer';
  payment_status: 'pending' | 'completed' | 'failed';
  created_at: string;
  created_by?: string;
  booking: {
    id: string;
    booking_id: string;
    customer_name: string;
    customer_phone: string;
    vehicle_details: {
      model: string;
      registration: string;
    };
    booking_amount: number;
    security_deposit_amount: number;
    paid_amount: number;
  };
}

export default function TodaysPaymentsPage() {
  const [payments, setPayments] = useState<PaymentWithBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchTodaysPayments();
  }, [refreshKey]);

  const fetchTodaysPayments = async () => {
    setLoading(true);
    setError(null);

    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const supabase = getSupabaseClient();
      
      // First, get today's payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`)
        .order('created_at', { ascending: false });

      if (paymentsError) {
        throw new Error(`Failed to fetch payments: ${paymentsError.message}`);
      }
      
      if (!paymentsData || paymentsData.length === 0) {
        setPayments([]);
        return;
      }
      
      // Get all bookings to map to payments
      const bookingIds = paymentsData.map(p => p.booking_id);
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .in('id', bookingIds);
        
      if (bookingsError) {
        throw new Error(`Failed to fetch bookings: ${bookingsError.message}`);
      }
      
      // Create a lookup map for bookings
      const bookingsMap = new Map();
      bookingsData?.forEach(booking => {
        bookingsMap.set(booking.id, {
          ...booking,
          vehicle_details: booking.vehicle_details || { model: 'Unknown', registration: 'N/A' }
        });
      });

      // Transform payments with booking data
      const transformedPayments: PaymentWithBooking[] = paymentsData.map(payment => {
        const booking = bookingsMap.get(payment.booking_id);
        
        return {
          id: payment.id,
          booking_id: payment.booking_id,
          amount: payment.amount,
          payment_mode: payment.payment_mode,
          payment_status: payment.payment_status,
          created_at: payment.created_at,
          created_by: payment.created_by || 'system',
          booking: {
            id: booking?.id || '',
            booking_id: booking?.booking_id || '',
            customer_name: booking?.customer_name || 'Unknown Customer',
            customer_phone: booking?.customer_phone || '',
            vehicle_details: {
              model: booking?.vehicle_details?.model || 'Unknown',
              registration: booking?.vehicle_details?.registration || 'N/A'
            },
            booking_amount: booking?.booking_amount || 0,
            security_deposit_amount: booking?.security_deposit_amount || 0,
            paid_amount: booking?.paid_amount || 0
          }
        };
      });
      
      setPayments(transformedPayments);
    } catch (error) {
      console.error('Error in fetchTodaysPayments:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentModeIcon = (mode: string) => {
    switch (mode) {
      case 'cash':
        return '💵';
      case 'upi':
        return '📱';
      case 'card':
        return '💳';
      case 'bank_transfer':
        return '🏦';
      default:
        return '💰';
    }
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = (
      payment.booking.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (payment.booking.booking_id && payment.booking.booking_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      payment.booking.vehicle_details.registration.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const matchesStatus = statusFilter === 'all' || payment.payment_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalAmount = filteredPayments.reduce((sum, payment) => {
    return payment.payment_status === 'completed' ? sum + Number(payment.amount) : sum;
  }, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600 bg-red-50 rounded-md">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Today's Payments</h1>
          <p className="mt-2 text-sm text-gray-700">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <div className="bg-green-50 px-4 py-3 rounded-md inline-block">
            <div className="text-sm text-gray-600">Total Collected Today</div>
            <div className="text-xl font-semibold text-green-700">
              {formatCurrency(totalAmount)}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="w-full sm:max-w-xs">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Search payments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="w-full sm:w-48">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-5 w-5 text-gray-400" />
            </div>
            <select
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-lg">
        {filteredPayments.length === 0 ? (
          <div className="p-8 text-center">
            <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No payments</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' 
                ? 'No payments match your search criteria.'
                : 'No payments recorded for today.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer & Booking
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vehicle
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Details
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {payment.booking.customer_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {payment.booking.customer_phone}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            Booking #{payment.booking.booking_id || payment.booking.id.substring(0, 8)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {payment.booking.vehicle_details.model}
                      </div>
                      <div className="text-sm text-gray-500">
                        {payment.booking.vehicle_details.registration}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-xl mr-2">{getPaymentModeIcon(payment.payment_mode)}</span>
                        <div>
                          <div className="text-sm font-medium text-gray-900 capitalize">
                            {payment.payment_mode.replace('_', ' ')}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatDateTime(payment.created_at)}
                          </div>
                        </div>
                      </div>
                      <span className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(payment.payment_status)}`}>
                        {payment.payment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="text-gray-900">{formatCurrency(payment.amount)}</div>
                      <div className="text-xs text-gray-500">
                        {payment.payment_status === 'completed' ? 'Paid' : 'Pending'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={3} className="px-6 py-3 text-sm font-medium text-gray-700 text-right">
                    Total Collected:
                  </td>
                  <td className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                    {formatCurrency(totalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
