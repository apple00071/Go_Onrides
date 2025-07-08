'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { AlertCircle, IndianRupee } from 'lucide-react';
import Link from 'next/link';

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
      
      console.log('Fetching pending payments...');
      
      // Get bookings that are not cancelled or completed and have pending payments
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_id,
          customer_name,
          vehicle_details,
          booking_amount,
          security_deposit_amount,
          paid_amount,
          payment_status,
          status
        `)
        .or('payment_status.eq.pending,payment_status.eq.partial')
        .in('status', ['confirmed', 'in_use', 'pending'])
        .order('created_at', { ascending: false });

      console.log('Bookings data:', bookingsData);
      console.log('Bookings error:', bookingsError);

      if (bookingsError) {
        console.error('Bookings fetch error:', bookingsError);
        throw bookingsError;
      }

      // Get all payments to ensure we have the most recent payment data
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('booking_id, amount, created_at')
        .order('created_at', { ascending: false });
      
      console.log('Payments data:', paymentsData);
      console.log('Payments error:', paymentsError);

      if (paymentsError) {
        console.error('Payments fetch error:', paymentsError);
        throw paymentsError;
      }
      
      // Create a map of booking_id to total paid amount
      const paymentTotals = new Map<string, number>();
      if (paymentsData) {
        paymentsData.forEach(payment => {
          const currentTotal = paymentTotals.get(payment.booking_id) || 0;
          const paymentAmount = Number(payment.amount) || 0;
          paymentTotals.set(payment.booking_id, currentTotal + paymentAmount);
          console.log(`Adding payment for booking ${payment.booking_id}: ${paymentAmount} (Total: ${currentTotal + paymentAmount})`);
        });
      }

      console.log('Payment totals:', Object.fromEntries(paymentTotals));

      const pendingPayments = (bookingsData || []).filter(booking => {
        try {
          const bookingAmount = Number(booking.booking_amount) || 0;
          const securityDeposit = Number(booking.security_deposit_amount) || 0;
          const totalRequired = bookingAmount + securityDeposit;
          
          // Get actual paid amount from payments table
          const actualPaidAmount = paymentTotals.get(booking.id) || Number(booking.paid_amount) || 0;
          
          console.log(`Processing booking ${booking.booking_id}:`, {
            bookingAmount,
            securityDeposit,
            totalRequired,
            actualPaidAmount,
            isPending: actualPaidAmount < totalRequired
          });
          
          // Update the booking paid_amount with the actual total
          booking.paid_amount = actualPaidAmount;
          
          return actualPaidAmount < totalRequired;
        } catch (err) {
          console.error('Error processing booking payment:', booking.id, err);
          return false;
        }
      });

      console.log('Final pending payments:', pendingPayments);
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
            const totalAmount = Number(booking.booking_amount) + Number(booking.security_deposit_amount);
            const remainingAmount = totalAmount - Number(booking.paid_amount);
            
            return (
              <Link 
                key={booking.id} 
                href={`/dashboard/bookings/${booking.booking_id || booking.id}`}
                className="block"
              >
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {booking.vehicle_details?.model} ({booking.vehicle_details?.registration})
                    </div>
                    <div className="text-xs text-gray-500">
                      {booking.customer_name} • {booking.booking_id}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      <div className="mt-1">
                        Paid: <span className="font-medium flex items-center inline-flex">
                          {formatCurrency(booking.paid_amount)}
                        </span> of <span className="font-medium flex items-center inline-flex">
                          {formatCurrency(totalAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-yellow-600 flex items-center justify-end gap-1">
                      <IndianRupee className="w-4 h-4" />
                      {formatCurrency(remainingAmount).replace('₹', '')}
                    </div>
                    <div className="text-xs text-gray-500">
                      remaining
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
} 