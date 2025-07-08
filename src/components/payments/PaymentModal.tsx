'use client';

import { useState, useEffect } from 'react';
import { X, IndianRupee } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { CurrencyInput } from '@/components/ui/currency-input';
import { toast } from 'react-hot-toast';
import { notifyPaymentEvent } from '@/lib/notification';
import { cn } from '@/lib/utils';

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
  late_fee?: number;
  extension_fee?: number;
  damage_charges?: number;
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
    booking_id: '',
    amount: '',
    payment_mode: 'cash'
  });

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = getSupabaseClient();
      console.log('Fetching bookings...');
      
      if (initialBookingId) {
        // Get specific booking if initialBookingId is provided
        const { data: bookingData, error: bookingError } = await supabase
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
            total_amount,
            late_fee,
            extension_fee,
            damage_charges
          `)
          .eq('id', initialBookingId)
          .single();

        if (bookingError) {
          console.error('Booking fetch error:', bookingError);
          throw bookingError;
        }

        if (!bookingData) {
          console.log('No booking found');
          setBookings([]);
          setError('Booking not found');
          return;
        }

        const processedBooking = processBookingData(bookingData);
        setBookings([processedBooking]);
        setSelectedBooking(processedBooking);
        setFormData(prev => ({
          ...prev,
          booking_id: processedBooking.id
        }));
      } else {
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
            total_amount,
            late_fee,
            extension_fee,
            damage_charges
          `)
          .in('payment_status', ['pending', 'partial'])
          .in('status', ['confirmed', 'in_use'])
          .order('created_at', { ascending: false });

        if (bookingsError) {
          console.error('Bookings fetch error:', bookingsError);
          throw bookingsError;
        }

        if (!bookingsData?.length) {
          console.log('No bookings found');
          setBookings([]);
          setError('No active bookings with pending payments found');
          return;
        }

        const processedBookings = bookingsData.map(processBookingData);
        setBookings(processedBookings);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch bookings');
      setBookings([]);
      setSelectedBooking(null);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to process booking data
  const processBookingData = (booking: any) => {
    // Calculate additional fees
    const lateFee = Number(booking.late_fee) || 0;
    const extensionFee = Number(booking.extension_fee) || 0;
    const damageCharges = Number(booking.damage_charges) || 0;
    
    // Calculate total including all fees
    const baseAmount = Number(booking.booking_amount) + Number(booking.security_deposit_amount);
    const additionalFees = lateFee + extensionFee + damageCharges;
    const totalAmount = baseAmount + additionalFees;
    
    const paidAmount = Number(booking.paid_amount) || 0;
    const remainingAmount = totalAmount - paidAmount;

    return {
      ...booking,
      total_amount: totalAmount,
      paid_amount: paidAmount,
      remaining_amount: remainingAmount,
      late_fee: lateFee,
      extension_fee: extensionFee,
      damage_charges: damageCharges
    };
  };

  useEffect(() => {
    if (isOpen) {
      console.log('Modal opened with initialBookingId:', initialBookingId);
      if (initialBookingId) {
        setFormData(prev => ({ ...prev, booking_id: initialBookingId }));
      }
      fetchBookings();
    }
  }, [isOpen, initialBookingId]);

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
      // Convert the input value to a number for comparison
      const numericValue = value === '' ? 0 : parseFloat(value);
      
      if (isNaN(numericValue)) {
        setError('Please enter a valid amount');
        return;
      }
      
      if (numericValue > selectedBooking.remaining_amount) {
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

  const PaymentRow = ({ label, amount }: { label: string; amount: number }) => (
    <div className="flex justify-between py-2">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium">{formatCurrency(amount)}</span>
    </div>
  );

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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Booking
            </label>
            <select
              name="booking_id"
              required
              value={formData.booking_id}
              onChange={handleBookingChange}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              disabled={!!initialBookingId}
            >
              <option value="">Choose a booking</option>
              {bookings.map((booking) => (
                <option key={booking.id} value={booking.id}>
                  {booking.booking_id} - {booking.customer_name}
                </option>
              ))}
            </select>
          </div>

          {selectedBooking && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h3 className="font-medium text-gray-900 mb-3">Payment Details</h3>
              <PaymentRow label="Booking Amount" amount={selectedBooking.booking_amount} />
              <PaymentRow label="Security Deposit" amount={selectedBooking.security_deposit_amount} />
              
              {/* Show additional fees only if they exist and are greater than 0 */}
              {selectedBooking.late_fee && selectedBooking.late_fee > 0 && (
                <PaymentRow label="Late Fee" amount={selectedBooking.late_fee} />
              )}
              {selectedBooking.extension_fee && selectedBooking.extension_fee > 0 && (
                <PaymentRow label="Extension Fee" amount={selectedBooking.extension_fee} />
              )}
              {selectedBooking.damage_charges && selectedBooking.damage_charges > 0 && (
                <PaymentRow label="Damage Charges" amount={selectedBooking.damage_charges} />
              )}
              
              <div className="border-t border-gray-200 my-2" />
              <PaymentRow label="Total Required" amount={selectedBooking.total_amount} />
              <PaymentRow label="Amount Paid" amount={selectedBooking.paid_amount} />
              <div className="border-t border-gray-200 my-2" />
              <div className="flex justify-between py-2 text-blue-600 font-medium">
                <span>Remaining Balance</span>
                <span>{formatCurrency(selectedBooking.remaining_amount)}</span>
              </div>
            </div>
          )}

          <div className="space-y-4 pt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Amount
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                  <IndianRupee className="w-4 h-4" />
                </span>
                <input
                  type="number"
                  name="amount"
                  required
                  value={formData.amount}
                  onChange={handleInputChange}
                  min="0"
                  max={selectedBooking?.remaining_amount}
                  step="1"
                  placeholder={selectedBooking ? `Enter amount up to ${formatCurrency(selectedBooking.remaining_amount)}` : '0'}
                  className="pl-7 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method
              </label>
              <select
                name="payment_mode"
                required
                value={formData.payment_mode}
                onChange={handleInputChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
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
              {loading ? 'Processing...' : 'Add Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 