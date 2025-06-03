'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { Search, Filter, Plus, CreditCard, RefreshCw } from 'lucide-react';
import PaymentModal from '@/components/payments/PaymentModal';
import { formatCurrency, formatDateTime } from '@/lib/utils';

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
    vehicle_details: {
      model: string;
      registration: string;
    };
    booking_amount: number;
    security_deposit_amount: number;
    paid_amount: number;
  };
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentWithBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('Fetching payments for payments page...');
      const supabase = getSupabaseClient();
      
      // First, get all payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (paymentsError) {
        console.error('Error fetching payments:', paymentsError);
        throw new Error(`Failed to fetch payments: ${paymentsError.message}`);
      }
      
      console.log('Raw payments data:', paymentsData);
      
      if (!paymentsData || paymentsData.length === 0) {
        console.log('No payments found');
        setPayments([]);
        return;
      }
      
      // Get all bookings to map to payments
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*');
        
      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        throw new Error(`Failed to fetch bookings: ${bookingsError.message}`);
      }
      
      // Create a lookup map for bookings
      const bookingsMap = new Map();
      bookingsData?.forEach(booking => {
        bookingsMap.set(booking.id, booking);
      });
      
      console.log('Processed bookings map:', Array.from(bookingsMap.keys()));

      // Now transform payments with booking data
      const transformedPayments: PaymentWithBooking[] = paymentsData.map(payment => {
        const booking = bookingsMap.get(payment.booking_id);
        console.log(`Mapping payment ${payment.id} to booking ${payment.booking_id}:`, booking ? 'Found' : 'Not found');
        
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
            vehicle_details: {
              model: booking?.vehicle_details?.model || 'Unknown',
              registration: booking?.vehicle_details?.registration || 'Unknown'
            },
            booking_amount: booking?.booking_amount || 0,
            security_deposit_amount: booking?.security_deposit_amount || 0,
            paid_amount: booking?.paid_amount || 0
          }
        };
      });
      
      console.log('Transformed payments data:', transformedPayments);
      setPayments(transformedPayments);
    } catch (error) {
      console.error('Error in fetchPayments:', error);
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
      payment.booking.booking_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.booking.vehicle_details.registration.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const matchesStatus = statusFilter === 'all' || payment.payment_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalAmount = filteredPayments.reduce((sum, payment) => {
    return payment.payment_status === 'completed' ? sum + Number(payment.amount) : sum;
  }, 0);

  const handlePaymentCreated = () => {
    console.log('Payment created, refreshing data...');
    setRefreshKey(prevKey => prevKey + 1);
    
    // Trigger dashboard refresh by sending a custom event
    const dashboardRefreshEvent = new CustomEvent('dashboard:refresh');
    window.dispatchEvent(dashboardRefreshEvent);
  };

  return (
    <div className="min-h-screen p-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Payments</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage payments and track revenue
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <button
            onClick={fetchPayments}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 border rounded-md text-sm font-medium border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Payment
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
              <h3 className="text-sm font-medium text-red-800">Error loading payments</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 bg-white shadow rounded-lg">
        <div className="p-4 border-b border-gray-200 sm:flex sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Search by customer, booking ID or vehicle..."
            />
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        <div className="bg-gray-50 p-4 border-b">
          <div className="text-sm text-gray-700 flex items-center">
            <span className="mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-500">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.418 0-8-3.582-8-8s3.582-8 8-8 8 3.582 8 8-3.582 8-8 8zm-1-13v2h2v1h-2v1h2v1h-2v3h-1v-3H9v-1h1v-1H9v-1h1V7h1zm3 0v2h1v5h-1V7z" clipRule="evenodd" />
              </svg>
            </span>
            Total Revenue (Completed Payments): <span className="font-semibold">{formatCurrency(totalAmount)}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Booking Details
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Info
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {payment.booking.booking_id}
                    </div>
                    <div className="text-sm text-gray-500">
                      {payment.booking.customer_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {payment.booking.vehicle_details.model} ({payment.booking.vehicle_details.registration})
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm text-gray-900">
                      <span className="mr-2">{getPaymentModeIcon(payment.payment_mode)}</span>
                      <span className="capitalize">{payment.payment_mode}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Total: {formatCurrency(payment.booking.booking_amount + payment.booking.security_deposit_amount)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Paid: {formatCurrency(payment.booking.paid_amount)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(payment.amount)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(payment.payment_status)}`}>
                      {payment.payment_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDateTime(payment.created_at)}
                  </td>
                </tr>
              ))}
              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    No payments found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PaymentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPaymentCreated={handlePaymentCreated}
      />
    </div>
  );
}