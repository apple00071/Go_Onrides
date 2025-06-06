'use client';

import { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import DocumentUpload from './DocumentUpload';
import { CurrencyInput } from '@/components/ui/currency-input';
import { notifyBookingEvent } from '@/lib/notification';

interface BookingDetails {
  id: string;
  booking_id: string;
  customer_id: string;
  customer_name: string;
  customer_contact: string;
  customer_email: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  aadhar_number: string;
  date_of_birth: string;
  dl_number: string;
  dl_expiry_date: string;
  temp_address: string;
  perm_address: string;
  vehicle_details: {
    model: string;
    registration: string;
  };
  start_date: string;
  end_date: string;
  pickup_time: string;
  dropoff_time: string;
  booking_amount: number;
  security_deposit_amount: number;
  payment_status: string;
  paid_amount: number;
  payment_mode: string;
  status: string;
  documents?: {
    customer_photo?: string;
    aadhar_front?: string;
    aadhar_back?: string;
    dl_front?: string;
    dl_back?: string;
  };
}

interface EditBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookingUpdated: () => void;
  booking: BookingDetails;
}

type DocumentType = 'customer_photo' | 'aadhar_front' | 'aadhar_back' | 'dl_front' | 'dl_back';

interface CustomerDocuments {
  customer_photo?: string;
  aadhar_front?: string;
  aadhar_back?: string;
  dl_front?: string;
  dl_back?: string;
}

interface FormData {
  customer_name: string;
  customer_contact: string;
  customer_email: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  aadhar_number: string;
  date_of_birth: string;
  dl_number: string;
  dl_expiry_date: string;
  start_date: string;
  end_date: string;
  pickup_time: string;
  dropoff_time: string;
  temp_address: string;
  perm_address: string;
  vehicle_details: {
    model: string;
    registration: string;
  };
  booking_amount: string;
  security_deposit_amount: string;
  total_amount: string;
  payment_status: 'full' | 'partial' | 'pending';
  paid_amount: string;
  payment_mode: 'cash' | 'upi' | 'card' | 'bank_transfer';
  status: 'pending' | 'confirmed' | 'in_use' | 'completed' | 'cancelled';
  documents: CustomerDocuments;
}

