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

type PaymentMode = 'cash' | 'upi' | 'card' | 'bank_transfer';
type PaymentStatus = 'pending' | 'completed' | 'failed';

export default function PaymentHistory({ bookingId }: { bookingId: string }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { isAdmin, hasPermission, loading: permissionsLoading } = usePermissions();

  useEffect(() => {
    if (!permissionsLoading) {
      fetchPayments();
    }
  }, [bookingId, permissionsLoading, refreshKey]);

  useEffect(() => {
    const handlePaymentUpdate = () => {
      setRefreshKey(prev => prev + 1);
    };

    window.addEventListener('payment:created', handlePaymentUpdate);
    window.addEventListener('payment:updated', handlePaymentUpdate);

    return () => {
      window.removeEventListener('payment:created', handlePaymentUpdate);
      window.removeEventListener('payment:updated', handlePaymentUpdate);
    };
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError(null);

      const supabase = getSupabaseClient();
      
      // Log permissions state
      console.log('Permission check:', {
        isAdmin,
        hasManagePayments: hasPermission('managePayments'),
        bookingId
      });

      if (!isAdmin && !hasPermission('managePayments')) {
        throw new Error('You do not have permission to view payments');
      }

      if (!bookingId) {
        throw new Error('Booking ID is required');
      }

      // First fetch payments
      console.log('Fetching payments for booking:', bookingId);
      
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          id,
          booking_id,
          amount,
          payment_mode,
          payment_status,
          created_at,
          created_by
        `)
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false });

      if (paymentsError) {
        console.error('Detailed payment fetch error:', {
          error: paymentsError,
          message: paymentsError.message,
          details: paymentsError.details,
          hint: paymentsError.hint,
          code: paymentsError.code
        });
        throw new Error(`Failed to fetch payments: ${paymentsError.message}`);
      }

      // If we have payments, fetch the user data for each unique created_by
      const uniqueUserIds = Array.from(new Set((paymentsData || [])
        .map(p => p.created_by)
        .filter(Boolean)));
      
      const userDataMap = new Map();
      
      if (uniqueUserIds.length > 0) {
        // Fetch user data from profiles table
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, username')
          .in('id', uniqueUserIds);
        
        if (profilesError) {
          console.error('Error fetching profile data:', profilesError);
        } else if (profilesData) {
          profilesData.forEach(profile => {
            userDataMap.set(profile.id, {
              full_name: profile.username,
              email: profile.email
            });
          });
        }
      }

      console.log('Payments data received:', {
        count: paymentsData?.length || 0,
        data: paymentsData,
        userMap: Object.fromEntries(userDataMap)
      });
      
      // Transform the data to match the Payment interface
      const transformedPayments: Payment[] = (paymentsData || []).map((payment: any) => {
        console.log('Processing payment:', payment);
        const userData = payment.created_by ? userDataMap.get(payment.created_by) : null;
        
        return {
          id: payment.id,
          booking_id: payment.booking_id,
          amount: payment.amount,
          payment_mode: payment.payment_mode,
          payment_status: payment.payment_status,
          created_at: payment.created_at,
          user: userData || {
            full_name: null,
            email: null
          }
        };
      });

      console.log('Transformed payments:', transformedPayments);
      setPayments(transformedPayments);
    } catch (err) {
      console.error('Detailed error in fetchPayments:', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined
      });
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
    <div className="bg-white rounded-lg">
      <div className="space-y-2">
        {payments.map((payment) => (
          <div key={payment.id} className="bg-gray-50 rounded-lg p-3">
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
                  {payment.user?.full_name || payment.user?.email || 'Unknown user'}
                </div>
              </div>
              <div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  payment.payment_status.toLowerCase() === 'completed' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
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