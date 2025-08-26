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
  paid_amount: number;
  next_payment_date: string;
  created_at: string;
  vehicle_details: {
    model: string;
    registration: string;
  };
  status: string;
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
            paid_amount,
            next_payment_date,
            created_at,
            vehicle_details,
            status
          `)
          .eq('payment_status', 'partial')
          .in('status', ['confirmed', 'in_use'])
          .order('next_payment_date', { ascending: true });

        if (error) throw error;

        const bookings = data as BookingData[];
        const payments: PendingPayment[] = bookings.map(booking => {
          const totalAmount = (booking.booking_amount || 0) + (booking.security_deposit_amount || 0);
          const paidAmount = booking.paid_amount || 0;
          return {
            ...booking,
            remaining_amount: totalAmount - paidAmount
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

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    return format(new Date(date), 'dd/MM/yyyy');
  };

  const isOverdue = (date: string | null) => {
    if (!date) return false;
    return isAfter(new Date(), new Date(date));
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 bg-red-50 p-4 rounded-lg">
        {error}
      </div>
    );
  }

  const hasOverduePayments = pendingPayments.some(payment => 
    isOverdue(payment.next_payment_date)
  );

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
              const totalAmount = (payment.booking_amount || 0) + (payment.security_deposit_amount || 0);
              
              return (
                <div key={payment.id} className="relative">
                  <Link
                    href={`/dashboard/bookings/${payment.booking_id}`}
                    className="block transition-colors hover:bg-gray-50"
                  >
                    <div
                      className={`p-4 rounded-lg border ${
                        isPaymentOverdue ? 'bg-red-50 border-red-200 hover:bg-red-100' : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div className="space-y-1 w-full sm:w-auto">
                          <div className="flex items-center gap-2">
                            <Car className="h-4 w-4 text-gray-500 flex-shrink-0" />
                            <span className="font-medium text-gray-900">
                              {payment.vehicle_details?.model} ({payment.vehicle_details?.registration})
                            </span>
                            {payment.customer_contact && (
                              <a
                                href={`tel:${payment.customer_contact}`}
                                className="ml-auto sm:hidden p-2 rounded-full bg-white shadow-sm border border-gray-200 text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                                title="Call customer"
                              >
                                <Phone className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            #{payment.booking_id} • {payment.customer_name}
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <CalendarDays className="h-4 w-4 mr-1 flex-shrink-0" />
                            <span>
                              Due: {formatDate(payment.next_payment_date)}
                              {isPaymentOverdue && payment.next_payment_date && (
                                <span className="text-red-600 ml-2">
                                  ({Math.floor((new Date().getTime() - new Date(payment.next_payment_date).getTime()) / (1000 * 60 * 60 * 24))} days overdue)
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="text-right ml-auto flex items-center gap-4">
                          <div>
                            <div className="text-gray-900 font-medium">
                              {formatCurrency(payment.remaining_amount)}
                            </div>
                            <div className="text-sm text-gray-500">
                              Paid: {formatCurrency(payment.paid_amount)} of {formatCurrency(totalAmount)}
                            </div>
                          </div>
                          {payment.customer_contact && (
                            <a
                              href={`tel:${payment.customer_contact}`}
                              className="hidden sm:flex p-2 rounded-full bg-white shadow-sm border border-gray-200 text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                              title="Call customer"
                            >
                              <Phone className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
} 