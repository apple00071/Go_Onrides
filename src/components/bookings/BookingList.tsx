'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency, formatDateForDisplay, formatTime } from '@/lib/utils';

interface Booking {
  id: string;
  booking_id: string;
  customer_name: string;
  customer_contact: string;
  vehicle_details: {
    model: string;
    registration: string;
  };
  start_date: string;
  end_date: string;
  booking_amount: number;
  security_deposit_amount: number;
  total_amount: number;
  paid_amount: number;
  payment_status: string;
  status: string;
  created_at: string;
  pickup_time: string;
  dropoff_time: string;
}

interface BookingListProps {
  bookings: Booking[];
}

export default function BookingList({ bookings }: BookingListProps) {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Set client-side flag to prevent hydration mismatch
    setIsClient(true);

    const checkScreenSize = () => {
      const mobile = window.innerWidth < 1024; // lg breakpoint
      console.log('Screen width:', window.innerWidth, 'isMobile:', mobile);
      setIsMobile(mobile);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    in_use: 'bg-green-100 text-green-800',
    completed: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800'
  };

  const handleBookingClick = (booking: Booking) => {
    // Use the booking_id if available, otherwise fall back to id
    const bookingIdentifier = booking.booking_id || booking.id;
    if (bookingIdentifier) {
      router.push(`/dashboard/bookings/${encodeURIComponent(bookingIdentifier)}`);
    }
  };

  const handleCompleteClick = (e: React.MouseEvent, booking: Booking) => {
    e.stopPropagation(); // Prevent row click
    router.push(`/dashboard/bookings/${encodeURIComponent(booking.booking_id)}/complete`);
  };

  const getPaymentStatusDisplay = (booking: Booking) => {
    const totalRequired = booking.booking_amount + booking.security_deposit_amount;
    const paidAmount = booking.paid_amount || 0;
    return paidAmount >= totalRequired ? 'full' : paidAmount > 0 ? 'partial' : 'pending';
  };

  // Don't render anything until client-side hydration is complete
  if (!isClient) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  console.log('Rendering BookingList - isMobile:', isMobile, 'isClient:', isClient);

  return (
    <>
      {/* Debug info - remove in production */}
      <div className="mb-2 p-2 bg-yellow-100 text-xs text-yellow-800 rounded">
        Debug: Screen width: {typeof window !== 'undefined' ? window.innerWidth : 'N/A'}px |
        isMobile: {isMobile.toString()} |
        View: {isMobile ? 'Mobile Cards' : 'Desktop Table'}
      </div>

      {/* Desktop table view */}
      {!isMobile && (
        <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Booking ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vehicle
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payment
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bookings.map((booking) => (
              <tr
                key={booking.id}
                onClick={() => handleBookingClick(booking)}
                className="hover:bg-gray-50 cursor-pointer"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {booking.booking_id || booking.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {booking.customer_name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {booking.customer_contact}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {booking.vehicle_details.model}
                  </div>
                  <div className="text-sm text-gray-500">
                    {booking.vehicle_details.registration}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatDateForDisplay(booking.start_date)}
                    <span className="text-gray-500 ml-2">
                      {formatTime(booking.pickup_time)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    to {formatDateForDisplay(booking.end_date)}
                    <span className="ml-2">
                      {formatTime(booking.dropoff_time)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatCurrency(booking.booking_amount + booking.security_deposit_amount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex text-xs leading-5 font-semibold rounded-full px-2 py-1 ${
                    getPaymentStatusDisplay(booking) === 'full'
                      ? 'bg-green-100 text-green-800'
                      : getPaymentStatusDisplay(booking) === 'partial'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {getPaymentStatusDisplay(booking)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex text-xs leading-5 font-semibold rounded-full px-2 py-1 ${statusColors[booking.status as keyof typeof statusColors]}`}>
                    {booking.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {booking.status === 'in_use' && (
                    <button
                      onClick={(e) => handleCompleteClick(e, booking)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Complete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}

      {/* Mobile card view */}
      {isMobile && (
        <div className="space-y-4">
        {bookings.map((booking) => (
          <div
            key={booking.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleBookingClick(booking)}
          >
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-gray-900">{booking.booking_id || booking.id}</div>
                  <div className="text-sm text-gray-500">Booking ID</div>
                </div>
                <span className={`inline-flex text-xs leading-5 font-semibold rounded-full px-2 py-1 ${statusColors[booking.status as keyof typeof statusColors]}`}>
                  {booking.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="font-medium text-gray-900">{booking.customer_name || 'N/A'}</div>
                  <div className="text-sm text-gray-500">{booking.customer_contact || 'N/A'}</div>
                  <div className="text-xs text-gray-400">Customer</div>
                </div>
                <div>
                  <div className="font-medium text-gray-900">{booking.vehicle_details?.model || 'N/A'}</div>
                  <div className="text-sm text-gray-500">{booking.vehicle_details?.registration || 'N/A'}</div>
                  <div className="text-xs text-gray-400">Vehicle</div>
                </div>
              </div>

              <div>
                <div className="font-medium text-gray-900">
                  {formatDateForDisplay(booking.start_date)} {formatTime(booking.pickup_time)}
                </div>
                <div className="text-sm text-gray-500">
                  to {formatDateForDisplay(booking.end_date)} {formatTime(booking.dropoff_time)}
                </div>
                <div className="text-xs text-gray-400">Duration</div>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium text-gray-900">
                    {formatCurrency(booking.booking_amount + booking.security_deposit_amount)}
                  </div>
                  <div className="text-xs text-gray-400">Amount</div>
                </div>
                <span className={`inline-flex text-xs leading-5 font-semibold rounded-full px-2 py-1 ${
                  getPaymentStatusDisplay(booking) === 'full'
                    ? 'bg-green-100 text-green-800'
                    : getPaymentStatusDisplay(booking) === 'partial'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {getPaymentStatusDisplay(booking)}
                </span>
              </div>
            </div>
          </div>
        ))}
        </div>
      )}
    </>
  );
}