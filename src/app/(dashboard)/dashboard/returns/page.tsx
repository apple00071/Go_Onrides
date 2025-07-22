'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { parseISO } from 'date-fns';
import { formatDate, formatTime } from '@/lib/utils';
import { Phone } from 'lucide-react';

interface Booking {
  id: string;
  customer_name: string;
  customer_contact: string;
  vehicle_details: {
    model: string;
    registration: string;
  };
  dropoff_time: string;
  end_date: string;
}

export default function TodaysReturnsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodaysReturns();
  }, []);

  const fetchTodaysReturns = async () => {
    try {
      const supabase = getSupabaseClient();
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          customer_name,
          customer_contact,
          vehicle_details,
          dropoff_time,
          end_date
        `)
        .eq('end_date', today)
        .eq('status', 'in_use');

      if (error) throw error;
      
      setBookings(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching returns:', error);
      setLoading(false);
    }
  };

  const isOverdue = (returnDate: string, returnTime: string) => {
    try {
      const now = new Date();
      const [hours, minutes] = returnTime.split(':');
      const returnDateTime = parseISO(returnDate);
      returnDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10));
      return returnDateTime < now;
    } catch (error) {
      console.error('Error checking overdue:', error);
      return false;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-gray-500">Loading returns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-gray-900">Today's Returns</h1>
      <p className="mt-1 text-sm text-gray-500">{bookings.length} vehicle{bookings.length !== 1 ? 's' : ''} to be returned</p>
      
      <div className="mt-6 space-y-4">
        {bookings.map((booking) => (
          <div key={booking.id} className="bg-white rounded-lg shadow">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {booking.vehicle_details.model}
                    {isOverdue(booking.end_date, booking.dropoff_time) && (
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Overdue
                      </span>
                    )}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">{booking.vehicle_details.registration}</p>
                </div>
                <a
                  href={`tel:${booking.customer_contact}`}
                  className="inline-flex items-center p-2 text-gray-400 hover:text-gray-500"
                >
                  <Phone className="h-5 w-5" />
                </a>
              </div>

              <div className="mt-4">
                <div className="text-sm font-medium text-gray-900">
                  Customer: {booking.customer_name}
                </div>
                <div className="text-sm text-gray-500">
                  Contact: {booking.customer_contact}
                </div>
                <div className="mt-2">
                  <div className="text-sm font-medium text-gray-900">
                    Return Date: {formatDate(booking.end_date)}
                  </div>
                  <div className="text-sm text-gray-500">
                    Return Time: {formatTime(booking.dropoff_time)}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={() => router.push(`/dashboard/returns/complete/${booking.id}`)}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Complete Booking
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}