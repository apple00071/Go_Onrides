'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { ArrowLeft, User, Phone, MapPin, Calendar, Mail, X, CheckCircle, XCircle } from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface CustomerDocument {
  id: string;
  document_type: string;
  document_url: string;
  created_at: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  temp_address_street: string | null;
  temp_address_city: string | null;
  temp_address_state: string | null;
  temp_address_pincode: string | null;
  perm_address_street: string | null;
  perm_address_city: string | null;
  perm_address_state: string | null;
  perm_address_pincode: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_phone1: string | null;
  emergency_contact_relationship: string | null;
  created_at: string;
  documents: {
    customer_photo?: string;
    aadhar_front?: string;
    aadhar_back?: string;
    dl_front?: string;
    dl_back?: string;
  };
  aadhar_number: string | null;
  dl_number: string | null;
  dl_expiry_date: string | null;
  dob: string | null;
  signature?: string | null;
  submitted_documents?: {
    passport?: boolean;
    voter_id?: boolean;
    original_dl?: boolean;
    original_aadhar?: boolean;
    other_document?: boolean;
  };
}

interface CustomerDetails {
  id: string;
  name: string;
  phone: string;
  email: string;
  alternative_phone: string | null;
  temp_address_street: string | null;
  temp_address_city: string | null;
  temp_address_state: string | null;
  temp_address_pincode: string | null;
  perm_address_street: string | null;
  perm_address_city: string | null;
  perm_address_state: string | null;
  perm_address_pincode: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_phone1: string | null;
  emergency_contact_relationship: string | null;
  created_at: string;
  documents: {
    customer_photo?: string;
    aadhar_front?: string;
    aadhar_back?: string;
    dl_front?: string;
    dl_back?: string;
  };
  aadhar_number: string | null;
  dl_number: string | null;
  dl_expiry_date: string | null;
  dob: string | null;
  signature?: string | null;
  submitted_documents?: {
    passport?: boolean;
    voter_id?: boolean;
    original_dl?: boolean;
    original_aadhar?: boolean;
    other_document?: boolean;
  };
  bookings?: Array<{
    id: string;
    booking_id: string;
    start_date: string;
    end_date: string;
    status: string;
    booking_amount: number;
    vehicle_details: any;
    submitted_documents?: {
      passport?: boolean;
      voter_id?: boolean;
      original_dl?: boolean;
      original_aadhar?: boolean;
      other_document?: boolean;
    };
  }>;
}

// Add this type check helper function at the top level
const isValidUrl = (url: string | null | undefined): url is string => {
  return typeof url === 'string' && url.trim().length > 0;
};

// Add this function at the top level
const getPublicUrl = async (filePath: string) => {
  if (!filePath) return '';
  try {
    const supabase = getSupabaseClient();
    const { data } = await supabase.storage
      .from('customer-documents')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    return data?.signedUrl || '';
  } catch (error) {
    console.error('Error getting signed URL:', error);
    return '';
  }
};

