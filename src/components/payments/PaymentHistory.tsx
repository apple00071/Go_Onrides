'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Payment {
  id: string;
  booking_id: string;
  amount: number;
  payment_mode: string;
  payment_status: string;
  created_at: string;
  user: {
    full_name: string | null;
    email: string | null;
  };
}

export default function PaymentHistory({ bookingId }: { bookingId: string }) {
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    if (bookingId) {
      fetchPayments();
    }
  }, [bookingId]);

  // Also refresh when a new payment is created
  useEffect(() => {
    const handlePaymentUpdate = () => fetchPayments();
    window.addEventListener('payment:created', handlePaymentUpdate);
    return () => window.removeEventListener('payment:created', handlePaymentUpdate);
  }, []);

  const fetchPayments = async () => {
    const supabase = getSupabaseClient();

    // Get payments for this booking
    const { data: payments } = await supabase
      .from('payments')
      .select('id, booking_id, amount, payment_mode, payment_status, created_at, created_by')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false });

    if (!payments?.length) {
      setPayments([]);
      return;
    }

    // Get user info for these payments
    const userIds = payments.map(p => p.created_by).filter(Boolean);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, username')
      .in('id', userIds);

    const userMap = new Map(
      profiles?.map(p => [p.id, { full_name: p.username, email: p.email }]) || []
    );

    // Map payments with user info
    const paymentsWithUsers = payments.map(payment => ({
      id: payment.id,
      booking_id: payment.booking_id,
      amount: payment.amount,
      payment_mode: payment.payment_mode,
      payment_status: payment.payment_status,
      created_at: payment.created_at,
      user: userMap.get(payment.created_by) || { full_name: null, email: null }
    }));

    setPayments(paymentsWithUsers);
  };

  if (!payments.length) {
    return <div className="text-gray-500 py-4">No payment history found.</div>;
  }

  return (
    <div className="bg-white rounded-lg">
      <div className="space-y-2">
        {payments.map((payment) => (
          <div key={payment.id} className="bg-gray-50 rounded-lg p-3">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium">{formatCurrency(payment.amount)}</div>
                <div className="text-sm text-gray-500">
                  {payment.payment_mode.toUpperCase()} • {formatDate(payment.created_at)}
                </div>
                {payment.user.full_name && (
                  <div className="text-sm text-gray-500">
                    Added by {payment.user.full_name}
                  </div>
                )}
              </div>
              <div className="text-sm">
                <span className="px-2 py-1 rounded-full bg-green-100 text-green-800">
                  {payment.payment_status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 