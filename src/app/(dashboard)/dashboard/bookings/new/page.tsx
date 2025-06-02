'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import DocumentUpload from '@/components/bookings/DocumentUpload';
import { generateBookingId } from '@/lib/utils';
import SignaturePad from 'react-signature-canvas';
import type SignaturePadType from 'react-signature-canvas';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

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
  signature: string;
  terms_accepted: boolean;
}

export default function NewBookingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExistingCustomer, setIsExistingCustomer] = useState(false);
  const [signaturePad, setSignaturePad] = useState<SignaturePadType | null>(null);

  // Memoize the initial form data
  const initialFormData = useMemo<FormData>(() => ({
    customer_name: '',
    customer_contact: '',
    customer_email: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    aadhar_number: '',
    date_of_birth: '',
    dl_number: '',
    dl_expiry_date: '',
    start_date: '',
    end_date: '',
    pickup_time: '',
    dropoff_time: '',
    temp_address: '',
    perm_address: '',
    vehicle_details: {
      model: '',
      registration: ''
    },
    booking_amount: '',
    security_deposit_amount: '',
    total_amount: '',
    payment_status: 'pending',
    paid_amount: '',
    payment_mode: 'cash',
    status: 'confirmed',
    documents: {
      customer_photo: '',
      aadhar_front: '',
      aadhar_back: '',
      dl_front: '',
      dl_back: ''
    },
    signature: '',
    terms_accepted: false
  }), []);

  const [formData, setFormData] = useState<FormData>(initialFormData);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

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

    // Clear any previous error
    setError(null);

    // Validate specific fields
    if (name === 'customer_contact') {
      if (!/^\d{10}$/.test(value)) {
        setError('Customer contact must be a 10-digit number');
      }
    } else if (name === 'customer_email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        setError('Please enter a valid email address');
      }
    } else if (name === 'emergency_contact_phone') {
      if (!/^\d{10}$/.test(value)) {
        setError('Emergency contact must be a 10-digit number');
      }
    } else if (name === 'aadhar_number') {
      if (!/^\d{12}$/.test(value)) {
        setError('Aadhar number must be a 12-digit number');
      }
    } else if (name === 'dl_number') {
      if (value.length < 8) {
        setError('Driving license number must be at least 8 characters');
      }
    } else if (name === 'dl_expiry_date') {
      const expiryDate = new Date(value);
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      if (expiryDate < oneMonthAgo) {
        setError('Driving license should not be expired for more than a month');
      }
    } else if (name === 'date_of_birth') {
      const dob = new Date(value);
      const today = new Date();
      if (dob > today) {
        setError('Date of birth cannot be in the future');
      }
    } else if (name === 'start_date') {
      const startDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (startDate < today) {
        setError('Start date cannot be in the past');
      }
    } else if (name === 'end_date') {
      const endDate = new Date(value);
      const startDate = new Date(formData.start_date);
      if (endDate < startDate) {
        setError('End date cannot be before start date');
      }
    } else if (name === 'booking_amount' || name === 'security_deposit_amount' || name === 'paid_amount') {
      const amount = parseFloat(value);
      if (amount < 0) {
        setError('Amount cannot be negative');
      }
      if (name === 'paid_amount') {
        const totalAmount = parseFloat(formData.total_amount);
        if (amount > totalAmount) {
          setError('Paid amount cannot exceed total amount');
        }
      }
    }
  };

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

  // Check for existing customer documents when Aadhar number changes
  useEffect(() => {
    const checkExistingCustomer = async () => {
      if (formData.aadhar_number.length === 12) {
        const supabase = getSupabaseClient();
        
        // First find the customer by Aadhar number
        const { data: customers, error: customerError } = await supabase
          .from('customers')
          .select('*')
          .eq('aadhar_number', formData.aadhar_number)
          .limit(1);

        if (customerError) {
          console.error('Error checking customer:', customerError);
          return;
        }

        if (customers && customers.length > 0) {
          const customer = customers[0];
          setIsExistingCustomer(true);
          // Pre-fill form data with existing customer info
          setFormData(prev => ({
            ...prev,
            customer_name: customer.name,
            customer_contact: customer.phone,
            customer_email: customer.email || '',
            emergency_contact_name: customer.emergency_contact_name || '',
            emergency_contact_phone: customer.emergency_contact_phone || '',
            date_of_birth: customer.dob || '',
            dl_number: customer.dl_number || '',
            dl_expiry_date: customer.dl_expiry_date || '',
            temp_address: customer.temp_address_street || '',
            perm_address: customer.perm_address_street || '',
            documents: customer.documents || {
              customer_photo: '',
              aadhar_front: '',
              aadhar_back: '',
              dl_front: '',
              dl_back: ''
            }
          }));
          toast.success('Found existing customer - form pre-filled');
        } else {
          setIsExistingCustomer(false);
          // Reset form data except Aadhar number
          const { aadhar_number } = formData;
          setFormData({
            ...initialFormData,
            aadhar_number
          });
        }
      }
    };

    checkExistingCustomer();
  }, [formData.aadhar_number, initialFormData]);

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

  const handleDocumentUpload = (type: DocumentType, url: string) => {
    setFormData(prev => ({
      ...prev,
      documents: {
        ...prev.documents,
        [type]: url
      }
    }));
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();

      // Validate signature and terms
      if (!formData.signature) {
        throw new Error('Please provide your signature');
      }

      if (!formData.terms_accepted) {
        throw new Error('Please accept the terms and conditions');
      }

      // Validate required fields based on customer type
      if (!isExistingCustomer) {
        // Validate all fields for new customers
        if (!formData.customer_name || !formData.customer_contact || !formData.customer_email ||
            !formData.emergency_contact_name || !formData.emergency_contact_phone ||
            !formData.aadhar_number || !formData.date_of_birth ||
            !formData.dl_number || !formData.dl_expiry_date ||
            !formData.temp_address || !formData.perm_address) {
          throw new Error('Please fill in all required fields');
        }
      }

      // Validate fields required for all bookings
      if (!formData.vehicle_details.model || !formData.vehicle_details.registration ||
          !formData.start_date || !formData.end_date ||
          !formData.pickup_time || !formData.dropoff_time ||
          !formData.booking_amount || !formData.security_deposit_amount) {
        throw new Error('Please fill in all required booking fields');
      }

      // Additional date validations before submission
      if (!isExistingCustomer) {
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
      }

      // Validate required documents for new customers
      if (!isExistingCustomer) {
        const requiredDocuments: DocumentType[] = ['customer_photo', 'aadhar_front', 'aadhar_back', 'dl_front', 'dl_back'];
        const missingDocuments = requiredDocuments.filter(doc => !formData.documents[doc]);
        
        if (missingDocuments.length > 0) {
          throw new Error(`Please upload all required documents: ${missingDocuments.map(doc => doc.replace('_', ' ')).join(', ')}`);
        }
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

      // Generate the booking ID
      const bookingId = await generateBookingId(supabase);

      // First, check if customer exists or create new customer
      let customerId: string;
      const { data: existingCustomers, error: customerCheckError } = await supabase
        .from('customers')
        .select('id')
        .eq('aadhar_number', formData.aadhar_number)
        .limit(1);

      if (customerCheckError) {
        throw new Error(`Failed to check existing customer: ${customerCheckError.message}`);
      }

      if (existingCustomers && existingCustomers.length > 0) {
        customerId = existingCustomers[0].id;
        
        // Create new customer
        const { data: newCustomer, error: customerCreateError } = await supabase
          .from('customers')
          .insert({
            name: formData.customer_name,
            email: formData.customer_email,
            phone: formData.customer_contact,
            emergency_contact_name: formData.emergency_contact_name,
            emergency_contact_phone: formData.emergency_contact_phone,
            emergency_contact_relationship: 'emergency',
            dob: formData.date_of_birth,
            aadhar_number: formData.aadhar_number,
            dl_number: formData.dl_number,
            dl_expiry_date: formData.dl_expiry_date,
            temp_address_street: formData.temp_address,
            perm_address_street: formData.perm_address,
            documents: formData.documents
          })
          .select('id')
          .single();

        if (customerCreateError || !newCustomer) {
          console.error('Customer creation error:', customerCreateError);
          throw new Error(`Failed to create customer: ${customerCreateError?.message}`);
        }

        // Update existing customer if needed
        if (!isExistingCustomer) {
          const { error: customerUpdateError } = await supabase
            .from('customers')
            .update({
              name: formData.customer_name,
              email: formData.customer_email,
              emergency_contact_name: formData.emergency_contact_name,
              emergency_contact_phone: formData.emergency_contact_phone,
              emergency_contact_relationship: 'emergency',
              dob: formData.date_of_birth,
              aadhar_number: formData.aadhar_number,
              dl_number: formData.dl_number,
              dl_expiry_date: formData.dl_expiry_date,
              temp_address_street: formData.temp_address,
              perm_address_street: formData.perm_address,
              documents: formData.documents
            })
            .eq('id', customerId);

          if (customerUpdateError) {
            console.error('Customer update error:', customerUpdateError);
            throw new Error(`Failed to update customer: ${customerUpdateError.message}`);
          }
        }
      } else {
        // Create new customer
        const { data: newCustomer, error: customerCreateError } = await supabase
          .from('customers')
          .insert({
            name: formData.customer_name,
            email: formData.customer_email,
            phone: formData.customer_contact,
            emergency_contact_name: formData.emergency_contact_name,
            emergency_contact_phone: formData.emergency_contact_phone,
            emergency_contact_relationship: 'emergency',
            dob: formData.date_of_birth,
            aadhar_number: formData.aadhar_number,
            dl_number: formData.dl_number,
            dl_expiry_date: formData.dl_expiry_date,
            temp_address_street: formData.temp_address,
            perm_address_street: formData.perm_address,
            documents: formData.documents
          })
          .select('id')
          .single();

        if (customerCreateError || !newCustomer) {
          console.error('Customer creation error:', customerCreateError);
          throw new Error(`Failed to create customer: ${customerCreateError?.message}`);
        }

        customerId = newCustomer.id;
      }

      // Create booking with proper status and new booking ID format
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          booking_id: bookingId,
          customer_id: customerId,
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
          total_amount: parseFloat(formData.total_amount),
          payment_status: formData.payment_status,
          paid_amount: parseFloat(formData.paid_amount),
          payment_mode: formData.payment_mode,
          status: 'confirmed'
        })
        .select()
        .single();

      if (bookingError) {
        console.error('Booking creation error details:', bookingError);
        throw new Error(`Failed to create booking: ${bookingError.message}`);
      }

      if (!booking) {
        throw new Error('No booking data returned after creation');
      }

      toast.success(`Booking created successfully. Booking ID: ${bookingId}`);
      router.push('/dashboard/bookings');
    } catch (error) {
      console.error('Error creating booking:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900"
            aria-label="Back to Bookings"
          >
            <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
            Back to Bookings
          </button>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h1 className="text-xl font-semibold text-gray-900">
              {isExistingCustomer ? 'Create Booking for Existing Customer' : 'Create New Booking'}
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="p-6" aria-label="Booking Form">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md mb-6" role="alert">
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

                  {!isExistingCustomer && (
                    <>
                      <div>
                        <label htmlFor="emergency_contact_name" className="block text-sm font-medium text-gray-700 mb-1">
                          Emergency Contact Name *
                        </label>
                        <input
                          id="emergency_contact_name"
                          type="text"
                          name="emergency_contact_name"
                          required
                          value={formData.emergency_contact_name}
                          onChange={handleInputChange}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          aria-required="true"
                        />
                      </div>

                      <div>
                        <label htmlFor="emergency_contact_phone" className="block text-sm font-medium text-gray-700 mb-1">
                          Emergency Contact Phone *
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
                        />
                      </div>

                      <div>
                        <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700 mb-1">
                          Date of Birth *
                        </label>
                        <input
                          id="date_of_birth"
                          type="date"
                          name="date_of_birth"
                          required
                          max={maxDOB}
                          value={formData.date_of_birth}
                          onChange={handleInputChange}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          aria-required="true"
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
                          onChange={handleInputChange}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          aria-required="true"
                        />
                      </div>

                      <div>
                        <label htmlFor="dl_expiry_date" className="block text-sm font-medium text-gray-700 mb-1">
                          DL Expiry Date *
                        </label>
                        <input
                          id="dl_expiry_date"
                          type="date"
                          name="dl_expiry_date"
                          required
                          min={minDLExpiry}
                          value={formData.dl_expiry_date}
                          onChange={handleInputChange}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          aria-required="true"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label htmlFor="temp_address" className="block text-sm font-medium text-gray-700 mb-1">
                          Temporary Address *
                        </label>
                        <textarea
                          id="temp_address"
                          name="temp_address"
                          required
                          value={formData.temp_address}
                          onChange={handleInputChange}
                          rows={2}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          aria-required="true"
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
                    </>
                  )}
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
                      onChange={handleInputChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      aria-required="true"
                    />
                  </div>
                </div>
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
                    <label htmlFor="pickup_time" className="block text-sm font-medium text-gray-700 mb-1">
                      Pickup Time *
                    </label>
                    <select
                      id="pickup_time"
                      name="pickup_time"
                      required
                      value={formData.pickup_time}
                      onChange={handleInputChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      aria-required="true"
                    >
                      <option value="">Select time</option>
                      {Array.from({ length: 48 }, (_, i): JSX.Element => {
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
                    <label htmlFor="dropoff_time" className="block text-sm font-medium text-gray-700 mb-1">
                      Drop-off Time *
                    </label>
                    <select
                      id="dropoff_time"
                      name="dropoff_time"
                      required
                      value={formData.dropoff_time}
                      onChange={handleInputChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      aria-required="true"
                    >
                      <option value="">Select time</option>
                      {Array.from({ length: 48 }, (_, i): JSX.Element => {
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
                      type="number"
                      name="booking_amount"
                      required
                      value={formData.booking_amount}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      aria-required="true"
                    />
                  </div>
                  <div>
                    <label htmlFor="security_deposit" className="block text-sm font-medium text-gray-700 mb-1">
                      Security Deposit Amount *
                    </label>
                    <input
                      id="security_deposit"
                      type="number"
                      name="security_deposit_amount"
                      required
                      value={formData.security_deposit_amount}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      aria-required="true"
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

              {/* Document Upload - Only for new customers */}
              {!isExistingCustomer && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">Document Upload</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <DocumentUpload
                      customerId={formData.customer_contact}
                      documentType="customer_photo"
                      onUploadComplete={(url) => handleDocumentUpload('customer_photo', url)}
                      existingUrl={formData.documents.customer_photo}
                    />
                    <DocumentUpload
                      customerId={formData.customer_contact}
                      documentType="aadhar_front"
                      onUploadComplete={(url) => handleDocumentUpload('aadhar_front', url)}
                      existingUrl={formData.documents.aadhar_front}
                    />
                    <DocumentUpload
                      customerId={formData.customer_contact}
                      documentType="aadhar_back"
                      onUploadComplete={(url) => handleDocumentUpload('aadhar_back', url)}
                      existingUrl={formData.documents.aadhar_back}
                    />
                    <DocumentUpload
                      customerId={formData.customer_contact}
                      documentType="dl_front"
                      onUploadComplete={(url) => handleDocumentUpload('dl_front', url)}
                      existingUrl={formData.documents.dl_front}
                    />
                    <DocumentUpload
                      customerId={formData.customer_contact}
                      documentType="dl_back"
                      onUploadComplete={(url) => handleDocumentUpload('dl_back', url)}
                      existingUrl={formData.documents.dl_back}
                    />
                  </div>
                </div>
              )}

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

              {/* Signature */}
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Signature</h3>
                <div className="border rounded-lg p-4">
                  <div className="border border-gray-300 rounded-lg bg-white">
                    <SignaturePad
                      ref={(ref: SignaturePadType | null) => setSignaturePad(ref)}
                      onEnd={handleSignatureEnd}
                      canvasProps={{
                        className: 'w-full h-48',
                        'aria-label': 'Signature Canvas'
                      }}
                    />
                  </div>
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSignatureClear}
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      Clear Signature
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Booking'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 