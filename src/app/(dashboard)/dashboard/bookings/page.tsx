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
      
      // First, check if we're authenticated
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError) {
        console.error('Auth error:', authError);
        throw new Error('Authentication error');
      }
      
      if (!session) {
        console.error('No session found');
        throw new Error('No active session');
      }

      // Fetch bookings
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
          total_amount,
          paid_amount
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching bookings:', error);
        throw error;
      }

      console.log('Raw bookings data:', data);

      if (!data || data.length === 0) {
        console.log('No bookings found');
        setBookings([]);
        return;
      }

      // Transform the data to match our Booking interface
      const transformedBookings: Booking[] = data.map((booking: any) => {
        console.log('Processing booking:', booking);
        
        // Parse vehicle details from JSONB
        const vehicleDetails = booking.vehicle_details || {};
        
        const transformed = {
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
          amount: booking.total_amount || booking.booking_amount + (booking.security_deposit_amount || 0),
          payment: booking.payment_status || 'pending',
          status: booking.status || 'pending',
        };
        
        console.log('Transformed booking:', transformed);
        return transformed;
      });

      console.log('Final transformed bookings:', transformedBookings);
      setBookings(transformedBookings);
    } catch (error) {
      console.error('Error in fetchBookings:', error);
      toast.error('Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    // Simple test query to check if there's any data
    const testQuery = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.error('No session found in test query');
          return;
        }

        console.log('Running test query...');
        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .limit(1);

        console.log('Test query result:', {
          hasData: !!data && data.length > 0,
          firstRecord: data?.[0],
          error
        });
      } catch (error) {
        console.error('Error in test query:', error);
      }
    };

    testQuery();
    fetchBookings();
  }, [fetchBookings, supabase]);

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