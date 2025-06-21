'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import SignatureCanvas from '@/components/ui/SignatureCanvas';
import { getSupabaseClient } from '@/lib/supabase';
import { CurrencyInput } from '@/components/ui/currency-input';

interface BookingDetails {
  id: string;
  booking_id: string;
  customer_name: string;
  total_amount: number;
  paid_amount: number;
  security_deposit_amount: number;
  rental_purpose: 'local' | 'outstation';
  vehicle_details: {
    model: string;
    registration: string;
  };
}

interface FormData {
  remainingAmount: string;
  damageDescription: string;
  damageCharges: string;
  vehicleRemarks: string;
  refundAmount: string;
  paymentMode: 'cash' | 'upi' | 'card' | 'bank_transfer';
  signature: string;
  odometer_reading: string;
  fuel_level: string;
  inspection_notes: string;
}

export default function CompleteBookingPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingDetails | null>(null);

  const initialFormData: FormData = {
    remainingAmount: '0',
    damageDescription: '',
    damageCharges: '0',
    vehicleRemarks: '',
    refundAmount: '0',
    paymentMode: 'cash',
    signature: '',
    odometer_reading: '',
    fuel_level: '',
    inspection_notes: ''
  };

  const [formData, setFormData] = useState<FormData>(initialFormData);

  useEffect(() => {
    const fetchBooking = async () => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('booking_id', params.id)
        .single();

      if (error) {
        console.error('Error fetching booking:', error);
        toast.error('Failed to fetch booking details');
        return;
      }

      setBooking(data);
      setFormData(prev => ({
        ...prev,
        remainingAmount: (data.total_amount - data.paid_amount).toString(),
        refundAmount: data.security_deposit_amount.toString()
      }));
    };

    fetchBooking();
  }, [params.id]);

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
      const newRefundAmount = Math.max(0, booking?.security_deposit_amount || 0 - charges);
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
        .eq('id', booking?.id)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch current booking: ${fetchError.message}`);
      }

      // Calculate the final amounts
      const damageCharges = parseFloat(formData.damageCharges) || 0;
      const refundAmount = parseFloat(formData.refundAmount) || 0;
      const remainingAmount = parseFloat(formData.remainingAmount) || 0;
      
      // Create payment record for the remaining amount
      if (remainingAmount > 0) {
        const { error: paymentError } = await supabase
          .from('payments')
          .insert({
            booking_id: booking?.id,
            amount: remainingAmount,
            payment_mode: formData.paymentMode,
            payment_status: 'completed',
            created_at: new Date().toISOString(),
            created_by: session.user.id
          });

        if (paymentError) {
          throw new Error(`Failed to create payment record: ${paymentError.message}`);
        }
      }

      // The final total amount should be:
      // Original booking amount + damage charges (not including security deposit)
      const finalTotalAmount = currentBooking.booking_amount + damageCharges;

      // Calculate the new total paid amount including this payment
      const newPaidAmount = currentBooking.paid_amount + remainingAmount;

      // Update the booking to mark it as completed and update amounts
      const { error: bookingUpdateError } = await supabase
        .from('bookings')
        .update({
          status: 'completed',
          vehicle_remarks: formData.vehicleRemarks,
          odometer_reading: formData.odometer_reading,
          fuel_level: formData.fuel_level,
          inspection_notes: formData.inspection_notes,
          completed_at: new Date().toISOString(),
          completed_by: session.user.id,
          damage_charges: damageCharges,
          refund_amount: refundAmount,
          total_amount: finalTotalAmount,
          paid_amount: newPaidAmount,
          payment_status: 'full'
        })
        .eq('id', booking?.id);

      if (bookingUpdateError) {
        throw new Error(`Failed to update booking: ${bookingUpdateError.message}`);
      }

      // Store the signature
      const { error: signatureError } = await supabase
        .from('booking_signatures')
        .insert({
          booking_id: booking?.id,
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
            booking_id: booking?.id,
            description: formData.damageDescription,
            charges: damageCharges,
            created_at: new Date().toISOString(),
            created_by: session.user.id
          });

        if (damageError) {
          throw new Error(`Failed to record damage details: ${damageError.message}`);
        }
      }

      toast.success('Booking completed successfully');
      router.push('/dashboard/bookings');
    } catch (error) {
      console.error('Error completing booking:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  const termsAndConditions = booking.security_deposit_amount > 0 
    ? `I hereby acknowledge that I have returned the vehicle and agree to the assessment of any damages and associated charges. I understand that my security deposit of ₹${booking.security_deposit_amount} will be refunded minus any applicable damage charges of ₹${formData.damageCharges}, resulting in a final refund of ₹${formData.refundAmount}.`
    : 'I hereby acknowledge that I have returned the vehicle and agree to the assessment of any damages and associated charges. I confirm that all payments have been settled as per the agreement.';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Bookings
          </button>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h1 className="text-xl font-semibold text-gray-900">
              Complete Booking - {booking.booking_id}
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
                {error}
              </div>
            )}

            {/* Vehicle Return Details */}
            <div className="space-y-4 rounded-lg bg-gray-50 p-4">
              <h3 className="font-medium">Vehicle Return Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {booking.rental_purpose === 'outstation' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Odometer Reading
                    </label>
                    <input
                      type="text"
                      name="odometer_reading"
                      value={formData.odometer_reading}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Fuel Level
                  </label>
                  <select
                    name="fuel_level"
                    value={formData.fuel_level}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select fuel level</option>
                    <option value="full">Full</option>
                    <option value="3/4">3/4</option>
                    <option value="1/2">1/2</option>
                    <option value="1/4">1/4</option>
                    <option value="empty">Empty</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Payment Section */}
            <div className="space-y-4 rounded-lg bg-gray-50 p-4">
              <h3 className="font-medium">Payment Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Describe any damages to the vehicle..."
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* Additional Notes */}
            <div className="space-y-4 rounded-lg bg-gray-50 p-4">
              <h3 className="font-medium">Additional Notes</h3>
              <div>
                <textarea
                  name="inspection_notes"
                  value={formData.inspection_notes}
                  onChange={handleInputChange}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Add any additional notes about the vehicle return..."
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

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Completing...' : 'Complete Booking'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 