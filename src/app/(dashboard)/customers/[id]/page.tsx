'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { ArrowLeft, User, Phone, MapPin, Calendar, Mail, X, CheckCircle, XCircle } from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import Image from 'next/image';

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
    customer_photo: string;
    aadhar_front: string;
    aadhar_back: string;
    dl_front: string;
    dl_back: string;
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

export default function CustomerDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<CustomerDetails | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageLabel, setSelectedImageLabel] = useState<string>('');
  const [signature, setSignature] = useState<string | null>(null);

  useEffect(() => {
    const fetchCustomerDetails = async () => {
      if (!params?.id) {
        setError('No customer ID provided');
        setLoading(false);
        return;
      }

      try {
        const supabase = getSupabaseClient();
        
        // First, get the customer details with documents
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select(`
            id,
            name,
            email,
            phone,
            alternative_phone,
            temp_address_street,
            temp_address_city,
            temp_address_state,
            temp_address_pincode,
            perm_address_street,
            perm_address_city,
            perm_address_state,
            perm_address_pincode,
            emergency_contact_name,
            emergency_contact_phone,
            emergency_contact_phone1,
            emergency_contact_relationship,
            created_at,
            documents,
            aadhar_number,
            dl_number,
            dl_expiry_date,
            dob
          `)
          .eq('id', params.id)
          .single();

        if (customerError) {
          console.error('Customer fetch error:', customerError);
          throw new Error(customerError.message || 'Failed to fetch customer details');
        }

        if (!customerData) {
          throw new Error('Customer not found');
        }

        // Get the public URLs for each document
        const getPublicUrl = (fileName: string) => {
          if (!fileName) return '';
          const { data } = supabase.storage
            .from('customer-documents')
            .getPublicUrl(`${customerData.id}/${fileName}`);
          return data?.publicUrl || '';
        };

        // Process documents to get public URLs
        const documents = {
          customer_photo: customerData.documents?.customer_photo ? 
            getPublicUrl(customerData.documents.customer_photo) : '',
          aadhar_front: customerData.documents?.aadhar_front ? 
            getPublicUrl(customerData.documents.aadhar_front) : '',
          aadhar_back: customerData.documents?.aadhar_back ? 
            getPublicUrl(customerData.documents.aadhar_back) : '',
          dl_front: customerData.documents?.dl_front ? 
            getPublicUrl(customerData.documents.dl_front) : '',
          dl_back: customerData.documents?.dl_back ? 
            getPublicUrl(customerData.documents.dl_back) : ''
        };

        console.log('Raw documents:', customerData.documents);
        console.log('Customer ID:', customerData.id);
        console.log('Processed documents with URLs:', documents);

        // Get customer's bookings and their submitted documents
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

        // Get the latest submitted documents from the most recent booking
        const defaultSubmittedDocs = {
          passport: false,
          voter_id: false,
          original_dl: false,
          original_aadhar: false,
          other_document: false
        };

        const latestSubmittedDocuments = bookingsData && bookingsData.length > 0 && bookingsData[0].submitted_documents
          ? bookingsData[0].submitted_documents
          : defaultSubmittedDocs;

        // Fetch customer's latest signature from the most recent booking's signatures
        let signatureData = null;
        if (bookingsData && bookingsData.length > 0) {
          const latestBooking = bookingsData[0];
          const { data: signaturesData, error: signatureError } = await supabase
            .from('booking_signatures')
            .select('signature_data, created_at')
            .eq('booking_id', latestBooking.id)
            .order('created_at', { ascending: false })
            .limit(1);
            
          if (signatureError) {
            console.error('Error fetching signature:', signatureError);
          } else if (signaturesData && signaturesData.length > 0) {
            signatureData = signaturesData[0].signature_data;
          }
        }

        const customerWithDetails = {
          ...customerData,
          documents: documents,
          bookings: bookingsData || [],
          submitted_documents: latestSubmittedDocuments,
          signature: signatureData
        } as CustomerDetails;

        console.log('Customer details:', customerWithDetails);
        setCustomer(customerWithDetails);
        setSignature(signatureData);
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
  }, [params?.id, signature]);

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
          <div className="p-4 sm:p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Documents & Signatures</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {customer.documents && typeof customer.documents === 'object' && (
                <>
                  {customer.documents.customer_photo && customer.documents.customer_photo !== '' && (
                    <div className="cursor-pointer hover:opacity-75 transition-opacity">
                      <p className="text-sm font-medium text-gray-500 mb-2">Customer Photo</p>
                      <div className="w-full h-32 relative rounded-lg overflow-hidden border border-gray-200">
                        <Image
                          src={customer.documents.customer_photo}
                          alt="Customer Photo"
                          fill
                          className="object-cover"
                        />
                      </div>
                    </div>
                  )}
                  {customer.documents.aadhar_front && customer.documents.aadhar_front !== '' && (
                    <div className="cursor-pointer hover:opacity-75 transition-opacity">
                      <p className="text-sm font-medium text-gray-500 mb-2">Aadhar Front</p>
                      <div className="w-full h-32 relative rounded-lg overflow-hidden border border-gray-200">
                        <Image
                          src={customer.documents.aadhar_front}
                          alt="Aadhar Front"
                          fill
                          className="object-cover"
                        />
                      </div>
                    </div>
                  )}
                  {customer.documents.aadhar_back && customer.documents.aadhar_back !== '' && (
                    <div className="cursor-pointer hover:opacity-75 transition-opacity">
                      <p className="text-sm font-medium text-gray-500 mb-2">Aadhar Back</p>
                      <div className="w-full h-32 relative rounded-lg overflow-hidden border border-gray-200">
                        <Image
                          src={customer.documents.aadhar_back}
                          alt="Aadhar Back"
                          fill
                          className="object-cover"
                        />
                      </div>
                    </div>
                  )}
                  {customer.documents.dl_front && customer.documents.dl_front !== '' && (
                    <div className="cursor-pointer hover:opacity-75 transition-opacity">
                      <p className="text-sm font-medium text-gray-500 mb-2">DL Front</p>
                      <div className="w-full h-32 relative rounded-lg overflow-hidden border border-gray-200">
                        <Image
                          src={customer.documents.dl_front}
                          alt="DL Front"
                          fill
                          className="object-cover"
                        />
                      </div>
                    </div>
                  )}
                  {customer.documents.dl_back && customer.documents.dl_back !== '' && (
                    <div className="cursor-pointer hover:opacity-75 transition-opacity">
                      <p className="text-sm font-medium text-gray-500 mb-2">DL Back</p>
                      <div className="w-full h-32 relative rounded-lg overflow-hidden border border-gray-200">
                        <Image
                          src={customer.documents.dl_back}
                          alt="DL Back"
                          fill
                          className="object-cover"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
              {(!customer.documents || 
                !Object.values(customer.documents).some(doc => doc && doc !== '')) && (
                <div className="col-span-5 text-center py-8 text-gray-500">
                  No documents uploaded
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Physical Documents Section */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 sm:p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Physical Documents Submitted</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 flex items-center justify-center">
                  {customer.submitted_documents?.passport ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
                <span className="text-sm text-gray-700">Passport</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 flex items-center justify-center">
                  {customer.submitted_documents?.voter_id ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
                <span className="text-sm text-gray-700">Voter ID</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 flex items-center justify-center">
                  {customer.submitted_documents?.original_dl ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
                <span className="text-sm text-gray-700">Original DL</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 flex items-center justify-center">
                  {customer.submitted_documents?.original_aadhar ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
                <span className="text-sm text-gray-700">Original Aadhar</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 flex items-center justify-center">
                  {customer.submitted_documents?.other_document ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
                <span className="text-sm text-gray-700">Other Document</span>
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