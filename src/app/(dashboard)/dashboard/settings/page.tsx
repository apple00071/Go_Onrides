'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { UserPlus } from 'lucide-react';
import type { UserProfile } from '@/types/database';
import CreateUserModal from '@/components/settings/CreateUserModal';

export default function SettingsPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    const supabase = getSupabaseClient();

    const checkSessionAndFetchUsers = async () => {
      try {
        // First check if we have a session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }

        if (!session) {
          router.replace('/login');
          return;
        }

        // Only proceed if component is still mounted
        if (!mounted) return;

        // Then check if user has admin role
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

        // Only proceed if component is still mounted
        if (!mounted) return;

        // If we get here, user is authenticated and is an admin
        // Now fetch all users
        console.log('Fetching users...');
        const { data: usersData, error: usersError } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (usersError) {
          throw usersError;
        }

        // Only update state if component is still mounted
        if (mounted) {
          console.log('Users fetched:', usersData);
          setUsers(usersData || []);
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

    checkSessionAndFetchUsers();

    // Cleanup function
    return () => {
      mounted = false;
    };
  }, [router]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-sm text-gray-600">Loading user data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="bg-red-50 p-6 rounded-lg max-w-md w-full">
          <h3 className="text-lg font-medium text-red-800">Error loading users</h3>
          <div className="mt-2 text-sm text-red-700">{error}</div>
          <div className="mt-4 flex gap-4">
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                router.refresh();
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Try again
            </button>
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
    <div>
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">User Management</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage users, roles, and permissions
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="mt-4 sm:mt-0 inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Create User
        </button>
      </div>

      <div className="mt-6 bg-white shadow rounded-lg overflow-hidden">
        <div className="bg-gray-50">
          <div className="grid grid-cols-12 gap-4 py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div className="col-span-3">USER</div>
            <div className="col-span-2">ROLE</div>
            <div className="col-span-5">PERMISSIONS</div>
            <div className="col-span-2">JOINED</div>
          </div>
        </div>

        <div className="divide-y divide-gray-200 bg-white">
          {users.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-gray-500">
              <p>No users found</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-2 text-blue-600 hover:text-blue-500"
              >
                Create your first user
              </button>
            </div>
          ) : (
            users.map((user) => (
              <div key={user.id} className="grid grid-cols-12 gap-4 px-6 py-4 text-sm">
                <div className="col-span-3">
                  <div className="text-gray-900">{user.email}</div>
                </div>
                <div className="col-span-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize bg-gray-100 text-gray-800">
                    {user.role}
                  </span>
                </div>
                <div className="col-span-5">
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(user.permissions || {}).map(([key, value]) => (
                      value && (
                        <span
                          key={key}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                      )
                    ))}
                  </div>
                </div>
                <div className="col-span-2 text-gray-500">
                  {formatDate(user.created_at)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <CreateUserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUserCreated={() => {
          setLoading(true);
          router.refresh();
        }}
      />
    </div>
  );
} 