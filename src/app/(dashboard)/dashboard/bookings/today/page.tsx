'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { format } from 'date-fns';
import { Search, Filter, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import BookingsTable from '@/components/bookings/BookingsTable';
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
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  created_by_user?: {
    email: string;
    username: string;
  };
  updated_by_user?: {
    email: string;
    username: string;
  };
  paid_amount?: number;
  pickup_time?: string;
  dropoff_time?: string;
}

export default function TodaysBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchTodaysBookings();
  }, []);

  const fetchTodaysBookings = async () => {
    try {
      setLoading(true);
      const supabase = getSupabaseClient();
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // First, get today's bookings with user data
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          created_by_user:profiles!bookings_created_by_fkey(
            email,
            username
          ),
          updated_by_user:profiles!bookings_updated_by_fkey(
            email,
            username
          )
        `)
        .gte('start_date', `${today}T00:00:00`)
        .lte('start_date', `${today}T23:59:59`)
        .order('start_date', { ascending: true });

      if (bookingsError) throw bookingsError;

      // Get related payments to calculate paid amounts
      const bookingIds = bookingsData?.map(b => b.id) || [];
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('booking_id, amount')
        .in('booking_id', bookingIds);

      if (paymentsError) throw paymentsError;

      // Calculate total paid amount per booking
      const paidAmounts = (paymentsData || []).reduce((acc, payment) => {
        acc[payment.booking_id] = (acc[payment.booking_id] || 0) + (payment.amount || 0);
        return acc;
      }, {} as Record<string, number>);

      // Enrich bookings with payment data and ensure all required fields are present
      const enrichedBookings = (bookingsData || []).map(booking => {
        // Safely get vehicle details with fallbacks
        const vehicleModel = booking.vehicle_model || 
                           (booking.vehicle_details?.model || 'Unknown');
        const vehicleRegistration = booking.vehicle_registration || 
                                 (booking.vehicle_details?.registration || 'N/A');
        
        return {
          ...booking,
          paid_amount: paidAmounts[booking.id] || 0,
          vehicle_details: {
            model: vehicleModel,
            registration: vehicleRegistration
          },
          customer_name: booking.customer_name || 'Unknown',
          customer_contact: booking.customer_phone || '',
          // Ensure all required Booking interface fields are present
          booking_id: booking.booking_id || booking.id,
          start_date: booking.start_date || booking.created_at,
          end_date: booking.end_date || '',
          booking_amount: booking.booking_amount || 0,
          security_deposit_amount: booking.security_deposit_amount || 0,
          payment_status: booking.payment_status || 'pending',
          status: booking.status || 'pending',
          created_at: booking.created_at,
          updated_at: booking.updated_at || booking.created_at,
          created_by: booking.created_by || null,
          updated_by: booking.updated_by || null
        };
      });

      setBookings(enrichedBookings);
    } catch (error) {
      console.error('Error fetching today\'s bookings:', error);
      toast.error('Failed to load today\'s bookings');
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = searchTerm === '' || 
      booking.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.customer_contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.vehicle_details.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.vehicle_details.registration.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (booking.booking_id || booking.id).toString().toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filterStatus === 'all' || booking.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterStatus(e.target.value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-semibold text-gray-900">Today's Bookings</h1>
        <button
          onClick={() => router.push('/dashboard/bookings/new')}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Booking
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="w-full md:w-96">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search bookings..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>

        <div className="w-full md:w-48">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-5 w-5 text-gray-400" />
            </div>
            <select
              value={filterStatus}
              onChange={handleFilterChange}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_use">In Use</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      <BookingsTable bookings={filteredBookings} />
    </div>
  );
}
