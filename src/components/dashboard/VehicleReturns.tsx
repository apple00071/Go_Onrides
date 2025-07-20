'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { formatDate, formatDateTime, getISTDate } from '@/lib/utils';
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

interface VehicleReturn {
  id: string;
  booking_id: string;
  customer_name: string;
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
      
      const tomorrow = getISTDate();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .in('status', ['confirmed', 'in_use'])
        .order('end_date', { ascending: true });

      if (error) throw error;

      const categorizedReturns = (data || []).reduce((acc: any, booking) => {
        const endDateTime = getISTDate(combineDateAndTime(booking.end_date, booking.dropoff_time));
        const endDateStart = new Date(endDateTime);
        endDateStart.setHours(0, 0, 0, 0);

        if (endDateTime < getISTDate()) {
          acc.overdue.push(booking);
        } else if (endDateStart.getTime() === today.getTime()) {
          acc.today.push(booking);
        } else if (endDateStart.getTime() === tomorrow.getTime()) {
          acc.upcoming.push(booking);
        }
        return acc;
      }, { overdue: [], today: [], upcoming: [] });

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
            {returns.overdue.map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between p-3 bg-red-50 rounded-lg cursor-pointer hover:bg-red-100 transition-colors"
                onClick={() => handleBookingClick(booking.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleBookingClick(booking.id)}
              >
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {booking.vehicle_details.model} ({booking.vehicle_details.registration})
                  </div>
                  <div className="text-xs text-gray-500">
                    #{booking.booking_id} • {booking.customer_name} • Due: {formatDateTime(combineDateAndTime(booking.end_date, booking.dropoff_time))}
                  </div>
                </div>
                <div className="text-xs font-medium text-red-600">
                  {Math.ceil((getISTDate().getTime() - getISTDate(combineDateAndTime(booking.end_date, booking.dropoff_time)).getTime()) / (1000 * 60 * 60 * 24))} days overdue
                </div>
              </div>
            ))}
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
            {returns.today.map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between p-3 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                onClick={() => handleBookingClick(booking.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleBookingClick(booking.id)}
              >
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {booking.vehicle_details.model} ({booking.vehicle_details.registration})
                  </div>
                  <div className="text-xs text-gray-500">
                    #{booking.booking_id} • {booking.customer_name} • Return by: {formatDateTime(combineDateAndTime(booking.end_date, booking.dropoff_time))}
                  </div>
                </div>
                <div className="text-xs font-medium text-blue-600">
                  Due today
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {returns.upcoming.length > 0 && (
        <div className="p-4">
          <div className="space-y-3">
            {returns.upcoming.map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between p-3 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
                onClick={() => handleBookingClick(booking.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleBookingClick(booking.id)}
              >
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {booking.vehicle_details.model} ({booking.vehicle_details.registration})
                  </div>
                  <div className="text-xs text-gray-500">
                    #{booking.booking_id} • {booking.customer_name} • Return by: {formatDateTime(combineDateAndTime(booking.end_date, booking.dropoff_time))}
                  </div>
                </div>
                <div className="text-xs font-medium text-green-600">
                  Due tomorrow
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 