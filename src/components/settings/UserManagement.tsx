'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, User, Shield, UserCheck, X, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { UserProfile, Permission } from '@/types/database';
import { permissionGroups, defaultPermissions } from '@/lib/permissions';

interface CreateUserForm {
  email: string;
  username: string;
  password: string;
  role: 'admin' | 'worker' | 'manager';
  permissions: Permission;
}

interface EditUserForm {
  username: string;
  role: 'admin' | 'worker' | 'manager';
  permissions: Permission;
  newPassword?: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  
  // Password visibility states
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  
  // Form states
  const [createForm, setCreateForm] = useState<CreateUserForm>({
    email: '',
    username: '',
    password: '',
    role: 'worker',
    permissions: { ...defaultPermissions }
  });
  
  const [editForm, setEditForm] = useState<EditUserForm>({
    username: '',
    role: 'worker',
    permissions: { ...defaultPermissions },
    newPassword: ''
  });

  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

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

  const resetCreateForm = () => {
    setCreateForm({
      email: '',
      username: '',
      password: '',
      role: 'worker',
      permissions: { ...defaultPermissions }
    });
    setShowCreatePassword(false);
  };

  const handleCreateUser = async () => {
    if (!createForm.email || !createForm.username || !createForm.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createForm),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }

      toast.success('User created successfully');
      setIsCreateModalOpen(false);
      resetCreateForm();
      fetchUsers();
    } catch (err) {
      console.error('Error creating user:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser || !editForm.username) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user');
      }

      toast.success('User updated successfully');
      setEditingUser(null);
      setShowEditPassword(false);
      fetchUsers();
    } catch (err) {
      console.error('Error updating user:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string, userRole: string) => {
    // Prevent deletion of admin users
    if (userRole === 'admin') {
      toast.error('Admin users cannot be deleted');
      return;
    }

    const confirmMessage = `Are you sure you want to delete user ${userEmail}? This action cannot be undone.`;
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
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

  const handleEditUser = (user: UserProfile) => {
    setEditForm({
      username: user.username || '',
      role: user.role,
      permissions: user.permissions || { ...defaultPermissions },
      newPassword: ''
    });
    setEditingUser(user);
    setShowEditPassword(false);
  };

  const handleRoleChange = (role: 'admin' | 'worker' | 'manager', isCreate: boolean = true) => {
    const adminPermissions: Permission = {
      // Booking Permissions
      createBooking: true,
      viewBookings: true,
      editBookings: true,
      deleteBookings: true,
      manageBookings: true, // Added for booking completion
      
      // Customer Permissions
      createCustomer: true,
      viewCustomers: true,
      editCustomers: true,
      deleteCustomers: true,
      
      // Vehicle Permissions
      createVehicle: true,
      viewVehicles: true,
      editVehicles: true,
      deleteVehicles: true,
      
      // Maintenance Permissions
      createMaintenance: true,
      viewMaintenance: true,
      editMaintenance: true,
      deleteMaintenance: true,
      
      // Invoice & Payments
      createInvoice: true,
      viewInvoices: true,
      editInvoices: true,
      managePayments: true,
      
      // Reports
      viewReports: true,
      exportReports: true,
      
      // System
      manageUsers: true,
      manageSettings: true,
      viewAuditLogs: true
    };

    const workerPermissions: Permission = {
      ...defaultPermissions
    };

    const newPermissions = role === 'admin' ? adminPermissions : workerPermissions;

    if (isCreate) {
      setCreateForm(prev => ({
        ...prev,
        role,
        permissions: newPermissions
      }));
    } else {
      setEditForm(prev => ({
        ...prev,
        role,
        permissions: newPermissions
      }));
    }
  };

  const handlePermissionChange = (
    permissionKey: keyof Permission, 
    value: boolean, 
    isCreate: boolean = true
  ) => {
    if (isCreate) {
      setCreateForm(prev => ({
        ...prev,
        permissions: {
          ...prev.permissions,
          [permissionKey]: value
        }
      }));
    } else {
      setEditForm(prev => ({
        ...prev,
        permissions: {
          ...prev.permissions,
          [permissionKey]: value
        }
      }));
    }
  };

  const renderPermissionGroups = (permissions: Permission, isCreate: boolean = true) => {
    return (
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-900">Permissions</h4>
        <div className="space-y-3">
          {Object.entries(permissionGroups).map(([groupName, groupPermissions]) => (
            <div key={groupName} className="border border-gray-200 rounded-lg p-3">
              <h5 className="text-xs font-medium text-gray-700 mb-2">{groupName}</h5>
              <div className="grid grid-cols-2 gap-2">
                {groupPermissions.map((permission) => (
                  <label key={permission.key} className="flex items-center space-x-2 text-xs">
                    <input
                      type="checkbox"
                      checked={permissions[permission.key] || false}
                      onChange={(e) => handlePermissionChange(permission.key, e.target.checked, isCreate)}
                      className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-gray-700">{permission.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
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
                          <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
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
                                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
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
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.is_active !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {user.is_active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm font-medium'>
                        <div className='flex space-x-2'>
                          <button
                            onClick={() => handleEditUser(user)}
                            className='text-blue-600 hover:text-blue-900'
                            title='Edit user'
                          >
                            <Edit className='h-4 w-4' />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id, user.email, user.role)}
                            className={`${user.role === 'admin' ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:text-red-900'}`}
                            title={user.role === 'admin' ? 'Admin users cannot be deleted' : 'Delete user'}
                            disabled={user.role === 'admin'}
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
          <div className='bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto'>
            <div className='flex justify-between items-center mb-4'>
              <h3 className='text-lg font-medium'>Create New User</h3>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  resetCreateForm();
                }}
                className='text-gray-400 hover:text-gray-600'
              >
                <X className='h-5 w-5' />
              </button>
            </div>
            
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
              {/* Basic Information */}
              <div className='space-y-4'>
                <h4 className='text-sm font-medium text-gray-900'>Basic Information</h4>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>Email *</label>
                  <input
                    type='email'
                    value={createForm.email}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                    className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
                    placeholder='user@example.com'
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>Username *</label>
                  <input
                    type='text'
                    value={createForm.username}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, username: e.target.value }))}
                    className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
                    placeholder='username'
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>Password *</label>
                  <div className='relative'>
                    <input
                      type={showCreatePassword ? 'text' : 'password'}
                      value={createForm.password}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                      className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm pr-10'
                      placeholder='password'
                    />
                    <button
                      type='button'
                      onClick={() => setShowCreatePassword(!showCreatePassword)}
                      className='absolute inset-y-0 right-0 pr-3 flex items-center'
                    >
                      {showCreatePassword ? (
                        <EyeOff className='h-4 w-4 text-gray-400' />
                      ) : (
                        <Eye className='h-4 w-4 text-gray-400' />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>Role *</label>
                  <select 
                    value={createForm.role}
                    onChange={(e) => handleRoleChange(e.target.value as 'admin' | 'worker' | 'manager', true)}
                    className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
                  >
                    <option value='worker'>Worker</option>
                    <option value='admin'>Admin</option>
                  </select>
                </div>
              </div>

              {/* Permissions */}
              <div className='max-h-96 overflow-y-auto'>
                {renderPermissionGroups(createForm.permissions, true)}
              </div>
            </div>
            
            <div className='mt-6 flex space-x-3'>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  resetCreateForm();
                }}
                className='flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400'
                disabled={isCreating}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateUser}
                disabled={isCreating}
                className='flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {isCreating ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className='fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50'>
          <div className='bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto'>
            <div className='flex justify-between items-center mb-4'>
              <h3 className='text-lg font-medium'>Edit User: {editingUser.email}</h3>
              <button
                onClick={() => setEditingUser(null)}
                className='text-gray-400 hover:text-gray-600'
              >
                <X className='h-5 w-5' />
              </button>
            </div>
            
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
              {/* Basic Information */}
              <div className='space-y-4'>
                <h4 className='text-sm font-medium text-gray-900'>Basic Information</h4>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>Email</label>
                  <input
                    type='email'
                    value={editingUser.email}
                    disabled
                    className='mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm sm:text-sm'
                  />
                  <p className='mt-1 text-xs text-gray-500'>Email cannot be changed</p>
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>Username *</label>
                  <input
                    type='text'
                    value={editForm.username}
                    onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value }))}
                    className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>New Password (optional)</label>
                  <div className='relative'>
                    <input
                      type={showEditPassword ? 'text' : 'password'}
                      value={editForm.newPassword || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, newPassword: e.target.value }))}
                      className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm pr-10'
                      placeholder='Leave empty to keep current password'
                    />
                    <button
                      type='button'
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      className='absolute inset-y-0 right-0 pr-3 flex items-center'
                    >
                      {showEditPassword ? (
                        <EyeOff className='h-4 w-4 text-gray-400' />
                      ) : (
                        <Eye className='h-4 w-4 text-gray-400' />
                      )}
                    </button>
                  </div>
                  <p className='mt-1 text-xs text-gray-500'>Leave empty to keep current password</p>
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>Role *</label>
                  <select 
                    value={editForm.role}
                    onChange={(e) => handleRoleChange(e.target.value as 'admin' | 'worker' | 'manager', false)}
                    className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
                  >
                    <option value='worker'>Worker</option>
                    <option value='admin'>Admin</option>
                  </select>
                </div>
              </div>

              {/* Permissions */}
              <div className='max-h-96 overflow-y-auto'>
                {renderPermissionGroups(editForm.permissions, false)}
              </div>
            </div>
            
            <div className='mt-6 flex space-x-3'>
              <button
                onClick={() => setEditingUser(null)}
                className='flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400'
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateUser}
                disabled={isUpdating}
                className='flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {isUpdating ? 'Updating...' : 'Update User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
