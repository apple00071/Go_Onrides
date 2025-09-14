'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, User, Shield, UserCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { UserProfile } from '@/types/database';

export default function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users');
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUserCreated = () => {
    fetchUsers();
    setIsCreateModalOpen(false);
  };

  const handleUserUpdated = () => {
    fetchUsers();
    setEditingUser(null);
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    const confirmMessage = 'Are you sure you want to delete user ' + userEmail + '? This action cannot be undone.';
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await fetch('/api/users/' + userId, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }

      toast.success('User deleted successfully');
      fetchUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className='h-4 w-4 text-red-500' />;
      case 'worker':
        return <User className='h-4 w-4 text-blue-500' />;
      default:
        return <UserCheck className='h-4 w-4 text-gray-500' />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'worker':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
        <span className='ml-2 text-gray-600'>Loading users...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className='bg-red-50 border border-red-200 rounded-md p-4'>
        <div className='flex'>
          <div className='ml-3'>
            <h3 className='text-sm font-medium text-red-800'>Error loading users</h3>
            <div className='mt-2 text-sm text-red-700'>{error}</div>
            <div className='mt-4'>
              <button
                onClick={fetchUsers}
                className='bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm'
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='flex justify-between items-center'>
        <div>
          <h2 className='text-2xl font-semibold text-gray-900'>User Management</h2>
          <p className='text-sm text-gray-600'>Manage users, roles, and permissions</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
        >
          <Plus className='h-4 w-4 mr-2' />
          Create User
        </button>
      </div>

      <div className='bg-white shadow overflow-hidden sm:rounded-md'>
        <div className='px-4 py-5 sm:p-6'>
          {users.length === 0 ? (
            <div className='text-center py-12'>
              <User className='mx-auto h-12 w-12 text-gray-400' />
              <h3 className='mt-2 text-sm font-medium text-gray-900'>No users</h3>
              <p className='mt-1 text-sm text-gray-500'>Get started by creating a new user.</p>
              <div className='mt-6'>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className='inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                >
                  <Plus className='h-4 w-4 mr-2' />
                  Create User
                </button>
              </div>
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <table className='min-w-full divide-y divide-gray-200'>
                <thead className='bg-gray-50'>
                  <tr>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>User</th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Role</th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Permissions</th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Joined</th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Status</th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Actions</th>
                  </tr>
                </thead>
                <tbody className='bg-white divide-y divide-gray-200'>
                  {users.map((user) => (
                    <tr key={user.id} className='hover:bg-gray-50'>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div className='flex items-center'>
                          <div className='flex-shrink-0 h-10 w-10'>
                            <div className='h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center'>
                              <User className='h-5 w-5 text-gray-600' />
                            </div>
                          </div>
                          <div className='ml-4'>
                            <div className='text-sm font-medium text-gray-900'>
                              {user.username || user.email}
                            </div>
                            <div className='text-sm text-gray-500'>{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div className='flex items-center'>
                          {getRoleIcon(user.role)}
                          <span className={'ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ' + getRoleBadgeColor(user.role)}>
                            {user.role}
                          </span>
                        </div>
                      </td>
                      <td className='px-6 py-4'>
                        <div className='flex flex-wrap gap-1'>
                          {user.permissions && Object.entries(user.permissions)
                            .filter(([_, value]) => value === true)
                            .slice(0, 3)
                            .map(([key, _]) => (
                              <span
                                key={key}
                                className='inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full'
                              >
                                {key.replace(/([A-Z])/g, ' ').replace(/^./, str => str.toUpperCase())}
                              </span>
                            ))}
                          {user.permissions && Object.values(user.permissions).filter(Boolean).length > 3 && (
                            <span className='inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full'>
                              +{Object.values(user.permissions).filter(Boolean).length - 3} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                        {user.created_at ? formatDate(user.created_at) : 'N/A'}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span className={'inline-flex px-2 py-1 text-xs font-semibold rounded-full ' + (user.is_active !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')}>
                          {user.is_active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm font-medium'>
                        <div className='flex space-x-2'>
                          <button
                            onClick={() => setEditingUser(user)}
                            className='text-blue-600 hover:text-blue-900'
                            title='Edit user'
                          >
                            <Edit className='h-4 w-4' />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id, user.email)}
                            className='text-red-600 hover:text-red-900'
                            title='Delete user'
                          >
                            <Trash2 className='h-4 w-4' />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      {isCreateModalOpen && (
        <div className='fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50'>
          <div className='bg-white rounded-lg p-6 max-w-md w-full'>
            <h3 className='text-lg font-medium mb-4'>Create New User</h3>
            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700'>Email</label>
                <input
                  type='email'
                  className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
                  placeholder='user@example.com'
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700'>Username</label>
                <input
                  type='text'
                  className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
                  placeholder='username'
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700'>Password</label>
                <input
                  type='password'
                  className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
                  placeholder='password'
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700'>Role</label>
                <select className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'>
                  <option value='worker'>Worker</option>
                  <option value='admin'>Admin</option>
                </select>
              </div>
            </div>
            <div className='mt-6 flex space-x-3'>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className='flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400'
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  toast.success('User creation functionality will be implemented');
                  setIsCreateModalOpen(false);
                }}
                className='flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700'
              >
                Create User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className='fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50'>
          <div className='bg-white rounded-lg p-6 max-w-md w-full'>
            <h3 className='text-lg font-medium mb-4'>Edit User: {editingUser.email}</h3>
            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700'>Username</label>
                <input
                  type='text'
                  defaultValue={editingUser.username || ''}
                  className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700'>Role</label>
                <select 
                  defaultValue={editingUser.role}
                  className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
                >
                  <option value='worker'>Worker</option>
                  <option value='admin'>Admin</option>
                </select>
              </div>
            </div>
            <div className='mt-6 flex space-x-3'>
              <button
                onClick={() => setEditingUser(null)}
                className='flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400'
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  toast.success('User update functionality will be implemented');
                  setEditingUser(null);
                }}
                className='flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700'
              >
                Update User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
