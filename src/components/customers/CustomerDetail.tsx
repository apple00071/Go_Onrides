'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { X } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'react-hot-toast';

interface Customer {
  id: string
  name: string
  email: string
  phone: string
  address: {
    temporary: string;
    permanent: string;
  }
  created_at: string
  documents: {
    customer_photo?: string;
    aadhar_front?: string;
    aadhar_back?: string;
    dl_front?: string;
    dl_back?: string;
  }
}

interface Booking {
  id: string
  created_at: string
  vehicle_details: {
    model: string;
    registration: string;
  }
  status: 'confirmed' | 'in_use' | 'completed' | 'cancelled'
  booking_amount: number
  security_deposit_amount: number
}

interface CustomerDetailProps {
  customer: Customer
}

const CustomerDetail = ({ customer }: CustomerDetailProps) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageLabel, setSelectedImageLabel] = useState<string>('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchBookings = async () => {
      if (!customer?.id) {
        setError('Customer ID is missing');
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('bookings')
          .select(`
            id,
            created_at,
            vehicle_details,
            status,
            booking_amount,
            security_deposit_amount
          `)
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) {
          console.error('Supabase error:', error);
          setError(`Failed to fetch bookings: ${error.message}`);
          return;
        }

        setBookings(data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching bookings:', err);
        setError('An unexpected error occurred while fetching bookings');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookings();
  }, [customer?.id, supabase]);

  const documentLabels = {
    customer_photo: 'Customer Photo',
    aadhar_front: 'Aadhar Card Front',
    aadhar_back: 'Aadhar Card Back',
    dl_front: 'Driving License Front',
    dl_back: 'Driving License Back',
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_use':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'confirmed':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleImageClick = (url: string, label: string) => {
    setSelectedImage(url);
    setSelectedImageLabel(label);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculateTotalAmount = (booking: Booking) => {
    return booking.booking_amount + (booking.security_deposit_amount || 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Customer Details</h1>
        <div className="flex gap-4">
          <Link
            href={`/customers/${customer.id}/edit`}
            className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600"
          >
            Edit Customer
          </Link>
          <Link
            href="/customers"
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            Back to List
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Name</h3>
            <p className="mt-1 text-lg text-gray-900">{customer.name}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Email</h3>
            <p className="mt-1 text-lg text-gray-900">{customer.email || 'N/A'}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Phone</h3>
            <p className="mt-1 text-lg text-gray-900">{customer.phone}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Address</h3>
            <div className="mt-1 space-y-2">
              <div>
                <p className="text-sm font-medium text-gray-700">Temporary Address</p>
                <p className="text-lg text-gray-900">
                  {typeof customer.address === 'object' ? customer.address.temporary : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Permanent Address</p>
                <p className="text-lg text-gray-900">
                  {typeof customer.address === 'object' ? customer.address.permanent : 'N/A'}
                </p>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Customer Since</h3>
            <p className="mt-1 text-lg text-gray-900">
              {new Date(customer.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Documents section */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Documents</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {customer.documents && Object.entries(customer.documents).map(([key, url]) => (
              url && (
                <div key={key} className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-700">
                    {documentLabels[key as keyof typeof documentLabels]}
                  </h3>
                  <button
                    onClick={() => handleImageClick(url, documentLabels[key as keyof typeof documentLabels])}
                    className="relative w-full h-32 overflow-hidden rounded-lg bg-gray-100 hover:opacity-90 transition-opacity"
                  >
                    <Image
                      src={url}
                      alt={documentLabels[key as keyof typeof documentLabels]}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    />
                  </button>
                </div>
              )
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders section */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Orders</h2>
          {isLoading ? (
            <div className="text-center py-4">
              <div className="animate-pulse flex space-x-4 justify-center">
                <div className="h-4 w-4 bg-gray-200 rounded-full"></div>
                <div className="h-4 w-4 bg-gray-200 rounded-full"></div>
                <div className="h-4 w-4 bg-gray-200 rounded-full"></div>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-4 text-red-600">{error}</div>
          ) : bookings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bookings.map((booking) => (
                    <tr key={booking.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(booking.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {booking.vehicle_details.model}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(booking.status)}`}>
                          {booking.status.replace('_', ' ').charAt(0).toUpperCase() + booking.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(calculateTotalAmount(booking))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link href={`/dashboard/bookings/${booking.id}`} className="text-indigo-600 hover:text-indigo-900">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">No bookings found for this customer.</p>
          )}
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-4xl w-full bg-white rounded-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">{selectedImageLabel}</h3>
              <button
                onClick={() => setSelectedImage(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="relative h-[80vh] w-full">
              <Image
                src={selectedImage}
                alt={selectedImageLabel}
                fill
                className="object-contain"
                sizes="(max-width: 1024px) 100vw, 80vw"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CustomerDetail 