'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

interface PendingPayment {
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
  payment_status: string;
}

export default function PendingPayments() {
  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingPayments();
  }, []);

  const fetchPendingPayments = async () => {
    try {
      const supabase = getSupabaseClient();
      
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('status', 'confirmed')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const pendingPayments = (data || []).filter(booking => {
        const totalRequired = booking.booking_amount + booking.security_deposit_amount;
        const paidAmount = booking.paid_amount || 0;
        return paidAmount < totalRequired;
      });

      setPayments(pendingPayments);
    } catch (error) {
      console.error('Error fetching pending payments:', error);
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

  if (payments.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Pending Payments</h2>
        <div className="text-center text-gray-500 py-8">
          No pending payments
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Pending Payments</h2>
      </div>
      <div className="p-4">
        <div className="space-y-3">
          {payments.map((booking) => {
            const totalAmount = booking.booking_amount + booking.security_deposit_amount;
            const remainingAmount = totalAmount - booking.paid_amount;
            
            return (
              <div key={booking.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {booking.vehicle_details.model} ({booking.vehicle_details.registration})
                  </div>
                  <div className="text-xs text-gray-500">
                    {booking.customer_name} • {booking.booking_id}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Paid: <span className="font-medium">{formatCurrency(booking.paid_amount)}</span> of <span className="font-medium">{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-yellow-600">
                    {formatCurrency(remainingAmount)}
                  </div>
                  <div className="text-xs text-gray-500">
                    remaining
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
} 