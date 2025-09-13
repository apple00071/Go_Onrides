'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import InstallPrompt from '@/components/pwa/InstallPrompt';
import type { UserProfile } from '@/types/database';
import type { AuthChangeEvent } from '@supabase/supabase-js';

const SKIP_AUTH_CHECK = true; // Skip redundant auth checks

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    const supabase = getSupabaseClient();

    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.replace('/login');
          return;
        }

        // Get user profile once
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (mounted) {
          setUser(profile);
          setError(null);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        if (mounted) {
          setError(error instanceof Error ? error.message : 'Failed to load user profile');
          setLoading(false);
        }
      }
    };

    // Only set up auth listener for sign out
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.replace('/login');
      }
    });

    // Initial profile fetch
    fetchUserProfile();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full px-6 py-8 bg-white shadow-md rounded-lg">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900">Something went wrong</h2>
            <p className="mt-2 text-sm text-gray-600">{error}</p>
            <button
              onClick={() => router.push('/login')}
              className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show nothing if no user (will redirect)
  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar user={user} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity md:hidden z-20"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={user} onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />

        <main className="flex-1 overflow-y-auto bg-gray-100">
          {children}
        </main>
      </div>

      <InstallPrompt />
    </div>
  );
} 