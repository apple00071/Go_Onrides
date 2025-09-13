'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase';
import { calculateReturnFees } from '@/lib/fee-calculator';
import { CurrencyInput } from '@/components/ui/currency-input';
import { sendBookingUpdateMessage } from '@/lib/whatsapp';

interface BookingDetails {
  id: string;
  booking_id: string;
  rental_purpose: string;
  status: string;
  actual_return_time: string | null;
  completed_at: string | null;
  completed_by: string | null;
  damage_charges: number;
  late_fee: number;
  extension_fee: number;
  total_amount: number;
  payment_status: string;
  security_deposit_amount: number;
  customer_contact: string;
}

interface FormData {
  damageCharges: string;
  damageDescription: string;
  vehicleRemarks: string;
  odometer_reading: string;
  fuel_level: string;
  inspection_notes: string;
  lateFee: string;
  extensionFee: string;
  paymentAmount: string;
  paymentMethod: string;
  notes: string;
}

export default function CompleteBookingPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    damageCharges: '0',
    damageDescription: '',
    vehicleRemarks: '',
    odometer_reading: '',
    fuel_level: '',
    inspection_notes: '',
    lateFee: '0',
    extensionFee: '0',
    paymentAmount: '0',
    paymentMethod: 'cash',
    notes: ''
  });

  // Create a custom style to hide the rupee symbol
  const currencyInputStyle = {
    "& input": {
      textIndent: "-0.5ch"
    }
  };

  // Modify your existing useEffect to be more efficient
  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        setLoading(true);
        const supabase = getSupabaseClient();

        // Get current user's session and profile
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
          
          setIsAdmin(profile?.role === 'admin');
        }

        const { data: bookingData, error: bookingError } = await supabase
          .from('bookings')
          .select(`
            *,
            customer:customer_id (
              contact,
              phone
            )
          `)
          .eq('booking_id', params.id)
          .single();

        if (bookingError) throw bookingError;
        if (!bookingData) throw new Error('Booking not found');

        // Use customer contact from the customer record
        const customerContact = bookingData.customer?.contact || bookingData.customer?.phone;
        if (!customerContact) {
          throw new Error('Customer contact information not found');
        }

        setBooking({
          ...bookingData,
          customer_contact: customerContact
        });

        // Calculate fees based on actual return time vs expected return time
        const actualReturnTime = new Date();
        const expectedReturnTime = new Date(`${bookingData.end_date}T${bookingData.dropoff_time}`);
        const fees = await calculateReturnFees(actualReturnTime, expectedReturnTime);
        
        setFormData(prev => ({
          ...prev,
          lateFee: fees.lateFee.toString(),
          extensionFee: fees.extensionFee.toString(),
          paymentAmount: fees.totalFees.toString()
        }));
      } catch (error) {
        console.error('Error fetching booking details:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch booking details');
      } finally {
        setLoading(false);
      }
    };

    fetchBookingDetails();
  }, [params.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newFormData = {
        ...prev,
        [name]: value
      };

      // Automatically update payment amount when fees or damage charges change
      if (name === 'lateFee' || name === 'extensionFee' || name === 'damageCharges') {
        const lateFee = parseFloat(newFormData.lateFee) || 0;
        const extensionFee = parseFloat(newFormData.extensionFee) || 0;
        const damageCharges = parseFloat(newFormData.damageCharges) || 0;
        
        // Calculate total fees
        const totalFees = lateFee + extensionFee + damageCharges;
        newFormData.paymentAmount = totalFees.toString();
      }

      return newFormData;
    });
  };

  // Modify your handleSubmit function to handle OTP state
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      
      // Get current user's session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) throw new Error('No active session');

      // Start a transaction by getting the current booking
      const { data: currentBooking, error: fetchError } = await supabase
        .from('bookings')
        .select(`
          *,
          customer:customer_id (
            contact,
            phone
          )
        `)
        .eq('id', booking?.id)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch current booking: ${fetchError.message}`);
      }

      // Calculate the final amounts
      const damageCharges = parseFloat(formData.damageCharges) || 0;
      const lateFee = parseFloat(formData.lateFee) || 0;
      const extensionFee = parseFloat(formData.extensionFee) || 0;
      const remainingAmount = currentBooking.total_amount - currentBooking.paid_amount;
      
      // Calculate the new total paid amount including this payment
      const newPaidAmount = currentBooking.paid_amount + remainingAmount;

      // If there's a remaining amount being paid, create a payment record
      if (remainingAmount > 0) {
        const { error: paymentError } = await supabase
          .from('payments')
          .insert([{
            booking_id: booking?.id,
            amount: remainingAmount,
            payment_mode: formData.paymentMethod || 'cash',
            payment_status: 'completed',
            created_at: new Date().toISOString(),
            created_by: session.user.id
          }]);

        if (paymentError) {
          throw new Error(`Failed to create payment record: ${paymentError.message}`);
        }
      }

      // The final total amount should be:
      // Original booking amount + damage charges + late fee + extension fee
      const finalTotalAmount = currentBooking.booking_amount + damageCharges + lateFee + extensionFee;

      // Prepare update data
      const updateData: any = {
        status: 'completed',
        vehicle_remarks: formData.vehicleRemarks,
        inspection_notes: formData.inspection_notes,
        completed_at: new Date().toISOString(),
        completed_by: session.user.id,
        damage_charges: damageCharges,
        late_fee: lateFee,
        extension_fee: extensionFee,
        total_amount: finalTotalAmount,
        paid_amount: newPaidAmount,
        payment_status: newPaidAmount >= finalTotalAmount ? 'full' : 'partial'
      };

      // Only add odometer_reading and fuel_level for outstation bookings
      if (booking?.rental_purpose === 'outstation') {
        updateData.odometer_reading = formData.odometer_reading;
        updateData.fuel_level = formData.fuel_level;
      }

      // Update the booking to mark it as completed and update amounts
      const { error: bookingUpdateError } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', booking?.id);

      if (bookingUpdateError) {
        throw new Error(`Failed to update booking: ${bookingUpdateError.message}`);
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

      // Prepare additional info for WhatsApp message
      let additionalInfo = '';
      if (damageCharges > 0) {
        additionalInfo += `Damage charges: ₹${damageCharges}. `;
      }
      if (lateFee > 0) {
        additionalInfo += `Late fee: ₹${lateFee}. `;
      }
      if (extensionFee > 0) {
        additionalInfo += `Extension fee: ₹${extensionFee}. `;
      }
      if (remainingAmount > 0) {
        additionalInfo += `Remaining amount: ₹${remainingAmount}. `;
      }

      // Send WhatsApp notification
      try {
        const customerPhone = currentBooking.customer?.contact || currentBooking.customer?.phone;
        if (customerPhone) {
          await sendBookingUpdateMessage(
            customerPhone,
            booking?.booking_id || '',
            'completed',
            additionalInfo
          );
        }
      } catch (notificationError) {
        console.error('Failed to send WhatsApp notification:', notificationError);
        // Don't throw error here, as the booking is already completed
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
    ? (() => {
        const damageChargesAmount = parseFloat(formData.damageCharges) || 0;
        const lateFeeAmount = parseFloat(formData.lateFee) || 0;
        const extensionFeeAmount = parseFloat(formData.extensionFee) || 0;
        const securityDeposit = booking.security_deposit_amount;
        const totalCharges = lateFeeAmount + extensionFeeAmount + damageChargesAmount;
        const refundAmount = Math.max(0, securityDeposit - totalCharges);
        const additionalCharges = Math.max(0, totalCharges - securityDeposit);

        // Create array of charges
        const charges = [];
        if (lateFeeAmount > 0) charges.push(`late fee of ₹${lateFeeAmount.toLocaleString('en-IN')}`);
        if (extensionFeeAmount > 0) charges.push(`extension fee of ₹${extensionFeeAmount.toLocaleString('en-IN')}`);
        if (damageChargesAmount > 0) charges.push(`damage charges of ₹${damageChargesAmount.toLocaleString('en-IN')}`);

        // Format charges with proper spacing and conjunctions
        const chargesText = charges.length > 1 
          ? `${charges.slice(0, -1).join(', ')} and ${charges[charges.length - 1]}`
          : charges[0] || '';

        return `I hereby acknowledge that I have returned the vehicle and agree to the assessment of all charges. ${
          charges.length > 0 ? `The following charges are applicable: ${chargesText}. ` : ''
        }I understand that my security deposit of ₹${securityDeposit.toLocaleString('en-IN')} will be ${
          refundAmount === securityDeposit ? 'fully refunded' :
          refundAmount > 0 ? 'partially refunded' : 'fully utilized for the charges'
        }${
          additionalCharges > 0 ? `. Additional charges of ₹${additionalCharges.toLocaleString('en-IN')} need to be paid` : ''
        }${
          refundAmount > 0 ? `. The final refund amount is ₹${refundAmount.toLocaleString('en-IN')}` : ''
        }.`
      })()
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
              Complete Booking - {booking?.booking_id}
            </h1>
          </div>

          {error && (
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
                {error}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Vehicle Return Details - Only show for outstation bookings */}
            {booking?.rental_purpose === 'outstation' && (
              <div className="space-y-4 rounded-lg bg-gray-50 p-4">
                <h3 className="font-medium">Vehicle Return Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Odometer Reading
                    </label>
                    <input
                      type="text"
                      name="odometer_reading"
                      value={formData.odometer_reading}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required={booking?.rental_purpose === 'outstation'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Fuel Level
                    </label>
                    <select
                      name="fuel_level"
                      value={formData.fuel_level}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required={booking?.rental_purpose === 'outstation'}
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
            )}

            {/* Payment Details */}
            <div className="space-y-4 rounded-lg bg-gray-50 p-4">
              <h3 className="font-medium">Payment Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Security Deposit Amount
                  </label>
                  <input
                    type="text"
                    value={`₹${booking.security_deposit_amount.toLocaleString('en-IN')}`}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Late Fee
                  </label>
                  <input
                    type="text"
                    name="lateFee"
                    value={formData.lateFee}
                    onChange={handleChange}
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${!isAdmin ? 'bg-gray-100' : ''}`}
                    readOnly={!isAdmin}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Extension Fee
                  </label>
                  <input
                    type="text"
                    name="extensionFee"
                    value={formData.extensionFee}
                    onChange={handleChange}
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${!isAdmin ? 'bg-gray-100' : ''}`}
                    readOnly={!isAdmin}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Payment Amount
                  </label>
                  <input
                    type="text"
                    name="paymentAmount"
                    value={formData.paymentAmount}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Payment Method
                  </label>
                  <select
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleChange}
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

            {/* Damage Assessment */}
            <div className="space-y-4 rounded-lg bg-gray-50 p-4">
              <h3 className="font-medium">Damage Assessment</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Damage Description
                  </label>
                  <textarea
                    name="damageDescription"
                    value={formData.damageDescription}
                    onChange={handleChange}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Damage Charges
                  </label>
                  <input
                    type="text"
                    name="damageCharges"
                    value={formData.damageCharges}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Additional Notes */}
            <div className="space-y-4 rounded-lg bg-gray-50 p-4">
              <h3 className="font-medium">Additional Notes</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Vehicle Remarks
                  </label>
                  <textarea
                    name="vehicleRemarks"
                    value={formData.vehicleRemarks}
                    onChange={handleChange}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Inspection Notes
                  </label>
                  <textarea
                    name="inspection_notes"
                    value={formData.inspection_notes}
                    onChange={handleChange}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Additional Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="space-y-4 rounded-lg bg-gray-50 p-4">
              <h3 className="font-medium">Terms and Conditions</h3>
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <p className="text-sm text-yellow-800">
                  {termsAndConditions}
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Complete Booking'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 