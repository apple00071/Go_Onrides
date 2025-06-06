'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { ArrowLeft, Calendar, Clock, MapPin, Phone, User, X, PenSquare, CalendarPlus, Mail } from 'lucide-react';
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
import PaymentInformation from '@/components/bookings/PaymentInformation';

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
  payment_status: 'full' | 'partial' | 'pending';
  paid_amount: number;
  payment_mode: 'cash' | 'upi' | 'card' | 'bank_transfer';
  status: 'pending' | 'confirmed' | 'in_use' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  created_by_user?: {
    email: string;
    username: string;
  };
  updated_by_user?: {
    email: string;
    username: string;
  };
  documents: {
    customer_photo?: string;
    aadhar_front?: string;
    aadhar_back?: string;
    dl_front?: string;
    dl_back?: string;
  };
}

// Helper function to convert our booking data format to the format expected by EditBookingModal
function convertToEditBookingFormat(booking: BookingDetailsData) {
  return {
    ...booking,
    documents: booking.documents
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
  const { isAdmin, canEdit, hasPermission } = usePermissions();

  const refreshBookingData = async () => {
    const supabase = getSupabaseClient();
    const bookingIdentifier = decodeURIComponent(params.id as string);
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingIdentifier);
    
    const { data: bookingData, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq(isUUID ? 'id' : 'booking_id', bookingIdentifier)
      .single();

    if (bookingError) throw bookingError;

    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .select('documents')
      .eq('id', bookingData.customer_id)
      .single();

    const transformedBooking: BookingDetailsData = {
      ...bookingData,
      status: bookingData.status as BookingDetailsData['status'],
      payment_status: bookingData.payment_status as BookingDetailsData['payment_status'],
      payment_mode: bookingData.payment_mode as BookingDetailsData['payment_mode'],
      documents: customerData?.documents || {
        customer_photo: '',
        aadhar_front: '',
        aadhar_back: '',
        dl_front: '',
        dl_back: ''
      }
    };

    setBooking(transformedBooking);
  };

  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        setLoading(true);
        await refreshBookingData();
        setError(null);
      } catch (error) {
        console.error('Error fetching booking details:', error);
        setError(error instanceof Error ? error.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchBookingDetails();
  }, [params?.id]);

  const handleStatusChange = async (newStatus: BookingDetailsData['status']) => {
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
      await refreshBookingData();
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
    setLoading(true);
    try {
      await refreshBookingData();
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
    setLoading(true);
    try {
      await refreshBookingData();
      toast.success('Booking extended successfully');
    } catch (error) {
      console.error('Error refreshing booking data:', error);
      toast.error('Failed to refresh booking data');
    } finally {
      setLoading(false);
      setShowExtendModal(false);
    }
  };

  const handlePaymentCreated = async () => {
    setLoading(true);
    try {
      await refreshBookingData();
      toast.success('Payment recorded successfully');
    } catch (error) {
      console.error('Error refreshing booking data:', error);
      toast.error('Failed to refresh booking data');
    } finally {
      setLoading(false);
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
  } as const;

  const totalAmount = booking.booking_amount + booking.security_deposit_amount;
  const remainingAmount = totalAmount - booking.paid_amount;

  // Add debug logging in render
  console.log('Current booking state:', booking);

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Bookings
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">
            Booking #{booking?.booking_id || booking?.id?.slice(0, 8)}
          </h1>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {booking?.status === 'in_use' && hasPermission('manageBookings') && (
            <button
              onClick={() => setShowCompleteModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Complete Booking
            </button>
          )}
          {hasPermission('manageBookings') && (
            <button
              onClick={() => setShowEditModal(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PenSquare className="h-4 w-4 mr-2" />
              Edit
            </button>
          )}
          {(booking?.status === 'confirmed' || booking?.status === 'in_use') && hasPermission('manageBookings') && (
            <button
              onClick={() => setShowExtendModal(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <CalendarPlus className="h-4 w-4 mr-2" />
              Extend
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Booking and Vehicle Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Booking Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium capitalize ${statusColors[booking?.status || 'pending']}`}>
                    {booking?.status}
                  </span>
                  {hasPermission('manageBookings') && booking.status !== 'completed' && booking.status !== 'cancelled' && (
                    <select
                      value={booking.status}
                      onChange={(e) => handleStatusChange(e.target.value as BookingDetailsData['status'])}
                      className="text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="in_use">In Use</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  )}
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Created by {booking?.created_by_user?.username || 'Unknown'} on {formatDate(booking?.created_at || '')}
                </p>
                {booking?.updated_by_user && booking.updated_at !== booking.created_at && (
                  <p className="text-sm text-gray-500">
                    Last updated by {booking.updated_by_user.username} on {formatDate(booking.updated_at)}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(totalAmount)}
                </p>
                <p className="text-sm text-gray-500">
                  {booking?.paid_amount ? `Paid: ${formatCurrency(booking.paid_amount)}` : 'No payment recorded'}
                </p>
                {remainingAmount > 0 && (
                  <p className="text-sm text-red-600">
                    Remaining: {formatCurrency(remainingAmount)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Booking Information */}
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Booking Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500">Vehicle</label>
                <p className="font-medium">{booking?.vehicle_details.model}</p>
                <p className="text-sm text-gray-500">{booking?.vehicle_details.registration}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Duration</label>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                  <p className="font-medium">{formatDate(booking?.start_date || '')}</p>
                </div>
                <div className="flex items-center mt-1">
                  <Clock className="h-4 w-4 mr-2 text-gray-400" />
                  <p className="text-sm">{booking?.pickup_time}</p>
                </div>
                <div className="flex items-center mt-2">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                  <p className="font-medium">{formatDate(booking?.end_date || '')}</p>
                </div>
                <div className="flex items-center mt-1">
                  <Clock className="h-4 w-4 mr-2 text-gray-400" />
                  <p className="text-sm">{booking?.dropoff_time}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Customer Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500">Name</label>
                <p className="font-medium">{booking?.customer_name}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Contact</label>
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-gray-400" />
                  <p className="font-medium">{booking?.customer_contact}</p>
                </div>
                {booking?.customer_email && (
                  <div className="flex items-center mt-1">
                    <Mail className="h-4 w-4 mr-2 text-gray-400" />
                    <p className="text-sm">{booking.customer_email}</p>
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm text-gray-500">Emergency Contact</label>
                <p className="font-medium">{booking?.emergency_contact_name}</p>
                <p className="text-sm text-gray-500">{booking?.emergency_contact_phone}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Address</label>
                <p className="font-medium">Temporary</p>
                <p className="text-sm text-gray-500">{booking?.temp_address}</p>
                <p className="font-medium mt-2">Permanent</p>
                <p className="text-sm text-gray-500">{booking?.perm_address}</p>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <PaymentInformation 
            booking={booking} 
            onPaymentCreated={handlePaymentCreated}
          />

          {/* Documents */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-4">Documents</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {booking?.documents && Object.entries(booking.documents).map(([key, url]) => (
                url ? (
                  <div key={key} className="relative">
                    <button
                      onClick={() => handleImageClick(url, key.replace(/_/g, ' ').toUpperCase())}
                      className="w-full aspect-[3/2] relative rounded-lg overflow-hidden border border-gray-200 hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <Image
                        src={url}
                        alt={key.replace(/_/g, ' ')}
                        fill
                        className="object-cover"
                      />
                    </button>
                    <p className="mt-1 text-sm text-gray-600 text-center">
                      {key.replace(/_/g, ' ').toUpperCase()}
                    </p>
                  </div>
                ) : null
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - History and Actions */}
        <div className="space-y-6">
          {/* Payment History */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment History</h2>
              <PaymentHistory bookingId={booking?.id || ''} />
            </div>
          </div>

          {/* Extension History */}
          <div className="bg-white rounded-lg shadow">
            <BookingExtensionHistory bookingId={booking?.id || ''} />
          </div>

          {/* Vehicle Damage History */}
          <div className="bg-white rounded-lg shadow">
            <VehicleDamageHistory bookingId={booking?.id || ''} />
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCompleteModal && booking && (
        <CompleteBookingModal
          isOpen={showCompleteModal}
          onClose={() => setShowCompleteModal(false)}
          onComplete={handleCompleteSuccess}
          bookingId={booking.id}
          totalAmount={totalAmount}
          paidAmount={booking.paid_amount}
          securityDeposit={booking.security_deposit_amount}
        />
      )}

      {showEditModal && booking && (
        <EditBookingModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onBookingUpdated={handleEditComplete}
          booking={booking}
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