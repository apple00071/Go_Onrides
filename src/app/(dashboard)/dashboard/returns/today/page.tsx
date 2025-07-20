'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { formatDateTime, getISTDate } from '@/lib/utils';
import { Phone, ArrowRight } from 'lucide-react';

interface TodayReturn {
  id: string;
  booking_id: string;
  customer_name: string;
  customer_contact: string;
  vehicle_details: {
    model: string;
    registration: string;
  };
  end_date: string;
  dropoff_time: string;
  status: string;
}

export default function TodayReturnsPage() {
  const router = useRouter();
  const [returns, setReturns] = useState<TodayReturn[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper function to combine date and time
  const combineDateAndTime = (date: string, time: string) => {
    const [year, month, day] = date.split('-');
    const [hours, minutes] = time.split(':');
    return new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hours),
      parseInt(minutes)
    ).toISOString();
  };

  useEffect(() => {
    fetchTodayReturns();
  }, []);

  const fetchTodayReturns = async () => {
    try {
      const supabase = getSupabaseClient();
      
      // Get today's date in IST
      const today = getISTDate();
      const todayStr = today.toISOString().split('T')[0];
      
      console.log('Fetching returns for date:', todayStr);
      
      // First get all active bookings
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .in('status', ['confirmed', 'in_use'])
        .order('end_date', { ascending: true })
        .order('dropoff_time', { ascending: true });

      if (error) {
        console.error('Error in query:', error);
        throw error;
      }

      console.log('Raw returns data:', data);

      // Filter returns that are due today or overdue
      const filteredReturns = (data || []).filter(booking => {
        const returnDateTime = new Date(`${booking.end_date}T${booking.dropoff_time}`);
        const todayStart = new Date(todayStr);
        const todayEnd = new Date(todayStr);
        todayEnd.setHours(23, 59, 59, 999);

        // Include if return date is today or in the past
        return returnDateTime <= todayEnd;
      });

      // Sort returns by date and time
      const sortedReturns = filteredReturns.sort((a, b) => {
        const dateA = new Date(`${a.end_date}T${a.dropoff_time}`);
        const dateB = new Date(`${b.end_date}T${b.dropoff_time}`);
        return dateA.getTime() - dateB.getTime();
      });

      console.log('Processed returns:', sortedReturns);

      setReturns(sortedReturns);
    } catch (error) {
      console.error('Error fetching today returns:', error);
    } finally {
      setLoading(false);
    }
  };

  const isOverdue = (endDate: string, dropoffTime: string) => {
    const now = getISTDate();
    const returnDateTime = new Date(`${endDate}T${dropoffTime}`);
    return returnDateTime < now;
  };

  const handleCompleteBooking = (bookingId: string) => {
    router.push(`/dashboard/bookings/${bookingId}/complete`);
  };

  const handlePhoneClick = (phoneNumber: string) => {
    window.location.href = `tel:${phoneNumber}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white p-6 rounded-lg shadow">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Today's Returns</h1>
          <p className="mt-2 text-sm text-gray-600">
            {returns.length} vehicle{returns.length !== 1 ? 's' : ''} to be returned
          </p>
        </div>

        {returns.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center text-gray-500">
              No vehicles are due for return today
            </div>
            <div className="mt-4 text-sm text-gray-400">
              Debug Info:
              <pre className="mt-2 p-2 bg-gray-50 rounded">
                Current Time (IST): {getISTDate().toISOString()}
              </pre>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {returns.map((booking) => {
              const isBookingOverdue = isOverdue(booking.end_date, booking.dropoff_time);
              
              return (
                <div
                  key={booking.id}
                  className={`bg-white shadow rounded-lg overflow-hidden ${
                    isBookingOverdue ? 'border-l-4 border-red-500' : ''
                  }`}
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-medium text-gray-900">
                            {booking.vehicle_details.model}
                          </h3>
                          {isBookingOverdue && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Overdue
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {booking.vehicle_details.registration}
                        </p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={() => handlePhoneClick(booking.customer_contact)}
                          className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-colors"
                          title="Call customer"
                        >
                          <Phone className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleCompleteBooking(booking.booking_id)}
                          className={`inline-flex items-center px-6 py-2.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white transition-colors ${
                            isBookingOverdue 
                              ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                              : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                          } focus:outline-none focus:ring-2 focus:ring-offset-2`}
                        >
                          Complete Booking
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Booking ID</p>
                        <p className="font-medium">#{booking.booking_id}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Customer</p>
                        <p className="font-medium">{booking.customer_name}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Return Date</p>
                        <p className={`font-medium ${isBookingOverdue ? 'text-red-600' : ''}`}>
                          {booking.end_date}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Return Time</p>
                        <p className={`font-medium ${isBookingOverdue ? 'text-red-600' : ''}`}>
                          {booking.dropoff_time}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
} 