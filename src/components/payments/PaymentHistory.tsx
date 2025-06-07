'use client';

import React, { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { usePermissions } from '@/lib/usePermissions';
import { format, formatDistanceToNow } from 'date-fns';
import { User } from 'lucide-react';

interface Payment {
  id: string;
  booking_id: string;
  amount: number;
  payment_mode: PaymentMode;
  payment_status: PaymentStatus;
  created_at: string;
  user: {
    full_name: string | null;
    email: string | null;
  } | null;
}

type PaymentMode = 'CASH' | 'CARD' | 'UPI' | 'BANK_TRANSFER';
type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

export default function PaymentHistory({ bookingId }: { bookingId: string }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAdmin, hasPermission, loading: permissionsLoading } = usePermissions();

  useEffect(() => {
    if (!permissionsLoading) {
      fetchPayments();
    }
  }, [bookingId, permissionsLoading]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError(null);

      const supabase = getSupabaseClient();
      
      // Log permissions state
      console.log('Permission check:', {
        isAdmin,
        hasManagePayments: hasPermission('managePayments')
      });

      if (!isAdmin && !hasPermission('managePayments')) {
        throw new Error('You do not have permission to view payments');
      }

      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          id,
          booking_id,
          amount,
          payment_mode,
          payment_status,
          created_at
        `)
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false });

      if (paymentsError) {
        console.error('Error fetching payments:', paymentsError);
        throw paymentsError;
      }

      console.log('Payments found:', paymentsData);
      
      // Transform the data to match the Payment interface
      const transformedPayments: Payment[] = (paymentsData || []).map((payment: any) => ({
        id: payment.id,
        booking_id: payment.booking_id,
        amount: payment.amount,
        payment_mode: payment.payment_mode as PaymentMode,
        payment_status: payment.payment_status as PaymentStatus,
        created_at: payment.created_at,
        user: null // No user data available from the current schema
      }));

      setPayments(transformedPayments);
    } catch (err) {
      console.error('Error in fetchPayments:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading payment history...</div>;
  }

  if (error) {
    return <div className="text-red-500 py-4">{error}</div>;
  }

  if (!payments.length) {
    return <div className="text-gray-500 py-4">No payment history found.</div>;
  }

  return (
    <div className="bg-white rounded-lg p-6">
      <div className="space-y-4">
        {payments.map((payment) => (
          <div key={payment.id} className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-lg font-medium">
                  ₹{payment.amount} via {payment.payment_mode.toLowerCase()}
                </div>
                <div className="text-gray-500 text-sm">
                  {format(new Date(payment.created_at), 'MMMM d, yyyy \'at\' h:mm:ss a')}
                </div>
                <div className="flex items-center mt-1 text-sm text-gray-500">
                  <User className="h-3.5 w-3.5 mr-1" />
                  {formatDistanceToNow(new Date(payment.created_at), { addSuffix: true })}
                </div>
              </div>
              <div>
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                  {payment.payment_status.toLowerCase()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 