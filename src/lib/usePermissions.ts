'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient } from './supabase';
import type { Permission } from '@/types/database';

export interface UsePermissionsResult {
  isAdmin: boolean;
  canEdit: (resource: string) => boolean;
  canCreate: (resource: keyof Permission) => boolean;
  canDelete: (resource: string) => boolean;
  canView: (resource: keyof Permission) => boolean;
  hasPermission: (permission: string) => boolean;
  permissions: Record<string, boolean>;
  loading: boolean;
}

const DEFAULT_PERMISSIONS = {
  createBooking: false,
  viewBookings: false,
  managePayments: false,
  accessReports: false,
  viewCustomers: false,
  uploadDocuments: false,
  viewDocuments: false
};

const ADMIN_PERMISSIONS = {
  createBooking: true,
  viewBookings: true,
  managePayments: true,
  accessReports: true,
  viewCustomers: true,
  uploadDocuments: true,
  viewDocuments: true
};

export function usePermissions(): UsePermissionsResult {
  const [isAdmin, setIsAdmin] = useState(false);
  const [permissions, setPermissions] = useState<Record<string, boolean>>(DEFAULT_PERMISSIONS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.log('No session found');
        setLoading(false);
        return;
      }

      console.log('Checking permissions for user:', session.user.id);

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, permissions')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        throw error;
      }

      console.log('Profile data:', profile);

      const isUserAdmin = profile?.role === 'admin';
      console.log('Is user admin?', isUserAdmin);
      setIsAdmin(isUserAdmin);
      
      // If user is admin, grant all permissions regardless of permissions object
      if (isUserAdmin) {
        console.log('Setting admin permissions:', ADMIN_PERMISSIONS);
        setPermissions(ADMIN_PERMISSIONS);
      } else {
        // Merge default permissions with profile permissions to ensure all keys exist
        const userPermissions = {
          ...DEFAULT_PERMISSIONS,
          ...(profile?.permissions || {})
        };
        console.log('Setting regular user permissions:', userPermissions);
        setPermissions(userPermissions);
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      // On error, reset to default permissions
      setPermissions(DEFAULT_PERMISSIONS);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permission: string): boolean => {
    // Early return if admin
    if (isAdmin) {
      console.log(`Admin check for permission '${permission}':`, true);
      return true;
    }
    
    // Check if permission exists in permissions object, default to false if undefined
    const hasPermissionValue = permissions[permission] === true;
    console.log(`Checking permission '${permission}':`, {
      isAdmin,
      permissionValue: permissions[permission],
      result: hasPermissionValue
    });
    return hasPermissionValue;
  };

  const canCreate = (resource: keyof Permission): boolean => {
    return hasPermission(resource);
  };

  const canEdit = (resource: string): boolean => {
    return hasPermission(`edit${resource.charAt(0).toUpperCase()}${resource.slice(1)}`);
  };

  const canDelete = (resource: string): boolean => {
    return hasPermission(`delete${resource.charAt(0).toUpperCase()}${resource.slice(1)}`);
  };

  const canView = (resource: keyof Permission): boolean => {
    return hasPermission(resource);
  };

  return {
    isAdmin,
    canCreate,
    canEdit,
    canDelete,
    canView,
    hasPermission,
    permissions,
    loading
  };
} 