'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { ArrowLeft, Calendar, Clock, MapPin, Phone, User, X, PenSquare, CalendarPlus } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import CompleteBookingModal from '@/components/bookings/CompleteBookingModal';
import VehicleDamageHistory from '@/components/bookings/VehicleDamageHistory';
import EditBookingModal from '@/components/bookings/EditBookingModal';
import ExtendBookingModal from '@/components/bookings/ExtendBookingModal';
import BookingExtensionHistory from '@/components/bookings/BookingExtensionHistory';
import PaymentHistory from '@/components/payments/PaymentHistory';
import { usePermissions } from '@/lib/usePermissions';
import { notifyBookingEvent } from '@/lib/notification';

// Rename the interface to avoid collision with imported EditBookingModal's BookingDetails
interface BookingDetailsData {
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
  created_at: string;
  documents: Array<{
    id: string;
    document_type: string;
    document_url: string;
    created_at: string;
  }>;
}

// Helper function to convert our booking data format to the format expected by EditBookingModal
function convertToEditBookingFormat(booking: BookingDetailsData) {
  // Convert array of document objects to object format with document types as keys
  const docsObj: {[key: string]: string} = {};
  booking.documents.forEach(doc => {
    docsObj[doc.document_type] = doc.document_url;
  });
  
  return {
    ...booking,
    documents: docsObj
  };
}

