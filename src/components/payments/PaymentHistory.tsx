'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/utils';
import { EntityAuditInfo } from '@/components/ui/EntityAuditInfo';

interface Payment {
  id: string;
  booking_id: string;
  amount: number;
  payment_mode: string;
  payment_status: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

interface PaymentHistoryProps {
  bookingId: string;
}

export default function PaymentHistory({ bookingId }: PaymentHistoryProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPaymentHistory();
  }, [bookingId]);

  const fetchPaymentHistory = async () => {
    if (!bookingId) return;
    
    try {
      setLoading(true);
      const supabase = getSupabaseClient();
      
      const { data, error: fetchError } = await supabase
        .from('payments')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false });
      
      if (fetchError) {
        throw fetchError;
      }
      
      setPayments(data || []);
      setError(null);
    } catch (error) {
      console.error('Error fetching payment history:', error);
      setError('Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-16 bg-gray-100 rounded-md mb-2"></div>
        <div className="h-16 bg-gray-100 rounded-md"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-sm py-2">
        {error}
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="text-sm text-gray-500 text-center py-4">
        No payment history available
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {payments.map((payment) => (
        <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex-grow">
            <div className="text-sm font-medium text-gray-900">
              {formatCurrency(payment.amount)} via {payment.payment_mode}
            </div>
            <div className="text-xs text-gray-500">
              {formatDate(payment.created_at)} at {new Date(payment.created_at).toLocaleTimeString()}
            </div>
            <EntityAuditInfo
              entityType="payment"
              createdAt={payment.created_at}
              updatedAt={payment.updated_at}
              createdBy={payment.created_by}
              updatedBy={payment.updated_by}
            />
          </div>
          <div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              payment.payment_status === 'completed' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {payment.payment_status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
} 