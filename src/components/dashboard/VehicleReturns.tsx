'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { formatDate, formatTime, getISTDate } from '@/lib/utils';
import { AlertTriangle, CheckCircle2, Clock, Phone } from 'lucide-react';

interface VehicleReturn {
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
  booking_amount: number;
  security_deposit_amount: number;
  paid_amount: number;
  status: string;
}

export default function VehicleReturns() {
  const router = useRouter();
  const [returns, setReturns] = useState<{
    overdue: VehicleReturn[];
    today: VehicleReturn[];
    upcoming: VehicleReturn[];
  }>({
    overdue: [],
    today: [],
    upcoming: []
  });
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
    fetchVehicleReturns();
  }, []);

  const fetchVehicleReturns = async () => {
    try {
      const supabase = getSupabaseClient();
      const today = getISTDate();
      today.setHours(0, 0, 0, 0);

      // Get all active bookings
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .in('status', ['confirmed', 'in_use'])
        .order('end_date', { ascending: true });

      if (error) throw error;

      const categorizedReturns = (data || []).reduce((acc: any, booking) => {
        const endDate = new Date(booking.end_date);
        endDate.setHours(0, 0, 0, 0);
        const todayDate = today.getTime();
        const endDateTime = endDate.getTime();

        // Overdue returns (end date is in the past)
        if (endDateTime < todayDate) {
          acc.overdue.push(booking);
        }
        // Returns due today
        else if (endDateTime === todayDate) {
          acc.today.push(booking);
        }
        // Returns due tomorrow
        else {
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          if (endDateTime === tomorrow.getTime()) {
            acc.upcoming.push(booking);
          }
        }
        return acc;
      }, { overdue: [], today: [], upcoming: [] });

      console.log('Categorized returns:', {
        overdue: categorizedReturns.overdue.length,
        today: categorizedReturns.today.length,
        upcoming: categorizedReturns.upcoming.length
      });

      setReturns(categorizedReturns);
    } catch (error) {
      console.error('Error fetching vehicle returns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookingClick = (bookingId: string) => {
    router.push(`/dashboard/bookings/${bookingId}`);
  };

  const renderBookingCard = (booking: VehicleReturn, type: 'overdue' | 'today' | 'upcoming') => {
    const bgColorClass = {
      overdue: 'bg-red-50 hover:bg-red-100',
      today: 'bg-blue-50 hover:bg-blue-100',
      upcoming: 'bg-green-50 hover:bg-green-100'
    }[type];

    const statusText = {
      overdue: `${Math.ceil((getISTDate().getTime() - getISTDate(combineDateAndTime(booking.end_date, booking.dropoff_time)).getTime()) / (1000 * 60 * 60 * 24))} days overdue`,
      today: 'Due today',
      upcoming: 'Due tomorrow'
    }[type];

    const statusColor = {
      overdue: 'text-red-600',
      today: 'text-blue-600',
      upcoming: 'text-green-600'
    }[type];

    return (
      <div key={booking.id} className="relative">
        <div
          className={`p-3 rounded-lg cursor-pointer transition-colors ${bgColorClass}`}
          onClick={() => handleBookingClick(booking.id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleBookingClick(booking.id)}
        >
          <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
            <div className="w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium text-gray-900">
                  {booking.vehicle_details.model} ({booking.vehicle_details.registration})
                </div>
                {booking.customer_contact && (
                  <a
                    href={`tel:${booking.customer_contact}`}
                    className="ml-auto sm:hidden p-2 rounded-full bg-white shadow-sm border border-gray-200 text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                    title="Call customer"
                  >
                    <Phone className="h-4 w-4" />
                  </a>
                )}
              </div>
              <div className="text-xs text-gray-500">
                #{booking.booking_id} • {booking.customer_name} • {type === 'overdue' ? 'Due:' : 'Return by:'} {formatDate(booking.end_date)} {formatTime(booking.dropoff_time)}
              </div>
            </div>
            <div className="flex items-center gap-4 ml-auto">
              <div className={`text-xs font-medium ${statusColor}`}>
                {statusText}
              </div>
              {booking.customer_contact && (
                <a
                  href={`tel:${booking.customer_contact}`}
                  className="hidden sm:flex p-2 rounded-full bg-white shadow-sm border border-gray-200 text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                  title="Call customer"
                >
                  <Phone className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-48 bg-gray-100 rounded-lg"></div>
      </div>
    );
  }

  const hasReturns = returns.overdue.length > 0 || returns.today.length > 0 || returns.upcoming.length > 0;

  if (!hasReturns) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Vehicle Returns</h2>
        <div className="text-center text-gray-500 py-8">
          No vehicle returns scheduled
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Vehicle Returns</h2>
      </div>
      
      {returns.overdue.length > 0 && (
        <div className="p-4 border-b">
          <h3 className="text-sm font-medium text-red-600 flex items-center mb-3">
            <AlertTriangle className="h-4 w-4 mr-1" />
            Overdue Returns
          </h3>
          <div className="space-y-3">
            {returns.overdue.map((booking) => renderBookingCard(booking, 'overdue'))}
          </div>
        </div>
      )}

      {returns.today.length > 0 && (
        <div className="p-4 border-b">
          <h3 className="text-sm font-medium text-blue-600 flex items-center mb-3">
            <Clock className="h-4 w-4 mr-1" />
            Due Today
          </h3>
          <div className="space-y-3">
            {returns.today.map((booking) => renderBookingCard(booking, 'today'))}
          </div>
        </div>
      )}

      {returns.upcoming.length > 0 && (
        <div className="p-4">
          <div className="space-y-3">
            {returns.upcoming.map((booking) => renderBookingCard(booking, 'upcoming'))}
          </div>
        </div>
      )}
    </div>
  );
} 