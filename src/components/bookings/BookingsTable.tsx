import React from 'react';
import { formatCurrency } from '@/lib/utils';
import { useRouter } from 'next/navigation';

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
  payment_status: 'full' | 'partial' | 'pending';
  status: 'confirmed' | 'pending' | 'cancelled' | 'in_use' | 'completed';
  created_at: string;
  paid_amount?: number;
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

  const getPaymentStatusDisplay = (booking: Booking) => {
    const totalRequired = booking.booking_amount + booking.security_deposit_amount;
    const paidAmount = booking.paid_amount || 0;
    return paidAmount >= totalRequired ? 'full' : paidAmount > 0 ? 'partial' : 'pending';
  };

  const getPaymentStatusColor = (booking: Booking) => {
    const status = getPaymentStatusDisplay(booking);
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
      <div className="overflow-x-auto">
        <table className="w-full divide-y divide-gray-200">
          <thead>
            <tr className="bg-gray-50">
              <th scope="col" className="whitespace-nowrap px-6 py-3 text-left">
                <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Booking ID
                </span>
              </th>
              <th scope="col" className="whitespace-nowrap px-6 py-3 text-left">
                <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Customer
                </span>
              </th>
              <th scope="col" className="whitespace-nowrap px-6 py-3 text-left">
                <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Vehicle
                </span>
              </th>
              <th scope="col" className="whitespace-nowrap px-6 py-3 text-left">
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
                  Payment
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
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className="text-sm font-medium text-gray-900">
                    {booking.booking_id || booking.id}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">
                      {booking.customer_name}
                      </span>
                      <span className="text-sm text-gray-500">
                      {booking.customer_contact}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">
                      {booking.vehicle_details.model}
                      </span>
                      <span className="text-sm text-gray-500">
                      {booking.vehicle_details.registration}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">
                      {new Date(booking.start_date).toLocaleDateString('en-IN')}
                      </span>
                      <span className="text-sm text-gray-500">
                      to {new Date(booking.end_date).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(booking.booking_amount + booking.security_deposit_amount)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${getPaymentStatusColor(booking)}`}
                    >
                      {getPaymentStatusDisplay(booking)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${getStatusColor(booking.status)}`}
                    >
                      {booking.status}
                    </span>
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