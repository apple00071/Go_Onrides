'use client';

import { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { CurrencyInput } from '@/components/ui/currency-input';
import { notifyBookingEvent } from '@/lib/notification';
import { formatDate, getISTDate } from '@/lib/utils';

interface BookingExtensionDetails {
  id: string;
  booking_id: string;
  end_date: string;
  dropoff_time: string;
  booking_amount: number;
}

interface ExtendBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookingExtended: () => void;
  booking: BookingExtensionDetails;
}

interface FormData {
  end_date: string;
  dropoff_time: string;
  additional_amount: string;
  extension_reason: string;
}

// Helper function to convert 24h to 12h format
const formatTimeDisplay = (hour: number, minute: string) => {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${period}`;
};

export default function ExtendBookingModal({
  isOpen,
  onClose,
  onBookingExtended,
  booking
}: ExtendBookingModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Calculate minimum end date based on current date in IST
  const minEndDate = useMemo(() => {
    const todayIST = getISTDate();
    todayIST.setHours(0, 0, 0, 0);
    return todayIST.toISOString().split('T')[0];
  }, []);

  // Calculate maximum end date (30 days from today if current end date is in past, otherwise from current end date)
  const maxEndDate = useMemo(() => {
    const todayIST = getISTDate();
    todayIST.setHours(0, 0, 0, 0);
    
    const currentEndDate = getISTDate(booking?.end_date);
    currentEndDate.setHours(0, 0, 0, 0);
    
    // If current end date is in the past, calculate 30 days from today
    const baseDate = currentEndDate < todayIST ? todayIST : currentEndDate;
    const date = new Date(baseDate);
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  }, [booking?.end_date]);

  // Get current time rounded up to the next 30-minute slot in IST
  const getCurrentTime = () => {
    const now = getISTDate();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    // Round up to the next 30-minute slot
    if (minutes > 30) {
      return `${(hours + 1).toString().padStart(2, '0')}:00`;
    } else if (minutes > 0) {
      return `${hours.toString().padStart(2, '0')}:30`;
    }
    return `${hours.toString().padStart(2, '0')}:00`;
  };

  // Check if a time is in the past for today
  const isTimeInPast = (time: string) => {
    if (!time || !formData.end_date) return false;
    
    const todayIST = getISTDate();
    const selectedDate = getISTDate(formData.end_date);
    
    // Only check for past times if the selected date is today
    const todayStr = todayIST.toISOString().split('T')[0];
    const selectedStr = selectedDate.toISOString().split('T')[0];
    
    if (selectedStr !== todayStr) {
      return false;
    }
    
    const currentTime = getCurrentTime();
    return time <= currentTime;
  };

  // Generate available time slots
  const getAvailableTimeSlots = () => {
    // If no date is selected, show all time slots
    if (!formData.end_date) {
      return Array.from({ length: 48 }, (_, i) => {
        const hour = Math.floor(i / 2);
        const minute = i % 2 === 0 ? '00' : '30';
        return `${hour.toString().padStart(2, '0')}:${minute}`;
      });
    }

    return Array.from({ length: 48 }, (_, i) => {
      const hour = Math.floor(i / 2);
      const minute = i % 2 === 0 ? '00' : '30';
      const time = `${hour.toString().padStart(2, '0')}:${minute}`;
      
      // Only show future times if date is today
      if (!isTimeInPast(time)) {
        return time;
      }
      return null;
    }).filter(Boolean) as string[];
  };

  // Initialize form data with empty values
  const initialFormData = useMemo<FormData>(() => ({
    end_date: '',
    dropoff_time: '',
    additional_amount: '0',
    extension_reason: ''
  }), []);

  const [formData, setFormData] = useState<FormData>(initialFormData);
  
  // Reset form and interaction state when modal opens
  useEffect(() => {
    if (isOpen && booking) {
      setFormData(initialFormData);
      setHasInteracted(false);
      setError(null);
    }
  }, [isOpen, booking, initialFormData]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setHasInteracted(true);
    setError(null);
    
    // Date validation
    if (name === 'end_date') {
      const selectedDate = getISTDate(value);
      const todayIST = getISTDate();
      todayIST.setHours(0, 0, 0, 0);
      selectedDate.setHours(0, 0, 0, 0);
      
      if (selectedDate < todayIST) {
        setError('New end date cannot be in the past');
        return;
      }

      const maxDate = new Date(maxEndDate);
      if (selectedDate > maxDate) {
        setError('Maximum extension is 30 days from the current end date');
        return;
      }

      // Reset dropoff time if it would be in the past
      if (formData.dropoff_time && isTimeInPast(formData.dropoff_time)) {
        setFormData(prev => ({ 
          ...prev, 
          [name]: value,
          dropoff_time: '' // Reset time when date changes and current time would be invalid
        }));
        return;
      }

      setFormData(prev => ({ ...prev, [name]: value }));
      return;
    }

    // Time validation
    if (name === 'dropoff_time') {
      if (isTimeInPast(value)) {
        setError('Drop-off time cannot be in the past');
        return;
      }
      setFormData(prev => ({ ...prev, [name]: value }));
      return;
    }

    // Amount validation
    if (name === 'additional_amount') {
      const amount = parseFloat(value);
      if (amount < 0) {
        setError('Additional amount cannot be negative');
        return;
      }
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data before proceeding
    if (!formData.end_date || !formData.dropoff_time) {
      setError('Please fill in all required fields');
      return;
    }

    // Validate that the selected date and time are not in the past
    const selectedDateTime = getISTDate(`${formData.end_date}T${formData.dropoff_time}`);
    const nowIST = getISTDate();
    if (selectedDateTime <= nowIST) {
      setError('Selected date and time cannot be in the past');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();

      // Get the current user's session
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No authenticated user found');
      }

      const additionalAmount = parseFloat(formData.additional_amount) || 0;

      // First, log the extension in the booking_extensions table
      const { error: extensionError } = await supabase
        .from('booking_extensions')
        .insert({
          booking_id: booking.id,
          previous_end_date: booking.end_date,
          previous_dropoff_time: booking.dropoff_time,
          new_end_date: formData.end_date,
          new_dropoff_time: formData.dropoff_time,
          additional_amount: additionalAmount,
          reason: formData.extension_reason,
          created_by: user.id // Add the created_by field with the current user's ID
        });

      if (extensionError) {
        throw new Error(`Failed to log extension: ${extensionError.message}`);
      }

      // Then update the booking with the new end date, dropoff time and amount
      const newBookingAmount = booking.booking_amount + additionalAmount;
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({
          end_date: formData.end_date,
          dropoff_time: formData.dropoff_time,
          booking_amount: newBookingAmount,
          updated_by: user.id // Also update the updated_by field in the booking
        })
        .eq('id', booking.id);

      if (bookingError) {
        throw new Error(`Failed to update booking: ${bookingError.message}`);
      }

      // Notify about the booking extension
      await notifyBookingEvent(
        'BOOKING_EXTENDED',
        booking.id,
        {
          customerName: booking.booking_id,
          bookingId: booking.booking_id,
          actionBy: user.id,
          previousEndDate: formatDate(booking.end_date),
          newEndDate: formatDate(formData.end_date),
          additionalAmount: additionalAmount.toFixed(2)
        }
      );

      toast.success('Booking extended successfully');
      onBookingExtended();
      onClose();
    } catch (error) {
      console.error('Error extending booking:', error);
      setError(error instanceof Error ? error.message : 'Failed to extend booking');
      toast.error('Failed to extend booking');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Extend Booking: {booking.booking_id}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {hasInteracted && error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {/* Current End Date (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Current End Date
            </label>
            <input
              type="date"
              value={booking.end_date}
              disabled
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-50 opacity-75"
            />
          </div>

          {/* New End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              New End Date *
            </label>
            <input
              type="date"
              name="end_date"
              required
              min={minEndDate}
              max={maxEndDate}
              value={formData.end_date}
              placeholder="Select a date"
              onChange={handleInputChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          {/* New Drop-off Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              New Drop-off Time *
            </label>
            <select
              name="dropoff_time"
              required
              value={formData.dropoff_time}
              onChange={handleInputChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">Select time</option>
              {getAvailableTimeSlots().map(time => {
                const [hour, minute] = time.split(':');
                return (
                  <option key={time} value={time}>
                    {formatTimeDisplay(parseInt(hour), minute)}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Additional Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Additional Amount *
            </label>
            <CurrencyInput
              name="additional_amount"
              required
              value={formData.additional_amount}
              onChange={handleInputChange}
              error={error?.includes('amount')}
              helperText={error?.includes('amount') ? error : undefined}
            />
            <p className="mt-1 text-xs text-gray-500">
              This amount will be added to the current booking amount
            </p>
          </div>

          {/* Extension Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Reason for Extension
            </label>
            <textarea
              name="extension_reason"
              rows={3}
              value={formData.extension_reason}
              onChange={handleInputChange}
              placeholder="Explain why the booking is being extended"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Extending...' : 'Extend Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 