'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { UserPlus, Trash2, Edit2 } from 'lucide-react';
import type { UserProfile } from '@/types/database';
import CreateUserModal from '@/components/settings/CreateUserModal';
import EditUserModal from '@/components/settings/EditUserModal';
import UserActivityLogs from '@/components/settings/UserActivityLogs';
import FeeSettings from '@/components/admin/FeeSettings';
import { toast } from 'react-hot-toast';
import LogoUploader from '@/components/settings/LogoUploader';

export default function SettingsClient() {
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  const fetchUsers = async () => {
    try {
      const supabase = getSupabaseClient();
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) {
        throw usersError;
      }

      setUsers(usersData || []);
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

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

        await fetchUsers();
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

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to remove user ${userEmail}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove user');
      }

      // Update local state
      setUsers(users.filter(user => user.id !== userId));
      toast.success('User removed successfully');
    } catch (error) {
      console.error('Error removing user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to remove user');
    }
  };

  const handleEditUser = (user: UserProfile) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Unknown';
    
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
      <div className="min-h-[400px] flex items-center justify-center p-4">
        <div className="bg-red-50 p-6 rounded-lg max-w-md w-full">
          <h3 className="text-lg font-medium text-red-800">Error loading users</h3>
          <div className="mt-2 text-sm text-red-700">{error}</div>
          <div className="mt-4 flex flex-wrap gap-4">
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

        {/* User Management Section */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">User Management</h2>
              <p className="mt-2 text-sm text-gray-700">
                Manage users, roles, and permissions
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 whitespace-nowrap"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Create User
            </button>
          </div>

          <div className="mt-6 bg-white shadow rounded-lg overflow-hidden">
            <div className="min-w-full overflow-x-auto">
              <div className="bg-gray-50">
                <div className="grid grid-cols-12 gap-2 py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="col-span-12 sm:col-span-3 md:col-span-3">USER</div>
                  <div className="col-span-6 sm:col-span-2 md:col-span-2">ROLE</div>
                  <div className="hidden sm:block sm:col-span-5 md:col-span-5">PERMISSIONS</div>
                  <div className="col-span-5 sm:col-span-1 md:col-span-1">JOINED</div>
                  <div className="col-span-1 sm:col-span-1 md:col-span-1">ACTIONS</div>
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {users.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-500">
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
                    <div key={user.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-sm items-center">
                      <div className="col-span-12 sm:col-span-3 md:col-span-3 truncate">
                        <div className="text-gray-900">{user.email}</div>
                      </div>
                      <div className="col-span-6 sm:col-span-2 md:col-span-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize bg-gray-100 text-gray-800">
                          {user.role}
                        </span>
                      </div>
                      <div className="hidden sm:block sm:col-span-5 md:col-span-5">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(user.permissions || {}).map(([key, value]) => (
                            value && (
                              <span
                                key={key}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 whitespace-nowrap"
                              >
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                              </span>
                            )
                          ))}
                        </div>
                      </div>
                      <div className="col-span-5 sm:col-span-1 md:col-span-1 text-gray-500 whitespace-nowrap">
                        {formatDate(user.created_at)}
                      </div>
                      <div className="col-span-1 sm:col-span-1 md:col-span-1 flex justify-end space-x-2">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-50"
                          title="Edit user"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id, user.email)}
                          className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50"
                          title="Delete user"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <CreateUserModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onUserCreated={fetchUsers}
        />
      )}
      
      {isEditModalOpen && selectedUser && (
        <EditUserModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
          onUserUpdated={fetchUsers}
        />
      )}
      
      {/* User Activity Logs */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">User Activity Logs</h2>
        <UserActivityLogs />
      </div>
    </div>
  );
} 