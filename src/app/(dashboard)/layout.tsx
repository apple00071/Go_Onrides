'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import InstallPrompt from '@/components/pwa/InstallPrompt';
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
    let timeoutId: NodeJS.Timeout;
    const supabase = getSupabaseClient();

    // Safety timeout to prevent infinite loading
    const safetyTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.log('⚠️ Dashboard Layout: Safety timeout triggered, clearing loading state');
        setLoading(false);
        setError('Loading timeout - please refresh the page');
      }
    }, 10000); // 10 second timeout

    const checkSession = async () => {
      try {
        console.log('🔍 Dashboard Layout: Checking session...');
        setLoading(true); // Ensure loading is set to true at start
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('❌ Dashboard Layout: Session error:', sessionError);
          throw sessionError;
        }

        if (!session) {
          console.log('❌ Dashboard Layout: No session found, redirecting to login...');
          if (mounted) {
            setLoading(false);
            router.replace('/login');
          }
          return;
        }

        // Only proceed if component is still mounted
        if (!mounted) {
          console.log('🚫 Dashboard Layout: Component unmounted, stopping...');
          return;
        }

        console.log('✅ Dashboard Layout: Session found, fetching profile...');
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('❌ Dashboard Layout: Profile error:', profileError);
          throw profileError;
        }

        if (!profile) {
          console.log('❌ Dashboard Layout: No profile found, redirecting to login...');
          if (mounted) {
            setLoading(false);
            router.replace('/login');
          }
          return;
        }

        // Store current path
        const currentPath = window.location.pathname;
        console.log('Current path:', currentPath);

        // Handle role-based access control
        if (profile.role === 'worker' && currentPath.startsWith('/dashboard/admin')) {
          // Prevent workers from accessing admin routes
          console.log('🔄 Dashboard Layout: Worker attempting to access admin route, redirecting...');
          if (mounted) {
            setLoading(false);
            router.replace('/dashboard/workers');
          }
          return;
        }

        // Only update state if component is still mounted
        if (mounted) {
          console.log('✅ Dashboard Layout: Setting user profile and clearing loading:', profile);
          clearTimeout(safetyTimeout); // Clear safety timeout since we succeeded
          setUser(profile);
          setError(null);
          setLoading(false); // Set loading to false here
        } else {
          console.log('🚫 Dashboard Layout: Component unmounted, not setting state');
        }
      } catch (error) {
        console.error('❌ Dashboard Layout: Error in checkSession:', error);
        if (mounted) {
          clearTimeout(safetyTimeout); // Clear safety timeout on error
          setError(error instanceof Error ? error.message : 'An error occurred');
          setLoading(false); // Make sure to set loading to false even on error

          if (retryCount >= 2) {
            console.log('🔄 Dashboard Layout: Max retries reached, redirecting to login');
            router.replace('/login');
          } else {
            console.log(`🔄 Dashboard Layout: Retrying... (${retryCount + 1}/3)`);
            setRetryCount(prev => prev + 1);
            setTimeout(checkSession, 1000);
          }
        } else {
          console.log('🚫 Dashboard Layout: Component unmounted during error handling');
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
      console.log('🧹 Dashboard Layout: Cleaning up...');
      mounted = false;
      clearTimeout(safetyTimeout);
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
          <p className="mt-2 text-xs text-gray-400">Checking authentication...</p>
          {retryCount > 0 && (
            <p className="mt-1 text-xs text-orange-500">Retry {retryCount}/3</p>
          )}
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
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar user={user} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity md:hidden z-20"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header user={user} onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto bg-gray-100">
          {children}
        </main>
      </div>

      {/* PWA Install Prompt */}
      <InstallPrompt />
    </div>
  );
} 