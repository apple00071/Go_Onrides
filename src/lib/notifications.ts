import { createClient } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabase';

// For notifications
export async function notifyBookingEvent(bookingId: string, event: string, userId: string) {
  try {
    const supabase = getSupabaseClient();

    // Get the booking details including customer information
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:customer_id (
          name,
          phone,
          contact
        )
      `)
      .eq('booking_id', bookingId)
      .single();

    if (bookingError) throw bookingError;
    if (!booking) throw new Error('Booking not found');

    // Create notification record in database
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: `Booking ${event}`,
        message: `Booking #${bookingId} has been ${event}`,
        reference_type: 'booking',
        reference_id: bookingId,
        created_at: new Date().toISOString()
      });

    if (notificationError) throw notificationError;

    return { success: true };
  } catch (error) {
    console.error('Error in notifyBookingEvent:', error);
    throw error;
  }
} 