import { useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { Dialog } from '@headlessui/react';
import { X } from 'lucide-react';
import { notifyPaymentEvent } from '@/lib/notification';

interface CreatePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  remainingAmount: number;
  onPaymentCreated: () => void;
  bookingId: string;
  bookingNumber: string;
  customerName: string;
}

export default function CreatePaymentModal({
  isOpen,
  onClose,
  remainingAmount,
  onPaymentCreated,
  bookingId,
  bookingNumber,
  customerName
}: CreatePaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState(remainingAmount);
  const [paymentMethod, setPaymentMethod] = useState('cash');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const supabase = getSupabaseClient();

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get current booking details to calculate new paid amount
      const { data: currentBooking, error: bookingFetchError } = await supabase
        .from('bookings')
        .select('paid_amount')
        .eq('id', bookingId)
        .single();

      if (bookingFetchError) {
        console.error('Error fetching current booking:', bookingFetchError);
        throw new Error('Failed to fetch current booking details');
      }

      const newPaidAmount = (currentBooking?.paid_amount || 0) + amount;

      // Create payment record
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert([{
          booking_id: bookingId,
          amount: amount,
          payment_mode: paymentMethod,
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

      // Update booking's payment status and paid amount
      const { error: bookingUpdateError } = await supabase
        .from('bookings')
        .update({
          paid_amount: newPaidAmount,
          payment_status: amount >= remainingAmount ? 'full' : 'partial',
          payment_mode: paymentMethod,
          updated_at: new Date().toISOString(),
          updated_by: user.id
        })
        .eq('id', bookingId);

      if (bookingUpdateError) {
        console.error('Booking update error:', bookingUpdateError);
        // Rollback payment creation if booking update fails
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
            bookingId: bookingNumber,
            customerName: customerName,
            actionBy: user.email || 'Unknown User'
          }
        );
      } catch (notifyError) {
        console.error('Notification error:', notifyError);
        // Don't throw here, as the payment was successful
      }

      toast.success('Payment recorded successfully');
      onPaymentCreated();
      onClose();
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <Dialog.Title className="text-lg font-medium text-gray-900">
              Add Payment
            </Dialog.Title>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Amount
              </label>
              <div className="mt-1">
                <input
                  type="number"
                  min="0"
                  max={remainingAmount}
                  value={amount}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    if (value > remainingAmount) {
                      setError(`Amount cannot exceed remaining balance of ${formatCurrency(remainingAmount)}`);
                      return;
                    }
                    setAmount(value);
                    setError(null);
                  }}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Remaining amount: {formatCurrency(remainingAmount)}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="upi">UPI</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>

            {/* Footer */}
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || amount <= 0 || amount > remainingAmount}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Add Payment'}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
} 