'use client';

import { useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import type { Permission } from '@/types/database';
import { toast } from 'react-hot-toast';

interface FormData {
  email: string;
  password: string;
  role: 'admin' | 'worker';
  permissions: {
    createBooking: boolean;
    viewBookings: boolean;
    uploadDocuments: boolean;
    viewDocuments: boolean;
    managePayments: boolean;
    accessReports: boolean;
  };
}

export default function CreateUserForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    role: 'worker',
    permissions: {
      createBooking: false,
      viewBookings: true,
      uploadDocuments: false,
      viewDocuments: true,
      managePayments: false,
      accessReports: false
    }
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePermissionChange = (permission: keyof Permission) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permission]: !prev.permissions[permission]
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();

      // First check if we're logged in as admin
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) throw new Error('Not authenticated');

      // Check if we have admin privileges
      const { data: adminCheck, error: adminCheckError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (adminCheckError) throw adminCheckError;
      if (adminCheck?.role !== 'admin') throw new Error('Not authorized');

      // Create the user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: formData.email,
        password: formData.password,
        email_confirm: true,
        user_metadata: {
          role: formData.role
        }
      });

      if (authError) throw authError;
      if (!authData?.user) throw new Error('Failed to create user');

      // Create the user's profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: formData.email,
          role: formData.role,
          permissions: formData.permissions
        });

      if (profileError) {
        // If profile creation fails, try to delete the auth user
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw profileError;
      }

      toast.success('User created successfully');
      
      // Reset form
      setFormData({
        email: '',
        password: '',
        role: 'worker',
        permissions: {
          createBooking: false,
          viewBookings: true,
          uploadDocuments: false,
          viewDocuments: true,
          managePayments: false,
          accessReports: false
        }
      });
    } catch (error) {
      console.error('Error creating user:', error);
      let errorMessage = 'Failed to create user';
      
      if (error instanceof Error) {
        if (error.message === 'Not authenticated') {
          errorMessage = 'Please log in again to create users';
        } else if (error.message === 'Not authorized') {
          errorMessage = 'Only admins can create new users';
        } else if (error.message.includes('duplicate key')) {
          errorMessage = 'A user with this email already exists';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Email *
        </label>
        <input
          type="email"
          name="email"
          required
          value={formData.email}
          onChange={handleInputChange}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>

      {/* Password */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Password *
        </label>
        <input
          type="password"
          name="password"
          required
          minLength={6}
          value={formData.password}
          onChange={handleInputChange}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>

      {/* Role */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Role *
        </label>
        <select
          name="role"
          required
          value={formData.role}
          onChange={handleInputChange}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        >
          <option value="worker">Worker</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {/* Permissions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Permissions
        </label>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.permissions.createBooking}
              onChange={() => handlePermissionChange('createBooking')}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
            <span className="ml-2 text-sm text-gray-700">Create Booking</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.permissions.viewBookings}
              onChange={() => handlePermissionChange('viewBookings')}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
            <span className="ml-2 text-sm text-gray-700">View Bookings</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.permissions.uploadDocuments}
              onChange={() => handlePermissionChange('uploadDocuments')}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
            <span className="ml-2 text-sm text-gray-700">Upload Documents</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.permissions.viewDocuments}
              onChange={() => handlePermissionChange('viewDocuments')}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
            <span className="ml-2 text-sm text-gray-700">View Documents</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.permissions.managePayments}
              onChange={() => handlePermissionChange('managePayments')}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
            <span className="ml-2 text-sm text-gray-700">Manage Payments</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.permissions.accessReports}
              onChange={() => handlePermissionChange('accessReports')}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
            <span className="ml-2 text-sm text-gray-700">Access Reports</span>
          </label>
        </div>
      </div>

      <div className="pt-4">
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating...' : 'Create User'}
        </button>
      </div>
    </form>
  );
} 