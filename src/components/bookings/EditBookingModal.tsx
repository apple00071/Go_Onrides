'use client';

import { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { CurrencyInput } from '@/components/ui/currency-input';
import { notifyBookingEvent } from '@/lib/notification';
import DocumentUpload from '@/components/documents/DocumentUpload';
import DocumentsChecklist from '@/components/documents/DocumentsChecklist';
import SignaturePadWithRotation from '@/components/signature/SignaturePadWithRotation';
import type { UploadedDocuments, SubmittedDocuments, BookingDetails as GlobalBookingDetails } from '@/types/bookings';
import { formatCurrency, formatDateForInput, formatDateForDisplay } from '@/lib/utils';

interface OutstationDetails {
  destination: string;
  estimated_kms: number;
  start_odo: number;
  end_odo: number;
}

// Extend the global BookingDetails type with additional fields specific to the edit modal
interface BookingDetails extends Omit<GlobalBookingDetails, 'signatures'> {
  signature?: string;
  uploaded_documents?: UploadedDocuments;
  submitted_documents?: SubmittedDocuments;
}

interface EditBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookingUpdated: (updatedBooking: BookingDetails) => void;
  booking: BookingDetails;
}

interface FormData {
  customer_name: string;
  customer_contact: string;
  customer_email: string;
  alternative_phone: string;
  emergency_contact_phone: string;
  emergency_contact_phone1: string;
  colleague_phone: string;
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
  rental_purpose: 'local' | 'outstation';
  outstation_details: OutstationDetails;
  signature: string;
  uploaded_documents: UploadedDocuments;
  submitted_documents: {
    passport: boolean;
    voter_id: boolean;
    original_dl: boolean;
    original_aadhar: boolean;
    other_document: boolean;
  };
}

type PaymentStatus = 'pending' | 'partial' | 'full';

