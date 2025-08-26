import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    
    // Get all bookings with partial payments
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('payment_status', 'partial')
      .in('status', ['confirmed', 'in_use']);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      bookings,
      count: bookings?.length || 0,
      total_pending: bookings?.reduce((sum, booking) => {
        const totalAmount = (booking.booking_amount || 0) + (booking.security_deposit_amount || 0);
        const paidAmount = booking.paid_amount || 0;
        const pendingAmount = totalAmount - paidAmount;
        return sum + pendingAmount;
      }, 0) || 0
    });
  } catch (error) {
    console.error('Error fetching pending payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending payments' },
      { status: 500 }
    );
  }
} 