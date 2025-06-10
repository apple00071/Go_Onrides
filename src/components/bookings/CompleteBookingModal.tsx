'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import SignatureCanvas from '@/components/ui/SignatureCanvas';
import { getSupabaseClient } from '@/lib/supabase';
import { CurrencyInput } from '@/components/ui/currency-input';
import * as Dialog from '@radix-ui/react-dialog';

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
  signature: string;
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
    paymentMode: 'cash',
    signature: ''
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

  const handleSignatureSave = (signatureData: string) => {
    setFormData(prev => ({ ...prev, signature: signatureData }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.signature) {
      setError('Please provide your signature to complete the booking');
      setLoading(false);
      return;
    }

    try {
      const supabase = getSupabaseClient();
      
      // Get current user's session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) throw new Error('No active session');

      // Start a transaction by getting the current booking
      const { data: currentBooking, error: fetchError } = await supabase
        .from('bookings')
        .select('paid_amount, total_amount, status, booking_amount, security_deposit_amount')
        .eq('id', bookingId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch current booking: ${fetchError.message}`);
      }

      // Calculate the final amounts
      const damageCharges = parseFloat(formData.damageCharges) || 0;
      const refundAmount = parseFloat(formData.refundAmount) || 0;
      const remainingAmount = parseFloat(formData.remainingAmount) || 0;
      
      // Create payment record for the remaining amount
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
        throw new Error(`Failed to create payment record: ${paymentError.message}`);
      }

      // The final total amount should be:
      // Original booking amount + damage charges (not including security deposit)
      const finalTotalAmount = currentBooking.booking_amount + damageCharges;

      // Calculate the new total paid amount including this payment
      const newPaidAmount = currentBooking.paid_amount + remainingAmount;

      console.log('Completing booking with amounts:', {
        bookingAmount: currentBooking.booking_amount,
        securityDeposit: currentBooking.security_deposit_amount,
        damageCharges,
        refundAmount,
        finalTotalAmount,
        currentPaidAmount: currentBooking.paid_amount,
        remainingAmountPaid: remainingAmount,
        newTotalPaidAmount: newPaidAmount
      });

      // Update the booking to mark it as completed and update amounts
      const { error: bookingUpdateError } = await supabase
        .from('bookings')
        .update({
          status: 'completed',
          vehicle_remarks: formData.vehicleRemarks,
          completed_at: new Date().toISOString(),
          completed_by: session.user.id,
          damage_charges: damageCharges,
          refund_amount: refundAmount,
          total_amount: finalTotalAmount, // Total amount is booking amount + damage charges
          paid_amount: newPaidAmount, // Update with the new total paid amount
          payment_status: 'full' // Always set to full when completing
        })
        .eq('id', bookingId);

      if (bookingUpdateError) {
        throw new Error(`Failed to update booking: ${bookingUpdateError.message}`);
      }

      // Store the signature in a separate table
      const { error: signatureError } = await supabase
        .from('booking_signatures')
        .insert({
          booking_id: bookingId,
          signature_data: formData.signature,
          created_at: new Date().toISOString()
        });

      if (signatureError) {
        console.error('Signature error details:', signatureError);
        throw new Error(`Failed to save signature: ${signatureError.message}`);
      }

      // Record damage details if any
      if (formData.damageDescription || damageCharges > 0) {
        const { error: damageError } = await supabase
          .from('vehicle_damages')
          .insert({
            booking_id: bookingId,
            description: formData.damageDescription,
            charges: damageCharges,
            created_at: new Date().toISOString()
          });

        if (damageError) {
          throw new Error(`Failed to record damage details: ${damageError.message}`);
        }
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

  const termsAndConditions = securityDeposit > 0 
    ? `I hereby acknowledge that I have returned the vehicle and agree to the assessment of any damages and associated charges. I understand that my security deposit of ₹${securityDeposit} will be refunded minus any applicable damage charges of ₹${formData.damageCharges}, resulting in a final refund of ₹${formData.refundAmount}.`
    : 'I hereby acknowledge that I have returned the vehicle and agree to the assessment of any damages and associated charges. I confirm that all payments have been settled as per the agreement.';

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black bg-opacity-50" />
        <Dialog.Content className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="w-full max-w-2xl bg-white rounded-lg">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <Dialog.Title className="text-xl font-semibold">Complete Booking</Dialog.Title>
                <Dialog.Close className="rounded-full p-1 hover:bg-gray-100">
                  <X className="h-5 w-5" />
                </Dialog.Close>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="max-h-[calc(100vh-16rem)] overflow-y-auto p-6 space-y-6">
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

                {/* Terms and Signature Section */}
                <div className="space-y-4 rounded-lg bg-gray-50 p-4">
                  <h3 className="font-medium">Terms & Signature</h3>
                  <div className="space-y-4">
                    <div className="rounded-md bg-blue-50 p-4">
                      <p className="text-sm text-blue-700">
                        {termsAndConditions}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Customer Signature
                      </label>
                      <SignatureCanvas onSave={handleSignatureSave} />
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="rounded-md bg-red-50 p-4">
                    <div className="text-sm text-red-700">{error}</div>
                  </div>
                )}
              </div>

              <div className="border-t p-6">
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
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
} 