'use client';

import { useState, useEffect } from 'react';
import { X, IndianRupee } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { CurrencyInput } from '@/components/ui/currency-input';
import { toast } from 'react-hot-toast';
import { notifyPaymentEvent } from '@/lib/notification';
import { cn } from '@/lib/utils';
import { Dialog } from '@headlessui/react';

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

interface FormData {
  amount: string;
  payment_mode: string;
  next_payment_date?: string;
  booking_id?: string;
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
  const [formData, setFormData] = useState<FormData>({
    amount: '',
    payment_mode: 'cash',
    booking_id: initialBookingId || ''
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
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted with data:', formData)

    if (!selectedBooking) {
      setError('No booking selected');
      return;
    }

    if (!formData.amount || isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    const amount = Number(formData.amount);
    const isFullPayment = amount >= selectedBooking.remaining_amount;

    // Validate next payment date for partial payments
    if (!isFullPayment && !formData.next_payment_date) {
      setError('Please select the next payment date for partial payment');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();

      // Validate amount against remaining balance
      if (amount > selectedBooking.remaining_amount) {
        throw new Error(`Amount cannot exceed remaining balance of ${formatCurrency(selectedBooking.remaining_amount)}`);
      }

      // Get current user for the notification
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
      
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

      // Calculate new paid amount and status
      const newPaidAmount = Number(selectedBooking.paid_amount || 0) + amount;
      const totalRequired = Number(selectedBooking.booking_amount) + Number(selectedBooking.security_deposit_amount);
      const paymentStatus = newPaidAmount >= totalRequired ? 'full' : 'partial';

      // Update booking with new payment status and next payment date
      const { error: bookingUpdateError } = await supabase
        .from('bookings')
        .update({
          paid_amount: newPaidAmount,
          payment_status: paymentStatus,
          next_payment_date: paymentStatus === 'partial' ? formData.next_payment_date : null,
          updated_at: new Date().toISOString(),
          updated_by: user.id
        })
        .eq('id', selectedBooking.id);

      if (bookingUpdateError) {
        throw new Error(bookingUpdateError.message);
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
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
          <Dialog.Title
            as="h3"
            className="text-lg font-medium leading-6 text-gray-900"
          >
            Record Payment
          </Dialog.Title>

          <form onSubmit={handleSubmit} className="mt-4">
            {error && (
              <div className="mt-4 text-sm text-red-600">
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

            <div className="mt-4">
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                Amount
              </label>
              <div className="mt-1">
                <input
                  type="number"
                  name="amount"
                  id="amount"
                  step="0.01"
                  value={formData.amount}
                  onChange={handleInputChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                />
              </div>
            </div>

            <div className="mt-4">
              <label htmlFor="payment_mode" className="block text-sm font-medium text-gray-700">
                Payment Mode
              </label>
              <div className="mt-1">
                <select
                  id="payment_mode"
                  name="payment_mode"
                  value={formData.payment_mode}
                  onChange={handleInputChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="card">Card</option>
                </select>
              </div>
            </div>

            {selectedBooking && Number(formData.amount) < selectedBooking.remaining_amount && (
              <div className="mt-4">
                <label htmlFor="next_payment_date" className="block text-sm font-medium text-gray-700">
                  Next Payment Date
                </label>
                <div className="mt-1">
                  <input
                    type="date"
                    name="next_payment_date"
                    id="next_payment_date"
                    value={formData.next_payment_date}
                    onChange={handleInputChange}
                    min={new Date().toISOString().split('T')[0]}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    required
                  />
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {loading ? 'Processing...' : 'Save Payment'}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
} 