'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    email: string;
    role: string;
    permissions: string[];
  };
  onSave: (data: { email: string; role: string; permissions: string[] }) => void;
}

const PERMISSIONS = [
  { id: 'viewBookings', label: 'View Bookings' },
  { id: 'createBooking', label: 'Create Booking' },
  { id: 'manageBookings', label: 'Manage Bookings' },
  { id: 'viewVehicles', label: 'View Vehicles' },
  { id: 'createVehicle', label: 'Create Vehicle' },
  { id: 'manageVehicles', label: 'Manage Vehicles' },
  { id: 'viewCustomers', label: 'View Customers' },
  { id: 'createCustomer', label: 'Create Customer' },
  { id: 'manageCustomers', label: 'Manage Customers' },
  { id: 'viewInvoices', label: 'View Invoices' },
  { id: 'createInvoice', label: 'Create Invoice' },
  { id: 'managePayments', label: 'Manage Payments' },
  { id: 'viewMaintenance', label: 'View Maintenance' },
  { id: 'createMaintenance', label: 'Create Maintenance' },
  { id: 'manageMaintenance', label: 'Manage Maintenance' },
  { id: 'manageReturns', label: 'Manage Returns' },
  { id: 'viewNotifications', label: 'View Notifications' },
  { id: 'manageNotifications', label: 'Manage Notifications' },
  { id: 'exportReports', label: 'Export Reports' },
  { id: 'manageSettings', label: 'Manage Settings' }
];

export default function EditUserModal({ isOpen, onClose, user, onSave }: EditUserModalProps) {
  const [email, setEmail] = useState(user?.email || '');
  const [role, setRole] = useState(user?.role || 'worker');
  const [permissions, setPermissions] = useState<string[]>(user?.permissions || []);

  useEffect(() => {
    if (user) {
      setEmail(user.email);
      setRole(user.role);
      setPermissions(user.permissions);
    }
  }, [user]);

  const handleSave = () => {
    onSave({
      email,
      role,
      permissions
    });
    onClose();
  };

  const handlePermissionChange = (permissionId: string) => {
    setPermissions(current => 
      current.includes(permissionId)
        ? current.filter(p => p !== permissionId)
        : [...current, permissionId]
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="sm:flex sm:items-start">
        <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Edit User</h3>
          
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              disabled
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-gray-50"
            />
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="worker">Worker</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
            <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
              {PERMISSIONS.map((permission) => (
                <label key={permission.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={permissions.includes(permission.id)}
                    onChange={() => handlePermissionChange(permission.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">{permission.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
        <button
          type="button"
          onClick={handleSave}
          className="inline-flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
        >
          Save Changes
        </button>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
} 