export default function BookingDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingDetailsData | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageLabel, setSelectedImageLabel] = useState<string>('');
  const [payments, setPayments] = useState<any[]>([]);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const { isAdmin, canEdit } = usePermissions();

  useEffect(() => {
    const fetchBookingDetails = async () => {
      if (!params?.id) {
        setError('No booking ID provided');
        setLoading(false);
        return;
      }

      try {
        const supabase = getSupabaseClient();
        const bookingIdentifier = decodeURIComponent(params.id as string);

        // Check if the identifier is a UUID or a booking reference number
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingIdentifier);

        console.log('Fetching booking with identifier:', bookingIdentifier);
        
        // First, get the booking details
        const { data: bookingData, error: bookingError } = await supabase
          .from('bookings')
          .select('*')
          .eq(isUUID ? 'id' : 'booking_id', bookingIdentifier)
          .single();

        if (bookingError) {
          console.error('Booking fetch error:', bookingError);
          throw new Error(bookingError.message || 'Failed to fetch booking details');
        }

        if (!bookingData) {
          throw new Error('Booking not found');
        }

        console.log('Found booking:', bookingData);

        // Get customer documents
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('documents')
          .eq('id', bookingData.customer_id)
          .single();

        console.log('Customer documents query result:', { customerData, customerError });

        if (customerError) {
          console.error('Customer documents fetch error:', customerError);
          // Don't throw here, just log the error
        }

        // Get payment history
        const { data: paymentData, error: paymentError } = await supabase
          .from('payments')
          .select('*')
          .eq('booking_id', bookingData.id)
          .order('created_at', { ascending: false });

        if (paymentError) {
          console.error('Payment history fetch error:', paymentError);
          // Don't throw here, just log the error
        }

        // Transform the documents data to match our interface
        const transformedDocuments = customerData?.documents ? 
          Object.entries(customerData.documents)
            .filter(([_, url]) => url) // Filter out empty URLs
            .map(([type, url]) => ({
              id: type, // Use the document type as ID
              document_type: type,
              document_url: url as string,
              created_at: bookingData.created_at // Use booking creation date as we don't have document creation date
            })) : [];

        const bookingWithDocs: BookingDetailsData = {
          ...bookingData,
          documents: transformedDocuments
        };

        console.log('Setting booking state with:', bookingWithDocs);

        setBooking(bookingWithDocs);
        if (paymentData) {
          setPayments(paymentData);
        }
        setError(null);
      } catch (error) {
        console.error('Error fetching booking:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch booking details';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchBookingDetails();
  }, [params?.id]);

  const handleStatusChange = async (newStatus: string) => {
    if (!booking) return;

    if (newStatus === 'completed') {
      setShowCompleteModal(true);
      return;
    }

    try {
      const supabase = getSupabaseClient();
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', booking.id);

      if (updateError) {
        throw updateError;
      }

      setBooking(prev => prev ? { ...prev, status: newStatus } : null);
      toast.success('Booking status updated successfully');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update booking status');
    }
  };

  const handleCompleteSuccess = async () => {
    // Refresh the data
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const bookingIdentifier = Array.isArray(params.id) ? params.id[0] : params.id;
      
      // Fetch updated booking data
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingIdentifier)
        .single();

      if (bookingError) throw bookingError;

      // Fetch updated payment data
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .select('*')
        .eq('booking_id', bookingIdentifier)
        .order('created_at', { ascending: false });

      if (paymentError) throw paymentError;

      // Update state with new data
      setBooking(bookingData);
      setPayments(paymentData || []);
      toast.success('Booking completed and data refreshed');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh booking data');
    } finally {
      setLoading(false);
    }
  };

  const handleImageClick = (url: string, label: string) => {
    setSelectedImage(url);
    setSelectedImageLabel(label);
  };

  const handleEditComplete = async () => {
    // Refresh the booking data after edit
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const bookingIdentifier = decodeURIComponent(params.id as string);
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingIdentifier);
      
      // Fetch updated booking data
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .eq(isUUID ? 'id' : 'booking_id', bookingIdentifier)
        .single();

      if (bookingError) throw bookingError;

      // Get customer documents
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('documents')
        .eq('id', bookingData.customer_id)
        .single();

      // Transform the documents data to match our interface
      const transformedDocuments = customerData?.documents ? 
        Object.entries(customerData.documents)
          .filter(([_, url]) => url) // Filter out empty URLs
          .map(([type, url]) => ({
            id: type, // Use the document type as ID
            document_type: type,
            document_url: url as string,
            created_at: bookingData.created_at // Use booking creation date as we don't have document creation date
          })) : [];

      // Create the booking object with the correct types
      const bookingWithDocs: BookingDetailsData = {
        ...bookingData,
        documents: transformedDocuments
      };

      setBooking(bookingWithDocs);
      toast.success('Booking updated successfully');
    } catch (error) {
      console.error('Error refreshing booking data:', error);
      toast.error('Failed to refresh booking data');
    } finally {
      setLoading(false);
      setShowEditModal(false);
    }
  };

  const handleExtendComplete = async () => {
    // Refresh the booking data after extension
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const bookingIdentifier = decodeURIComponent(params.id as string);
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingIdentifier);
      
      // Fetch updated booking data
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .eq(isUUID ? 'id' : 'booking_id', bookingIdentifier)
        .single();

      if (bookingError) throw bookingError;

      // Get customer documents
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('documents')
        .eq('id', bookingData.customer_id)
        .single();

      // Transform the documents data to match our interface
      const transformedDocuments = customerData?.documents ? 
        Object.entries(customerData.documents)
          .filter(([_, url]) => url) // Filter out empty URLs
          .map(([type, url]) => ({
            id: type, // Use the document type as ID
            document_type: type,
            document_url: url as string,
            created_at: bookingData.created_at // Use booking creation date as we don't have document creation date
          })) : [];

      // Create the booking object with the correct types
      const bookingWithDocs: BookingDetailsData = {
        ...bookingData,
        documents: transformedDocuments
      };

      setBooking(bookingWithDocs);
      toast.success('Booking extended successfully');
    } catch (error) {
      console.error('Error refreshing booking data:', error);
      toast.error('Failed to refresh booking data');
    } finally {
      setLoading(false);
      setShowExtendModal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Bookings
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {error || 'Booking not found'}
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

  const totalAmount = booking.booking_amount + booking.security_deposit_amount;
  const remainingAmount = totalAmount - booking.paid_amount;

  // Add debug logging in render
  console.log('Current booking state:', booking);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header - Fixed at top */}
      <div className="sticky top-0 bg-gray-50 z-10 p-6 border-b">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Bookings
          </button>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">
              Created on {formatDate(booking.created_at)}
            </span>
            
            {/* Extend Booking button - available to everyone */}
            {booking && booking.status !== 'completed' && booking.status !== 'cancelled' && (
              <button
                onClick={() => setShowExtendModal(true)}
                className="flex items-center px-3 py-1 text-sm font-medium text-green-700 bg-green-50 rounded-md hover:bg-green-100"
              >
                <CalendarPlus className="h-3.5 w-3.5 mr-1" />
                Extend Booking
              </button>
            )}
            
            {/* Edit Booking button - admin only */}
            {isAdmin && (
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center px-3 py-1 text-sm font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100"
              >
                <PenSquare className="h-3.5 w-3.5 mr-1" />
                Edit Booking
              </button>
            )}
            
            <select
              value={booking.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[booking.status as keyof typeof statusColors]}`}
            >
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_use">In Use</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Booking Information */}
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Booking Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500">Booking ID</label>
                <p className="font-medium">{booking.booking_id || booking.id}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Vehicle</label>
                <p className="font-medium">{booking.vehicle_details.model}</p>
                <p className="text-sm text-gray-500">{booking.vehicle_details.registration}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500">Start Date</label>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                  <p className="font-medium">{formatDate(booking.start_date)}</p>
                </div>
                <div className="flex items-center mt-1">
                  <Clock className="h-4 w-4 mr-2 text-gray-400" />
                  <p className="text-sm">{booking.pickup_time}</p>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-500">End Date</label>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                  <p className="font-medium">{formatDate(booking.end_date)}</p>
                </div>
                <div className="flex items-center mt-1">
                  <Clock className="h-4 w-4 mr-2 text-gray-400" />
                  <p className="text-sm">{booking.dropoff_time}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Customer Information</h2>
            <div className="space-y-3">
              <div className="flex items-start">
                <User className="h-5 w-5 mr-3 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium">{booking.customer_name}</p>
                  <p className="text-sm text-gray-500">{booking.customer_contact}</p>
                </div>
              </div>
              <div className="flex items-start">
                <Phone className="h-5 w-5 mr-3 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium">Emergency Contact</p>
                  <p className="text-sm">{booking.emergency_contact_name}</p>
                  <p className="text-sm text-gray-500">{booking.emergency_contact_phone}</p>
                </div>
              </div>
              <div className="flex items-start">
                <MapPin className="h-5 w-5 mr-3 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium">Address</p>
                  <p className="text-sm">Temporary: {booking.temp_address}</p>
                  <p className="text-sm text-gray-500">Permanent: {booking.perm_address}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Payment Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500">Booking Amount</label>
                <p className="font-medium">{formatCurrency(booking.booking_amount)}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Security Deposit</label>
                <p className="font-medium">{formatCurrency(booking.security_deposit_amount)}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Total Amount</label>
                <p className="font-medium">{formatCurrency(totalAmount)}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Paid Amount</label>
                <p className="font-medium">{formatCurrency(booking.paid_amount)}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Remaining Amount</label>
                <p className="font-medium text-blue-600">
                  {formatCurrency(remainingAmount)}
                </p>
              </div>
            </div>
            <div className="mt-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Payment History</h3>
              <PaymentHistory bookingId={booking.id} />
            </div>
          </div>

          {/* Documents Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Documents</h2>
            <div className="space-y-6">
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-500">Aadhar Number</label>
                  <p className="font-medium">{booking.aadhar_number}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Driving License</label>
                  <p className="font-medium">{booking.dl_number}</p>
                  <p className="text-sm text-gray-500">Expires on {formatDate(booking.dl_expiry_date)}</p>
                </div>
              </div>

              {booking.documents && booking.documents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {booking.documents.map((doc) => (
                    <div key={doc.id} className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        {doc.document_type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                      </label>
                      <button
                        onClick={() => handleImageClick(doc.document_url, doc.document_type)}
                        className="relative aspect-[3/2] w-full overflow-hidden rounded-lg bg-gray-100 hover:opacity-90 transition-opacity"
                      >
                        <Image
                          src={doc.document_url}
                          alt={doc.document_type}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 mt-4">
                  No documents available
                  {booking.documents ? ` (${booking.documents.length} documents found)` : ' (documents array is undefined)'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Add Vehicle Damage History section - only show for completed bookings */}
        {booking.status === 'completed' && (
          <div className="mt-6">
            <VehicleDamageHistory bookingId={booking.id} />
          </div>
        )}

        {/* Extension History Section */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4 mt-6">
          <BookingExtensionHistory bookingId={booking?.id || ''} />
        </div>
      </div>

      {/* Image Preview Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="relative max-w-4xl w-full mx-4">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
            >
              <X className="h-6 w-6" />
            </button>
            <div className="relative aspect-[3/2] w-full">
              <Image
                src={selectedImage}
                alt={selectedImageLabel}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
          </div>
        </div>
      )}

      {/* Complete Booking Modal */}
      {showCompleteModal && booking && (
        <CompleteBookingModal
          isOpen={showCompleteModal}
          onClose={() => {
            setShowCompleteModal(false);
            // Reset status back to previous if modal is closed
            setBooking(prev => prev ? { ...prev, status: prev.status } : null);
          }}
          onComplete={handleCompleteSuccess}
          bookingId={booking.id}
          totalAmount={booking.booking_amount + booking.security_deposit_amount}
          paidAmount={booking.paid_amount}
          securityDeposit={booking.security_deposit_amount}
        />
      )}
      
      {/* Replace the placeholder edit modal with this */}
      {showEditModal && booking && (
        <EditBookingModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onBookingUpdated={handleEditComplete}
          booking={convertToEditBookingFormat(booking)}
        />
      )}

      {booking && showExtendModal && (
        <ExtendBookingModal
          isOpen={showExtendModal}
          onClose={() => setShowExtendModal(false)}
          onBookingExtended={handleExtendComplete}
          booking={{
            id: booking.id,
            booking_id: booking.booking_id,
            end_date: booking.end_date,
            dropoff_time: booking.dropoff_time,
            booking_amount: booking.booking_amount
          }}
        />
      )}
    </div>
  );
} 