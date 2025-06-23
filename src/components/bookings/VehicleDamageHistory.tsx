'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { formatDateTime, formatCurrency } from '@/lib/utils';

interface VehicleDamage {
  id: string;
  booking_id: string;
  description: string;
  charges: number;
  created_at: string;
  booking: {
    vehicle_remarks: string;
    vehicle_details: {
      model: string;
      registration: string;
    };
    customer_name: string;
  };
}

interface VehicleDamageHistoryProps {
  bookingId?: string; // Optional - if provided, shows history for specific booking
}

export default function VehicleDamageHistory({ bookingId }: VehicleDamageHistoryProps) {
  const [damages, setDamages] = useState<VehicleDamage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDamageHistory();
  }, [bookingId]);

  const fetchDamageHistory = async () => {
    try {
      const supabase = getSupabaseClient();

      // Validate bookingId is a UUID
      if (bookingId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId)) {
        console.error('Invalid booking ID format:', bookingId);
        setError('Invalid booking ID format');
        setLoading(false);
        return;
      }

      let query = supabase
        .from('vehicle_damages')
        .select(`
          *,
          booking:bookings (
            vehicle_remarks,
            vehicle_details,
            customer_name
          )
        `)
        .order('created_at', { ascending: false });

      // If bookingId is provided, filter for that specific booking
      if (bookingId) {
        query = query.eq('booking_id', bookingId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('Error fetching damage history:', fetchError);
        throw new Error(fetchError.message);
      }

      // Filter out any records with null or invalid booking data
      const validDamages = data?.filter(damage => damage.booking && damage.booking.vehicle_details) || [];
      setDamages(validDamages);
    } catch (err) {
      console.error('Error fetching damage history:', err);
      setError(err instanceof Error ? err.message : 'Failed to load damage history');
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

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (damages.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Vehicle Damage History</h2>
        <div className="text-center text-gray-500 py-8">
          No damage history found
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Vehicle Damage History</h2>
      </div>
      <div className="divide-y">
        {damages.map((damage) => (
          <div key={damage.id} className="p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-medium">
                  {damage.booking.vehicle_details.model} ({damage.booking.vehicle_details.registration})
                </h3>
                <p className="text-sm text-gray-500">
                  Customer: {damage.booking.customer_name}
                </p>
                <p className="text-sm text-gray-500">
                  Date: {formatDateTime(damage.created_at)}
                </p>
              </div>
              {damage.charges > 0 && (
                <div className="text-red-600 font-medium">
                  {formatCurrency(damage.charges)}
                </div>
              )}
            </div>
            
            {damage.description && (
              <div className="mt-2">
                <h4 className="text-sm font-medium">Damage Description:</h4>
                <p className="text-sm text-gray-600 mt-1">{damage.description}</p>
              </div>
            )}
            
            {damage.booking.vehicle_remarks && (
              <div className="mt-2">
                <h4 className="text-sm font-medium">Vehicle Remarks:</h4>
                <p className="text-sm text-gray-600 mt-1">{damage.booking.vehicle_remarks}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 