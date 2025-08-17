import { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { Permission, UserProfile } from '@/types/database';

type Role = 'admin' | 'worker';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onUserUpdated: () => void;
}

// Group permissions by category
const permissionGroups: Record<string, Array<{ key: keyof Permission; label: string }>> = {
  'Booking Permissions': [
    { key: 'createBooking', label: 'Create Booking' },
    { key: 'viewBookings', label: 'View Bookings' },
    { key: 'manageBookings', label: 'Manage Bookings' }
  ],
  'Customer Permissions': [
    { key: 'createCustomer', label: 'Create Customer' },
    { key: 'viewCustomers', label: 'View Customers' },
    { key: 'manageCustomers', label: 'Manage Customers' }
  ],
  'Vehicle Permissions': [
    { key: 'createVehicle', label: 'Create Vehicle' },
    { key: 'viewVehicles', label: 'View Vehicles' },
    { key: 'manageVehicles', label: 'Manage Vehicles' }
  ],
  'Maintenance Permissions': [
    { key: 'createMaintenance', label: 'Create Maintenance' },
    { key: 'viewMaintenance', label: 'View Maintenance' },
    { key: 'manageMaintenance', label: 'Manage Maintenance' }
  ],
  'Invoice & Payment Permissions': [
    { key: 'createInvoice', label: 'Create Invoice' },
    { key: 'viewInvoices', label: 'View Invoices' },
    { key: 'managePayments', label: 'Manage Payments' }
  ],
  'Report Permissions': [
    { key: 'accessReports', label: 'Access Reports' },
    { key: 'exportReports', label: 'Export Reports' }
  ],
  'Return Permissions': [
    { key: 'manageReturns', label: 'Manage Returns' },
    { key: 'viewReturns', label: 'View Returns' }
  ],
  'Notification Permissions': [
    { key: 'manageNotifications', label: 'Manage Notifications' },
    { key: 'viewNotifications', label: 'View Notifications' }
  ],
  'Settings Permissions': [
    { key: 'manageSettings', label: 'Manage Settings' }
  ]
};

const EditUserModal = ({ isOpen, onClose, user, onUserUpdated }: EditUserModalProps) => {
  const [role, setRole] = useState<Role>(user.role);
  const [permissions, setPermissions] = useState<Permission>(user.permissions || {});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setRole(user.role);
      setPermissions(user.permissions || {});
      setError(null);
      setExpandedSection(null);
    }
  }, [isOpen, user]);

  const handlePermissionChange = (key: keyof Permission, value: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const renderPermissionSection = (
    title: string,
    permissionList: Array<{key: keyof Permission, label: string}>
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
            {permissionList.map(({ key, label }) => (
              <label key={key} className="flex items-center">
                <input
                  type="checkbox"
                  checked={!!permissions[key]}
                  onChange={(e) => handlePermissionChange(key, e.target.checked)}
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
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role,
          permissions,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user');
      }

      toast.success('User updated successfully');
      onUserUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating user:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while updating user');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">Edit User</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4">
        {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
              {error}
          </div>
        )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={user.email}
              disabled
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-gray-50"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="worker">Worker</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
            <div className="space-y-2">
              {Object.entries(permissionGroups).map(([title, permissions]) => (
                renderPermissionSection(title, permissions)
              ))}
            </div>
          </div>
        </form>

        <div className="flex justify-end gap-3 p-4 border-t">
            <button
              type="button"
              onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
          </div>
      </div>
    </div>
  );
};

export default EditUserModal; 