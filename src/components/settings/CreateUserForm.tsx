'use client';

import { useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { Permission, Role } from '@/types/database';
import { permissionGroups } from '@/lib/permissions';

interface FormData {
  email: string;
  password: string;
  role: Role;
  permissions: Permission;
  fullName: string;
  phone: string;
}

const defaultPermissions: Permission = {
  // Booking permissions
  createBooking: false,
  viewBookings: true,
  editBookings: false,
  deleteBookings: false,
  
  // Customer permissions
  createCustomer: false,
  viewCustomers: true,
  editCustomers: false,
  deleteCustomers: false,
  
  // Vehicle permissions
  createVehicle: false,
  viewVehicles: true,
  editVehicles: false,
  deleteVehicles: false,
  
  // Maintenance permissions
  createMaintenance: false,
  viewMaintenance: true,
  editMaintenance: false,
  deleteMaintenance: false,
  
  // Invoice & Payments
  createInvoice: false,
  viewInvoices: true,
  editInvoices: false,
  managePayments: false,
  
  // Reports
  viewReports: false,
  exportReports: false,
  
  // System
  manageUsers: false,
  manageSettings: false,
  viewAuditLogs: false
};

export default function CreateUserForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'permissions'>('details');
  
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    role: 'worker',
    permissions: { ...defaultPermissions }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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

  const handleRoleChange = (role: Role) => {
    setFormData(prev => {
      const newPermissions = { ...defaultPermissions };
      
      if (role === 'admin') {
        // Grant all permissions for admin
        Object.keys(newPermissions).forEach(key => {
          newPermissions[key as keyof Permission] = true;
        });
      } else if (role === 'manager') {
        // Default manager permissions
        newPermissions.viewBookings = true;
        newPermissions.viewCustomers = true;
        newPermissions.viewVehicles = true;
        newPermissions.viewInvoices = true;
        newPermissions.viewReports = true;
        newPermissions.manageBookings = true;
        newPermissions.manageCustomers = true;
        newPermissions.manageVehicles = true;
        newPermissions.managePayments = true;
      } else {
        // Worker role - minimal default permissions
        newPermissions.viewBookings = true;
        newPermissions.viewCustomers = true;
        newPermissions.viewVehicles = true;
      }
      
      return {
        ...prev,
        role,
        permissions: newPermissions
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();

      // Check admin privileges
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) throw new Error('Not authenticated');

      const { data: adminCheck } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (adminCheck?.role !== 'admin') throw new Error('Not authorized');

      // Create user in Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: formData.email,
        password: formData.password,
        email_confirm: true,
        user_metadata: {
          full_name: formData.fullName,
          phone: formData.phone,
          role: formData.role
        }
      });

      if (authError) throw authError;
      if (!authData?.user) throw new Error('Failed to create user');

      // Create user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: formData.email,
          full_name: formData.fullName,
          phone: formData.phone,
          role: formData.role,
          permissions: formData.permissions,
          created_by: session.user.id
        });

      if (profileError) {
        // Clean up auth user if profile creation fails
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw profileError;
      }

      toast.success('User created successfully');
      
      // Reset form
      setFormData({
        email: '',
        password: '',
        fullName: '',
        phone: '',
        role: 'worker',
        permissions: { ...defaultPermissions }
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

  // Render permission group
  const renderPermissionGroup = (title: string, permissions: { key: keyof Permission; label: string }[]) => (
    <div key={title} className="space-y-2">
      <h3 className="font-medium text-gray-900 text-sm">{title}</h3>
      <div className="space-y-2">
        {permissions.map(({ key, label }) => (
          <label key={key} className="flex items-center">
            <input
              type="checkbox"
              checked={formData.permissions[key] || false}
              onChange={() => handlePermissionChange(key)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-3 text-sm text-gray-700">{label}</span>
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`${activeTab === 'details' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            User Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('permissions')}
            className={`${activeTab === 'permissions' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Permissions
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'details' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name *</label>
              <input
                type="text"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email *</label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Phone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Password *</label>
              <input
                type="password"
                name="password"
                required
                minLength={8}
                value={formData.password}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Role *</label>
              <select
                name="role"
                required
                value={formData.role}
                onChange={(e) => handleRoleChange(e.target.value as Role)}
                className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
              >
                <option value="worker">Worker</option>
                <option value="manager">Manager</option>
                <option value="admin">Administrator</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {formData.role === 'admin' 
                  ? 'Admins have full access to all features and settings.'
                  : formData.role === 'manager'
                  ? 'Managers can manage bookings, customers, and view reports.'
                  : 'Workers have limited access based on assigned permissions.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-md bg-blue-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Permission Guidance</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>Select the specific permissions to grant to this user. Consider the principle of least privilege when assigning permissions.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {Object.entries(permissionGroups).map(([title, permissions]) => (
                <div key={title} className="space-y-4 rounded-lg border border-gray-200 p-4">
                  {renderPermissionGroup(title, permissions)}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          {activeTab === 'permissions' && (
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Back
            </button>
          )}
          
          <button
            type={activeTab === 'details' ? 'button' : 'submit'}
            onClick={() => {
              if (activeTab === 'details') {
                setActiveTab('permissions');
              }
            }}
            className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            disabled={loading || (activeTab === 'details' && (!formData.email || !formData.password || !formData.fullName))}
          >
            {loading ? (
              'Saving...'
            ) : activeTab === 'details' ? (
              'Continue to Permissions'
            ) : (
              'Create User'
            )}
          </button>
        </div>
      </div>
    </form>
  );
} 