import React from 'react';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { User, Clock } from 'lucide-react';

interface BookingVehicleDetails {
  model: string;
  registration: string;
}

interface Booking {
  id: string;
  booking_id: string;
  customer_name: string;
  customer_contact: string;
  vehicle_details: BookingVehicleDetails;
  start_date: string;
  end_date: string;
  pickup_time?: string;
  dropoff_time?: string;
  booking_amount: number;
  security_deposit_amount: number;
  paid_amount?: number;
  status: string;
  created_at: string;
  created_by_user?: {
    email: string;
    username: string;
  };
}

interface BookingsTableProps {
  bookings: Booking[];
}

const BookingsTable: React.FC<BookingsTableProps> = ({ bookings }) => {
  const router = useRouter();

  const getStatusColor = (status: string) => {
    const colors = {
      confirmed: 'bg-blue-100 text-blue-800',
      pending: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800',
      in_use: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const calculateTotalAmount = (booking: Booking) => {
    return booking.booking_amount + booking.security_deposit_amount;
  };

  const getPaymentStatusDisplay = (booking: Booking) => {
    const totalRequired = calculateTotalAmount(booking);
    const paidAmount = booking.paid_amount || 0;
    return paidAmount >= totalRequired ? 'full' : paidAmount > 0 ? 'partial' : 'pending';
  };

  const getPaymentStatusColor = (status: string) => {
    const colors = {
      full: 'bg-green-100 text-green-800',
      partial: 'bg-yellow-100 text-yellow-800',
      pending: 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const handleRowClick = (bookingId: string) => {
    router.push(`/dashboard/bookings/${bookingId}`);
  };

  if (!bookings || bookings.length === 0) {
    return (
      <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
        <p className="text-gray-500">No bookings available</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-white">
      {/* Debug indicator - remove in production */}
      <div className="bg-yellow-100 text-yellow-800 text-xs p-2 text-center border-b">
        📱 DEBUG: Screen width: {typeof window !== 'undefined' ? window.innerWidth : 'SSR'}px |
        Mobile details: {typeof window !== 'undefined' && window.innerWidth < 768 ? 'SHOULD SHOW' : 'HIDDEN'}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full divide-y divide-gray-200">
          <thead>
            <tr className="bg-gray-50">
              <th scope="col" className="whitespace-nowrap px-6 py-3 text-left">
                <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Booking Details
                </span>
              </th>
              <th scope="col" className="whitespace-nowrap px-6 py-3 text-left hidden md:table-cell">
                <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Customer
                </span>
              </th>
              <th scope="col" className="whitespace-nowrap px-6 py-3 text-left hidden md:table-cell">
                <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Vehicle
                </span>
              </th>
              <th scope="col" className="whitespace-nowrap px-6 py-3 text-left hidden lg:table-cell">
                <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Duration
                </span>
              </th>
              <th scope="col" className="whitespace-nowrap px-6 py-3 text-left">
                <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Amount
                </span>
              </th>
              <th scope="col" className="whitespace-nowrap px-6 py-3 text-left">
                <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {bookings.map((booking) => (
              <tr 
                key={booking.id} 
                className="hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => handleRowClick(booking.booking_id || booking.id)}
                onKeyDown={(e) => e.key === 'Enter' && handleRowClick(booking.booking_id || booking.id)}
                tabIndex={0}
                role="button"
              >
                <td className="whitespace-nowrap px-6 py-4 align-top">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">
                      #{booking.booking_id || booking.id.slice(0, 8)}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                      <User className="h-3 w-3" />
                      <span>{booking.created_by_user?.username || 'Unknown'}</span>
                    </div>

                    {/* Mobile-only expanded details */}
                    <div className="mt-2 space-y-1 md:hidden text-xs text-gray-600 border-t border-gray-200 pt-2">
                      <div>
                        <span className="font-medium text-gray-700">Customer:</span>
                        <span className="ml-1">{booking.customer_name}</span>
                        {booking.customer_contact ? <span className="ml-1 text-gray-500">• {booking.customer_contact}</span> : null}
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Vehicle:</span>
                        <span className="ml-1">{booking.vehicle_details.model}</span>
                        <span className="ml-1 text-gray-500">• {booking.vehicle_details.registration}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-gray-500" />
                        <span>
                          {formatDate(booking.start_date)} {formatTime(booking.pickup_time || '')}
                          <span className="mx-1 text-gray-500">to</span>
                          {formatDate(booking.end_date)} {formatTime(booking.dropoff_time || '')}
                        </span>
                      </div>
                      {typeof booking.paid_amount !== 'undefined' && (
                        <div className="text-gray-500">Paid: {formatCurrency(booking.paid_amount || 0)}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 hidden md:table-cell align-top">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">
                      {booking.customer_name}
                    </span>
                    <span className="text-sm text-gray-500">
                      {booking.customer_contact}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 hidden md:table-cell align-top">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">
                      {booking.vehicle_details.model}
                    </span>
                    <span className="text-sm text-gray-500">
                      {booking.vehicle_details.registration}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 hidden lg:table-cell">
                  <div className="flex flex-col">
                    <div>
                      <span className="text-sm font-medium text-gray-900">
                        {formatDate(booking.start_date)}
                      </span>
                      <span className="text-sm text-gray-500 ml-2">
                        {formatTime(booking.pickup_time || '')}
                      </span>
                    </div>
                    <div className="mt-1">
                      <span className="text-sm text-gray-500">to </span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatDate(booking.end_date)}
                      </span>
                      <span className="text-sm text-gray-500 ml-2">
                        {formatTime(booking.dropoff_time || '')}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(calculateTotalAmount(booking))}
                    </span>
                    {booking.paid_amount ? (
                      <span className="text-xs text-gray-500">
                        Paid: {formatCurrency(booking.paid_amount)}
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex flex-col gap-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${getStatusColor(booking.status)}`}
                    >
                      {booking.status}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${getPaymentStatusColor(getPaymentStatusDisplay(booking))}`}
                    >
                      {getPaymentStatusDisplay(booking)}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BookingsTable; 