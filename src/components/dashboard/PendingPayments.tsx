'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { AlertTriangle, CalendarDays, IndianRupee, Car, Phone } from 'lucide-react';
import { format, isAfter } from 'date-fns';
import Link from 'next/link';

interface BookingData {
  id: string;
  booking_id: string;
  customer_name: string;
  customer_contact: string;
  booking_amount: number;
  security_deposit_amount: number;
  total_amount: number;
  paid_amount: number;
  damage_charges: number;
  refund_amount: number;
  next_payment_date: string;
  created_at: string;
  vehicle_details: {
    model: string;
    registration: string;
  };
  status: string;
  payment_status: string;
  extension_fee: number;
  late_fee: number;
  payments: {
    id: string;
    amount: number;
    created_at: string;
  }[];
  booking_extensions: {
    id: string;
    additional_amount: number;
    created_at: string;
  }[];
}

interface PendingPayment extends BookingData {
  remaining_amount: number;
}

export default function PendingPayments() {
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPendingPayments = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('bookings')
          .select(`
            id,
            booking_id,
            customer_name,
            customer_contact,
            booking_amount,
            security_deposit_amount,
            total_amount,
            paid_amount,
            damage_charges,
            refund_amount,
            next_payment_date,
            created_at,
            vehicle_details,
            status,
            payment_status,
            extension_fee,
            late_fee,
            payments (
              id,
              amount,
              created_at
            ),
            booking_extensions (
              id,
              additional_amount,
              created_at
            )
          `)
          .or('payment_status.eq.pending,payment_status.eq.partial')
          .in('status', ['confirmed', 'in_use'])
          .order('next_payment_date', { ascending: true });

        if (error) throw error;

        const bookings = data as BookingData[];
        const payments: PendingPayment[] = bookings.map(booking => {
          // Calculate base charges (always included)
          const baseCharges = Number(booking.booking_amount || 0);
          const securityDeposit = Number(booking.security_deposit_amount || 0);
          
          // Sum up all extension amounts from booking_extensions
          const extensionAmounts = booking.booking_extensions?.reduce((sum, ext) => 
            sum + Number(ext.additional_amount || 0), 0) || 0;

          // Calculate total charges based on booking status
          let totalCharges = baseCharges + securityDeposit + extensionAmounts;

          // Only include these charges for completed bookings
          if (booking.status === 'completed') {
            totalCharges += (
              Number(booking.extension_fee || 0) +    // Extension fees
              Number(booking.late_fee || 0) +         // Late fees
              Number(booking.damage_charges || 0)     // Damage charges
            );
          }
          
          // Calculate total payments
          const initialPayment = Number(booking.paid_amount || 0);
          const additionalPayments = booking.payments?.reduce((sum, payment) => 
            sum + Number(payment.amount || 0), 0) || 0;
          const totalPaid = initialPayment + additionalPayments;

          console.log('Payment calculation for booking:', {
            id: booking.booking_id,
            status: booking.status,
            baseCharges,
            securityDeposit,
            extensionAmounts,
            totalCharges,
            initialPayment,
            additionalPayments,
            totalPaid,
            remaining: Math.max(0, totalCharges - totalPaid)
          });

          // Calculate remaining amount
          return {
            ...booking,
            remaining_amount: Math.max(0, totalCharges - totalPaid)
          };
        });

        // Sort payments: those with next_payment_date first (ordered by date), then those without
        const sortedPayments = payments.sort((a, b) => {
          if (!a.next_payment_date && !b.next_payment_date) return 0;
          if (!a.next_payment_date) return 1;
          if (!b.next_payment_date) return -1;
          return new Date(a.next_payment_date).getTime() - new Date(b.next_payment_date).getTime();
        });

        setPendingPayments(sortedPayments);
      } catch (err) {
        console.error('Error fetching pending payments:', err);
        setError('Failed to load pending payments');
      } finally {
        setLoading(false);
      }
    };

    fetchPendingPayments();
  }, []);

  if (loading) {
    return <div className="p-4 text-center">Loading pending payments...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-600">{error}</div>;
  }

  const isOverdue = (date: string | null) => {
    if (!date) return false;
    return isAfter(new Date(), new Date(date));
  };

  const getDaysOverdue = (date: string | null) => {
    if (!date) return 0;
    const diffInDays = Math.floor((new Date().getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
    return diffInDays;
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Pending Payments</h2>
      </div>
      
      <div className="p-4">
        {pendingPayments.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            No pending payments
          </div>
        ) : (
          <div className="space-y-3">
            {pendingPayments.map((payment) => {
              const isPaymentOverdue = isOverdue(payment.next_payment_date);
              const totalCharges = Number(payment.total_amount || 0) + 
                                 Number(payment.damage_charges || 0) -
                                 Number(payment.refund_amount || 0);
              
              return (
                <div key={payment.id} className="relative">
                  <Link
                    href={`/dashboard/bookings/${payment.booking_id}`}
                    className="block transition-colors hover:bg-gray-50"
                  >
                    <div
                      className={`p-4 rounded-lg ${
                        isPaymentOverdue ? 'bg-red-50' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Car className="h-5 w-5 text-gray-500" />
                          <span className="font-medium">
                            {payment.vehicle_details.model} ({payment.vehicle_details.registration})
                          </span>
                        </div>
                        <div className="text-lg font-semibold">
                          ₹{formatCurrency(payment.remaining_amount)}
                        </div>
                      </div>

                      <div className="mt-2">
                        <div className="flex items-center space-x-1 text-gray-600">
                          <span className="font-medium">#{payment.booking_id}</span>
                          <span>•</span>
                          <span>{payment.customer_name}</span>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2 text-gray-600">
                          <CalendarDays className="h-4 w-4" />
                          <span>
                            Due: {format(new Date(payment.next_payment_date), 'dd/MM/yyyy')}
                            {isPaymentOverdue && (
                              <span className="text-red-600 ml-1">
                                ({getDaysOverdue(payment.next_payment_date)} days overdue)
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="text-gray-600">
                          Paid: ₹{formatCurrency(
                            Number(payment.paid_amount || 0)
                          )} of ₹{formatCurrency(
                            Number(payment.booking_amount || 0) +
                            Number(payment.security_deposit_amount || 0)
                          )}
                        </div>
                      </div>

                      {isPaymentOverdue && (
                        <div className="mt-2 flex items-center space-x-2 text-red-600">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-sm">Payment overdue</span>
                        </div>
                      )}
                    </div>
                  </Link>
                  <a
                    href={`tel:${payment.customer_contact}`}
                    className="absolute top-1/2 -translate-y-1/2 right-4 p-2 text-blue-600 hover:text-blue-800"
                  >
                    <Phone className="h-5 w-5" />
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
} 