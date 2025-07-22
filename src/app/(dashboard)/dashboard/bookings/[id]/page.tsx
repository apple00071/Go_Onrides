'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { ArrowLeft, Calendar, Clock, MapPin, Phone, User, X, PenSquare, CalendarPlus, Mail, Download, ZoomIn, CheckCircle2, PlusCircle } from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime, formatTime } from '@/lib/utils';
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
import type { BookingDetails, BookingDetailsData, OutstationDetails } from '@/types/bookings';

type BookingStatus = 'pending' | 'confirmed' | 'in_use' | 'completed' | 'cancelled';
type PaymentStatus = 'full' | 'partial' | 'pending';
type PaymentMode = 'cash' | 'upi' | 'card' | 'bank_transfer';

// Define the status colors type
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  in_use: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800'
};

// Add a helper function to convert 24h to 12h format
const formatTimeDisplay = (time: string): string => {
  if (!time) return '';
  const [hourStr, minute] = time.split(':');
  const hour = parseInt(hourStr, 10);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${period}`;
};

// Update the fetchBookingDetails function to handle the new outstation details structure
async function fetchBookingDetails(bookingId: string): Promise<BookingDetailsData> {
  const supabase = getSupabaseClient();

  const { data: booking, error } = await supabase
    .from('bookings')
    .select(`
      *,
      created_by_user:created_by(
        email,
        username
      ),
      updated_by_user:updated_by(
        email,
        username
      ),
      completed_by_user:completed_by(
        email,
        username
      )
    `)
    .eq('id', bookingId)
    .single();

  if (error) {
    console.error('Error fetching booking details:', error);
    throw new Error('Failed to fetch booking details');
  }

  // Transform the outstation_details to match the new structure
  if (booking.rental_purpose === 'outstation' && booking.outstation_details) {
    booking.outstation_details = {
      destination: booking.outstation_details.destination || '',
      estimated_kms: booking.outstation_details.estimated_kms || 0,
      start_odo: booking.outstation_details.start_odo || 0,
      end_odo: booking.outstation_details.end_odo || 0
    };
  }

  return booking;
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
      
      // Add validation for undefined params.id
      if (!params.id) {
        console.error('Booking ID is undefined');
        router.push('/dashboard/bookings');
        return;
      }

      const bookingIdentifier = decodeURIComponent(params.id as string);
      
      // Validate booking identifier
      if (!bookingIdentifier) {
        console.error('Invalid booking identifier');
        router.push('/dashboard/bookings');
        return;
      }

      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingIdentifier);
      
      // First fetch the booking details with customer information
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          *,
          customer:customers (
            id,
            name,
            phone,
            email,
            alternative_phone,
            emergency_contact_phone,
            emergency_contact_phone1,
            aadhar_number,
            dob,
            dl_number,
            dl_expiry_date,
            documents
          ),
          created_by_user:profiles!created_by (
            email,
            username
          ),
          updated_by_user:profiles!updated_by (
            email,
            username
          ),
          completed_by_user:profiles!completed_by (
            email,
            username
          )
        `)
        .eq(isUUID ? 'id' : 'booking_id', bookingIdentifier)
        .single();

      if (bookingError) {
        console.error('Booking Error:', bookingError);
        throw bookingError;
      }

      if (!bookingData) {
        throw new Error('Booking not found');
      }

      // Fetch signatures separately
      const { data: signaturesData, error: signaturesError } = await supabase
        .from('booking_signatures')
        .select('signature_data, signature_type, created_at')
        .eq('booking_id', bookingData.id)
        .order('created_at', { ascending: true });

      if (signaturesError) {
        console.error('Error fetching signatures:', signaturesError);
      }

      // Process signatures
      const bookingSignature = signaturesData?.find(s => !s.signature_type || s.signature_type === 'booking')?.signature_data || null;
      const completionSignature = signaturesData?.find(s => s.signature_type === 'completion')?.signature_data || null;

      console.log('Raw signatures data:', signaturesData);
      console.log('Processed signatures:', { bookingSignature, completionSignature });

      // Get the public URLs for each document
      const getPublicUrl = (fileName: string) => {
        if (!fileName) return '';
        const path = `${bookingData.customer?.id}/${fileName}`;
        console.log('Getting public URL for:', path);
        const { data } = supabase.storage
          .from('customer-documents')
          .getPublicUrl(path);
        console.log('Public URL result:', data);
        return data?.publicUrl || '';
      };

      // Process customer documents to get public URLs
      const customerDocuments = bookingData.customer?.documents ? {
        customer_photo: bookingData.customer.documents.customer_photo ? 
          getPublicUrl(bookingData.customer.documents.customer_photo) : '',
        aadhar_front: bookingData.customer.documents.aadhar_front ? 
          getPublicUrl(bookingData.customer.documents.aadhar_front) : '',
        aadhar_back: bookingData.customer.documents.aadhar_back ? 
          getPublicUrl(bookingData.customer.documents.aadhar_back) : '',
        dl_front: bookingData.customer.documents.dl_front ? 
          getPublicUrl(bookingData.customer.documents.dl_front) : '',
        dl_back: bookingData.customer.documents.dl_back ? 
          getPublicUrl(bookingData.customer.documents.dl_back) : ''
      } : {};

      console.log('Raw customer documents:', bookingData.customer?.documents);
      console.log('Customer ID:', bookingData.customer?.id);
      console.log('Processed documents with URLs:', customerDocuments);
      console.log('Signatures:', { bookingSignature, completionSignature });

      // Transform the booking data
      const transformedBooking: BookingDetailsData = {
        ...bookingData,
        customer_name: bookingData.customer?.name || '',
        customer_contact: bookingData.customer?.phone || '',
        customer_email: bookingData.customer?.email || '',
        alternative_phone: bookingData.customer?.alternative_phone || null,
        emergency_contact_phone: bookingData.customer?.emergency_contact_phone || null,
        emergency_contact_phone1: bookingData.customer?.emergency_contact_phone1 || null,
        colleague_phone: bookingData.colleague_phone || null,
        aadhar_number: bookingData.customer?.aadhar_number || '',
        date_of_birth: bookingData.customer?.dob || null,
        dl_number: bookingData.customer?.dl_number || null,
        dl_expiry_date: bookingData.customer?.dl_expiry_date || null,
        temp_address: bookingData.temp_address || null,
        perm_address: bookingData.perm_address || null,
        customer: {
          id: bookingData.customer?.id || '',
          name: bookingData.customer?.name || '',
          phone: bookingData.customer?.phone || '',
          email: bookingData.customer?.email || '',
          documents: customerDocuments
        },
        submitted_documents: bookingData.submitted_documents || {
          passport: false,
          voter_id: false,
          original_dl: false,
          original_aadhar: false,
          other_document: false
        } as {
          passport: boolean;
          voter_id: boolean;
          original_dl: boolean;
          original_aadhar: boolean;
          other_document: boolean;
        },
        signatures: {
          bookingSignature,
          completionSignature
        },
        damage_charges: bookingData.damage_charges || 0,
        late_fee: bookingData.late_fee || 0,
        extension_fee: bookingData.extension_fee || 0,
        refund_amount: bookingData.refund_amount || 0,
        vehicle_remarks: bookingData.vehicle_remarks || ''
      };

      console.log('Customer documents:', bookingData.customer?.documents);
      console.log('Submitted documents:', transformedBooking.submitted_documents);
      console.log('Signatures:', { bookingSignature, completionSignature });
      console.log('Transformed booking data:', transformedBooking);

      setBooking(transformedBooking);
      setSignature({
        bookingSignature,
        completionSignature
      });
      setError(null);
    } catch (error) {
      console.error('Error fetching booking details:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while fetching booking details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookingDetails();
  }, [params?.id]);

  // Add automatic payment history refresh if payment is full or partial
  useEffect(() => {
    if (booking && (booking.payment_status === 'full' || booking.payment_status === 'partial') && booking.paid_amount > 0) {
      console.log('Booking has payment but may not have payment records, triggering refresh', {
        id: booking.id,
        payment_status: booking.payment_status,
        paid_amount: booking.paid_amount
      });
      
      // Dispatch event to ensure payment history component refreshes
      window.dispatchEvent(new CustomEvent('payment:created', { 
        detail: { bookingId: booking?.id, refreshTimestamp: Date.now() }
      }));
    }
  }, [booking?.id, booking?.payment_status, booking?.paid_amount]);

  const handleStatusChange = async (newStatus: BookingStatus) => {
    if (!booking) return;
    
    if (newStatus === 'completed') {
      router.push(`/dashboard/bookings/${encodeURIComponent(params.id as string)}/complete`);
      return;
    }

    try {
      const supabase = getSupabaseClient();

      // Get current user's session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) throw new Error('No active session');

      // Ensure all submitted_documents values are explicitly boolean
      type SubmittedDocuments = {
        passport: boolean;
        voter_id: boolean;
        original_dl: boolean;
        original_aadhar: boolean;
        other_document: boolean;
      };

      const defaultSubmittedDocs: SubmittedDocuments = {
        passport: false,
        voter_id: false,
        original_dl: false,
        original_aadhar: false,
        other_document: false
      };

      const currentSubmittedDocs = booking.submitted_documents || defaultSubmittedDocs;
      
      const submittedDocuments: SubmittedDocuments = {
        passport: Boolean(currentSubmittedDocs.passport),
        voter_id: Boolean(currentSubmittedDocs.voter_id),
        original_dl: Boolean(currentSubmittedDocs.original_dl),
        original_aadhar: Boolean(currentSubmittedDocs.original_aadhar),
        other_document: Boolean(currentSubmittedDocs.other_document)
      };

      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          status: newStatus,
          submitted_documents: submittedDocuments,
          updated_by: session.user.id
        })
        .eq('id', booking.id);

      if (updateError) {
        console.error('Update error:', updateError);
        throw new Error(updateError.message);
      }

      setBooking(prev => prev ? { ...prev, status: newStatus } : null);
      toast.success('Booking status updated successfully');

      // Notify about the status change
      await notifyBookingEvent('BOOKING_UPDATED', booking.id, {
        customerName: booking.customer_name,
        bookingId: booking.booking_id,
        oldStatus: booking.status,
        newStatus: newStatus,
        actionBy: session.user.id
      });

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
      
      // Dispatch event to refresh other components - explicitly for payment history
      window.dispatchEvent(new CustomEvent('payment:created', { 
        detail: { bookingId: booking?.id, refreshTimestamp: Date.now() }
      }));
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
        signature: (booking.signatures?.completionSignature || booking.signatures?.bookingSignature || undefined)
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
            <div className="flex flex-col gap-4">
              {/* Status Badge and Selector */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium capitalize ${STATUS_COLORS[booking?.status || 'pending']}`}>
                    {booking?.status}
                  </span>
                  {hasPermission('manageBookings') && booking.status !== 'completed' && booking.status !== 'cancelled' && (
                    <select
                      value={booking.status}
                      onChange={(e) => handleStatusChange(e.target.value as BookingStatus)}
                      className="text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 py-1 px-2"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_use">In Use</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrency(totalAmount)}
                  </p>
                  <p className="text-sm text-gray-500">
                    Paid: {formatCurrency(booking.paid_amount)}
                  </p>
                </div>
              </div>

              {/* Status Information */}
              <div className="text-sm space-y-1 text-gray-600">
                {booking?.created_by_user && (
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium text-gray-700 min-w-[85px]">Created by</span>
                    <span className="text-gray-900">{booking.created_by_user.email}</span>
                    <span className="text-gray-500">
                      on {formatDateTime(booking.created_at)}
                    </span>
                  </div>
                )}
                {booking.status === 'completed' && booking.completed_by_user && (
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium text-gray-700 min-w-[85px]">Completed by</span>
                    <span className="text-gray-900">{booking.completed_by_user.email}</span>
                    <span className="text-gray-500">
                      on {formatDateTime(booking.completed_at || '')}
                    </span>
                  </div>
                )}
                {booking.updated_at && booking.updated_by_user && booking.updated_at !== booking.created_at && (
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium text-gray-700 min-w-[85px]">Updated by</span>
                    <span className="text-gray-900">{booking.updated_by_user.email}</span>
                    <span className="text-gray-500">
                      on {formatDateTime(booking.updated_at)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Rental Purpose and Outstation Details */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Rental Details</h3>
            <div className="space-y-2">
              <p className="text-sm text-gray-500">
                <span className="font-medium">Rental Purpose:</span> {booking.rental_purpose === 'outstation' ? 'Outstation' : 'Local'}
              </p>
              {booking.rental_purpose === 'outstation' && booking.outstation_details && (
                <>
                  <p className="text-sm text-gray-500">
                    <span className="font-medium">Destination:</span> {booking.outstation_details?.destination || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-500">
                    <span className="font-medium">Estimated Kilometers:</span> {booking.outstation_details?.estimated_kms?.toString() || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-500">
                    <span className="font-medium">Start Odometer:</span> {booking.outstation_details?.start_odo?.toString() || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-500">
                    <span className="font-medium">End Odometer:</span> {booking.outstation_details?.end_odo?.toString() || 'N/A'}
                  </p>
                </>
              )}
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
                  <p className="text-sm">{formatTime(booking?.pickup_time || '')}</p>
                </div>
                <div className="flex items-center mt-2">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                  <p className="font-medium">{formatDate(booking?.end_date || '')}</p>
                </div>
                <div className="flex items-center mt-1">
                  <Clock className="h-4 w-4 mr-2 text-gray-400" />
                  <p className="text-sm">{formatTime(booking?.dropoff_time || '')}</p>
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
                <label className="text-sm text-gray-500">Contact Information</label>
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-gray-400" />
                  <p className="font-medium">{booking?.customer_contact || 'N/A'} (Primary)</p>
                </div>
                {booking?.alternative_phone && (
                  <div className="flex items-center mt-1">
                    <Phone className="h-4 w-4 mr-2 text-gray-400" />
                    <p className="text-sm text-gray-600">{booking.alternative_phone} (Alternative)</p>
                  </div>
                )}
                {booking?.emergency_contact_phone && (
                  <div className="flex items-center mt-1">
                    <Phone className="h-4 w-4 mr-2 text-red-400" />
                    <p className="text-sm text-red-600">{booking.emergency_contact_phone} (Father)</p>
                  </div>
                )}
                {booking?.emergency_contact_phone1 && (
                  <div className="flex items-center mt-1">
                    <Phone className="h-4 w-4 mr-2 text-red-400" />
                    <p className="text-sm text-red-600">{booking.emergency_contact_phone1} (Brother/Friend)</p>
                  </div>
                )}
                {booking?.colleague_phone && (
                  <div className="flex items-center mt-1">
                    <Phone className="h-4 w-4 mr-2 text-red-400" />
                    <p className="text-sm text-red-600">{booking.colleague_phone} (Colleague/Relative)</p>
                  </div>
                )}
                {booking?.customer_email && (
                  <div className="flex items-center mt-1">
                    <Mail className="h-4 w-4 mr-2 text-gray-400" />
                    <p className="text-sm text-gray-600">{booking.customer_email}</p>
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
                <label className="text-sm text-gray-500">Temporary Address</label>
                <p className="font-medium">{booking?.temp_address || 'N/A'}</p>
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="text-sm text-gray-500">Permanent Address</label>
                <p className="font-medium">{booking?.perm_address || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Payment Details</h2>
                <button
                  onClick={handleDownloadInvoice}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Invoice
                </button>
              </div>
              <PaymentInformation
                bookingAmount={booking.booking_amount}
                securityDeposit={booking.security_deposit_amount}
                paidAmount={booking.paid_amount}
                damageCharges={booking.damage_charges}
                lateFee={booking.late_fee}
                extensionFee={booking.extension_fee}
                status={booking.status}
                paymentStatus={booking.payment_status}
                onPaymentCreated={handlePaymentCreated}
                bookingId={booking.id}
                bookingNumber={booking.booking_id}
                customerName={booking.customer_name}
              />
            </div>
          </div>

          {/* Documents & Signatures */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Documents & Signatures</h2>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {/* Booking Signature */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-4">Booking Signature</h3>
                  {booking?.signatures?.bookingSignature && (
                    <div className="border rounded-lg p-4 max-w-xs cursor-pointer hover:border-blue-500 transition-colors"
                         onClick={() => booking.signatures?.bookingSignature && handleImageClick(booking.signatures.bookingSignature, 'Booking Signature')}>
                      <img
                        src={booking.signatures.bookingSignature}
                        alt="Booking Signature"
                        className="w-full h-24 object-contain"
                      />
                      <p className="text-xs text-gray-500 mt-2 text-center">Click to view full size</p>
                    </div>
                  )}
                  {!booking?.signatures?.bookingSignature && (
                    <p className="text-sm text-gray-500">No booking signature available</p>
                  )}
                </div>

                {/* Uploaded Documents */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-4">Uploaded Documents</h3>
                  {booking?.customer?.documents && Object.entries(booking.customer.documents).some(([_, url]) => url && url !== '') ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {Object.entries(booking.customer.documents).map(([type, url]) => {
                        // Skip if URL is empty or null
                        if (!url || url === '') return null;
                        
                        // Format the document type for display
                        const displayType = type
                          .replace(/_/g, ' ')
                          .split(' ')
                          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                          .join(' ');

                        return (
                          <div key={type} className="relative group">
                            <div className="aspect-w-3 aspect-h-2 rounded-lg overflow-hidden border border-gray-200">
                              <img
                                src={url}
                                alt={displayType}
                                className="w-full h-32 object-cover cursor-pointer hover:opacity-75 transition-opacity"
                                onClick={() => handleImageClick(url, displayType)}
                              />
                            </div>
                            <div className="mt-1 text-xs font-medium text-gray-700 text-center">
                              {displayType}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No documents uploaded</p>
                  )}
                </div>

                {/* Physical Documents */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-4">Physical Documents Submitted</h3>
                  {booking?.submitted_documents ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {Object.entries(booking.submitted_documents).map(([type, isSubmitted]) => {
                        // Format the document type for display
                        const displayType = type
                          .replace(/_/g, ' ')
                          .split(' ')
                          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                          .join(' ');

                        return (
                          <div key={type} className="flex items-center space-x-2 bg-gray-50 p-2 rounded">
                            {isSubmitted ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                            ) : (
                              <X className="h-4 w-4 text-red-500 flex-shrink-0" />
                            )}
                            <span className="text-sm text-gray-700">
                              {displayType}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No physical documents information available</p>
                  )}
                </div>
              </div>
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
          <div className="bg-white rounded-lg shadow p-6">
            <BookingExtensionHistory bookingId={booking?.id || ''} />
          </div>

          {/* Completion Details Section */}
          {booking?.status === 'completed' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Vehicle Return & Completion Details</h2>
              
              {/* Completion Info */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Completion Information</h3>
                  <p className="text-sm text-gray-500">
                    Completed by {booking.completed_by_user?.username || 'Unknown'} on {formatDateTime(booking.completed_at || new Date())}
                  </p>
                </div>

                {/* Additional Fees Section */}
                {(booking.damage_charges > 0 || booking.late_fee > 0 || booking.extension_fee > 0) && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Additional Fees</h3>
                    <dl className="mt-2 space-y-2">
                      {booking.damage_charges > 0 && (
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-500">Damage Charges:</dt>
                          <dd className="text-sm font-medium text-red-600">{formatCurrency(booking.damage_charges)}</dd>
                        </div>
                      )}
                      {booking.late_fee > 0 && (
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-500">Late Fee:</dt>
                          <dd className="text-sm font-medium text-red-600">{formatCurrency(booking.late_fee)}</dd>
                        </div>
                      )}
                      {booking.extension_fee > 0 && (
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-500">Extension Fee:</dt>
                          <dd className="text-sm font-medium text-red-600">{formatCurrency(booking.extension_fee)}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                )}

                {/* Vehicle Return Details */}
                {booking.vehicle_remarks && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Vehicle Return Remarks</h3>
                    <p className="mt-1 text-gray-600">{booking.vehicle_remarks}</p>
                  </div>
                )}

                {/* Late Return Details */}
                {(booking.late_fee > 0 || booking.extension_fee > 0) && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Late Return Details</h3>
                    <div className="mt-2 space-y-2">
                      {booking.late_fee > 0 && (
                        <p className="text-sm text-red-600">
                          Late Fee: {formatCurrency(booking.late_fee)}
                        </p>
                      )}
                      {booking.extension_fee > 0 && (
                        <p className="text-sm text-red-600">
                          Extension Fee: {formatCurrency(booking.extension_fee)}
                        </p>
                      )}
                    </div>
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
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Return Confirmation Signature</h3>
                  {booking.signatures?.completionSignature ? (
                    <div className="mt-2 border rounded-lg p-4 max-w-md">
                      <img
                        src={booking.signatures.completionSignature}
                        alt="Return Confirmation Signature"
                        className="max-w-full h-auto max-h-[150px] w-auto object-contain"
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mt-2">No completion signature available</p>
                  )}
                </div>

                {/* Vehicle Damage History */}
                <div className="mt-6">
                  <VehicleDamageHistory bookingId={booking?.id || ''} />
                </div>
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

      {/* Image Preview Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" 
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl w-full h-[90vh] bg-white rounded-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 right-0 p-4 z-10">
              <button
                onClick={() => setSelectedImage(null)}
                className="bg-white rounded-full p-2 hover:bg-gray-100 transition-colors"
              >
                <X className="h-6 w-6 text-gray-600" />
              </button>
            </div>
            
            <div className="h-full flex flex-col">
              <div className="p-4 border-b">
                <h3 className="text-lg font-medium text-gray-900">{selectedImageLabel}</h3>
              </div>
              
              <div className="flex-1 overflow-auto p-4">
                <div className="min-h-full flex items-center justify-center">
                  <img
                    src={selectedImage}
                    alt={selectedImageLabel}
                    className="max-w-full max-h-[calc(90vh-8rem)] object-contain"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 