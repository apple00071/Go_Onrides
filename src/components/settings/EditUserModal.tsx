import { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, Save, Lock, User, Key, Mail, Phone } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { UserProfile, Role, Permission } from '@/types/database';
import { defaultPermissions, permissionGroups } from '@/lib/permissions';

interface FormData {
  email: string;
  fullName: string;
  phone: string;
  password: string;
  role: Role;
  permissions: Permission;
  isActive: boolean;
}

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onUserUpdated: () => void;
}

const EditUserModal = ({ isOpen, onClose, user, onUserUpdated }: EditUserModalProps) => {
  const [formData, setFormData] = useState<FormData>({
    email: user.email || '',
    fullName: user.full_name || '',
    phone: user.phone || '',
    password: '',
    role: user.role || 'worker',
    permissions: { ...defaultPermissions, ...user.permissions },
    isActive: user.is_active !== false // Default to true if not set
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'permissions'>('details');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Reset form when user changes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        email: user.email || '',
        fullName: user.full_name || '',
        phone: user.phone || '',
        password: '',
        role: user.role || 'worker',
        permissions: { ...defaultPermissions, ...user.permissions },
        isActive: user.is_active !== false
      });
      setError(null);
      setActiveTab('details');
      setIsResettingPassword(false);
    }
  }, [isOpen, user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handlePermissionChange = (key: keyof Permission, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: checked
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
        newPermissions.editBookings = true;
        newPermissions.editCustomers = true;
        newPermissions.editVehicles = true;
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

  const handleResetPassword = () => {
    setIsResettingPassword(true);
    // Auto-focus the password field
    setTimeout(() => {
      const passwordInput = document.getElementById('password');
      if (passwordInput) {
        passwordInput.focus();
      }
    }, 100);
  };

  const handleCancelResetPassword = () => {
    setIsResettingPassword(false);
    setFormData(prev => ({ ...prev, password: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const updateData: any = {
        email: formData.email,
        full_name: formData.fullName,
        phone: formData.phone,
        role: formData.role,
        permissions: formData.permissions,
        is_active: formData.isActive,
        updated_at: new Date().toISOString()
      };

      // Only include password if it's being updated
      if (formData.password) {
        updateData.password = formData.password;
      }

      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
        cache: 'no-cache',
      });

      const responseData = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to update user');
      }

      toast.success('User updated successfully');
      onUserUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating user:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while updating user');
      toast.error('Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render permission group
  const renderPermissionGroup = (title: string, permissions: { key: keyof Permission; label: string; description?: string }[]) => (
    <div key={title} className="space-y-2">
      <h3 className="font-medium text-gray-900 text-sm">{title}</h3>
      <div className="space-y-2">
        {permissions.map(({ key, label, description }) => (
          <div key={key} className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id={`permission-${key}`}
                type="checkbox"
                checked={!!formData.permissions[key]}
                onChange={(e) => handlePermissionChange(key, e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                disabled={formData.role === 'admin'}
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor={`permission-${key}`} className="font-medium text-gray-700">
                {label}
              </label>
              {description && <p className="text-gray-500">{description}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">
          &#8203;
        </span>

        <div className="inline-block w-full max-w-4xl transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:align-middle">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-medium leading-6 text-gray-900">
                    Edit User: {user.full_name || user.email}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Update user details and permissions below.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
                  disabled={isSubmitting}
                >
                  <span className="sr-only">Close</span>
                  <X className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>

              {error && (
                <div className="mt-4 rounded-md bg-red-50 p-4">
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

              <div className="mt-6 border-b border-gray-200">
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

              <div className="mt-6">
                {activeTab === 'details' ? (
                  <div className="space-y-6">
                    <div>
                      <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                        Full Name
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          name="fullName"
                          id="fullName"
                          value={formData.fullName}
                          onChange={handleInputChange}
                          className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                          placeholder="John Doe"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Email
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Mail className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="email"
                          name="email"
                          id="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                          placeholder="user@example.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                        Phone
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Phone className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="tel"
                          name="phone"
                          id="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                        Role
                      </label>
                      <select
                        id="role"
                        name="role"
                        value={formData.role}
                        onChange={(e) => handleRoleChange(e.target.value as Role)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                      >
                        <option value="worker">Worker</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Administrator</option>
                      </select>
                      <p className="mt-2 text-sm text-gray-500">
                        {formData.role === 'admin' 
                          ? 'Admins have full access to all features and settings.'
                          : formData.role === 'manager'
                          ? 'Managers can manage bookings, customers, and view reports.'
                          : 'Workers have limited access based on assigned permissions.'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label htmlFor="isActive" className="block text-sm font-medium text-gray-700">
                          Account Status
                        </label>
                        <p className="text-sm text-gray-500">
                          {formData.isActive ? 'Active' : 'Inactive'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
                        className={`${formData.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'} px-3 py-1 rounded-full text-xs font-medium`}
                      >
                        {formData.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-gray-700">
                          Password
                        </label>
                        {!isResettingPassword ? (
                          <button
                            type="button"
                            onClick={handleResetPassword}
                            className="text-sm font-medium text-blue-600 hover:text-blue-500 focus:outline-none"
                          >
                            Reset Password
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleCancelResetPassword}
                            className="text-sm font-medium text-gray-500 hover:text-gray-700 focus:outline-none"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                      {isResettingPassword && (
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Key className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="password"
                            name="password"
                            id="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                            placeholder="Enter new password"
                            minLength={8}
                          />
                        </div>
                      )}
                      {isResettingPassword && (
                        <p className="mt-2 text-sm text-gray-500">
                          Password must be at least 8 characters long.
                        </p>
                      )}
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
                            <p>Select the specific permissions to grant to this user. Administrators have all permissions by default.</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {formData.role === 'admin' ? (
                      <div className="rounded-md bg-yellow-50 p-4">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-yellow-800">Administrator Access</h3>
                            <div className="mt-2 text-sm text-yellow-700">
                              <p>This user has full administrator privileges and can access all features.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {Object.entries(permissionGroups).map(([title, permissions]) => (
                          <div key={title} className="space-y-4 rounded-lg border border-gray-200 p-4">
                            {renderPermissionGroup(title, permissions)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="-ml-1 mr-2 h-5 w-5" />
                    Save Changes
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditUserModal;