'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { generateBookingId, formatCurrency } from '@/lib/utils';
import SignaturePad from 'react-signature-canvas';
import type SignaturePadType from 'react-signature-canvas';
import { ArrowLeft, Download } from 'lucide-react';
import Link from 'next/link';
import DocumentUpload from '@/components/documents/DocumentUpload';
import DocumentsChecklist from '@/components/documents/DocumentsChecklist';
import SignaturePadWithRotation from '@/components/signature/SignaturePadWithRotation';
import type { UploadedDocuments, SubmittedDocuments } from '@/types/bookings';
import { type FormEvent } from 'react';
import { RefreshCw, Upload, Camera, X } from 'lucide-react';
import { notifyBookingEvent } from '@/lib/notification';
import { generateInvoice } from '@/lib/generateInvoice';

interface BookingFormData {
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
  total_amount: number;
  paid_amount: number;
  payment_mode: 'cash' | 'upi' | 'card' | 'bank_transfer';
  payment_status: 'full' | 'partial' | 'pending';
  rental_purpose: 'local' | 'outstation';
  outstation_details: {
    destination: string;
    estimated_kms: number;
    start_odo: number;
  } | null;
  signature?: string;
  terms_accepted: boolean;
  model: string;
  destination: string;
  uploaded_documents?: UploadedDocuments;
  submitted_documents?: SubmittedDocuments;
}

// Add interface for booking data
interface BookingData {
  booking_id: string;
  customer_id: string;
  customer_name: string;
  customer_contact: string;
  customer_email: string;
  emergency_contact_phone: string;
  emergency_contact_phone1: string;
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
  total_amount: number;
  payment_status: 'full' | 'partial' | 'pending';
  paid_amount: number;
  payment_mode: 'cash' | 'upi' | 'card' | 'bank_transfer';
  rental_purpose: 'local' | 'outstation';
  created_at: string;
  created_by: string | undefined;
  status: 'pending' | 'confirmed' | 'in_use' | 'completed' | 'cancelled';
  submitted_documents?: SubmittedDocuments;
  outstation_details?: {
    destination: string;
    estimated_kms: number;
    start_odo: number;
  } | null;
}

interface OutstationDetails {
  destination: string;
  estimated_kms: number;
  start_odo: number;
}

export default function NewBookingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExistingCustomer, setIsExistingCustomer] = useState(false);
  const [signaturePad, setSignaturePad] = useState<SignaturePadType | null>(null);
  const [debouncedAadhar, setDebouncedAadhar] = useState('');
  const [tempBookingId, setTempBookingId] = useState<string>('');
  const [bookingCreated, setBookingCreated] = useState(false);
  const [createdBookingData, setCreatedBookingData] = useState<{ id: string; bookingId: string; invoicePdfBlob?: Blob } | null>(null);
  const [userData, setUserData] = useState<{ id: string } | null>(null);
  const supabase = getSupabaseClient();

  const initialFormData: BookingFormData = {
    customer_name: '',
    customer_contact: '',
    customer_email: '',
    alternative_phone: '',
    emergency_contact_phone: '',
    emergency_contact_phone1: '',
    colleague_phone: '',
    aadhar_number: '',
    date_of_birth: '',
    dl_number: '',
    dl_expiry_date: '',
    temp_address: '',
    perm_address: '',
    vehicle_details: {
      model: '',
      registration: ''
    },
    start_date: '',
    end_date: '',
    pickup_time: '',
    dropoff_time: '',
    booking_amount: 0,
    security_deposit_amount: 0,
    total_amount: 0,
    paid_amount: 0,
    payment_mode: 'cash',
    payment_status: 'pending',
    rental_purpose: 'local',
    outstation_details: {
      destination: '',
      estimated_kms: 0,
      start_odo: 0
    },
    signature: '',
    terms_accepted: false,
    model: '',
    destination: '',
    uploaded_documents: {},
    submitted_documents: {
      original_aadhar: false,
      original_dl: false,
      passport: false,
      voter_id: false,
      other_document: ''
    }
  };

  const [formData, setFormData] = useState<BookingFormData>(initialFormData);

  const getCurrentTime = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    return `${hours.toString().padStart(2, '0')}:${minutes < 30 ? '30' : '00'}`;
  };

  const isTimeInPast = (time: string) => {
    if (!time) return false;
    const today = new Date().toISOString().split('T')[0];
    if (formData.start_date !== today) return false;
    const currentTime = getCurrentTime();
    return time <= currentTime;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
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
          const totalAmount = formData.total_amount;
          if (numValue > totalAmount) {
            setError('Paid amount cannot exceed total amount');
            return;
          }

          // Update payment status based on paid amount
          let newPaymentStatus: 'pending' | 'partial' | 'full' = 'pending';
          if (numValue === 0) {
            newPaymentStatus = 'pending';
          } else if (numValue === totalAmount) {
            newPaymentStatus = 'full';
          } else if (numValue > 0 && numValue < totalAmount) {
            newPaymentStatus = 'partial';
          }

          setFormData(prev => ({ 
            ...prev, 
            [name]: numValue,
            payment_status: newPaymentStatus
          }));
          return;
        }

        setFormData(prev => ({ ...prev, [name]: numValue }));
        return;
      }
      return;
    }
    
    if (name === 'aadhar_number') {
      setFormData(prev => ({ ...prev, [name]: value }));
      
      if (value.length === 12) {
        setDebouncedAadhar(value);
      }
      return;
    }

    if (name === 'rental_purpose') {
      setFormData(prev => ({
        ...prev,
        rental_purpose: value as 'local' | 'outstation',
        outstation_details: value === 'outstation' ? {
          destination: '',
          estimated_kms: 0,
          start_odo: 0
        } : null
      }));
      return;
    }

    if (name.startsWith('outstation_details.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        outstation_details: prev.outstation_details ? {
          ...prev.outstation_details,
          [field]: field === 'destination' ? value : Number(value)
        } : null
      }));
      return;
    }

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
      setFormData(prev => ({
        ...prev,
        [name]: name.includes('amount') ? Number(value) : value
      }));
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Handle empty input
    if (value === '') {
      setFormData(prev => ({ ...prev, [name]: 0 }));
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
          const totalAmount = formData.total_amount;
          
          if (numValue > totalAmount) {
            setError('Paid amount cannot exceed total amount');
            return;
          }

          // Update payment status based on paid amount
          let newPaymentStatus: 'pending' | 'partial' | 'full' = 'pending';
          if (numValue === 0) {
            newPaymentStatus = 'pending';
          } else if (numValue === totalAmount) {
            newPaymentStatus = 'full';
          } else if (numValue > 0 && numValue < totalAmount) {
            newPaymentStatus = 'partial';
          }

          setFormData(prev => ({
            ...prev,
            [name]: numValue,
            payment_status: newPaymentStatus
          }));
        } else {
          setFormData(prev => ({ ...prev, [name]: numValue }));
        }
      }
    } else {
      // Handle non-decimal values
      const formattedValue = sanitizedValue.replace(/^0+/, '') || '0';
      if (/^\d+$/.test(formattedValue)) {
        setFormData(prev => ({ ...prev, [name]: parseFloat(formattedValue) }));
      }
    }
  };

  useEffect(() => {
    const bookingAmt = parseFloat(formData.booking_amount.toString()) || 0;
    const securityAmt = parseFloat(formData.security_deposit_amount.toString()) || 0;
    const total = bookingAmt + securityAmt;
    setFormData(prev => ({ ...prev, total_amount: total }));
  }, [formData.booking_amount, formData.security_deposit_amount]);

  useEffect(() => {
    if (formData.payment_status === 'full') {
      setFormData(prev => ({ ...prev, paid_amount: parseFloat(formData.total_amount.toString()) || 0 }));
    } else if (formData.payment_status === 'pending') {
      setFormData(prev => ({ ...prev, paid_amount: 0 }));
    }
  }, [formData.payment_status, formData.total_amount]);

  const checkExistingCustomer = async (aadharNumber: string) => {
    if (!aadharNumber || aadharNumber.length !== 12) return;

    try {
      setLoading(true);
      setError(null);
      
      const { data: customers, error } = await supabase
        .from('customers')
        .select('*, documents')
        .eq('aadhar_number', aadharNumber)
        .limit(1);

      if (error) {
        throw error;
      }

      if (customers && customers.length > 0) {
        const customer = customers[0];
        setIsExistingCustomer(true);
        setFormData(prev => ({
          ...prev,
          customer_name: customer.name || '',
          customer_email: customer.email || '',
          customer_contact: customer.phone || '',
          alternative_phone: customer.alternative_phone || '',
          emergency_contact_phone: customer.emergency_contact_phone || '',
          emergency_contact_phone1: customer.emergency_contact_phone1 || '',
          date_of_birth: customer.dob || '',
          dl_number: customer.dl_number || '',
          dl_expiry_date: customer.dl_expiry_date || '',
          temp_address: customer.temp_address_street || '',
          perm_address: customer.perm_address_street || '',
          uploaded_documents: customer.documents || {}
        }));
        toast.success('Found existing customer - form pre-filled with details and documents');
      } else {
        setIsExistingCustomer(false);
        setFormData(prev => ({
          ...prev,
          customer_name: '',
          customer_email: '',
          customer_contact: '',
          alternative_phone: '',
          emergency_contact_phone: '',
          emergency_contact_phone1: '',
          date_of_birth: '',
          dl_number: '',
          dl_expiry_date: '',
          temp_address: '',
          perm_address: '',
          uploaded_documents: {}
        }));
      }
    } catch (error) {
      console.error('Error checking customer:', error);
      setError('Failed to check customer details. Please try again.');
      toast.error('Failed to check customer details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (debouncedAadhar) {
      timeoutId = setTimeout(() => {
        checkExistingCustomer(debouncedAadhar);
      }, 500);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [debouncedAadhar]);

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const maxDOB = useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 18);
    return date.toISOString().split('T')[0];
  }, []);
  
  const minDLExpiry = today;
  const minEndDate = formData.start_date || today;
  const maxStartDate = useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().split('T')[0];
  }, []);

  const maxEndDate = useMemo(() => {
    const date = formData.start_date ? new Date(formData.start_date) : new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  }, [formData.start_date]);

  const handleSignatureClear = () => {
    if (signaturePad) {
      signaturePad.clear();
      setFormData(prev => ({ ...prev, signature: '' }));
    }
  };

  const handleSignatureEnd = () => {
    if (signaturePad) {
      const signatureData = signaturePad.toDataURL();
      setFormData(prev => ({ ...prev, signature: signatureData }));
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (!userData) {
      setError('User session not found. Please login again.');
      setSubmitting(false);
      return;
    }

    try {
      // Validate required fields
      if (!formData.customer_name || !formData.customer_contact || !formData.aadhar_number) {
        throw new Error('Please fill in all required fields');
      }

      // Prepare customer data
      const customerData = {
        name: formData.customer_name,
        contact: formData.customer_contact,
        email: formData.customer_email || null,
        aadhar_number: formData.aadhar_number,
        date_of_birth: formData.date_of_birth || null,
        dl_number: formData.dl_number || null,
        dl_expiry_date: formData.dl_expiry_date || null,
        temp_address: formData.temp_address || null,
        perm_address: formData.perm_address,
        emergency_contact_phone: formData.emergency_contact_phone || null,
        emergency_contact_phone1: formData.emergency_contact_phone1 || null,
        colleague_phone: formData.colleague_phone || null,
        created_at: new Date().toISOString(),
        created_by: userData.id
      };

      // Check if customer exists
      let customerId: string;
      if (isExistingCustomer) {
        const { data: existingCustomer, error: fetchError } = await supabase
          .from('customers')
          .select('id')
          .eq('aadhar_number', formData.aadhar_number)
          .single();

        if (fetchError) {
          throw new Error(`Failed to fetch customer: ${fetchError.message}`);
        }
        customerId = existingCustomer.id;
      } else {
        // Insert new customer
        const { data: newCustomer, error: insertError } = await supabase
          .from('customers')
          .insert([customerData])
          .select()
          .single();

        if (insertError) {
          throw new Error(`Failed to create customer: ${insertError.message}`);
        }
        customerId = newCustomer.id;
      }

      // Create booking with the customer ID
      const { data: newBooking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          booking_id: tempBookingId,
          customer_id: customerId,
          customer_name: formData.customer_name,
          customer_contact: formData.customer_contact,
          customer_email: formData.customer_email || null,
          emergency_contact_phone: formData.emergency_contact_phone || null,
          emergency_contact_phone1: formData.emergency_contact_phone1 || null,
          aadhar_number: formData.aadhar_number,
          date_of_birth: formData.date_of_birth || null,
          dl_number: formData.dl_number || null,
          dl_expiry_date: formData.dl_expiry_date || null,
          temp_address: formData.temp_address || null,
          perm_address: formData.perm_address,
          vehicle_details: formData.vehicle_details,
          start_date: formData.start_date,
          end_date: formData.end_date,
          pickup_time: formData.pickup_time,
          dropoff_time: formData.dropoff_time,
          booking_amount: formData.booking_amount,
          security_deposit_amount: formData.security_deposit_amount,
          total_amount: formData.total_amount,
          payment_status: formData.payment_status,
          paid_amount: formData.paid_amount,
          payment_mode: formData.payment_mode,
          rental_purpose: formData.rental_purpose,
          outstation_details: formData.outstation_details,
          created_at: new Date().toISOString(),
          created_by: userData.id,
          status: 'confirmed',
          submitted_documents: formData.submitted_documents
        })
        .select()
        .single();

      if (bookingError) {
        throw new Error(`Failed to create booking: ${bookingError.message}`);
      }

      // Create payment record if paid amount is greater than zero
      if (formData.paid_amount > 0) {
        const { error: paymentError } = await supabase
          .from('payments')
          .insert({
            booking_id: newBooking.id,
            amount: formData.paid_amount,
            payment_mode: formData.payment_mode,
            payment_status: 'completed',
            created_at: new Date().toISOString(),
            created_by: userData.id
          });
          
        if (paymentError) {
          console.error('Error creating payment record:', paymentError);
          toast.error('Warning: Booking created but failed to record payment history');
        }
      }

      // Store signature if exists
      if (formData.signature && newBooking?.id) {
        const { error: signatureError } = await supabase
          .from('booking_signatures')
          .insert({
            booking_id: newBooking.id,
            signature_data: formData.signature,
          });

        if (signatureError) {
          console.error('Failed to save signature:', signatureError);
        }
      }

      // Create notification
      await notifyBookingEvent('BOOKING_CREATED', newBooking.id, {
        customerName: formData.customer_name,
        bookingId: tempBookingId,
        actionBy: userData.id || 'Unknown',
        vehicleInfo: `${formData.vehicle_details.model} (${formData.vehicle_details.registration})`
      });

      // Show success toast and redirect immediately
      toast.success('Booking created successfully!');
      router.push('/dashboard/bookings');

    } catch (error) {
      console.error('Error in form submission:', error);
      setError(error instanceof Error ? error.message : 'Failed to create booking');
      toast.error('Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  };

  // Function to handle manual invoice download
  const handleDownloadInvoice = () => {
    if (createdBookingData?.invoicePdfBlob) {
      const url = window.URL.createObjectURL(createdBookingData.invoicePdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${createdBookingData.bookingId}.pdf`);
      
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } else {
      toast.error('Invoice not available for download');
    }
  };

  // Add a helper function to convert 24h to 12h format
  const formatTimeDisplay = (time: string): string => {
    const [hourStr, minute] = time.split(':');
    const hour = parseInt(hourStr, 10);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minute} ${period}`;
  };

  const handleDocumentsUploaded = (documents: UploadedDocuments) => {
    setFormData(prev => ({
      ...prev,
      uploaded_documents: {
        ...prev.uploaded_documents,
        ...documents
      }
    }));
  };

  const handleSubmittedDocumentsChange = (documents: SubmittedDocuments) => {
    setFormData(prev => ({
      ...prev,
      submitted_documents: documents
    }));
  };

  useEffect(() => {
    // Generate a temporary booking ID when component mounts
    const generateTempId = async () => {
      const id = await generateBookingId(supabase);
      setTempBookingId(id);
    };
    generateTempId();
  }, []);

  // Add useEffect to get user data
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
          throw error;
        }
        if (user) {
          setUserData(user);
        } else {
          router.push('/login');
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        router.push('/login');
      }
    };

    getUser();
  }, [router]);

  // Add this function near the top with other handlers
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
              Create New Booking
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md mb-6">
                {error}
              </div>
            )}

            <div className="space-y-6">
              {/* Customer Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Customer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="aadhar_number" className="block text-sm font-medium text-gray-700 mb-1">
                      Aadhar Number *
                    </label>
                    <input
                      id="aadhar_number"
                      type="text"
                      name="aadhar_number"
                      required
                      value={formData.aadhar_number}
                      onChange={handleInputChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      aria-required="true"
                      maxLength={12}
                      pattern="\d{12}"
                      title="Please enter a valid 12-digit Aadhar number"
                      placeholder="Enter 12-digit Aadhar number to search"
                      inputMode="numeric"
                    />
                  </div>

                  <div>
                    <label htmlFor="customer_name" className="block text-sm font-medium text-gray-700 mb-1">
                      Customer Name *
                    </label>
                    <input
                      id="customer_name"
                      type="text"
                      name="customer_name"
                      required
                      value={formData.customer_name}
                      onChange={handleInputChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      aria-required="true"
                      inputMode="text"
                    />
                  </div>

                  <div>
                    <label htmlFor="customer_contact" className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number *
                    </label>
                    <input
                      id="customer_contact"
                      type="tel"
                      name="customer_contact"
                      required
                      value={formData.customer_contact}
                      onChange={handleInputChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      aria-required="true"
                      maxLength={10}
                      pattern="\d{10}"
                      title="Please enter a valid 10-digit phone number"
                      inputMode="numeric"
                    />
                  </div>

                  <div>
                    <label htmlFor="customer_email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      id="customer_email"
                      type="email"
                      name="customer_email"
                      value={formData.customer_email}
                      onChange={handleInputChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="alternative_phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Alternative Phone
                    </label>
                    <input
                      id="alternative_phone"
                      type="tel"
                      name="alternative_phone"
                      value={formData.alternative_phone}
                      onChange={handleInputChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      maxLength={10}
                      pattern="\d{10}"
                      title="Please enter a valid 10-digit phone number"
                      inputMode="numeric"
                    />
                  </div>

                  <div>
                    <label htmlFor="emergency_contact_phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Father Phone Number *
                    </label>
                    <input
                      id="emergency_contact_phone"
                      type="tel"
                      name="emergency_contact_phone"
                      required
                      value={formData.emergency_contact_phone}
                      onChange={handleInputChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      aria-required="true"
                      maxLength={10}
                      pattern="\d{10}"
                      title="Please enter a valid 10-digit phone number"
                      inputMode="numeric"
                    />
                  </div>

                  <div>
                    <label htmlFor="emergency_contact_phone1" className="block text-sm font-medium text-gray-700 mb-1">
                      Brother/Friend Phone Number
                    </label>
                    <input
                      id="emergency_contact_phone1"
                      type="tel"
                      name="emergency_contact_phone1"
                      value={formData.emergency_contact_phone1}
                      onChange={handleInputChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      maxLength={10}
                      pattern="\d{10}"
                      title="Please enter a valid 10-digit phone number"
                      inputMode="numeric"
                    />
                  </div>

                  <div>
                    <label htmlFor="colleague_phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Colleague/Relative Phone Number
                    </label>
                    <input
                      id="colleague_phone"
                      type="tel"
                      name="colleague_phone"
                      value={formData.colleague_phone}
                      onChange={handleInputChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      maxLength={10}
                      pattern="\d{10}"
                      title="Please enter a valid 10-digit phone number"
                      inputMode="numeric"
                    />
                  </div>

                  <div>
                    <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700 mb-1">
                      Date of Birth
                    </label>
                    <input
                      id="date_of_birth"
                      type="date"
                      name="date_of_birth"
                      max={maxDOB}
                      value={formData.date_of_birth}
                      onChange={handleInputChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="dl_number" className="block text-sm font-medium text-gray-700 mb-1">
                      Driving License Number *
                    </label>
                    <input
                      id="dl_number"
                      type="text"
                      name="dl_number"
                      required
                      value={formData.dl_number}
                      onChange={handleUppercaseInput}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      aria-required="true"
                      style={{ textTransform: 'uppercase' }}
                    />
                  </div>

                  <div>
                    <label htmlFor="dl_expiry_date" className="block text-sm font-medium text-gray-700 mb-1">
                      DL Expiry Date
                    </label>
                    <input
                      id="dl_expiry_date"
                      type="date"
                      name="dl_expiry_date"
                      min={minDLExpiry}
                      value={formData.dl_expiry_date}
                      onChange={handleInputChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="temp_address" className="block text-sm font-medium text-gray-700 mb-1">
                      Temporary Address
                    </label>
                    <textarea
                      id="temp_address"
                      name="temp_address"
                      value={formData.temp_address}
                      onChange={handleInputChange}
                      rows={3}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="perm_address" className="block text-sm font-medium text-gray-700 mb-1">
                      Permanent Address *
                    </label>
                    <textarea
                      id="perm_address"
                      name="perm_address"
                      required
                      value={formData.perm_address}
                      onChange={handleInputChange}
                      rows={2}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      aria-required="true"
                    />
                  </div>
                </div>
              </div>

              {/* Vehicle Details */}
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Vehicle Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="vehicle_model" className="block text-sm font-medium text-gray-700 mb-1">
                      Vehicle Model *
                    </label>
                    <input
                      id="vehicle_model"
                      type="text"
                      name="vehicle_details.model"
                      required
                      value={formData.vehicle_details.model}
                      onChange={handleInputChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      aria-required="true"
                      inputMode="text"
                    />
                  </div>
                  <div>
                    <label htmlFor="vehicle_registration" className="block text-sm font-medium text-gray-700 mb-1">
                      Registration Number *
                    </label>
                    <input
                      id="vehicle_registration"
                      type="text"
                      name="vehicle_details.registration"
                      required
                      value={formData.vehicle_details.registration}
                      onChange={handleUppercaseInput}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      aria-required="true"
                      style={{ textTransform: 'uppercase' }}
                    />
                  </div>
                </div>
              </div>

              {/* Rental Purpose and Outstation Details */}
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Rental Details</h3>
                <div>
                  <label htmlFor="rental_purpose" className="block text-sm font-medium text-gray-700">
                    Purpose of Rent
                  </label>
                  <select
                    id="rental_purpose"
                    name="rental_purpose"
                    value={formData.rental_purpose}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  >
                    <option value="local">Local</option>
                    <option value="outstation">Outstation</option>
                  </select>
                </div>

                {formData.rental_purpose === 'outstation' && (
                  <div className="space-y-6 border-t pt-6">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">Outstation Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="outstation_details.destination" className="block text-sm font-medium text-gray-700">
                          Destination *
                        </label>
                        <input
                          type="text"
                          id="outstation_details.destination"
                          name="outstation_details.destination"
                          required
                          value={formData.outstation_details?.destination || ''}
                          onChange={handleInputChange}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label htmlFor="outstation_details.estimated_kms" className="block text-sm font-medium text-gray-700">
                          Estimated Kilometers *
                        </label>
                        <input
                          type="number"
                          id="outstation_details.estimated_kms"
                          name="outstation_details.estimated_kms"
                          required
                          min="0"
                          value={formData.outstation_details?.estimated_kms || ''}
                          onChange={handleInputChange}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label htmlFor="outstation_details.start_odo" className="block text-sm font-medium text-gray-700">
                          Start Odometer *
                        </label>
                        <input
                          type="number"
                          id="outstation_details.start_odo"
                          name="outstation_details.start_odo"
                          required
                          min="0"
                          value={formData.outstation_details?.start_odo || ''}
                          onChange={handleInputChange}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Booking Details */}
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Booking Details</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date *
                    </label>
                    <input
                      id="start_date"
                      type="date"
                      name="start_date"
                      required
                      min={today}
                      max={maxStartDate}
                      value={formData.start_date}
                      onChange={handleInputChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      aria-required="true"
                    />
                  </div>
                  <div>
                    <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">
                      End Date *
                    </label>
                    <input
                      id="end_date"
                      type="date"
                      name="end_date"
                      required
                      min={minEndDate}
                      max={maxEndDate}
                      value={formData.end_date}
                      onChange={handleInputChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      aria-required="true"
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
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="">Select time</option>
                      {Array.from({ length: 1440 }, (_, i) => {
                        const hour = Math.floor(i / 60);
                        const minute = i % 60;
                        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                        // Only show future times
                        if (!isTimeInPast(time)) {
                          return (
                            <option key={time} value={time}>
                              {formatTimeDisplay(time)}
                            </option>
                          );
                        }
                        return null;
                      }).filter(Boolean)}
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
                      {Array.from({ length: 1440 }, (_, i) => {
                        const hour = Math.floor(i / 60);
                        const minute = i % 60;
                        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                        // Only show future times
                        if (!isTimeInPast(time)) {
                          return (
                            <option key={time} value={time}>
                              {formatTimeDisplay(time)}
                            </option>
                          );
                        }
                        return null;
                      }).filter(Boolean)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Payment Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="booking_amount" className="block text-sm font-medium text-gray-700 mb-1">
                      Booking Amount *
                    </label>
                    <input
                      id="booking_amount"
                      type="text"
                      name="booking_amount"
                      required
                      value={formData.booking_amount}
                      onChange={handleAmountChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      aria-required="true"
                      inputMode="decimal"
                      pattern="[0-9]*\.?[0-9]*"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label htmlFor="security_deposit" className="block text-sm font-medium text-gray-700 mb-1">
                      Security Deposit Amount *
                    </label>
                    <input
                      id="security_deposit"
                      type="text"
                      name="security_deposit_amount"
                      required
                      value={formData.security_deposit_amount}
                      onChange={handleAmountChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      aria-required="true"
                      inputMode="decimal"
                      pattern="[0-9]*\.?[0-9]*"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label htmlFor="total_amount" className="block text-sm font-medium text-gray-700 mb-1">
                      Total Amount
                    </label>
                    <input
                      id="total_amount"
                      type="number"
                      name="total_amount"
                      value={formData.total_amount}
                      readOnly
                      className="block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="payment_status" className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Status *
                    </label>
                    <select
                      id="payment_status"
                      name="payment_status"
                      required
                      value={formData.payment_status}
                      onChange={handleInputChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      aria-required="true"
                    >
                      <option value="pending">Pending</option>
                      <option value="partial">Partial Payment</option>
                      <option value="full">Full Payment</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="paid_amount" className="block text-sm font-medium text-gray-700 mb-1">
                      Paid Amount
                    </label>
                    <input
                      id="paid_amount"
                      type="number"
                      name="paid_amount"
                      value={formData.paid_amount}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="payment_mode" className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Mode
                    </label>
                    <select
                      id="payment_mode"
                      name="payment_mode"
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
              </div>

              {/* Documents Section */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Documents</h3>
                {tempBookingId && (
                  <DocumentUpload
                    bookingId={tempBookingId}
                    onDocumentsUploaded={handleDocumentsUploaded}
                    existingDocuments={formData.uploaded_documents}
                  />
                )}
              </div>

              {/* Physical Documents Checklist */}
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Physical Documents Verification</h3>
                <DocumentsChecklist
                  documents={formData.submitted_documents as SubmittedDocuments}
                  onDocumentsChange={handleSubmittedDocumentsChange}
                />
              </div>

              {/* Terms and Conditions */}
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Terms and Conditions</h3>
                <div className="bg-gray-50 p-4 rounded-md text-sm text-gray-700 mb-4">
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Day implies 24 hours. A maximum of a 1-hour grace period is accepted on 1 day prior intimation.</li>
                    <li>The vehicle should be given back with the same amount of fuel available while taking the vehicle, and if in case fuel is not topped up fuel charges + 10% fuel charges are levied.</li>
                    <li>The vehicle shall be collected and dropped off at our garage. Vehicle pickup/drop-off charges shall be Rs.300 each way in case pickup/drop-off of the vehicle at your location is required. (Subject to the availability of drivers.)</li>
                    <li>Any accident/damages shall be the client cost and shall be charged at actuals. The decision of GO-ON RIDERS.</li>
                    <li>Any maintenance charges accrued due to misuse of the vehicle shall be to the client's account.</li>
                    <li>Routine maintenance is to GO-ON RIDERS account.</li>
                    <li>The vehicle shall not be used for motor sports or any such activity that may impair the long term performance and condition of the vehicle.</li>
                    <li>The minimum age of the renter shall be 21 years, and he/she shall possess a minimum driving experience of 1 years.</li>
                    <li>The vehicle shall not be used for any other purpose other than the given purpose in the agreement form.</li>
                    <li>Any extension of the Vehicle should be informed in advance and is possible with the acceptance of GO-ON RIDERS.</li>
                    <li>Any violation of the terms will lead to termination of the deposit.</li>
                    <li>Without prior intimation of extension of vehicle lead to penalty of Rs. 1000 per day.</li>
                  </ul>
                </div>
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="terms"
                      name="terms"
                      type="checkbox"
                      checked={formData.terms_accepted}
                      onChange={(e) => setFormData(prev => ({ ...prev, terms_accepted: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="terms" className="font-medium text-gray-700">
                      I accept the terms and conditions
                    </label>
                    <p className="text-gray-500">
                      By checking this box, you agree to our{' '}
                      <Link href="/terms" className="text-blue-600 hover:text-blue-500">
                        Terms of Service
                      </Link>{' '}
                      and{' '}
                      <Link href="/privacy" className="text-blue-600 hover:text-blue-500">
                        Privacy Policy
                      </Link>
                    </p>
                  </div>
                </div>
              </div>

              {/* Signature Section */}
              <div className="space-y-6 border-t pt-6">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Signature</h3>
                <SignaturePadWithRotation
                  initialSignature={formData.signature}
                  onSignatureChange={(signature) => setFormData(prev => ({ ...prev, signature }))}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create Booking'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 