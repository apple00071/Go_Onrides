'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import FeeSettings from '@/components/admin/FeeSettings';
import { toast } from 'react-hot-toast';
import LogoUploader from '@/components/settings/LogoUploader';

export default function SettingsClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const supabase = getSupabaseClient();

    const checkSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }

        if (!session) {
          router.replace('/login');
          return;
        }

        if (!mounted) return;

        // Check if user has admin role
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          throw profileError;
        }

        if (!profile || profile.role !== 'admin') {
          router.replace('/dashboard');
          return;
        }

      } catch (error) {
        console.error('Error:', error);
        if (mounted) {
          setError(error instanceof Error ? error.message : 'An error occurred');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    checkSession();

    return () => {
      mounted = false;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-sm text-gray-600">Loading settings...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[400px] flex items-center justify-center p-4">
        <div className="bg-red-50 p-6 rounded-lg max-w-md w-full">
          <h3 className="text-lg font-medium text-red-800">Error loading settings</h3>
          <div className="mt-2 text-sm text-red-700">{error}</div>
          <div className="mt-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="w-full max-w-[100vw] overflow-x-hidden space-y-8">
        {/* Company Logo Section */}
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Company Logo</h2>
          <div className="bg-white shadow rounded-lg p-6">
            <LogoUploader />
          </div>
        </div>

        {/* Fee Settings Section */}
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Fee Settings</h2>
          <FeeSettings />
        </div>
      </div>
    </div>
  );
}
