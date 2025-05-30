'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getSupabaseClient } from '@/lib/supabase';
import { CurrencyInput } from '@/components/ui/currency-input';

interface CompleteBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  bookingId: string;
  totalAmount: number;
  paidAmount: number;
  securityDeposit: number;
}

interface FormData {
  remainingAmount: string;
  damageDescription: string;
  damageCharges: string;
  vehicleRemarks: string;
  refundAmount: string;
  paymentMode: 'cash' | 'upi' | 'card' | 'bank_transfer';
}

export default function CompleteBookingModal({
  isOpen,
  onClose,
  onComplete,
  bookingId,
  totalAmount,
  paidAmount,
  securityDeposit
}: CompleteBookingModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialFormData: FormData = {
    remainingAmount: (totalAmount - paidAmount).toString(),
    damageDescription: '',
    damageCharges: '0',
    vehicleRemarks: '',
    refundAmount: securityDeposit.toString(),
    paymentMode: 'cash'
  };

  const [formData, setFormData] = useState<FormData>(initialFormData);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setError(null);

    if (name === 'damageCharges') {
      const charges = parseFloat(value) || 0;
      if (charges < 0) {
        setError('Damage charges cannot be negative');
        return;
      }
      // Update refund amount when damage charges change
      const newRefundAmount = Math.max(0, securityDeposit - charges);
      setFormData(prev => ({
        ...prev,
        [name]: value,
        refundAmount: newRefundAmount.toString()
      }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();

      // Validate remaining amount payment if any
      const remainingAmount = parseFloat(formData.remainingAmount);
      if (remainingAmount > 0) {
        const { error: paymentError } = await supabase
          .from('payments')
          .insert({
            booking_id: bookingId,
            amount: remainingAmount,
            payment_mode: formData.paymentMode,
            payment_status: 'completed',
            created_at: new Date().toISOString()
          });

        if (paymentError) {
          throw new Error(`Failed to record payment: ${paymentError.message}`);
        }
      }

      // Record damage details if any
      if (formData.damageDescription || parseFloat(formData.damageCharges) > 0) {
        const { error: damageError } = await supabase
          .from('vehicle_damages')
          .insert({
            booking_id: bookingId,
            description: formData.damageDescription,
            charges: parseFloat(formData.damageCharges),
            created_at: new Date().toISOString()
          });

        if (damageError) {
          throw new Error(`Failed to record damage details: ${damageError.message}`);
        }
      }

      // Update booking status and add remarks
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({
          status: 'completed',
          vehicle_remarks: formData.vehicleRemarks,
          completed_at: new Date().toISOString(),
          refund_amount: parseFloat(formData.refundAmount)
        })
        .eq('id', bookingId);

      if (bookingError) {
        throw new Error(`Failed to update booking: ${bookingError.message}`);
      }

      toast.success('Booking completed successfully');
      onComplete();
      onClose();
    } catch (error) {
      console.error('Error completing booking:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Complete Booking</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Payment Section */}
          <div className="space-y-4 rounded-lg bg-gray-50 p-4">
            <h3 className="font-medium">Payment Details</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Remaining Amount
                </label>
                <CurrencyInput
                  name="remainingAmount"
                  value={formData.remainingAmount}
                  onChange={handleInputChange}
                  readOnly
                  className="bg-gray-100"
                />
              </div>
              {parseFloat(formData.remainingAmount) > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Payment Mode
                  </label>
                  <select
                    name="paymentMode"
                    value={formData.paymentMode}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Vehicle Damage Section */}
          <div className="space-y-4 rounded-lg bg-gray-50 p-4">
            <h3 className="font-medium">Vehicle Damage Assessment</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Damage Description
                </label>
                <textarea
                  name="damageDescription"
                  value={formData.damageDescription}
                  onChange={handleInputChange}
                  rows={3}
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  placeholder="Describe any damages to the vehicle..."
                />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Damage Charges
                  </label>
                  <CurrencyInput
                    name="damageCharges"
                    value={formData.damageCharges}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Security Deposit Refund
                  </label>
                  <CurrencyInput
                    name="refundAmount"
                    value={formData.refundAmount}
                    onChange={handleInputChange}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Vehicle Remarks Section */}
          <div className="space-y-4 rounded-lg bg-gray-50 p-4">
            <h3 className="font-medium">Vehicle Remarks</h3>
            <div>
              <textarea
                name="vehicleRemarks"
                value={formData.vehicleRemarks}
                onChange={handleInputChange}
                rows={3}
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                placeholder="Add any remarks about the vehicle condition..."
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? 'Completing...' : 'Complete Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 