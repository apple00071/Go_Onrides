'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { ArrowLeft } from 'lucide-react';

export default function VehicleMaintenancePage({ params }: { params: { registration: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkVehicle();
  }, []);

  const checkVehicle = async () => {
    try {
      // First decode the URL-encoded registration from the params
      // This handles cases where the registration was already URL encoded
      const rawRegistration = decodeURIComponent(params.registration.replace(/\+/g, ' '));
      
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('registration', rawRegistration)
        .single();

      if (error) {
        console.error('Database error:', error);
        if (error.code === 'PGRST116') {
          setError(`Vehicle not found: ${rawRegistration}`);
        } else {
          setError('Failed to fetch vehicle details');
        }
      } else if (data) {
        // If we found the vehicle, redirect to the maintenance history page
        router.replace(`/dashboard/maintenance/vehicle/${encodeURIComponent(data.registration)}/history`);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="text-center">
        <div className="inline-block p-4 rounded-full bg-red-50 mb-4">
          <svg className="h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Vehicle not found</h2>
        <p className="text-gray-600 mb-6">
          The vehicle with registration number "{decodeURIComponent(params.registration.replace(/\+/g, ' '))}" could not be found in the system.
        </p>
        <button
          onClick={() => router.push('/dashboard/maintenance')}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Maintenance
        </button>
      </div>
    </div>
  );
} 