// Helper function to convert 24h to 12h format
const formatTimeDisplay = (hour: number, minute: string) => {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${period}`;
};

// Generate time slots
const timeSlots = Array.from({ length: 1440 }, (_, i) => {
  const hour = Math.floor(i / 60);
  const minute = i % 60;
  const value = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  const label = formatTimeDisplay(hour, minute.toString().padStart(2, '0'));
  return { value, label };
});

const STATUS_OPTIONS = ['pending', 'confirmed', 'in_use', 'completed', 'cancelled'] as const;
const PAYMENT_STATUS_OPTIONS = ['full', 'partial', 'pending'] as const;
const PAYMENT_MODE_OPTIONS = ['cash', 'upi', 'card', 'bank_transfer'] as const;

const documentLabels: Record<string, string> = {
  customer_photo: 'Customer Photo',
  aadhar_front: 'Aadhar Card - Front',
  aadhar_back: 'Aadhar Card - Back',
  dl_front: 'Driving License - Front',
  dl_back: 'Driving License - Back'
};

export default function EditBookingModal({
  isOpen,
  onClose,
  onBookingUpdated,
  booking
}: EditBookingModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        setUserRole(profile?.role || null);
      }
    };

    fetchUserRole();
  }, []);

  // Create form data from booking
  const initialFormData = useMemo<FormData>(() => ({
    customer_name: booking?.customer_name || '',
    customer_contact: booking?.customer_contact || '',
    customer_email: booking?.customer_email || '',
    alternative_phone: booking?.alternative_phone || '',
    emergency_contact_phone: booking?.emergency_contact_phone || '',
    emergency_contact_phone1: booking?.emergency_contact_phone1 || '',
    colleague_phone: booking?.colleague_phone || '',
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
    rental_purpose: booking?.rental_purpose || 'local',
    outstation_details: booking?.outstation_details || {
      destination: '',
      estimated_kms: 0,
      start_odo: 0,
      end_odo: 0
    },
    signature: booking?.signature || '',
    uploaded_documents: booking?.uploaded_documents || {},
    submitted_documents: booking?.submitted_documents || {
      original_aadhar: false,
      original_dl: false,
      passport: false,
      voter_id: false,
      other_document: false
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
    
    // Handle amount fields - remove leading zeros and validate
    if (name === 'booking_amount' || name === 'security_deposit_amount' || name === 'paid_amount') {
      // Remove leading zeros but keep single zero
      const cleanValue = value.replace(/^0+(?=\d)/, '');
      
      // Validate if it's a valid number
      if (cleanValue === '' || /^\d*\.?\d*$/.test(cleanValue)) {
        const numValue = cleanValue === '' ? 0 : parseFloat(cleanValue);
        
        if (numValue < 0) {
          setError('Amount cannot be negative');
          return;
        }

        if (name === 'paid_amount') {
          const totalAmount = parseFloat(formData.total_amount);
          if (numValue > totalAmount) {
            setError('Paid amount cannot exceed total amount');
            return;
          }

          // Update payment status based on paid amount
          let newPaymentStatus: PaymentStatus = 'pending';
          if (numValue === 0) {
            newPaymentStatus = 'pending';
          } else if (numValue === totalAmount) {
            newPaymentStatus = 'full';
          } else if (numValue > 0 && numValue < totalAmount) {
            newPaymentStatus = 'partial';
          }

          setFormData(prev => ({ 
            ...prev, 
            [name]: cleanValue,
            payment_status: newPaymentStatus
          }));
          return;
        }

        setFormData(prev => ({ ...prev, [name]: cleanValue }));
        return;
      }
      return;
    }
    
    // Date validation
    if (name === 'date_of_birth') {
      const selectedDate = new Date(value);
      const minAge = new Date();
      minAge.setFullYear(minAge.getFullYear() - 18);
      
      if (selectedDate > minAge) {
        setError('Customer must be at least 18 years old');
        return;
      }
      setFormData(prev => ({
        ...prev,
        [name]: formatDateForInput(selectedDate)
      }));
      return;
    }

    if (name === 'dl_expiry_date') {
      const selectedDate = new Date(value);
      const today = new Date();
      
      if (selectedDate < today) {
        setError('Driving license cannot be expired');
        return;
      }
      setFormData(prev => ({
        ...prev,
        [name]: formatDateForInput(selectedDate)
      }));
      return;
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
          start_date: formatDateForInput(selectedDate),
          end_date: formatDateForInput(selectedDate)
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          start_date: formatDateForInput(selectedDate)
        }));
      }
      return;
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

      setFormData(prev => ({
        ...prev,
        end_date: formatDateForInput(selectedDate)
      }));
      return;
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
      } else if (parent === 'outstation_details') {
        setFormData(prev => ({
          ...prev,
          outstation_details: {
            ...prev.outstation_details,
            [child]: value
          }
        }));
      }
    } else {
      // Handle rental purpose change
      if (name === 'rental_purpose') {
        if (value !== 'local' && value !== 'outstation') {
          setError('Invalid rental purpose value');
          return;
        }
        setFormData(prev => ({
          ...prev,
          rental_purpose: value,
          outstation_details: value === 'local' ? {
            destination: '',
            estimated_kms: 0,
            start_odo: 0,
            end_odo: 0
          } : prev.outstation_details
        }));
      } else {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Handle empty input
    if (value === '') {
      setFormData(prev => ({ ...prev, [name]: '0' }));
      return;
    }

    // Remove any non-numeric characters except decimal point
    const sanitizedValue = value.replace(/[^\d.]/g, '');
    
    // Handle decimal values
    if (sanitizedValue.includes('.')) {
      const [whole, decimal] = sanitizedValue.split('.');
      // Remove leading zeros from whole number part, but keep single zero
      const formattedWhole = whole.replace(/^0+/, '') || '0';
      const formattedValue = decimal ? `${formattedWhole}.${decimal}` : formattedWhole;
      
      if (/^\d*\.?\d*$/.test(formattedValue)) {
        const numValue = parseFloat(formattedValue);
        
        if (name === 'paid_amount') {
          const totalAmount = parseFloat(formData.total_amount);
          
          if (numValue > totalAmount) {
            setError('Paid amount cannot exceed total amount');
            return;
          }

          // Update payment status based on paid amount
          let newPaymentStatus: PaymentStatus = 'pending';
          if (numValue === 0) {
            newPaymentStatus = 'pending';
          } else if (numValue === totalAmount) {
            newPaymentStatus = 'full';
          } else if (numValue > 0 && numValue < totalAmount) {
            newPaymentStatus = 'partial';
          }

          setFormData(prev => ({
            ...prev,
            [name]: formattedValue,
            payment_status: newPaymentStatus
          }));
        } else {
          setFormData(prev => ({ ...prev, [name]: formattedValue }));
        }
      }
    } else {
      // Handle non-decimal values
      const formattedValue = sanitizedValue.replace(/^0+/, '') || '0';
      if (/^\d+$/.test(formattedValue)) {
        setFormData(prev => ({ ...prev, [name]: formattedValue }));
      }
    }
  };

  const handleDocumentsChange = (documents: UploadedDocuments) => {
    setFormData(prev => ({
      ...prev,
      uploaded_documents: documents
    }));
  };

  const handleSubmittedDocumentsChange = (documents: SubmittedDocuments) => {
    setFormData(prev => ({
      ...prev,
      submitted_documents: documents
    }));
  };

  const handleUppercaseInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      if (name === 'vehicle_details.registration') {
        return {
          ...prev,
          vehicle_details: {
            ...prev.vehicle_details,
            registration: value.toUpperCase()
          }
        };
      }
      return {
        ...prev,
        [name]: value.toUpperCase()
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if user has admin role
    if (userRole !== 'admin') {
      setError('Unauthorized - Only administrators can modify bookings');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();

      // Prepare update data
      const updateData = {
        customer_name: formData.customer_name,
        customer_contact: formData.customer_contact,
        customer_email: formData.customer_email,
        alternative_phone: formData.alternative_phone,
        emergency_contact_phone: formData.emergency_contact_phone,
        emergency_contact_phone1: formData.emergency_contact_phone1,
        colleague_phone: formData.colleague_phone,
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
        total_amount: parseFloat(formData.total_amount),
        paid_amount: parseFloat(formData.paid_amount),
        payment_status: formData.payment_status,
        payment_mode: formData.payment_mode,
        status: formData.status,
        rental_purpose: formData.rental_purpose,
        outstation_details: formData.outstation_details,
        signature: formData.signature,
        uploaded_documents: formData.uploaded_documents,
        submitted_documents: formData.submitted_documents,
        updated_at: new Date().toISOString(),
        updated_by: user?.id
      };

      // Update booking in database
      const { data: updatedBooking, error: updateError } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', booking.id)
        .select()
        .single();

      if (updateError) throw updateError;
      if (!updatedBooking) throw new Error('Failed to update booking');

      // Send notification about the booking update
      if (booking.status !== updatedBooking.status) {
        await notifyBookingEvent(
          'BOOKING_UPDATED',
          booking.id,
          {
            customerName: formData.customer_name,
            bookingId: booking.booking_id,
            actionBy: user?.id || 'Unknown',
            vehicleInfo: `${formData.vehicle_details.model} (${formData.vehicle_details.registration})`,
            oldStatus: booking.status,
            newStatus: updatedBooking.status
          }
        );
      }

      toast.success('Booking updated successfully!');
      onBookingUpdated(updatedBooking);
      onClose();
    } catch (error) {
      console.error('Error updating booking:', error);
      setError('Failed to update booking');
      toast.error('Failed to update booking');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 ${isOpen ? '' : 'hidden'}`}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 w-full max-w-4xl bg-white shadow-xl">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-lg font-semibold">Edit Booking</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Customer Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Customer Information</h3>
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
                      inputMode="numeric"
                      pattern="[0-9]*"
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
                      inputMode="text"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Alternative Phone
                    </label>
                    <input
                      type="tel"
                      name="alternative_phone"
                      value={formData.alternative_phone}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      inputMode="numeric"
                      pattern="[0-9]*"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Father Phone Number *
                    </label>
                    <input
                      type="tel"
                      name="emergency_contact_phone"
                      required
                      value={formData.emergency_contact_phone}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      inputMode="numeric"
                      pattern="[0-9]*"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Brother/Friend Phone Number
                    </label>
                    <input
                      type="tel"
                      name="emergency_contact_phone1"
                      value={formData.emergency_contact_phone1}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      inputMode="numeric"
                      pattern="[0-9]*"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Colleague/Relative Phone Number
                    </label>
                    <input
                      type="tel"
                      name="colleague_phone"
                      value={formData.colleague_phone}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      inputMode="numeric"
                      pattern="[0-9]*"
                    />
                  </div>
                </div>

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
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={12}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      name="date_of_birth"
                      max={maxDOB}
                      value={formData.date_of_birth}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    <div className="mt-1 text-sm text-gray-500">
                      Selected: {formData.date_of_birth ? formatDateForDisplay(formData.date_of_birth) : 'Not selected'}
                    </div>
                  </div>
                </div>

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
                      onChange={handleUppercaseInput}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      style={{ textTransform: 'uppercase' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      DL Expiry Date
                    </label>
                    <input
                      type="date"
                      name="dl_expiry_date"
                      min={minDLExpiry}
                      value={formData.dl_expiry_date}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    <div className="mt-1 text-sm text-gray-500">
                      Selected: {formData.dl_expiry_date ? formatDateForDisplay(formData.dl_expiry_date) : 'Not selected'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Temporary Address
                    </label>
                    <textarea
                      name="temp_address"
                      value={formData.temp_address}
                      onChange={handleInputChange}
                      rows={3}
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
                      inputMode="text"
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
                      onChange={handleUppercaseInput}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      style={{ textTransform: 'uppercase' }}
                    />
                  </div>
                </div>
              </div>

              {/* Booking Details */}
              <div className="space-y-6 border-t pt-6">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Booking Details</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      name="start_date"
                      required
                      value={formData.start_date}
                      onChange={handleInputChange}
                      min={formatDateForInput(new Date())}
                      max={formatDateForInput(maxStartDate)}
                      disabled={booking.status === 'in_use' || booking.status === 'completed'}
                      className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                        booking.status === 'in_use' || booking.status === 'completed' ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    />
                    <div className="mt-1 text-sm text-gray-500">
                      Selected: {formData.start_date ? formatDateForDisplay(formData.start_date) : 'Not selected'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      End Date *
                    </label>
                    <input
                      type="date"
                      name="end_date"
                      required
                      value={formData.end_date}
                      onChange={handleInputChange}
                      min={formatDateForInput(minEndDate)}
                      max={formatDateForInput(maxEndDate)}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    <div className="mt-1 text-sm text-gray-500">
                      Selected: {formData.end_date ? formatDateForDisplay(formData.end_date) : 'Not selected'}
                    </div>
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
                      {timeSlots.map(slot => (
                        <option key={slot.value} value={slot.value}>
                          {slot.label}
                        </option>
                      ))}
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
                      {timeSlots.map(slot => (
                        <option key={slot.value} value={slot.value}>
                          {slot.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div className="space-y-6 border-t pt-6">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Payment Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Booking Amount *
                    </label>
                    <input
                      type="text"
                      name="booking_amount"
                      required
                      value={formData.booking_amount}
                      onChange={handleAmountChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      inputMode="decimal"
                      pattern="[0-9]*\.?[0-9]*"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Security Deposit Amount *
                    </label>
                    <input
                      type="text"
                      name="security_deposit_amount"
                      required
                      value={formData.security_deposit_amount}
                      onChange={handleAmountChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      inputMode="decimal"
                      pattern="[0-9]*\.?[0-9]*"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Total Amount
                      </label>
                    <CurrencyInput
                      name="total_amount"
                      readOnly
                      value={formData.total_amount}
                      onChange={() => {}}
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Paid Amount
                    </label>
                    <input
                      type="text"
                      name="paid_amount"
                      value={formData.paid_amount}
                      onChange={handleAmountChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      inputMode="decimal"
                      pattern="[0-9]*\.?[0-9]*"
                      placeholder="0"
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
              </div>

              {/* Outstation Details */}
              {formData.rental_purpose === 'outstation' && (
                <div className="space-y-6 border-t pt-6">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">Outstation Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Destination *
                      </label>
                      <input
                        type="text"
                        name="outstation_details.destination"
                        required
                        value={formData.outstation_details.destination}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Estimated KMs *
                      </label>
                      <input
                        type="number"
                        name="outstation_details.estimated_kms"
                        required
                        value={formData.outstation_details.estimated_kms}
                        onChange={handleInputChange}
                        min="0"
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Start ODO *
                      </label>
                      <input
                        type="number"
                        name="outstation_details.start_odo"
                        required
                        value={formData.outstation_details.start_odo}
                        onChange={handleInputChange}
                        min="0"
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        End ODO *
                      </label>
                      <input
                        type="number"
                        name="outstation_details.end_odo"
                        required
                        value={formData.outstation_details.end_odo}
                        onChange={handleInputChange}
                        min="0"
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Document Upload Section */}
              <div className="space-y-6 border-t pt-6">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Document Upload</h3>
                <DocumentUpload
                  bookingId={booking.id}
                  onDocumentsUploaded={handleDocumentsChange}
                  existingDocuments={formData.uploaded_documents}
                />
              </div>

              {/* Physical Documents Verification */}
              <div className="space-y-6 border-t pt-6">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Physical Documents Verification</h3>
                <DocumentsChecklist
                  documents={formData.submitted_documents || {
                    original_aadhar: false,
                    original_dl: false,
                    passport: false,
                    voter_id: false,
                    other_document: false
                  }}
                  onDocumentsChange={handleSubmittedDocumentsChange}
                />
              </div>

              {/* Signature Section */}
              <div className="space-y-6 border-t pt-6">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Signature</h3>
                <SignaturePadWithRotation
                  initialSignature={formData.signature}
                  onSignatureChange={(signature) => setFormData(prev => ({ ...prev, signature }))}
                />
              </div>

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
      </div>
    </div>
  );
} 