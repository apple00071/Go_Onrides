import { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { Permission, UserProfile } from '@/types/database';

type Role = 'admin' | 'worker';

interface FormData {
  email: string;
  username: string;
  password: string;
  role: Role;
  permissions: Permission;
}

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onUserUpdated: () => void;
}

// Group permissions by category
const permissionGroups: Record<string, Array<{ key: keyof Permission; label: string }>> = {
  'Booking Permissions': [
    { key: 'can_create_bookings', label: 'Create Bookings' },
    { key: 'can_view_bookings', label: 'View Bookings' },
    { key: 'can_edit_bookings', label: 'Edit Bookings' },
    { key: 'can_delete_bookings', label: 'Delete Bookings' }
  ],
  'User Management': [
    { key: 'can_manage_users', label: 'Manage Users' }
  ],
  'Report Access': [
    { key: 'can_view_reports', label: 'View Reports' }
  ]
};

const EditUserModal = ({ isOpen, onClose, user, onUserUpdated }: EditUserModalProps) => {
  const [formData, setFormData] = useState<FormData>({
    email: user.email,
    username: user.username,
    password: '',
    role: user.role as Role,
    permissions: {
      can_create_bookings: user.permissions?.can_create_bookings ?? false,
      can_view_bookings: user.permissions?.can_view_bookings ?? true,
      can_edit_bookings: user.permissions?.can_edit_bookings ?? false,
      can_delete_bookings: user.permissions?.can_delete_bookings ?? false,
      can_manage_users: user.permissions?.can_manage_users ?? false,
      can_view_reports: user.permissions?.can_view_reports ?? false
    }
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Reset form when user changes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        email: user.email,
        username: user.username,
        password: '',
        role: user.role as Role,
        permissions: {
          can_create_bookings: user.permissions?.can_create_bookings ?? false,
          can_view_bookings: user.permissions?.can_view_bookings ?? true,
          can_edit_bookings: user.permissions?.can_edit_bookings ?? false,
          can_delete_bookings: user.permissions?.can_delete_bookings ?? false,
          can_manage_users: user.permissions?.can_manage_users ?? false,
          can_view_reports: user.permissions?.can_view_reports ?? false
        }
      });
      setError(null);
      setExpandedSection(null);
    }
  }, [isOpen, user]);

  const handlePermissionChange = (key: keyof Permission, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: checked
      }
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
                  checked={!!formData.permissions[key]}
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
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: formData.role,
          permissions: formData.permissions,
        }),
        // Add cache control headers
        cache: 'no-cache',
      });

      let data;
      try {
        data = await response.json();
      } catch (err) {
        throw new Error('Failed to parse server response');
      }

      if (!response.ok) {
        throw new Error(data?.error || `Failed to update user: ${response.statusText}`);
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
            type="button"
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
              value={formData.role}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                role: e.target.value as Role
              }))}
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

        <div className="flex justify-end gap-3 p-4 border-t mt-4">
            <button
              type="button"
              onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
          <button
            type="submit"
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