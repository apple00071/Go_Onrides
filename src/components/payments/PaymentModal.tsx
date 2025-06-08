'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { CurrencyInput } from '@/components/ui/currency-input';
import { toast } from 'react-hot-toast';
import { notifyPaymentEvent } from '@/lib/notification';

interface BookingWithPayments {
  id: string;
  booking_id: string;
  customer_name: string;
  vehicle_details: {
    model: string;
    registration: string;
  };
  booking_amount: number;
  security_deposit_amount: number;
  paid_amount: number;
  payment_status: string;
  total_amount: number;
  remaining_amount: number;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentCreated: () => void;
  initialBookingId?: string;
}

export default function PaymentModal({
  isOpen,
  onClose,
  onPaymentCreated,
  initialBookingId
}: PaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<BookingWithPayments[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithPayments | null>(null);
  const [formData, setFormData] = useState({
    booking_id: initialBookingId || '',
    amount: '',
    payment_mode: 'cash'
  });

  useEffect(() => {
    if (isOpen) {
      console.log('Modal opened with initialBookingId:', initialBookingId);
      fetchBookings().then(() => {
        // If initialBookingId is provided, select that booking
        if (initialBookingId) {
          console.log('Setting initial booking:', initialBookingId);
          const booking = bookings.find(b => b.id === initialBookingId);
          if (booking) {
            console.log('Found initial booking:', booking);
            setSelectedBooking(booking);
            setFormData(prev => ({
              ...prev,
              booking_id: initialBookingId
            }));
          } else {
            console.log('Initial booking not found in bookings list');
          }
        }
      });
    }
  }, [isOpen, initialBookingId, bookings]);

  const fetchBookings = async () => {
    try {
      const supabase = getSupabaseClient();
      console.log('Fetching bookings...');
      
      // Get all active bookings with pending or partial payments
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_id,
          customer_name,
          vehicle_details,
          booking_amount,
          security_deposit_amount,
          paid_amount,
          payment_status,
          status,
          total_amount
        `)
        .eq('id', initialBookingId)
        .single();

      if (bookingsError) {
        console.error('Booking fetch error:', bookingsError);
        throw bookingsError;
      }

      console.log('Raw bookings data:', bookingsData);

      if (!bookingsData) {
        console.log('No booking found');
        setBookings([]);
        return;
      }

      // Process booking to calculate remaining amount
      const totalAmount = Number(bookingsData.booking_amount) + Number(bookingsData.security_deposit_amount);
      const paidAmount = Number(bookingsData.paid_amount) || 0;
      const remainingAmount = totalAmount - paidAmount;

      console.log('Processing booking:', {
        bookingAmount: bookingsData.booking_amount,
        securityDeposit: bookingsData.security_deposit_amount,
        totalAmount,
        paidAmount,
        remainingAmount
      });

      const processedBooking = {
        ...bookingsData,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        remaining_amount: remainingAmount
      };

      setBookings([processedBooking]);
      setSelectedBooking(processedBooking);
      setFormData(prev => ({
        ...prev,
        booking_id: processedBooking.id
      }));
    } catch (error) {
      console.error('Error fetching booking:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch booking');
    }
  };

  const handleBookingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const bookingId = e.target.value;
    setFormData(prev => ({ ...prev, booking_id: bookingId }));
    
    const selected = bookings.find(booking => booking.id === bookingId);
    setSelectedBooking(selected || null);
    setError(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'amount' && selectedBooking) {
      const amount = parseFloat(value);
      if (amount > selectedBooking.remaining_amount) {
        setError(`Amount cannot exceed remaining balance of ${formatCurrency(selectedBooking.remaining_amount)}`);
        return;
      }
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted with data:', formData);
    console.log('Selected booking:', selectedBooking);

    if (!selectedBooking) {
      setError('Please select a booking');
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!formData.payment_mode) {
      setError('Please select a payment mode');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const amount = Number(formData.amount);

      // Validate amount against remaining balance
      if (amount > selectedBooking.remaining_amount) {
        throw new Error(`Amount cannot exceed remaining balance of ${formatCurrency(selectedBooking.remaining_amount)}`);
      }

      // Get current user for the notification
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      console.log('Creating payment record with data:', {
        booking_id: selectedBooking.id,
        amount,
        payment_mode: formData.payment_mode,
        created_by: user.id
      });
      
      // Create the payment record
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert([{
          booking_id: selectedBooking.id,
          amount: amount,
          payment_mode: formData.payment_mode,
          payment_status: 'completed',
          created_at: new Date().toISOString(),
          created_by: user.id
        }])
        .select()
        .single();

      if (paymentError) {
        console.error('Payment creation error:', paymentError);
        throw new Error(paymentError.message);
      }

      if (!paymentData) {
        throw new Error('Payment was created but no data was returned');
      }

      console.log('Created payment record successfully:', paymentData);

      // Calculate new paid amount and status
      const newPaidAmount = Number(selectedBooking.paid_amount || 0) + amount;
      const totalRequired = Number(selectedBooking.booking_amount) + Number(selectedBooking.security_deposit_amount);
      const paymentStatus = newPaidAmount >= totalRequired ? 'full' : 'partial';

      console.log('Updating booking payment details:', {
        newPaidAmount,
        totalRequired,
        paymentStatus,
        booking_id: selectedBooking.id
      });

      // Update the booking's payment status and paid amount
      const { error: bookingUpdateError } = await supabase
        .from('bookings')
        .update({
          paid_amount: newPaidAmount,
          payment_status: paymentStatus,
          payment_mode: formData.payment_mode,
          updated_at: new Date().toISOString(),
          updated_by: user.id
        })
        .eq('id', selectedBooking.id);

      if (bookingUpdateError) {
        console.error('Booking update error:', bookingUpdateError);
        // If booking update fails, we should delete the payment we just created
        await supabase
          .from('payments')
          .delete()
          .eq('id', paymentData.id);
        throw new Error('Failed to update booking payment status');
      }

      // Send notification about the payment
      try {
        await notifyPaymentEvent(
          'PAYMENT_CREATED',
          paymentData.id,
          {
            amount: amount,
            bookingId: selectedBooking.booking_id,
            customerName: selectedBooking.customer_name,
            actionBy: user.email || 'Unknown User'
          }
        );
      } catch (notifyError) {
        console.error('Notification error:', notifyError);
        // Don't throw here, as the payment was successful
      }

      toast.success('Payment added successfully');
      onClose();
      if (onPaymentCreated) {
        onPaymentCreated();
      }
    } catch (error) {
      console.error('Error in payment submission:', error);
      setError(error instanceof Error ? error.message : 'Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">New Payment</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Booking
            </label>
            <select
              name="booking_id"
              required
              value={formData.booking_id}
              onChange={handleBookingChange}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              disabled={!!initialBookingId}
            >
              <option value="">Select a booking</option>
              {bookings.map((booking) => (
                <option key={booking.id} value={booking.id}>
                  {booking.booking_id} - {booking.customer_name} ({formatCurrency(booking.remaining_amount)} remaining)
                </option>
              ))}
            </select>
          </div>

          {selectedBooking && (
            <div className="bg-gray-50 p-3 rounded-md space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Booking Amount:</span>
                <span className="font-medium">{formatCurrency(selectedBooking.booking_amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Security Deposit:</span>
                <span className="font-medium">{formatCurrency(selectedBooking.security_deposit_amount)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold border-t border-gray-200 pt-2">
                <span className="text-gray-500">Total Required:</span>
                <span className="font-medium">{formatCurrency(selectedBooking.total_amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Paid Amount:</span>
                <span className="font-medium">{formatCurrency(selectedBooking.paid_amount)}</span>
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span className="text-gray-500">Remaining Amount:</span>
                <span className="text-blue-600">{formatCurrency(selectedBooking.remaining_amount)}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Amount
            </label>
            <CurrencyInput
              name="amount"
              required
              value={formData.amount}
              onChange={handleInputChange}
              max={selectedBooking?.remaining_amount}
              placeholder={selectedBooking ? `Max ${formatCurrency(selectedBooking.remaining_amount)}` : '0.00'}
              error={!!error}
              helperText={error || undefined}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Payment Mode
            </label>
            <select
              name="payment_mode"
              required
              value={formData.payment_mode}
              onChange={handleInputChange}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedBooking || !formData.amount}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding...' : 'Add Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 