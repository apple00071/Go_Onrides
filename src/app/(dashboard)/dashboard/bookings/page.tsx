'use client';

import React from 'react';
import { useEffect, useState, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import BookingsTable from '@/components/bookings/BookingsTable';
import BookingsControls from '@/components/bookings/BookingsControls';
import BookingModal from '@/components/bookings/BookingModal';
import { Search, Filter, Plus, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Booking {
  id: string;
  customer: {
    name: string;
    phone: string;
  };
  vehicle: {
    model: string;
    number: string;
  };
  duration: {
    start: string;
    end: string;
  };
  amount: number;
  payment: 'full' | 'partial' | 'pending';
  status: 'confirmed' | 'pending' | 'cancelled';
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const supabase = getSupabaseClient();

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Fetching bookings...');
      
      const supabase = getSupabaseClient();
      
      // Check authentication status
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError) {
        console.error('Authentication error:', authError);
        toast.error('Authentication error: Please try logging in again');
        return;
      }

      if (!session) {
        console.error('No active session');
        toast.error('Please log in to view bookings');
        return;
      }

      console.log('Session found, fetching bookings...');
      
      // Fetch bookings with only existing columns
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_id,
          customer_name,
          customer_contact,
          vehicle_details,
          start_date,
          end_date,
          booking_amount,
          security_deposit_amount,
          payment_status,
          status,
          paid_amount,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching bookings:', error);
        console.log('Detailed error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        toast.error(`Failed to fetch bookings: ${error.message}`);
        return;
      }

      if (!data) {
        console.log('No data returned');
        setBookings([]);
        return;
      }

      console.log('Raw bookings data:', data);

      if (data.length === 0) {
        console.log('No bookings found in the data');
        setBookings([]);
        return;
      }

      // Transform the data to match our Booking interface
      const transformedBookings: Booking[] = data.map((booking: any) => {
        console.log('Processing booking:', booking);
        
        // Parse vehicle details from JSONB
        const vehicleDetails = typeof booking.vehicle_details === 'string' 
          ? JSON.parse(booking.vehicle_details) 
          : (booking.vehicle_details || {});
        
        // Calculate total amount from booking_amount and security_deposit_amount
        const totalAmount = (booking.booking_amount || 0) + (booking.security_deposit_amount || 0);
        const paidAmount = booking.paid_amount || 0;

        // Determine payment status based on paid amount vs total amount
        let paymentStatus: 'full' | 'partial' | 'pending' = 'pending';
        if (paidAmount >= totalAmount) {
          paymentStatus = 'full';
        } else if (paidAmount > 0) {
          paymentStatus = 'partial';
        }

        return {
          id: booking.booking_id || booking.id,
          customer: {
            name: booking.customer_name || 'N/A',
            phone: booking.customer_contact || 'N/A',
          },
          vehicle: {
            model: vehicleDetails.model || 'N/A',
            number: vehicleDetails.registration || 'N/A',
          },
          duration: {
            start: booking.start_date ? new Date(booking.start_date).toLocaleDateString('en-IN') : 'N/A',
            end: booking.end_date ? new Date(booking.end_date).toLocaleDateString('en-IN') : 'N/A',
          },
          amount: totalAmount,
          payment: paymentStatus,
          status: booking.status || 'pending',
        };
      });

      console.log('Final transformed bookings:', transformedBookings);
      setBookings(transformedBookings);
    } catch (error) {
      console.error('Error in fetchBookings:', error);
      toast.error('Failed to fetch bookings: Unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleRefresh = () => {
    fetchBookings();
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
  };

  const handleNewBooking = () => {
    setIsModalOpen(true);
  };

  // Filter bookings based on search query and status
  const filteredBookings = bookings.filter((booking) => {
    console.log('Filtering booking:', booking);
    
    const matchesSearch =
      searchQuery === '' ||
      booking.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.customer.phone.includes(searchQuery) ||
      booking.vehicle.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;

    console.log('Search match:', matchesSearch, 'Status match:', matchesStatus);
    return matchesSearch && matchesStatus;
  });

  console.log('Filtered bookings:', filteredBookings);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage all vehicle bookings and their status
        </p>
      </div>

      <BookingsControls
        onSearch={handleSearch}
        onStatusFilter={handleStatusFilter}
        onRefresh={handleRefresh}
        onNewBooking={handleNewBooking}
      />

      {/* Content */}
      <div className="mt-6">
        {loading ? (
          <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-gray-200 bg-white">
            <div className="flex flex-col items-center space-y-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              <p className="text-sm text-gray-500">Loading bookings...</p>
            </div>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <Search className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No bookings found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery || statusFilter !== 'all'
                ? "Try adjusting your search or filter to find what you're looking for."
                : 'Get started by creating a new booking.'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <div className="mt-6">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Booking
                </button>
              </div>
            )}
          </div>
        ) : (
          <BookingsTable bookings={filteredBookings} />
        )}
      </div>

      <BookingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onBookingCreated={() => {
          setIsModalOpen(false);
          fetchBookings();
          toast.success('Booking created successfully');
        }}
      />
    </div>
  );
} 