export default function EditBookingModal({
  isOpen,
  onClose,
  onBookingUpdated,
  booking
}: EditBookingModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create form data from booking
  const initialFormData = useMemo<FormData>(() => ({
    customer_name: booking?.customer_name || '',
    customer_contact: booking?.customer_contact || '',
    customer_email: booking?.customer_email || '',
    emergency_contact_name: booking?.emergency_contact_name || '',
    emergency_contact_phone: booking?.emergency_contact_phone || '',
    aadhar_number: booking?.aadhar_number || '',
    date_of_birth: booking?.date_of_birth || '',
    dl_number: booking?.dl_number || '',
    dl_expiry_date: booking?.dl_expiry_date || '',
    start_date: booking?.start_date || '',
    end_date: booking?.end_date || '',
    pickup_time: booking?.pickup_time || '',
    dropoff_time: booking?.dropoff_time || '',
    temp_address: booking?.temp_address || '',
    perm_address: booking?.perm_address || '',
    vehicle_details: {
      model: booking?.vehicle_details?.model || '',
      registration: booking?.vehicle_details?.registration || ''
    },
    booking_amount: booking?.booking_amount?.toString() || '',
    security_deposit_amount: booking?.security_deposit_amount?.toString() || '',
    total_amount: (booking?.booking_amount + booking?.security_deposit_amount)?.toString() || '',
    payment_status: booking?.payment_status as 'full' | 'partial' | 'pending' || 'pending',
    paid_amount: booking?.paid_amount?.toString() || '',
    payment_mode: booking?.payment_mode as 'cash' | 'upi' | 'card' | 'bank_transfer' || 'cash',
    status: booking?.status as 'pending' | 'confirmed' | 'in_use' | 'completed' | 'cancelled' || 'confirmed',
    documents: booking?.documents || {
      customer_photo: '',
      aadhar_front: '',
      aadhar_back: '',
      dl_front: '',
      dl_back: ''
    }
  }), [booking]);

  const [formData, setFormData] = useState<FormData>(initialFormData);

  // Calculate total amount when booking amount or security deposit changes
  useEffect(() => {
    const bookingAmt = parseFloat(formData.booking_amount) || 0;
    const securityAmt = parseFloat(formData.security_deposit_amount) || 0;
    const total = bookingAmt + securityAmt;
    setFormData(prev => ({ ...prev, total_amount: total.toString() }));
  }, [formData.booking_amount, formData.security_deposit_amount]);

  // Update paid amount when payment status changes to full
  useEffect(() => {
    if (formData.payment_status === 'full') {
      setFormData(prev => ({ ...prev, paid_amount: formData.total_amount }));
    } else if (formData.payment_status === 'pending') {
      setFormData(prev => ({ ...prev, paid_amount: '0' }));
    }
  }, [formData.payment_status, formData.total_amount]);

  // Reset form when modal opens/closes or booking changes
  useEffect(() => {
    if (isOpen && booking) {
      setFormData(initialFormData);
      setError(null);
    }
  }, [isOpen, initialFormData, booking]);

  // Get today's date in YYYY-MM-DD format for date inputs
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  
  // Calculate maximum date for DOB (18 years ago)
  const maxDOB = useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 18);
    return date.toISOString().split('T')[0];
  }, []);
  
  // Calculate minimum date for DL expiry (today)
  const minDLExpiry = today;

  // Calculate minimum end date based on start date
  const minEndDate = formData.start_date || today;

  // Calculate maximum start date (1 year from today)
  const maxStartDate = useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().split('T')[0];
  }, []);

  // Calculate maximum end date (30 days from start date)
  const maxEndDate = useMemo(() => {
    const date = formData.start_date ? new Date(formData.start_date) : new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  }, [formData.start_date]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setError(null);
    
    // Date validation
    if (name === 'date_of_birth') {
      const selectedDate = new Date(value);
      const minAge = new Date();
      minAge.setFullYear(minAge.getFullYear() - 18);
      
      if (selectedDate > minAge) {
        setError('Customer must be at least 18 years old');
        return;
      }
    }

    if (name === 'dl_expiry_date') {
      const selectedDate = new Date(value);
      const today = new Date();
      
      if (selectedDate < today) {
        setError('Driving license cannot be expired');
        return;
      }
    }

    if (name === 'start_date') {
      const selectedDate = new Date(value);
      
      if (booking.status === 'in_use' || booking.status === 'completed') {
        setError('Cannot change start date for booking already in use or completed');
        return;
      }

      // Reset end date if it's before new start date
      const endDate = new Date(formData.end_date);
      if (endDate < selectedDate) {
        setFormData(prev => ({
          ...prev,
          end_date: value
        }));
      }
    }

    if (name === 'end_date') {
      const selectedDate = new Date(value);
      const startDate = new Date(formData.start_date);
      const maxDate = new Date(startDate);
      maxDate.setDate(maxDate.getDate() + 30);

      if (selectedDate < startDate) {
        setError('End date cannot be before start date');
        return;
      }

      if (selectedDate > maxDate) {
        setError('Maximum booking duration is 30 days');
        return;
      }
    }

    // Time validation
    if (name === 'pickup_time' && formData.start_date === formData.end_date) {
      const dropoffTime = formData.dropoff_time;
      if (dropoffTime && value >= dropoffTime) {
        setError('Pickup time must be before drop-off time on same day bookings');
        return;
      }
    }

    if (name === 'dropoff_time' && formData.start_date === formData.end_date) {
      const pickupTime = formData.pickup_time;
      if (pickupTime && value <= pickupTime) {
        setError('Drop-off time must be after pickup time on same day bookings');
        return;
      }
    }

    // Amount validation
    if (name === 'booking_amount' || name === 'security_deposit_amount') {
      const amount = parseFloat(value);
      if (amount < 0) {
        setError('Amount cannot be negative');
        return;
      }
    }

    if (name === 'paid_amount') {
      const amount = parseFloat(value);
      const totalAmount = parseFloat(formData.total_amount);
      
      if (amount < 0) {
        setError('Paid amount cannot be negative');
        return;
      }

      if (amount > totalAmount) {
        setError('Paid amount cannot exceed total amount');
        return;
      }

      // Update payment status based on paid amount
      if (amount === 0) {
        setFormData(prev => ({ ...prev, payment_status: 'pending' }));
      } else if (amount === totalAmount) {
        setFormData(prev => ({ ...prev, payment_status: 'full' }));
      } else if (amount > 0 && amount < totalAmount) {
        setFormData(prev => ({ ...prev, payment_status: 'partial' }));
      }
    }

    // Handle nested object updates
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      if (parent === 'vehicle_details') {
        setFormData(prev => ({
          ...prev,
          vehicle_details: {
            ...prev.vehicle_details,
            [child]: value
          }
        }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleDocumentUpload = (type: DocumentType, url: string) => {
    setFormData(prev => ({
      ...prev,
      documents: {
        ...prev.documents,
        [type]: url
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();

      // Validate required fields
      if (!formData.customer_name || !formData.customer_contact || !formData.customer_email ||
          !formData.emergency_contact_name || !formData.emergency_contact_phone ||
          !formData.aadhar_number || !formData.date_of_birth ||
          !formData.dl_number || !formData.dl_expiry_date ||
          !formData.temp_address || !formData.perm_address) {
        throw new Error('Please fill in all required customer fields');
      }

      // Validate fields required for booking
      if (!formData.vehicle_details.model || !formData.vehicle_details.registration ||
          !formData.start_date || !formData.end_date ||
          !formData.pickup_time || !formData.dropoff_time ||
          !formData.booking_amount || !formData.security_deposit_amount) {
        throw new Error('Please fill in all required booking fields');
      }

      // Additional date validations
      const dob = new Date(formData.date_of_birth);
      const today = new Date();
      if (dob > today) {
        throw new Error('Date of birth cannot be in the future');
      }

      const dlExpiry = new Date(formData.dl_expiry_date);
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      if (dlExpiry < oneMonthAgo) {
        throw new Error('Driving license should not be expired for more than a month');
      }

      // Payment validations
      const totalAmount = parseFloat(formData.total_amount);
      const paidAmount = parseFloat(formData.paid_amount);

      if (formData.payment_status === 'full' && paidAmount !== totalAmount) {
        throw new Error('Paid amount must equal total amount for full payment');
      }

      if (formData.payment_status === 'partial' && paidAmount >= totalAmount) {
        throw new Error('Paid amount must be less than total amount for partial payment');
      }

      if (paidAmount < 0) {
        throw new Error('Paid amount cannot be negative');
      }

      // Update the customer information
      const { error: customerUpdateError } = await supabase
        .from('customers')
        .update({
          name: formData.customer_name,
          email: formData.customer_email,
          phone: formData.customer_contact,
          emergency_contact_name: formData.emergency_contact_name,
          emergency_contact_phone: formData.emergency_contact_phone,
          emergency_contact_relationship: 'emergency',
          date_of_birth: formData.date_of_birth,
          aadhar_number: formData.aadhar_number,
          dl_number: formData.dl_number,
          dl_expiry_date: formData.dl_expiry_date,
          temp_address: formData.temp_address,
          perm_address: formData.perm_address,
          documents: formData.documents
        })
        .eq('id', booking.customer_id);

      if (customerUpdateError) {
        console.error('Customer update error:', customerUpdateError);
        throw new Error(`Failed to update customer: ${customerUpdateError.message}`);
      }

      // Get the current user's email to use in the notification
      const { data: { user } } = await supabase.auth.getUser();
      
      // Update the booking
      const { data: updatedBooking, error: bookingError } = await supabase
        .from('bookings')
        .update({
          customer_name: formData.customer_name,
          customer_contact: formData.customer_contact,
          customer_email: formData.customer_email,
          emergency_contact_name: formData.emergency_contact_name,
          emergency_contact_phone: formData.emergency_contact_phone,
          aadhar_number: formData.aadhar_number,
          date_of_birth: formData.date_of_birth,
          dl_number: formData.dl_number,
          dl_expiry_date: formData.dl_expiry_date,
          temp_address: formData.temp_address,
          perm_address: formData.perm_address,
          vehicle_details: formData.vehicle_details,
          start_date: formData.start_date,
          end_date: formData.end_date,
          pickup_time: formData.pickup_time,
          dropoff_time: formData.dropoff_time,
          booking_amount: parseFloat(formData.booking_amount),
          security_deposit_amount: parseFloat(formData.security_deposit_amount),
          payment_status: formData.payment_status,
          paid_amount: parseFloat(formData.paid_amount),
          payment_mode: formData.payment_mode,
          status: formData.status,
          updated_by: user?.id
        })
        .eq('id', booking.id)
        .select()
        .single();

      if (bookingError) {
        console.error('Booking update error:', bookingError);
        throw new Error(`Failed to update booking: ${bookingError.message}`);
      }

      // Send notification to admin users about the updated booking
      await notifyBookingEvent(
        'BOOKING_UPDATED',
        booking.id,
        {
          customerName: formData.customer_name,
          bookingId: booking.booking_id,
          actionBy: user?.id || 'Unknown',
          vehicleInfo: `${formData.vehicle_details.model} (${formData.vehicle_details.registration})`
        }
      );

      toast.success('Booking updated successfully!');
      onBookingUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating booking:', error);
      setError(error instanceof Error ? error.message : 'Failed to update booking');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Edit Booking: {booking.booking_id}
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

          {/* Customer Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Customer Contact *
              </label>
              <input
                type="tel"
                name="customer_contact"
                required
                value={formData.customer_contact}
                onChange={handleInputChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Customer Email *
              </label>
              <input
                type="email"
                name="customer_email"
                required
                value={formData.customer_email}
                onChange={handleInputChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          {/* Customer Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Customer Name *
              </label>
              <input
                type="text"
                name="customer_name"
                required
                value={formData.customer_name}
                onChange={handleInputChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Emergency Contact Name *
              </label>
              <input
                type="text"
                name="emergency_contact_name"
                required
                value={formData.emergency_contact_name}
                onChange={handleInputChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Emergency Contact Phone *
              </label>
              <input
                type="tel"
                name="emergency_contact_phone"
                required
                value={formData.emergency_contact_phone}
                onChange={handleInputChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          {/* Personal Documents */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Aadhar Number *
              </label>
              <input
                type="text"
                name="aadhar_number"
                required
                value={formData.aadhar_number}
                onChange={handleInputChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Date of Birth *
              </label>
              <input
                type="date"
                name="date_of_birth"
                required
                max={maxDOB}
                value={formData.date_of_birth}
                onChange={handleInputChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          {/* Driving License */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Driving License Number *
              </label>
              <input
                type="text"
                name="dl_number"
                required
                value={formData.dl_number}
                onChange={handleInputChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                DL Expiry Date *
              </label>
              <input
                type="date"
                name="dl_expiry_date"
                required
                min={minDLExpiry}
                value={formData.dl_expiry_date}
                onChange={handleInputChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          {/* Address Information */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Temporary Address *
              </label>
              <textarea
                name="temp_address"
                required
                value={formData.temp_address}
                onChange={handleInputChange}
                rows={2}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Permanent Address *
              </label>
              <textarea
                name="perm_address"
                required
                value={formData.perm_address}
                onChange={handleInputChange}
                rows={2}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          {/* Vehicle Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Vehicle Model *
              </label>
              <input
                type="text"
                name="vehicle_details.model"
                required
                value={formData.vehicle_details.model}
                onChange={handleInputChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Registration Number *
              </label>
              <input
                type="text"
                name="vehicle_details.registration"
                required
                value={formData.vehicle_details.registration}
                onChange={handleInputChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          {/* Booking Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Start Date *
              </label>
              <input
                type="date"
                name="start_date"
                required
                min={today}
                max={maxStartDate}
                value={formData.start_date}
                onChange={handleInputChange}
                disabled={booking.status === 'in_use' || booking.status === 'completed'}
                className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                  booking.status === 'in_use' || booking.status === 'completed' ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                End Date *
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
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Pickup Time *
              </label>
              <select
                name="pickup_time"
                required
                value={formData.pickup_time}
                onChange={handleInputChange}
                disabled={booking.status === 'in_use' || booking.status === 'completed'}
                className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                  booking.status === 'in_use' || booking.status === 'completed' ? 'opacity-50 cursor-not-allowed' : ''
                }`}
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
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Drop-off Time *
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
          </div>

          {/* Payment Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Booking Amount *
              </label>
              <CurrencyInput
                name="booking_amount"
                required
                value={formData.booking_amount}
                onChange={handleInputChange}
                error={error?.includes('booking_amount')}
                helperText={error?.includes('booking_amount') ? error : undefined}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Security Deposit Amount *
              </label>
              <CurrencyInput
                name="security_deposit_amount"
                required
                value={formData.security_deposit_amount}
                onChange={handleInputChange}
                error={error?.includes('security_deposit')}
                helperText={error?.includes('security_deposit') ? error : undefined}
              />
            </div>
          </div>

          {/* Total Amount and Payment Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Total Amount
              </label>
              <CurrencyInput
                name="total_amount"
                readOnly
                value={formData.total_amount}
                className="bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Payment Status *
              </label>
              <select
                name="payment_status"
                required
                value={formData.payment_status}
                onChange={handleInputChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="pending">Pending</option>
                <option value="partial">Partial Payment</option>
                <option value="full">Full Payment</option>
              </select>
            </div>
          </div>

          {/* Paid Amount and Payment Mode */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Paid Amount
              </label>
              <CurrencyInput
                name="paid_amount"
                value={formData.paid_amount}
                onChange={handleInputChange}
                error={error?.includes('paid_amount')}
                helperText={error?.includes('paid_amount') ? error : undefined}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Payment Mode
              </label>
              <select
                name="payment_mode"
                value={formData.payment_mode}
                onChange={handleInputChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>
          </div>

          {/* Booking Status */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Booking Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="in_use">In Use</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Documents Display */}
          {booking.documents && Object.keys(booking.documents).length > 0 && (
            <div className="space-y-6 border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900">Documents</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(booking.documents).map(([type, url]) => {
                  if (!url) return null;
                  const documentType = type as DocumentType;
                  return (
                    <DocumentUpload
                      key={type}
                      customerId={formData.customer_contact}
                      documentType={documentType}
                      onUploadComplete={(url) => handleDocumentUpload(documentType, url)}
                      existingUrl={url}
                    />
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-4">
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
              {loading ? 'Updating...' : 'Update Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 