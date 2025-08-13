'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import type { UserProfile } from '@/types/database';
import type { AuthChangeEvent } from '@supabase/supabase-js';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    const supabase = getSupabaseClient();

    const checkSession = async () => {
      try {
        console.log('Checking session...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Session error:', sessionError);
          throw sessionError;
        }

        if (!session) {
          console.log('No session found, redirecting to login...');
          router.replace('/login');
          return;
        }

        // Only proceed if component is still mounted
        if (!mounted) return;

        console.log('Session found, fetching profile...');
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('Profile error:', profileError);
          throw profileError;
        }

        if (!profile) {
          console.log('No profile found, redirecting to login...');
          router.replace('/login');
          return;
        }

        // Store current path
        const currentPath = window.location.pathname;
        console.log('Current path:', currentPath);

        // Only redirect if we're on the exact /dashboard path
        if (currentPath === '/dashboard') {
          if (profile.role === 'admin') {
            console.log('Redirecting admin to admin dashboard...');
            router.replace('/dashboard/admin');
            return;
          } else if (profile.role === 'worker') {
            console.log('Redirecting worker to worker dashboard...');
            router.replace('/dashboard/workers');
            return;
          }
        } else if (profile.role === 'worker' && currentPath.startsWith('/dashboard/admin')) {
          // Prevent workers from accessing admin routes
          console.log('Worker attempting to access admin route, redirecting...');
          router.replace('/dashboard/workers');
          return;
        }

        // Only update state if component is still mounted
        if (mounted) {
          console.log('Setting user profile:', profile);
          setUser(profile);
          setError(null);
          setLoading(false); // Set loading to false here
        }
      } catch (error) {
        console.error('Error in checkSession:', error);
        if (mounted) {
          setError(error instanceof Error ? error.message : 'An error occurred');
          setLoading(false); // Make sure to set loading to false even on error
          
          if (retryCount >= 2) {
            router.replace('/login');
          } else {
            setRetryCount(prev => prev + 1);
            setTimeout(checkSession, 1000);
          }
        }
      }
    };

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
      console.log('Auth state changed:', event);
      if (event === 'SIGNED_OUT') {
        router.replace('/login');
      } else if (event === 'SIGNED_IN' && mounted) {
        checkSession();
      }
    });

    // Initial session check
    checkSession();

    // Cleanup function
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router, retryCount]);

  // Show loading spinner while checking session
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error message if something went wrong
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full px-6 py-8 bg-white shadow-md rounded-lg">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900">Something went wrong</h2>
            <p className="mt-2 text-sm text-gray-600">{error}</p>
            <button
              onClick={() => {
                setRetryCount(0);
                setError(null);
                setLoading(true);
              }}
              className="mt-4 w-full min-h-[44px] px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => router.push('/login')}
              className="mt-2 w-full min-h-[44px] px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
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
    <div className="min-h-screen bg-gray-100">
      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity md:hidden z-20"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="flex">
        {/* Sidebar */}
        <Sidebar user={user} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        {/* Main content */}
        <div className="flex-1">
          {/* Header */}
          <Header user={user} onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />

          {/* Main content area */}
          <main className="p-4">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
} 