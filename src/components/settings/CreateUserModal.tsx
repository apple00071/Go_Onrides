'use client';

import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import type { Permission } from '@/types/database';
import { toast } from 'react-hot-toast';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: () => void;
}

interface FormData {
  email: string;
  username: string;
  password: string;
  role: 'admin' | 'worker';
  permissions: Permission;
}

export default function CreateUserModal({
  isOpen,
  onClose,
  onUserCreated
}: CreateUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    username: '',
    password: '',
    role: 'worker',
    permissions: {
      // Booking permissions
      createBooking: false,
      viewBookings: true,
      manageBookings: false,

      // Customer permissions
      createCustomer: false,
      viewCustomers: true,
      manageCustomers: false,

      // Vehicle permissions
      createVehicle: false,
      viewVehicles: true,
      manageVehicles: false,

      // Maintenance permissions
      createMaintenance: false,
      viewMaintenance: true,
      manageMaintenance: false,

      // Invoice and payment permissions
      createInvoice: false,
      viewInvoices: true,
      managePayments: false,

      // Report permissions
      accessReports: false,
      exportReports: false,

      // Return permissions
      manageReturns: false,
      viewReturns: true,

      // Notification permissions
      manageNotifications: false,
      viewNotifications: true,

      // Settings permissions
      manageSettings: false
    }
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => {
      // If username is being changed, automatically update email to match
      if (name === 'username') {
        return {
          ...prev,
          [name]: value,
          email: `${value}@goonriders.com`
        };
      }
      return { ...prev, [name]: value };
    });
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

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const renderPermissionSection = (
    title: string,
    permissions: Array<{key: keyof Permission, label: string}>
  ) => {
    const isExpanded = expandedSection === title;
    
    return (
      <div className="border rounded-md">
        <button
          type="button"
          onClick={() => toggleSection(title)}
          className="w-full px-4 py-2 flex justify-between items-center bg-gray-50 hover:bg-gray-100 rounded-t-md"
        >
          <h3 className="font-medium text-sm">{title}</h3>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {isExpanded && (
          <div className="p-4 space-y-2 border-t">
            {permissions.map(({ key, label }) => (
              <label key={key} className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.permissions[key]}
                  onChange={() => handlePermissionChange(key)}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      toast.success('User created successfully');
      onUserCreated();
      onClose();
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">Create New User</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Username *
            </label>
            <input
              type="text"
              name="username"
              required
              value={formData.username}
              onChange={handleInputChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          {/* Hidden Email field */}
          <input
            type="hidden"
            name="email"
            value={formData.email}
          />

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
              {renderPermissionSection("Booking Permissions", [
                { key: "createBooking", label: "Create Booking" },
                { key: "viewBookings", label: "View Bookings" },
                { key: "manageBookings", label: "Manage Bookings" }
              ])}
              
              {renderPermissionSection("Customer Permissions", [
                { key: "createCustomer", label: "Create Customer" },
                { key: "viewCustomers", label: "View Customers" },
                { key: "manageCustomers", label: "Manage Customers" }
              ])}
              
              {renderPermissionSection("Vehicle Permissions", [
                { key: "createVehicle", label: "Create Vehicle" },
                { key: "viewVehicles", label: "View Vehicles" },
                { key: "manageVehicles", label: "Manage Vehicles" }
              ])}
              
              {renderPermissionSection("Maintenance Permissions", [
                { key: "createMaintenance", label: "Create Maintenance Record" },
                { key: "viewMaintenance", label: "View Maintenance Records" },
                { key: "manageMaintenance", label: "Manage Maintenance Records" }
              ])}
              
              {renderPermissionSection("Invoice & Payment Permissions", [
                { key: "createInvoice", label: "Create Invoice" },
                { key: "viewInvoices", label: "View Invoices" },
                { key: "managePayments", label: "Manage Payments" }
              ])}
              
              {renderPermissionSection("Report Permissions", [
                { key: "accessReports", label: "Access Reports" },
                { key: "exportReports", label: "Export Reports" }
              ])}
              
              {renderPermissionSection("Return Permissions", [
                { key: "manageReturns", label: "Manage Returns" },
                { key: "viewReturns", label: "View Returns" }
              ])}
              
              {renderPermissionSection("Notification Permissions", [
                { key: "manageNotifications", label: "Manage Notifications" },
                { key: "viewNotifications", label: "View Notifications" }
              ])}
              
              {renderPermissionSection("Settings Permissions", [
                { key: "manageSettings", label: "Manage Settings" }
              ])}
            </div>
          </div>

          <div className="mt-5">
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 