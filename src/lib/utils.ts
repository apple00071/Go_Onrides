import { SupabaseClient } from '@supabase/supabase-js';

export function getISTDate(date: string | Date = new Date()) {
  return new Date(new Date(date).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
}

export function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

export const formatDateTime = (date: string | Date) => {
  return new Date(date).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });
};

interface BookingRecord {
  booking_id: string | null;
}

export async function generateBookingId(supabase: SupabaseClient): Promise<string> {
  try {
    const currentYear = new Date().getFullYear().toString().slice(-2);
    
    // Get all bookings for the current year
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('booking_id')
      .like('booking_id', `GN%${currentYear}`)
      .order('booking_id', { ascending: false });

    if (error) {
      console.error('Supabase query error:', error);
      throw new Error(`Database error: ${error.message || 'Unknown error occurred'}`);
    }

    let nextNumber = 1;

    if (bookings && bookings.length > 0) {
      // Find the highest number used
      const highestNumber = bookings.reduce((max: number, booking: BookingRecord) => {
        if (!booking.booking_id) return max;
        
        const match = booking.booking_id.match(/^GN(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          return num > max ? num : max;
        }
        return max;
      }, 0);
      
      nextNumber = highestNumber + 1;
    }

    // Format: GN + sequential number + YY
    const bookingId = `GN${nextNumber}${currentYear}`;
    
    // Verify the booking ID doesn't already exist
    const { data: existingBooking, error: verifyError } = await supabase
      .from('bookings')
      .select('booking_id')
      .eq('booking_id', bookingId)
      .single();

    if (verifyError && verifyError.code !== 'PGRST116') { // Ignore "no rows returned" error
      console.error('Verification error:', verifyError);
      throw new Error(`Failed to verify booking ID: ${verifyError.message || 'Unknown error occurred'}`);
    }

    if (existingBooking) {
      // If the ID already exists, try the next number
      return generateBookingId(supabase);
    }

    return bookingId;
  } catch (error) {
    console.error('Error in generateBookingId:', error);
    throw new Error(`Failed to generate booking ID: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
  }
} 