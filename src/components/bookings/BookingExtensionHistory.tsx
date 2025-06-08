'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { format } from 'date-fns';

interface BookingExtension {
  id: string;
  booking_id: string;
  previous_end_date: string;
  previous_dropoff_time: string;
  new_end_date: string;
  new_dropoff_time: string;
  additional_amount: number;
  reason: string | null;
  created_at: string;
  created_by: string | null;
  created_by_user?: {
    email: string;
    username: string;
  };
}

interface BookingExtensionHistoryProps {
  bookingId: string;
}

export default function BookingExtensionHistory({ bookingId }: BookingExtensionHistoryProps) {
  const [extensions, setExtensions] = useState<BookingExtension[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchExtensionHistory = async () => {
      try {
        setLoading(true);
        const supabase = getSupabaseClient();
        
        // First get the extensions
        const { data: extensionsData, error: extensionsError } = await supabase
          .from('booking_extensions')
          .select('*')
          .eq('booking_id', bookingId)
          .order('created_at', { ascending: false });
          
        if (extensionsError) throw extensionsError;

        // Then get the user information for each extension
        const extensionsWithUsers = await Promise.all(
          (extensionsData || []).map(async (extension) => {
            if (!extension.created_by) return extension;

            const { data: userData, error: userError } = await supabase
              .from('profiles')
              .select('email, username')
              .eq('id', extension.created_by)
              .single();

            if (userError) {
              console.error('Error fetching user data:', userError);
              return {
                ...extension,
                created_by_user: undefined
              };
            }

            return {
              ...extension,
              created_by_user: userData
            };
          })
        );
        
        setExtensions(extensionsWithUsers || []);
      } catch (err) {
        console.error('Error fetching booking extensions:', err);
        setError('Failed to load extension history');
      } finally {
        setLoading(false);
      }
    };
    
    if (bookingId) {
      fetchExtensionHistory();
    }
  }, [bookingId]);
  
  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 text-red-500">
        <p>{error}</p>
      </div>
    );
  }
  
  if (extensions.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>No extension history available for this booking</p>
      </div>
    );
  }
  
  // Format the time string to display in the desired format (HH:MM)
  const formatTimeString = (timeStr: string) => {
    // Extract hours and minutes from the time string (assuming format like "HH:MM:SS")
    const match = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      const [_, hours, minutes] = match;
      return `(${hours}:${minutes})`;
    }
    return timeStr;
  };
  
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Extension History</h2>
      <div className="space-y-4">
        {extensions.map((extension) => (
          <div key={extension.id} className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-base font-medium">
                  {format(new Date(extension.created_at), 'MMMM d, yyyy h:mm a')}
                </div>
                <div className="text-gray-500 text-sm mt-1">
                  By: {extension.created_by_user?.username || 'System'}
                </div>
                
                <div className="mt-3 text-sm">
                  <div className="mb-1">
                    <span className="text-gray-500">From:</span> {format(new Date(extension.previous_end_date), 'MMMM d, yyyy')} {formatTimeString(extension.previous_dropoff_time)}
                  </div>
                  <div>
                    <span className="text-gray-500">To:</span> {format(new Date(extension.new_end_date), 'MMMM d, yyyy')} {formatTimeString(extension.new_dropoff_time)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-green-600 text-lg">
                  ₹{extension.additional_amount.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 