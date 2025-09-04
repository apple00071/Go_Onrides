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
  const inputDate = new Date(date);
  
  // Format in IST timezone
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Kolkata'
  }).format(inputDate);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatDateTime(date: string | Date): string {
  const inputDate = new Date(date);
  
  // Format in IST timezone with time
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata'
  }).format(inputDate);
}

interface BookingRecord {
  booking_id: string | null;
}

export async function generateBookingId(supabase: SupabaseClient): Promise<string> {
  try {
    // Get all bookings ordered by booking_id in descending order
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('booking_id')
      .order('booking_id', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Supabase query error:', error);
      throw new Error(`Database error: ${error.message || 'Unknown error occurred'}`);
    }

    let nextNumber = 125; // Start from 125 if no bookings exist

    if (bookings && bookings.length > 0 && bookings[0].booking_id) {
      // Extract the number from the latest booking ID
      const match = bookings[0].booking_id.match(/^GN(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    // Format: GN + sequential number (no padding)
    const bookingId = `GN${nextNumber}`;
    
    // Verify the booking ID doesn't already exist
    const { data: existingBooking, error: verifyError } = await supabase
      .from('bookings')
      .select('booking_id')
      .eq('booking_id', bookingId)
      .maybeSingle();

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
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Kolkata'
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

// Format date for display (DD/MM/YYYY)
export function formatDateForDisplay(date: string | Date): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Kolkata'
  }).format(d);
}

// Format date for input fields (YYYY-MM-DD)
export function formatDateForInput(date: string | Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Parse date from display format (DD/MM/YYYY) to ISO format
export function parseDateFromDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const [day, month, year] = dateStr.split('/');
  return `${year}-${month}-${day}`;
}

// Format date for API (YYYY-MM-DD)
export function formatDateForAPI(date: string | Date): string {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

// Format date and time in IST
export function formatDateTimeIST(date: string | Date): string {
  const inputDate = new Date(date);
  const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
  const istDate = new Date(inputDate.getTime() + istOffset);
  
  // Format hours and minutes with leading zeros
  const hours = istDate.getUTCHours();
  const minutes = istDate.getUTCMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12; // Convert 24h to 12h format
  
  // Format date in DD/MM/YYYY format
  const day = istDate.getUTCDate().toString().padStart(2, '0');
  const month = (istDate.getUTCMonth() + 1).toString().padStart(2, '0');
  const year = istDate.getUTCFullYear();
  
  return `${day}/${month}/${year} ${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

export function formatTime(timeStr: string): string {
  if (!timeStr) return '';
  
  const date = new Date(`1970-01-01T${timeStr}`);
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata'
  });
} 