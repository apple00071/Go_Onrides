'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import CustomerDocuments from '@/components/customers/CustomerDocuments';
import { toast } from 'react-hot-toast';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookingCreated: () => void;
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
}

interface CustomerDocuments {
  customer_photo?: string;
  aadhar_front?: string;
  aadhar_back?: string;
  dl_front?: string;
  dl_back?: string;
}

export default function BookingModal({
  isOpen,
  onClose,
  onBookingCreated
}: BookingModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingCustomerDocs, setExistingCustomerDocs] = useState<CustomerDocuments | null>(null);
  const [formData, setFormData] = useState<FormData>({
    customer_name: '',
    customer_contact: '',
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

  });

  // Check for existing customer documents when phone number changes
  useEffect(() => {
    const checkExistingCustomer = async () => {
      if (formData.customer_contact.length >= 10) {
        const supabase = getSupabaseClient();
        
        // First find the customer
        const { data: customers, error: customerError } = await supabase
          .from('customers')
          .select('id')
          .eq('phone', formData.customer_contact)
          .limit(1);

        if (customerError) {
          console.error('Error checking customer:', customerError);
          return;
        }

        if (customers && customers.length > 0) {
          const customerId = customers[0].id;

          // Then get their documents
          const { data: documents, error: docsError } = await supabase
            .from('customer_documents')
            .select('type, url')
            .eq('customer_id', customerId);

          if (docsError) {
            console.error('Error checking documents:', docsError);
            return;
          }

          if (documents && documents.length > 0) {
            const docs: CustomerDocuments = {};
            documents.forEach(doc => {
              docs[doc.type as keyof CustomerDocuments] = doc.url;
            });
            setExistingCustomerDocs(docs);
            toast.success('Found existing customer documents');
          } else {
            setExistingCustomerDocs(null);
          }
        } else {
          setExistingCustomerDocs(null);
        }
      }
    };

    checkExistingCustomer();
  }, [formData.customer_contact]);

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];
  
  // Calculate maximum date for DOB (today)
  const maxDOB = today;
  
  // Calculate minimum date for DL expiry (1 month ago)
  const minDLExpiry = new Date();
  minDLExpiry.setMonth(minDLExpiry.getMonth() - 1);
  const minDLExpiryDate = minDLExpiry.toISOString().split('T')[0];

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
      setFormData(prev => ({ ...prev, paid_amount: prev.total_amount }));
    } else if (formData.payment_status === 'pending') {
      setFormData(prev => ({ ...prev, paid_amount: '0' }));
    }
  }, [formData.payment_status, formData.total_amount]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setError(null);
    
    // Date validation
    if (name === 'date_of_birth') {
      const selectedDate = new Date(value);
      const today = new Date();
      if (selectedDate > today) {
        setError('Date of birth cannot be in the future');
        return;
      }
    }

    if (name === 'dl_expiry_date') {
      const selectedDate = new Date(value);
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      
      if (selectedDate < oneMonthAgo) {
        setError('Driving license should not be expired for more than a month');
        return;
      }
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
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();

      // Validate all required fields
      if (!formData.customer_name || !formData.customer_contact || 
          !formData.emergency_contact_name || !formData.emergency_contact_phone ||
          !formData.aadhar_number || !formData.date_of_birth ||
          !formData.dl_number || !formData.dl_expiry_date ||
          !formData.temp_address || !formData.perm_address ||
          !formData.start_date || !formData.end_date ||
          !formData.pickup_time || !formData.dropoff_time ||
          !formData.vehicle_details.model || !formData.vehicle_details.registration) {
        throw new Error('Please fill in all required fields');
      }

      // Validate that we have documents for the customer
      if (!existingCustomerDocs && formData.customer_contact.length >= 10) {
        throw new Error('Please upload all required documents before creating the booking');
      }

      // Additional date validations before submission
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

      // First, check if customer exists or create new customer
      let customerId: string;
      const { data: existingCustomers, error: customerCheckError } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', formData.customer_contact)
        .limit(1);

      if (customerCheckError) {
        throw new Error(`Failed to check existing customer: ${customerCheckError.message}`);
      }

      if (existingCustomers && existingCustomers.length > 0) {
        customerId = existingCustomers[0].id;
      } else {
        // Create new customer
        const { data: newCustomer, error: customerCreateError } = await supabase
          .from('customers')
          .insert({
            name: formData.customer_name,
            phone: formData.customer_contact,
            emergency_contact: {
              name: formData.emergency_contact_name,
              phone: formData.emergency_contact_phone
            },
            identification: {
              aadhar_number: formData.aadhar_number,
              dl_number: formData.dl_number,
              dl_expiry: formData.dl_expiry_date
            },
            address: {
              temporary: formData.temp_address,
              permanent: formData.perm_address
            }
          })
          .select('id')
          .single();

        if (customerCreateError || !newCustomer) {
          throw new Error(`Failed to create customer: ${customerCreateError?.message}`);
        }

        customerId = newCustomer.id;
      }

      // Create booking
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          customer_id: customerId,
          customer_name: formData.customer_name,
          customer_contact: formData.customer_contact,
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
          status: 'pending'
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

      // Create initial payment record if amount is paid
      if (paidAmount > 0) {
        const { error: paymentError } = await supabase
          .from('payments')
          .insert({
            booking_id: booking.id,
            amount: paidAmount,
            payment_mode: formData.payment_mode,
            payment_status: 'completed'
          });

        if (paymentError) {
          console.error('Payment record creation error:', paymentError);
          throw new Error(`Failed to create payment record: ${paymentError.message}`);
        }
      }

      onBookingCreated();
      onClose();
    } catch (error) {
      console.error('Error creating booking:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred while creating the booking. Please check the console for details.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Create New Booking</h2>
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
                min={minDLExpiryDate}
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
                value={formData.start_date}
                onChange={handleInputChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">₹</span>
                </div>
                <input
                  type="number"
                  name="booking_amount"
                  required
                  min="0"
                  step="0.01"
                  value={formData.booking_amount}
                  onChange={handleInputChange}
                  className="mt-1 block w-full pl-7 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Security Deposit Amount *
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">₹</span>
                </div>
                <input
                  type="number"
                  name="security_deposit_amount"
                  required
                  min="0"
                  step="0.01"
                  value={formData.security_deposit_amount}
                  onChange={handleInputChange}
                  className="mt-1 block w-full pl-7 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
          </div>

          {/* Total Amount and Payment Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Total Amount
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">₹</span>
                </div>
                <input
                  type="number"
                  name="total_amount"
                  readOnly
                  value={formData.total_amount}
                  className="mt-1 block w-full pl-7 border-gray-300 bg-gray-50 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
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
                Paid Amount *
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">₹</span>
                </div>
                <input
                  type="number"
                  name="paid_amount"
                  required
                  min="0"
                  step="0.01"
                  value={formData.paid_amount}
                  onChange={handleInputChange}
                  disabled={formData.payment_status === 'full'}
                  className="mt-1 block w-full pl-7 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-50"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Payment Mode *
              </label>
              <select
                name="payment_mode"
                required
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

          {/* Document Upload Section */}
          {formData.customer_contact.length >= 10 && (
            <CustomerDocuments
              customerPhone={formData.customer_contact}
              onDocumentsFound={docs => setExistingCustomerDocs(docs)}
              onUploadComplete={docs => setExistingCustomerDocs(docs)}
            />
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
              disabled={loading || (!existingCustomerDocs && formData.customer_contact.length >= 10)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 