'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { ArrowLeft, Calendar, Clock, MapPin, Phone, User } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import Image from 'next/image';

interface BookingDetails {
  id: string;
  booking_id: string;
  customer_name: string;
  customer_contact: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  aadhar_number: string;
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
  documents?: {
    customer_photo?: string;
    aadhar_front?: string;
    aadhar_back?: string;
    dl_front?: string;
    dl_back?: string;
  };
}

export default function BookingDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingDetails | null>(null);

  useEffect(() => {
    const fetchBookingDetails = async () => {
      if (!params?.id) {
        setError('No booking ID provided');
        setLoading(false);
        return;
      }

      try {
        const supabase = getSupabaseClient();
        const bookingId = decodeURIComponent(params.id as string);
        
        // Try to fetch by booking_id first
        let { data: bookingData, error: fetchError } = await supabase
          .from('bookings')
          .select(`
            *,
            customers (
              documents
            )
          `)
          .eq('booking_id', bookingId)
          .single();

        // If not found by booking_id, try to fetch by id
        if (!bookingData && !fetchError) {
          ({ data: bookingData, error: fetchError } = await supabase
            .from('bookings')
            .select(`
              *,
              customers (
                documents
              )
            `)
            .eq('id', bookingId)
            .single());
        }

        if (fetchError) {
          console.error('Database error:', fetchError);
          throw new Error('Failed to fetch booking details');
        }

        if (!bookingData) {
          throw new Error('Booking not found');
        }

        // Merge customer documents with booking data
        const bookingWithDocuments = {
          ...bookingData,
          documents: bookingData.customers?.documents || {}
        };

        setBooking(bookingWithDocuments as BookingDetails);
        setError(null);
      } catch (error) {
        console.error('Error fetching booking:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch booking details');
        toast.error('Failed to load booking details');
      } finally {
        setLoading(false);
      }
    };

    fetchBookingDetails();
  }, [params?.id]);

  const handleStatusChange = async (newStatus: string) => {
    if (!booking) return;

    try {
      const supabase = getSupabaseClient();
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('booking_id', booking.booking_id)
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

  return (
    <div className="min-h-screen p-6 space-y-6">
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
              <p className="font-medium">{formatCurrency(booking.booking_amount + booking.security_deposit_amount)}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Paid Amount</label>
              <p className="font-medium">{formatCurrency(booking.paid_amount)}</p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              <label className="text-sm text-gray-500">Payment Status</label>
              <p className="font-medium capitalize">{booking.payment_status}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Payment Mode</label>
              <p className="font-medium capitalize">{booking.payment_mode}</p>
            </div>
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

            {booking.documents && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {booking.documents.customer_photo && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Customer Photo</label>
                    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-gray-100">
                      <Image
                        src={booking.documents.customer_photo}
                        alt="Customer Photo"
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </div>
                  </div>
                )}

                {booking.documents.aadhar_front && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Aadhar Card (Front)</label>
                    <div className="relative aspect-[3/2] w-full overflow-hidden rounded-lg bg-gray-100">
                      <Image
                        src={booking.documents.aadhar_front}
                        alt="Aadhar Front"
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </div>
                  </div>
                )}

                {booking.documents.aadhar_back && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Aadhar Card (Back)</label>
                    <div className="relative aspect-[3/2] w-full overflow-hidden rounded-lg bg-gray-100">
                      <Image
                        src={booking.documents.aadhar_back}
                        alt="Aadhar Back"
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </div>
                  </div>
                )}

                {booking.documents.dl_front && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Driving License (Front)</label>
                    <div className="relative aspect-[3/2] w-full overflow-hidden rounded-lg bg-gray-100">
                      <Image
                        src={booking.documents.dl_front}
                        alt="DL Front"
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </div>
                  </div>
                )}

                {booking.documents.dl_back && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Driving License (Back)</label>
                    <div className="relative aspect-[3/2] w-full overflow-hidden rounded-lg bg-gray-100">
                      <Image
                        src={booking.documents.dl_back}
                        alt="DL Back"
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 