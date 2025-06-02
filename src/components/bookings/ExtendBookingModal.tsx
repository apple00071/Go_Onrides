'use client';

import { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { CurrencyInput } from '@/components/ui/currency-input';
import { notifyBookingEvent } from '@/lib/notification';
import { formatDate } from '@/lib/utils';

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

export default function ExtendBookingModal({
  isOpen,
  onClose,
  onBookingExtended,
  booking
}: ExtendBookingModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create form data
  const initialFormData = useMemo<FormData>(() => ({
    end_date: booking?.end_date || '',
    dropoff_time: booking?.dropoff_time || '',
    additional_amount: '0',
    extension_reason: ''
  }), [booking]);

  const [formData, setFormData] = useState<FormData>(initialFormData);
  
  // Reset form when modal opens/closes or booking changes
  useEffect(() => {
    if (isOpen && booking) {
      setFormData(initialFormData);
      setError(null);
    }
  }, [isOpen, initialFormData, booking]);

  // Calculate minimum end date based on current end date
  const minEndDate = booking?.end_date || new Date().toISOString().split('T')[0];

  // Calculate maximum end date (30 days from current end date)
  const maxEndDate = useMemo(() => {
    const date = booking?.end_date ? new Date(booking.end_date) : new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  }, [booking?.end_date]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setError(null);
    
    // Date validation
    if (name === 'end_date') {
      const selectedDate = new Date(value);
      const currentEndDate = new Date(booking.end_date);
      
      if (selectedDate < currentEndDate) {
        setError('New end date cannot be earlier than the current end date');
        return;
      }

      const maxDate = new Date(maxEndDate);
      if (selectedDate > maxDate) {
        setError('Maximum extension is 30 days from the current end date');
        return;
      }
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
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();

      // Validate form data
      if (!formData.end_date || !formData.dropoff_time) {
        throw new Error('Please fill in all required fields');
      }

      // Ensure the end date is after or equal to the current end date
      if (new Date(formData.end_date) < new Date(booking.end_date)) {
        throw new Error('New end date must be after the current end date');
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
          reason: formData.extension_reason
        });

      if (extensionError) {
        console.error('Extension logging error:', extensionError);
        throw new Error(`Failed to log extension: ${extensionError.message}`);
      }

      // Then update the booking with the new end date, dropoff time and amount
      const newBookingAmount = booking.booking_amount + additionalAmount;
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({
          end_date: formData.end_date,
          dropoff_time: formData.dropoff_time,
          booking_amount: newBookingAmount
        })
        .eq('id', booking.id);

      if (bookingError) {
        console.error('Booking update error:', bookingError);
        throw new Error(`Failed to update booking: ${bookingError.message}`);
      }

      // Get the current user's email to use in the notification
      const { data: { user } } = await supabase.auth.getUser();
      
      // Send notification about the booking extension
      await notifyBookingEvent(
        'BOOKING_EXTENDED',
        booking.id,
        {
          bookingId: booking.booking_id,
          actionBy: user?.email || 'Unknown User',
          previousEndDate: formatDate(booking.end_date),
          newEndDate: formatDate(formData.end_date),
          additionalAmount: additionalAmount.toFixed(2)
        }
      );

      toast.success('Booking extended successfully!');
      onBookingExtended();
      onClose();
    } catch (error) {
      console.error('Error extending booking:', error);
      setError(error instanceof Error ? error.message : 'Failed to extend booking');
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
          {error && (
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
              {Array.from({ length: 48 }, (_, i) => {
                const hour = Math.floor(i / 2);
                const minute = i % 2 === 0 ? '00' : '30';
                const time = `${hour.toString().padStart(2, '0')}:${minute}`;
                return (
                  <option key={time} value={time}>
                    {time}
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
              value={formData.extension_reason}
              onChange={handleInputChange}
              rows={3}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Explain why the booking is being extended"
            />
          </div>

          <div className="flex justify-end space-x-4 pt-4">
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
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Extending...' : 'Extend Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 