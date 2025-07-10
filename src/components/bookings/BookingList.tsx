'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency, formatDate } from '@/lib/utils';

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

  const formatTimeDisplay = (time: string | undefined) => {
    if (!time) return '';
    const [hourStr, minutes] = time.split(':');
    const hours = parseInt(hourStr, 10);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes} ${period}`;
  };

  return (
    <>
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
                    {formatDate(booking.start_date)}
                    <span className="text-gray-500 ml-2">
                      {formatTimeDisplay(booking.pickup_time)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    to {formatDate(booking.end_date)}
                    <span className="ml-2">
                      {formatTimeDisplay(booking.dropoff_time)}
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
    </>
  );
} 