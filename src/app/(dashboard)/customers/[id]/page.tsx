'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { ArrowLeft, User, Phone, MapPin, Calendar, Mail } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { toast } from 'react-hot-toast';

interface CustomerDetails {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: {
    permanent?: string;
    temporary?: string;
  };
  emergency_contact: {
    name?: string;
    phone?: string;
  };
  identification: {
    aadhar_number?: string;
    dl_number?: string;
    dl_expiry?: string;
  };
  date_of_birth?: string;
  signature?: string;
  created_at: string;
  documents: Array<{
    id: string;
    document_type: string;
    document_url: string;
    created_at: string;
  }>;
  bookings: Array<{
    id: string;
    booking_id: string;
    start_date: string;
    end_date: string;
    status: string;
    booking_amount: number;
    vehicle_details: {
      model: string;
      registration: string;
    };
  }>;
}

export default function CustomerDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<CustomerDetails | null>(null);

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
            address,
            emergency_contact,
            identification,
            date_of_birth,
            signature,
            created_at,
            documents
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

        // Transform documents data if it exists
        let transformedDocuments = [];
        if (customerData.documents) {
          // If documents is an object with key-value pairs
          if (typeof customerData.documents === 'object' && !Array.isArray(customerData.documents)) {
            transformedDocuments = Object.entries(customerData.documents)
              .filter(([_, url]) => url) // Filter out empty URLs
              .map(([type, url]) => ({
                id: type,
                document_type: type,
                document_url: url as string,
                created_at: customerData.created_at
              }));
          } 
          // If documents is already an array
          else if (Array.isArray(customerData.documents)) {
            transformedDocuments = customerData.documents;
          }
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
            vehicle_details
          `)
          .eq('customer_id', customerData.id)
          .order('created_at', { ascending: false });

        if (bookingsError) {
          console.error('Bookings fetch error:', bookingsError);
        }

        const customerWithDetails = {
          ...customerData,
          documents: transformedDocuments,
          bookings: bookingsData || []
        } as CustomerDetails;

        console.log('Customer details:', customerWithDetails);
        setCustomer(customerWithDetails);
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

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 bg-gray-50 z-10 p-6 border-b">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customers
          </button>
          <span className="text-sm text-gray-500">
            Customer since {formatDate(customer.created_at)}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Customer Information Card */}
            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Customer Information</h2>
              <div className="space-y-4">
                <div className="flex items-start">
                  <User className="h-5 w-5 mr-3 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">{customer.name}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Mail className="h-5 w-5 mr-3 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">{customer.email || 'Email not provided'}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Phone className="h-5 w-5 mr-3 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">{customer.phone}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Calendar className="h-5 w-5 mr-3 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {customer.date_of_birth ? formatDate(customer.date_of_birth) : 'DOB not provided'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 mr-3 text-gray-400 mt-0.5" />
                  <div className="space-y-2">
                    {customer.address?.permanent && (
                      <div>
                        <p className="font-medium text-gray-900">Permanent Address</p>
                        <p className="text-gray-600">{customer.address.permanent}</p>
                      </div>
                    )}
                    {customer.address?.temporary && (
                      <div>
                        <p className="font-medium text-gray-900">Temporary Address</p>
                        <p className="text-gray-600">{customer.address.temporary}</p>
                      </div>
                    )}
                    {!customer.address?.permanent && !customer.address?.temporary && (
                      <p className="text-gray-600">No address provided</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Emergency Contact Card */}
            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Emergency Contact</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Name</p>
                  <p className="mt-1 text-gray-900">{customer.emergency_contact?.name || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Phone</p>
                  <p className="mt-1 text-gray-900">{customer.emergency_contact?.phone || 'Not provided'}</p>
                </div>
              </div>
            </div>

            {/* Documents Card */}
            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Documents</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Aadhar Number</p>
                  <p className="mt-1 text-gray-900">{customer.identification.aadhar_number || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Driving License</p>
                  <p className="mt-1 text-gray-900">{customer.identification.dl_number || 'Not provided'}</p>
                  {customer.identification.dl_expiry && (
                    <p className="mt-1 text-sm text-gray-500">
                      Expires on {formatDate(customer.identification.dl_expiry)}
                    </p>
                  )}
                </div>
                {customer.documents && customer.documents.length > 0 && (
                  <div className="pt-4 border-t">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Uploaded Documents</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {customer.documents.map((doc) => (
                        <div key={doc.id} className="space-y-2">
                          <p className="text-sm font-medium text-gray-900">
                            {doc.document_type.split('_').map(word => 
                              word.charAt(0).toUpperCase() + word.slice(1)
                            ).join(' ')}
                          </p>
                          <a
                            href={doc.document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block aspect-[3/2] relative rounded-lg overflow-hidden border border-gray-200 hover:opacity-75 transition-opacity"
                          >
                            <img
                              src={doc.document_url}
                              alt={doc.document_type}
                              className="object-cover w-full h-full"
                            />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Signature Card */}
            {customer.signature && (
              <div className="bg-white rounded-lg shadow p-6 space-y-4">
                <h2 className="text-xl font-semibold text-gray-900">Signature</h2>
                <div className="border rounded-lg overflow-hidden">
                  <img
                    src={customer.signature}
                    alt="Customer Signature"
                    className="w-full object-contain max-h-48"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Booking History */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Booking History</h2>
              <div className="space-y-4">
                {customer.bookings.length > 0 ? (
                  customer.bookings.map((booking) => (
                    <div
                      key={booking.id}
                      onClick={() => router.push(`/dashboard/bookings/${booking.booking_id}`)}
                      className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">
                          {booking.vehicle_details.model}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          statusColors[booking.status as keyof typeof statusColors]
                        }`}>
                          {booking.status}
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-2" />
                        {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    No booking history available
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 