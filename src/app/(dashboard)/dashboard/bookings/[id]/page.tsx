'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { ArrowLeft, Calendar, Clock, MapPin, Phone, User, X, PenSquare, CalendarPlus, Mail, Download, ZoomIn } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import VehicleDamageHistory from '@/components/bookings/VehicleDamageHistory';
import EditBookingModal from '@/components/bookings/EditBookingModal';
import ExtendBookingModal from '@/components/bookings/ExtendBookingModal';
import BookingExtensionHistory from '@/components/bookings/BookingExtensionHistory';
import PaymentHistory from '@/components/payments/PaymentHistory';
import { usePermissions } from '@/lib/usePermissions';
import { notifyBookingEvent } from '@/lib/notification';
import PaymentInformation from '@/components/bookings/PaymentInformation';
import { generateInvoice } from '@/lib/generateInvoice';

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
  status: BookingStatus;
  completed_at?: string;
  completed_by?: string;
  completed_by_user?: {
    email: string;
    username: string;
  };
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
  vehicle_remarks?: string;
  damage_charges: number;
  refund_amount: number;
  signatures?: {
    bookingSignature?: string;
    completionSignature?: string;
  };
}

type BookingStatus = 'pending' | 'confirmed' | 'in_use' | 'completed' | 'cancelled';
type PaymentStatus = 'full' | 'partial' | 'pending';
type PaymentMode = 'cash' | 'upi' | 'card' | 'bank_transfer';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  in_use: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800'
} as const;

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
  const [showEditModal, setShowEditModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [signature, setSignature] = useState<{ bookingSignature?: string; completionSignature?: string } | null>(null);
  const { isAdmin, canEdit, hasPermission } = usePermissions();

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      const supabase = getSupabaseClient();
      const bookingIdentifier = decodeURIComponent(params.id as string);
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingIdentifier);
      
      // First fetch the booking details
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .eq(isUUID ? 'id' : 'booking_id', bookingIdentifier)
        .single();

      if (bookingError) throw bookingError;

      // Then fetch the user profiles
      const [createdByUser, updatedByUser, completedByUser] = await Promise.all([
        bookingData.created_by ? supabase
          .from('profiles')
          .select('email, username')
          .eq('id', bookingData.created_by)
          .maybeSingle() : Promise.resolve({ data: null }),
        bookingData.updated_by ? supabase
          .from('profiles')
          .select('email, username')
          .eq('id', bookingData.updated_by)
          .maybeSingle() : Promise.resolve({ data: null }),
        bookingData.completed_by ? supabase
          .from('profiles')
          .select('email, username')
          .eq('id', bookingData.completed_by)
          .maybeSingle() : Promise.resolve({ data: null })
      ]);

      // Fetch customer documents
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('documents')
        .eq('id', bookingData.customer_id)
        .single();

      // Fetch both initial and completion signatures
      const { data: signaturesData, error: signatureError } = await supabase
        .from('booking_signatures')
        .select('signature_data, signature_type, created_at')
        .eq('booking_id', bookingData.id)
        .order('created_at', { ascending: true });

      if (signatureError) {
        console.error('Error fetching signatures:', signatureError);
      } else if (signaturesData && signaturesData.length > 0) {
        // Group signatures by type
        const bookingSignature = signaturesData.find(s => s.signature_type === 'booking')?.signature_data || 
                                 signaturesData[0]?.signature_data;
        const completionSignature = signaturesData.find(s => s.signature_type === 'completion')?.signature_data || 
                                    (signaturesData.length > 1 ? signaturesData[signaturesData.length - 1]?.signature_data : null);
        
        setSignature({
          bookingSignature,
          completionSignature
        });
      }

      const transformedBooking: BookingDetailsData = {
        ...bookingData,
        status: bookingData.status as BookingStatus,
        payment_status: bookingData.payment_status as BookingDetailsData['payment_status'],
        payment_mode: bookingData.payment_mode as BookingDetailsData['payment_mode'],
        created_by_user: createdByUser.data || undefined,
        updated_by_user: updatedByUser.data || undefined,
        completed_by_user: completedByUser.data || undefined,
        signatures: signature || undefined,
        damage_charges: bookingData.damage_charges || 0,
        refund_amount: bookingData.refund_amount || 0,
        documents: customerData?.documents || {
          customer_photo: '',
          aadhar_front: '',
          aadhar_back: '',
          dl_front: '',
          dl_back: ''
        }
      };

      setBooking(transformedBooking);
      setError(null);
    } catch (error) {
      console.error('Error fetching booking details:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookingDetails();
  }, [params?.id]);

  const handleStatusChange = async (newStatus: BookingStatus) => {
    if (!booking) return;
    
    if (newStatus === 'completed') {
      router.push(`/dashboard/bookings/${encodeURIComponent(params.id as string)}/complete`);
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
    await fetchBookingDetails();
    toast.success('Booking completed successfully');
  };

  const handleImageClick = (url: string, label: string) => {
    setSelectedImage(url);
    setSelectedImageLabel(label);
  };

  const handleEditComplete = async () => {
    setLoading(true);
    try {
      await fetchBookingDetails();
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
      await fetchBookingDetails();
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
      await fetchBookingDetails();
      toast.success('Payment recorded successfully');
    } catch (error) {
      console.error('Error refreshing booking data:', error);
      toast.error('Failed to refresh booking data');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async () => {
    try {
      if (!booking) {
        toast.error('Booking details not available');
        return;
      }

      const pdfBlob = await generateInvoice({
        ...booking,
        signature: booking.signatures?.completionSignature || booking.signatures?.bookingSignature
      });
      
      // Create a download link
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${booking.booking_id}.pdf`);
      
      // Append to body, click and cleanup
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error('Failed to download invoice');
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

  const totalAmount = booking.booking_amount + booking.security_deposit_amount;
  const remainingAmount = totalAmount - booking.paid_amount;

  // Add debug logging in render
  console.log('Current booking state:', booking);

  // For the image props, ensure documentUrl is a string
  const documentUrl = typeof booking?.documents === 'string' ? booking.documents : '/placeholder-image.jpg';

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
              onClick={() => router.push(`/dashboard/bookings/${encodeURIComponent(booking.booking_id)}/complete`)}
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
                  <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium capitalize ${STATUS_COLORS[booking?.status || 'pending']}`}>
                    {booking?.status}
                  </span>
                  {hasPermission('manageBookings') && booking.status !== 'completed' && booking.status !== 'cancelled' && (
                    <select
                      value={booking.status}
                      onChange={(e) => handleStatusChange(e.target.value as BookingStatus)}
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
                  Created by {booking?.created_by_user?.username || 'Unknown'} on {new Date(booking?.created_at || '').toLocaleString()}
                </p>
                {booking?.completed_at && (
                  <p className="text-sm text-gray-500">
                    Completed by {booking?.completed_by_user?.username || 'Unknown'} on {new Date(booking.completed_at).toLocaleString()}
                  </p>
                )}
                {booking?.updated_by_user && booking.updated_at !== booking.created_at && booking.updated_at !== booking.completed_at && (
                  <p className="text-sm text-gray-500">
                    Last updated by {booking.updated_by_user.username} on {new Date(booking.updated_at).toLocaleString()}
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
                <p className="font-medium">{booking?.customer_name || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Contact</label>
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-gray-400" />
                  <p className="font-medium">{booking?.customer_contact || 'N/A'}</p>
                </div>
                {booking?.customer_email && (
                  <div className="flex items-center mt-1">
                    <Mail className="h-4 w-4 mr-2 text-gray-400" />
                    <p className="text-sm">{booking.customer_email}</p>
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm text-gray-500">Aadhar Number</label>
                <p className="font-medium">{booking?.aadhar_number || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Date of Birth</label>
                <p className="font-medium">{booking?.date_of_birth ? new Date(booking.date_of_birth).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Driving License Number</label>
                <p className="font-medium">{booking?.dl_number || 'N/A'}</p>
                {booking?.dl_expiry_date && (
                  <p className="text-sm text-gray-500">Expires: {new Date(booking.dl_expiry_date).toLocaleDateString()}</p>
                )}
              </div>
              <div>
                <label className="text-sm text-gray-500">Emergency Contact</label>
                <p className="font-medium">{booking?.emergency_contact_name || 'N/A'}</p>
                <p className="text-sm text-gray-500">{booking?.emergency_contact_phone || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Temporary Address</label>
                <p className="font-medium">{booking?.temp_address || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Permanent Address</label>
                <p className="font-medium">{booking?.perm_address || 'N/A'}</p>
              </div>
              {booking.signatures?.bookingSignature && (
                <div className="col-span-1 md:col-span-2">
                  <label className="text-sm text-gray-500">Booking Signature</label>
                  <div className="border rounded-lg p-4 mt-1 max-w-md">
                    <img
                      src={booking.signatures.bookingSignature}
                      alt="Booking Signature"
                      className="max-w-full h-auto max-h-[150px] w-auto object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Payment Information with Invoice Download */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Payment Information</h2>
                <button
                  onClick={handleDownloadInvoice}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Invoice
                </button>
              </div>
              <PaymentInformation 
                booking={booking} 
                onPaymentCreated={handlePaymentCreated}
              />
            </div>
          </div>

          {/* Documents */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-4">Documents</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {booking?.documents && Object.entries(booking.documents).map(([key, url]) => (
                url ? (
                  <div key={key} className="relative group">
                    <button
                      onClick={() => handleImageClick(url, key.replace(/_/g, ' ').toUpperCase())}
                      className="w-full aspect-[3/2] relative rounded-lg overflow-hidden border border-gray-200 hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <Image
                        src={url}
                        alt={key.replace(/_/g, ' ')}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                        <ZoomIn className="text-white opacity-0 group-hover:opacity-100 h-6 w-6" />
                      </div>
                    </button>
                    <p className="mt-1 text-sm text-gray-600 text-center">
                      {key.replace(/_/g, ' ').toUpperCase()}
                    </p>
                  </div>
                ) : null
              ))}
            </div>
          </div>

          {/* Image Modal */}
          {selectedImage && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75" onClick={() => setSelectedImage(null)}>
              <div className="relative max-w-7xl w-full h-full p-4 flex items-center justify-center">
                <button
                  onClick={() => setSelectedImage(null)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-white text-gray-800 hover:bg-gray-100"
                >
                  <X className="h-6 w-6" />
                </button>
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    src={selectedImage}
                    alt={selectedImageLabel}
                    className="max-w-full max-h-full object-contain"
                  />
                  <p className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white px-4 py-2 rounded-md">
                    {selectedImageLabel}
                  </p>
                </div>
              </div>
            </div>
          )}
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
          <div className="bg-white rounded-lg shadow p-6">
            <BookingExtensionHistory bookingId={booking?.id || ''} />
          </div>

          {/* Completion Details Section */}
          {booking?.status === 'completed' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Vehicle Return & Completion Details</h2>
              
              {/* Completion Info */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Completion Information</h3>
                  <p className="text-sm text-gray-500">
                    Completed by {booking.completed_by_user?.username || 'Unknown'} on {new Date(booking.completed_at || '').toLocaleString()}
                  </p>
                </div>

                {/* Vehicle Return Details */}
                {booking.vehicle_remarks && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Vehicle Return Remarks</h3>
                    <p className="mt-1 text-gray-600">{booking.vehicle_remarks}</p>
                  </div>
                )}

                {/* Security Deposit Details */}
                {booking.security_deposit_amount > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Security Deposit Settlement</h3>
                    <div className="mt-2 space-y-2">
                      <p className="text-sm text-gray-600">
                        Initial Deposit: {formatCurrency(booking.security_deposit_amount)}
                      </p>
                      {booking.damage_charges > 0 && (
                        <p className="text-sm text-red-600">
                          Damage Charges: {formatCurrency(booking.damage_charges)}
                        </p>
                      )}
                      <p className="text-sm font-medium text-gray-900">
                        Final Refund: {formatCurrency(booking.refund_amount)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Completion Signature */}
                {booking.signatures?.completionSignature && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Return Confirmation Signature</h3>
                    <div className="mt-2 border rounded-lg p-4 max-w-md">
                      <img
                        src={booking.signatures.completionSignature}
                        alt="Return Confirmation Signature"
                        className="max-w-full h-auto max-h-[150px] w-auto object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Vehicle Damage History */}
              <div className="mt-6">
                <VehicleDamageHistory bookingId={booking?.id || ''} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
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