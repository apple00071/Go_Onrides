'use client';

import { useEffect, useState } from 'react';
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
        const endDate = getISTDate(booking.end_date);
        endDate.setHours(0, 0, 0, 0);

        if (endDate < today) {
          acc.overdue.push(booking);
        } else if (endDate.getTime() === today.getTime()) {
          acc.today.push(booking);
        } else if (endDate.getTime() === tomorrow.getTime()) {
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
              <div key={booking.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {booking.vehicle_details.model} ({booking.vehicle_details.registration})
                  </div>
                  <div className="text-xs text-gray-500">
                    {booking.customer_name} • Due: {formatDateTime(booking.end_date)}
                  </div>
                </div>
                <div className="text-xs font-medium text-red-600">
                  {Math.ceil((getISTDate().getTime() - getISTDate(booking.end_date).getTime()) / (1000 * 60 * 60 * 24))} days overdue
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
              <div key={booking.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {booking.vehicle_details.model} ({booking.vehicle_details.registration})
                  </div>
                  <div className="text-xs text-gray-500">
                    {booking.customer_name} • Return by: {formatDateTime(booking.end_date)}
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
          <h3 className="text-sm font-medium text-green-600 flex items-center mb-3">
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Due Tomorrow
          </h3>
          <div className="space-y-3">
            {returns.upcoming.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {booking.vehicle_details.model} ({booking.vehicle_details.registration})
                  </div>
                  <div className="text-xs text-gray-500">
                    {booking.customer_name} • Return by: {formatDateTime(booking.end_date)}
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