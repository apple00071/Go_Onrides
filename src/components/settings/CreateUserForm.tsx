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
    manageBookings: boolean;
    createCustomer: boolean;
    viewCustomers: boolean;
    manageCustomers: boolean;
    createVehicle: boolean;
    viewVehicles: boolean;
    manageVehicles: boolean;
    createMaintenance: boolean;
    viewMaintenance: boolean;
    manageMaintenance: boolean;
    createInvoice: boolean;
    viewInvoices: boolean;
    managePayments: boolean;
    accessReports: boolean;
    exportReports: boolean;
    manageReturns: boolean;
    viewReturns: boolean;
    manageNotifications: boolean;
    viewNotifications: boolean;
    manageSettings: boolean;
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
      manageBookings: false,
      createCustomer: false,
      viewCustomers: true,
      manageCustomers: false,
      createVehicle: false,
      viewVehicles: true,
      manageVehicles: false,
      createMaintenance: false,
      viewMaintenance: true,
      manageMaintenance: false,
      createInvoice: false,
      viewInvoices: true,
      managePayments: false,
      accessReports: false,
      exportReports: false,
      manageReturns: false,
      viewReturns: true,
      manageNotifications: false,
      viewNotifications: true,
      manageSettings: false
    }
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePermissionChange = (permission: keyof FormData['permissions']) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permission]: !(prev.permissions[permission])
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
          manageBookings: false,
          createCustomer: false,
          viewCustomers: true,
          manageCustomers: false,
          createVehicle: false,
          viewVehicles: true,
          manageVehicles: false,
          createMaintenance: false,
          viewMaintenance: true,
          manageMaintenance: false,
          createInvoice: false,
          viewInvoices: true,
          managePayments: false,
          accessReports: false,
          exportReports: false,
          manageReturns: false,
          viewReturns: true,
          manageNotifications: false,
          viewNotifications: true,
          manageSettings: false
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
        <div className="space-y-4 border rounded-md p-4">
          {/* Booking Permissions */}
          <div className="border-b pb-4">
            <h3 className="font-medium mb-2">Booking Permissions</h3>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.permissions.createBooking}
                  onChange={() => handlePermissionChange('createBooking')}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">Create Bookings</span>
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
                  checked={formData.permissions.manageBookings}
                  onChange={() => handlePermissionChange('manageBookings')}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">Edit Bookings</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.permissions.manageBookings}
                  onChange={() => handlePermissionChange('manageBookings')}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">Delete Bookings</span>
              </label>
            </div>
          </div>

          {/* User Management Permissions */}
          <div className="border-b pb-4">
            <h3 className="font-medium mb-2">User Management</h3>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.permissions.manageCustomers}
                  onChange={() => handlePermissionChange('manageCustomers')}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">Manage Users</span>
              </label>
            </div>
          </div>

          {/* Report Permissions */}
          <div>
            <h3 className="font-medium mb-2">Report Permissions</h3>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.permissions.accessReports}
                  onChange={() => handlePermissionChange('accessReports')}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">View Reports</span>
              </label>
            </div>
          </div>
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