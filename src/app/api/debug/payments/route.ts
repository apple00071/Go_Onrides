import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

interface PaymentMetrics {
  pending_payments: Array<{
    booking_id: string;
    customer_name: string;
    vehicle: {
      model: string;
      registration: string;
    };
    total_amount: number;
    paid_amount: number;
    pending_amount: number;
  }>;
  total_pending: number;
}

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    
    // Get all bookings with their payment details
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_id,
        customer_name,
        booking_amount,
        security_deposit_amount,
        paid_amount,
        payment_status,
        status,
        vehicle_details,
        payments (
          id,
          amount,
          payment_mode,
          created_at
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Calculate various payment metrics
    const metrics = bookings?.reduce<PaymentMetrics>((acc, booking) => {
      const totalAmount = (booking.booking_amount || 0) + (booking.security_deposit_amount || 0);
      const paidAmount = booking.paid_amount || 0;
      const pendingAmount = totalAmount - paidAmount;

      if (booking.payment_status === 'partial' && ['confirmed', 'in_use'].includes(booking.status)) {
        acc.pending_payments.push({
          booking_id: booking.booking_id,
          customer_name: booking.customer_name,
          vehicle: booking.vehicle_details,
          total_amount: totalAmount,
          paid_amount: paidAmount,
          pending_amount: pendingAmount
        });
        acc.total_pending += pendingAmount;
      }

      return acc;
    }, {
      pending_payments: [],
      total_pending: 0
    });

    return NextResponse.json({
      bookings,
      metrics
    });
  } catch (error) {
    console.error('Error fetching payment data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment data' },
      { status: 500 }
    );
  }
} 