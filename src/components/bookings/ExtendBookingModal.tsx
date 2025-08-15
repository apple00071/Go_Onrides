'use client';

import { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { CurrencyInput } from '@/components/ui/currency-input';
import { notifyBookingEvent } from '@/lib/notification';
import { formatDate, getISTDate } from '@/lib/utils';
import React from 'react'; // Added missing import for React

interface BookingExtensionDetails {
  id: string;
  booking_id: string;
  end_date: string;
  dropoff_time: string;
  booking_amount: number;
  paid_amount: number;
  total_amount?: number;
  remaining_amount?: number;
  damage_charges?: number;
  late_fee?: number;
  extension_fee?: number;
  security_deposit_amount?: number;
}

interface ExtendBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookingExtended: () => void;
  booking: BookingExtensionDetails;
}

interface FormData {
  end_date: string;
  additional_amount: string;
  extension_reason: string;
  payment_method: string;
  next_payment_date: string;
  current_payment: string;
  dropoff_time: string; // Add new field for time
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
    additional_amount: '',
    extension_reason: '',
    payment_method: 'cash',
    next_payment_date: '',
    current_payment: '',
    dropoff_time: '12:00' // Default to noon
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

    // Amount validation
    if (name === 'additional_amount' || name === 'current_payment') {
      // Remove any non-numeric characters except decimal point
      const sanitizedValue = value.replace(/[^\d.]/g, '');
      // Ensure only one decimal point
      const parts = sanitizedValue.split('.');
      const cleanValue = parts[0] + (parts.length > 1 ? '.' + parts[1] : '');
      
      if (cleanValue === '') {
        setFormData(prev => ({ ...prev, [name]: '' }));
        return;
      }

      const amount = parseFloat(cleanValue);
      if (isNaN(amount)) {
        setError('Please enter a valid amount');
        return;
      }
      if (amount < 0) {
        setError('Amount cannot be negative');
        return;
      }
      setFormData(prev => ({ ...prev, [name]: cleanValue }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data before proceeding
    if (!formData.end_date || !formData.additional_amount || !formData.next_payment_date || !formData.dropoff_time) {
      setError('Please fill in all required fields');
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
      const currentPaymentAmount = parseFloat(formData.current_payment) || 0;

      // Create extension data object
      const extensionData = {
        booking_id: booking.id,
        previous_end_date: booking.end_date,
        previous_dropoff_time: booking.dropoff_time || '12:00',
        new_end_date: formData.end_date,
        new_dropoff_time: formData.dropoff_time,
        additional_amount: additionalAmount,
        payment_amount: currentPaymentAmount,
        reason: formData.extension_reason,
        payment_method: formData.payment_method,
        created_by: user.id
      };

      console.log('Debug - Extension Data:', extensionData);

      // First, log the extension in the booking_extensions table
      const { error: extensionError } = await supabase
        .from('booking_extensions')
        .insert(extensionData);

      if (extensionError) {
        console.error('Extension error:', extensionError);
        throw new Error(`Failed to log extension: ${extensionError.message}`);
      }

      // Create booking update data object
      const bookingUpdateData = {
        end_date: formData.end_date,
        booking_amount: booking.booking_amount + additionalAmount,
        paid_amount: booking.paid_amount + currentPaymentAmount,
        updated_by: user.id,
        next_payment_date: formData.next_payment_date,
        dropoff_time: formData.dropoff_time
      };

      console.log('Debug - Booking Update Data:', bookingUpdateData);

      // Then update the booking
      const { error: bookingError } = await supabase
        .from('bookings')
        .update(bookingUpdateData)
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

  // Calculate total amount and pending amount including security deposit
  const bookingAmount = Number(booking?.booking_amount || 0);
  const securityDeposit = Number(booking?.security_deposit_amount || 0);
  const totalAmount = bookingAmount + securityDeposit;
  const paidAmount = Number(booking?.paid_amount || 0);
  const pendingAmount = totalAmount - paidAmount;
  const additionalAmount = parseFloat(formData.additional_amount) || 0;
  const currentPaymentAmount = parseFloat(formData.current_payment) || 0;
  const totalExtendedAmount = pendingAmount + additionalAmount;

  console.log('Debug booking:', {
    booking,
    bookingAmount,
    securityDeposit,
    totalAmount,
    paidAmount,
    pendingAmount,
    additionalAmount,
    totalExtendedAmount,
    bookingDetails: {
      id: booking?.id,
      booking_id: booking?.booking_id,
      booking_amount: booking?.booking_amount,
      security_deposit_amount: booking?.security_deposit_amount,
      paid_amount: booking?.paid_amount
    }
  });

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

          {/* Payment Information Section */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Payment Information</h3>

            {/* Pending Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Pending Amount
              </label>
              <div className="mt-1 text-lg font-semibold text-red-600">
                ₹{pendingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            {/* Additional Amount for Extension */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Additional Amount for Extension *
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">₹</span>
                </div>
                <input
                  type="text"
                  name="additional_amount"
                  required
                  value={formData.additional_amount}
                  onChange={handleInputChange}
                  className="block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter amount"
                />
              </div>
            </div>

            {/* Total Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Total Amount
              </label>
              <div className="mt-1 text-lg font-semibold text-gray-900">
                ₹{totalExtendedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            {/* Current Payment Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Current Payment Amount *
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">₹</span>
                </div>
                <input
                  type="text"
                  name="current_payment"
                  required
                  value={formData.current_payment}
                  onChange={handleInputChange}
                  className="block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter payment amount"
                />
              </div>
            </div>

            {/* Remaining Amount After Current Payment */}
            {formData.current_payment && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Remaining Amount After Payment
                </label>
                <div className="mt-1 text-lg font-semibold text-orange-600">
                  ₹{(totalExtendedAmount - parseFloat(formData.current_payment || '0')).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            )}

            {/* Previously Paid Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Previously Paid Amount
              </label>
              <div className="mt-1 text-lg font-semibold text-green-600">
                ₹{paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Payment Method *
              </label>
              <select
                name="payment_method"
                required
                value={formData.payment_method}
                onChange={handleInputChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>

            {/* Next Payment Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Next Payment Date *
              </label>
              <input
                type="date"
                name="next_payment_date"
                required
                min={minEndDate}
                value={formData.next_payment_date}
                onChange={handleInputChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          {/* Extension Details Section */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Extension Details</h3>

            {/* Current End Date and Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Current End Date & Time
              </label>
              <div className="mt-1 text-lg flex items-center gap-2">
                <span>{formatDate(booking.end_date)}</span>
                <span className="text-gray-500">at</span>
                <span>{booking.dropoff_time || '12:00'}</span>
              </div>
            </div>

            {/* New End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                New End Date & Time *
              </label>
              <div className="grid grid-cols-2 gap-4">
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
                <select
                  name="dropoff_time"
                  required
                  value={formData.dropoff_time}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  {Array.from({ length: 24 }, (_, hour) => (
                    <React.Fragment key={hour}>
                      <option value={`${hour.toString().padStart(2, '0')}:00`}>
                        {formatTimeDisplay(hour, '00')}
                      </option>
                      <option value={`${hour.toString().padStart(2, '0')}:30`}>
                        {formatTimeDisplay(hour, '30')}
                      </option>
                    </React.Fragment>
                  ))}
                </select>
              </div>
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