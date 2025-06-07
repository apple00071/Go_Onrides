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
  created_by_user?: {
    email: string;
    username: string;
  };
  updated_by_user?: {
    email: string;
    username: string;
  };
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
      
      console.log('Fetching payment history for booking:', bookingId);
      
      // First, get booking details to make sure we have the correct ID
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select('id, booking_id')
        .eq('id', bookingId)
        .single();
      
      if (bookingError) {
        console.log('Error fetching booking by ID, trying booking_id field instead:', bookingError);
        
        // Try to find by booking_id field instead
        const { data: altBookingData, error: altBookingError } = await supabase
          .from('bookings')
          .select('id, booking_id')
          .eq('booking_id', bookingId)
          .single();
        
        if (altBookingError) {
          console.error('Could not find booking with either id or booking_id:', bookingId);
          throw new Error('Booking not found');
        }
        
        console.log('Found booking by booking_id field:', altBookingData);
        fetchPaymentsForBooking(altBookingData.id);
      } else {
        console.log('Found booking by id:', bookingData);
        fetchPaymentsForBooking(bookingData.id);
      }
    } catch (error) {
      console.error('Error in payment history:', error);
      setError('Failed to load payment history');
      setLoading(false);
    }
  };
  
  const fetchPaymentsForBooking = async (dbBookingId: string) => {
    try {
      const supabase = getSupabaseClient();
      
      console.log('Fetching payments for booking ID:', dbBookingId);
      
      // First get the payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('booking_id', dbBookingId)
        .order('created_at', { ascending: false });
      
      if (paymentsError) {
        console.error('Error fetching payments for booking:', paymentsError);
        throw paymentsError;
      }

      // Then get the user information for each payment
      const paymentsWithUsers = await Promise.all(
        (paymentsData || []).map(async (payment) => {
          if (!payment.created_by) return payment;

          const { data: userData, error: userError } = await supabase
            .from('profiles')
            .select('email, username')
            .eq('id', payment.created_by)
            .single();

          return {
            ...payment,
            created_by_user: userData || undefined
          };
        })
      );
      
      console.log('Payments found for booking:', paymentsWithUsers);
      
      if (!paymentsWithUsers || paymentsWithUsers.length === 0) {
        console.log('No payments found for booking ID:', dbBookingId);
      }
      
      setPayments(paymentsWithUsers || []);
      setError(null);
    } catch (error) {
      console.error('Error fetching payments for booking:', error);
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
            <div className="text-xs text-gray-500">
              Added by {payment.created_by_user?.username || 'Unknown'}
            </div>
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