export default function CustomerDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<CustomerDetails | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageLabel, setSelectedImageLabel] = useState<string>('');

  useEffect(() => {
    const fetchCustomerDetails = async () => {
      try {
        if (!params?.id) {
          setError('No customer ID provided');
          return;
        }

        setLoading(true);
        const supabase = getSupabaseClient();

        // First get the customer's latest booking to get the booking ID
        const { data: latestBooking, error: bookingError } = await supabase
          .from('bookings')
          .select('booking_id, documents')
          .eq('customer_id', params.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (bookingError && bookingError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
          console.error('Error fetching latest booking:', bookingError);
        }

        // Then get the customer details
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('*')
          .eq('id', params.id)
          .single();

        if (customerError) throw customerError;
        if (!customerData) throw new Error('Customer not found');

        // Process documents to get public URLs using the booking ID
        if (customerData.documents) {
          const processedDocuments: Record<string, string> = {};
          for (const [key, value] of Object.entries(customerData.documents)) {
            if (value && typeof value === 'string') {
              processedDocuments[key] = await getPublicUrl(value);
            }
          }
          customerData.documents = processedDocuments;
        }

        // Get customer's bookings
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('bookings')
          .select(`
            id,
            booking_id,
            start_date,
            end_date,
            status,
            booking_amount,
            vehicle_details,
            submitted_documents
          `)
          .eq('customer_id', customerData.id)
          .order('created_at', { ascending: false });

        if (bookingsError) {
          console.error('Bookings fetch error:', bookingsError);
        }

        setCustomer({
          ...customerData,
          bookings: bookingsData || []
        });
        setError(null);
      } catch (error) {
        console.error('Error fetching customer:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch customer details';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerDetails();
  }, [params?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="min-h-screen p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customers
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {error || 'Customer not found'}
        </div>
      </div>
    );
  }

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    in_use: 'bg-green-100 text-green-800',
    completed: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800'
  };

  const handleImageClick = (url: string | undefined, label: string) => {
    if (!url) return;
    setSelectedImage(url);
    setSelectedImageLabel(label);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 bg-gray-50 z-10 p-4 sm:p-6 border-b">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customers
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <span className="text-sm text-gray-500">
              Customer since {formatDate(customer.created_at)}
            </span>
            <button
              onClick={() => router.push(`/dashboard/customers/${customer.id}/edit`)}
              className="px-3 py-1 text-sm font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100"
            >
              Edit Customer
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
        {/* Customer Information Section */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4 sm:p-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Basic Information</h2>
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:justify-between">
                  <span className="text-sm font-medium text-gray-500">Name</span>
                  <span className="text-sm text-gray-900">{customer.name}</span>
                </div>
                <div className="flex flex-col space-y-2">
                  <span className="text-sm font-medium text-gray-500">Contact Information</span>
                  <div className="space-y-1">
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="text-sm text-gray-900">{customer.phone} (Primary)</span>
                    </div>
                    {customer.alternative_phone && (
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="text-sm text-gray-600">{customer.alternative_phone} (Alternative)</span>
                      </div>
                    )}
                    {customer.emergency_contact_phone && (
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2 text-red-400" />
                        <span className="text-sm text-red-600">{customer.emergency_contact_phone} (Father)</span>
                      </div>
                    )}
                    {customer.emergency_contact_phone1 && (
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2 text-red-400" />
                        <span className="text-sm text-red-600">{customer.emergency_contact_phone1} (Brother/Friend)</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between">
                  <span className="text-sm font-medium text-gray-500">Email</span>
                  <span className="text-sm text-gray-900 break-words">{customer.email || 'Not provided'}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between">
                  <span className="text-sm font-medium text-gray-500">Date of Birth</span>
                  <span className="text-sm text-gray-900">{customer.dob ? formatDate(customer.dob) : 'Not provided'}</span>
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Emergency Contact</h2>
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:justify-between">
                  <span className="text-sm font-medium text-gray-500">Name</span>
                  <span className="text-sm text-gray-900">{customer.emergency_contact_name || 'Not provided'}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between">
                  <span className="text-sm font-medium text-gray-500">Phone</span>
                  <span className="text-sm text-gray-900">{customer.emergency_contact_phone || 'Not provided'}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between">
                  <span className="text-sm font-medium text-gray-500">Relationship</span>
                  <span className="text-sm text-gray-900">{customer.emergency_contact_relationship || 'Not provided'}</span>
                </div>
              </div>
            </div>

            {/* Identification */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Identification</h2>
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:justify-between">
                  <span className="text-sm font-medium text-gray-500">Aadhar Number</span>
                  <span className="text-sm text-gray-900">{customer.aadhar_number || 'Not provided'}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between">
                  <span className="text-sm font-medium text-gray-500">DL Number</span>
                  <span className="text-sm text-gray-900">{customer.dl_number || 'Not provided'}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between">
                  <span className="text-sm font-medium text-gray-500">DL Expiry</span>
                  <span className="text-sm text-gray-900">{customer.dl_expiry_date ? formatDate(customer.dl_expiry_date) : 'Not provided'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Address Section */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x">
            {/* Temporary Address */}
            <div className="p-4 sm:p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Temporary Address</h2>
              <p className="text-gray-900">
                {[
                  customer.temp_address_street,
                  customer.temp_address_city,
                  customer.temp_address_state,
                  customer.temp_address_pincode
                ].filter(Boolean).join(', ') || 'Not provided'}
              </p>
            </div>

            {/* Permanent Address */}
            <div className="p-4 sm:p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Permanent Address</h2>
              <p className="text-gray-900">
                {[
                  customer.perm_address_street,
                  customer.perm_address_city,
                  customer.perm_address_state,
                  customer.perm_address_pincode
                ].filter(Boolean).join(', ') || 'Not provided'}
              </p>
            </div>
          </div>
        </div>

        {/* Documents & Signatures Section */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Documents</h2>
          </div>
          <div className="p-6">
            <div className="space-y-8">
              {/* Uploaded Documents */}
              <div>
                <h3 className="text-md font-medium text-gray-900 mb-4">Uploaded Documents</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {customer.documents ? (
                    <>
                      {Object.entries(customer.documents).map(([key, path]) => {
                        if (!path) return null;
                        
                        const documentLabel = {
                          customer_photo: 'Customer Photo',
                          aadhar_front: 'Aadhar Front',
                          aadhar_back: 'Aadhar Back',
                          dl_front: 'DL Front',
                          dl_back: 'DL Back'
                        }[key as keyof typeof customer.documents] || key;

                        return (
                          <div key={key} className="cursor-pointer hover:opacity-75 transition-opacity"
                               onClick={() => path && handleImageClick(path, documentLabel)}>
                            <p className="text-sm font-medium text-gray-500 mb-2">{documentLabel}</p>
                            <div className="w-full h-32 relative rounded-lg overflow-hidden border border-gray-200">
                              {path && (
                                <Image
                                  src={path}
                                  alt={documentLabel || 'Document'}
                                  fill
                                  className="object-cover"
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    <p className="text-gray-500">No documents uploaded</p>
                  )}
                </div>
              </div>

              {/* Submitted Documents Checklist */}
              <div>
                <h3 className="text-md font-medium text-gray-900 mb-4">Submitted Physical Documents</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {customer.submitted_documents ? (
                    Object.entries(customer.submitted_documents).map(([key, value]) => {
                      const documentLabel = {
                        passport: 'Passport',
                        voter_id: 'Voter ID',
                        original_dl: 'Original DL',
                        original_aadhar: 'Original Aadhar',
                        other_document: 'Other Document'
                      }[key as keyof typeof customer.submitted_documents] || key;

                      return (
                        <div key={key} className="flex items-center space-x-2">
                          {value ? (
                            <CheckCircleIcon className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircleIcon className="h-5 w-5 text-red-500" />
                          )}
                          <span className="text-sm text-gray-700">{documentLabel}</span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-gray-500">No physical documents submitted</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bookings Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 sm:p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Booking History</h2>
            {customer.bookings && customer.bookings.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Booking ID
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vehicle
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Dates
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {customer.bookings.map((booking) => (
                      <tr 
                        key={booking.id} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => router.push(`/dashboard/bookings/${booking.id}`)}
                        onKeyDown={(e) => e.key === 'Enter' && router.push(`/dashboard/bookings/${booking.id}`)}
                        tabIndex={0}
                        role="button"
                      >
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-blue-600 hover:text-blue-800">
                          {booking.booking_id}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {booking.vehicle_details?.model || 'Unknown'} 
                          <span className="block text-xs text-gray-400">
                            {booking.vehicle_details?.registration || 'No Reg'}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className="block">{formatDate(booking.start_date)}</span>
                          <span className="block text-xs text-gray-400">to {formatDate(booking.end_date)}</span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(booking.booking_amount)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${statusColors[booking.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
                            {booking.status?.replace('_', ' ') || 'Unknown'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No booking history available
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 