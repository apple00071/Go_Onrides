import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { UserProfile, Permission } from '@/types/database';

type Role = 'admin' | 'worker';

type EditUserModalProps = {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onUserUpdated: () => void;
};

const availableRoles: Role[] = ['admin', 'worker'];
const availablePermissions: { [key: string]: string } = {
  viewBookings: 'View Bookings',
  createBooking: 'Create Booking',
  manageBookings: 'Manage Bookings',
  viewVehicles: 'View Vehicles',
  createVehicle: 'Create Vehicle',
  manageVehicles: 'Manage Vehicles',
  viewCustomers: 'View Customers',
  createCustomer: 'Create Customer',
  manageCustomers: 'Manage Customers',
  viewInvoices: 'View Invoices',
  createInvoice: 'Create Invoice',
  managePayments: 'Manage Payments',
  viewMaintenance: 'View Maintenance',
  createMaintenance: 'Create Maintenance',
  manageMaintenance: 'Manage Maintenance',
  manageReturns: 'Manage Returns',
  viewNotifications: 'View Notifications',
  manageNotifications: 'Manage Notifications',
  exportReports: 'Export Reports',
  manageSettings: 'Manage Settings'
};

const EditUserModal = ({ isOpen, onClose, user, onUserUpdated }: EditUserModalProps) => {
  const [role, setRole] = useState<Role>(user.role);
  const [permissions, setPermissions] = useState<Permission>(user.permissions || {});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset form when modal opens with user data
    if (isOpen) {
      setRole(user.role);
      setPermissions(user.permissions || {});
      setError(null);
    }
  }, [isOpen, user]);

  const handlePermissionChange = (key: keyof Permission, value: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [key]: value,
    }));
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Edit User</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 p-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-100 text-gray-600 focus:outline-none sm:text-sm"
              value={user.email}
              disabled
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              {availableRoles.map((role) => (
                <option key={role} value={role}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
            <div className="space-y-2 max-h-60 overflow-y-auto p-2 border border-gray-200 rounded-md">
              {Object.entries(availablePermissions).map(([key, label]) => (
                <div key={key} className="flex items-center">
                  <input
                    id={`permission-${key}`}
                    type="checkbox"
                    checked={!!permissions[key as keyof Permission]}
                    onChange={(e) => handlePermissionChange(key as keyof Permission, e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor={`permission-${key}`}
                    className="ml-2 block text-sm text-gray-900"
                  >
                    {label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 sm:mt-6 flex flex-row-reverse gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex justify-center w-full sm:w-auto rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed sm:text-sm"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin inline-block h-4 w-4 mr-2 border-t-2 border-white rounded-full" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex justify-center w-full sm:w-auto rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUserModal; 