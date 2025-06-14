import { SupabaseClient } from '@supabase/supabase-js';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function getISTDate(date: string | Date = new Date()) {
  const inputDate = new Date(date);
  // IST is UTC+5:30
  const istOffset = 5.5 * 60 * 60 * 1000;
  const utc = inputDate.getTime() + (inputDate.getTimezoneOffset() * 60 * 1000);
  return new Date(utc + istOffset);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Kolkata'
  }).format(new Date(date));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
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
      .maybeSingle(); // Use maybeSingle instead of single to avoid 406 error

    if (verifyError) {
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

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatNumber(number: number): string {
  return new Intl.NumberFormat('en-US').format(number);
}

export function formatPercentage(number: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(number / 100);
} 