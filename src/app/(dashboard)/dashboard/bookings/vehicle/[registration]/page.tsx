'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';

interface Booking {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
  amount: number;
  customer_name: string;
  customer_phone: string;
}

export default function VehicleBookingHistoryPage({ params }: { params: { registration: string } }) {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBookingHistory();
  }, []);

  const fetchBookingHistory = async () => {
    try {
      setLoading(true);
      const supabase = getSupabaseClient();
      const decodedRegistration = decodeURIComponent(params.registration);

      // Fetch booking history with customer details
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          customers (
            name,
            phone
          )
        `)
        .order('start_date', { ascending: false });

      if (error) throw error;

      // Filter bookings for this vehicle and transform the data
      const formattedBookings = (data || [])
        .filter(booking => {
          try {
            const vehicleDetails = typeof booking.vehicle_details === 'string'
              ? JSON.parse(booking.vehicle_details)
              : booking.vehicle_details;
            return vehicleDetails?.registration === decodedRegistration;
          } catch (e) {
            return false;
          }
        })
        .map(booking => ({
          ...booking,
          customer_name: booking.customer_name || 'Unknown',
          customer_phone: booking.customer_contact || 'N/A',
          amount: booking.total_amount || booking.booking_amount || 0
        }));

      setBookings(formattedBookings);
    } catch (error) {
      console.error('Error fetching booking history:', error);
      setError('Failed to load booking history');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="text-center">Loading booking history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="text-center text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="sm:flex sm:items-center">
            <div className="sm:flex-auto">
              <h3 className="text-lg font-medium text-gray-900">Booking History</h3>
              <p className="mt-2 text-sm text-gray-700">
                Complete booking history for this vehicle
              </p>
            </div>
          </div>
          
          <div className="mt-6 overflow-hidden">
            {bookings.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No booking records found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Booking Period
                      </th>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {bookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>{booking.customer_name}</div>
                          <div className="text-gray-500">{booking.customer_phone}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                            ${
                              booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                              booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                              booking.status === 'ongoing' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }
                          `}>
                            {booking.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(booking.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 