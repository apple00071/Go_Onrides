'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { formatDate, formatCurrency } from '@/lib/utils';
import { CalendarClock } from 'lucide-react';

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
      <div className="p-6 text-center text-gray-500 border border-gray-200 rounded-lg bg-gray-50">
        <CalendarClock className="h-8 w-8 mx-auto text-gray-400 mb-2" />
        <p>No extension history available for this booking</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Extension History</h3>
      <div className="space-y-3">
        {extensions.map((extension) => (
          <div key={extension.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium">{formatDate(extension.created_at)}</div>
                <div className="text-sm text-gray-500">
                  Extended by {extension.created_by_user?.username || 'Unknown'}
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-green-600">
                  {formatCurrency(extension.additional_amount)}
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">From:</span> {formatDate(extension.previous_end_date)} ({extension.previous_dropoff_time})
              </div>
              <div>
                <span className="text-gray-500">To:</span> {formatDate(extension.new_end_date)} ({extension.new_dropoff_time})
              </div>
            </div>
            {extension.reason && (
              <div className="mt-2 text-sm text-gray-600 border-t border-gray-100 pt-2">
                <span className="font-medium">Reason:</span> {extension.reason}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 