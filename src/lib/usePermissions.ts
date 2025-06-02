'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient } from './supabase';
import type { Permission } from '@/types/database';

interface UsePermissionsResult {
  isAdmin: boolean;
  permissions: Permission | null;
  loading: boolean;
  canCreate: (resource: keyof Permission) => boolean;
  canEdit: (resource: string) => boolean;
  canDelete: (resource: string) => boolean;
  canView: (resource: keyof Permission) => boolean;
}

export function usePermissions(): UsePermissionsResult {
  const [role, setRole] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Permission | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPermissions() {
      try {
        const supabase = getSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('role, permissions')
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.error('Error fetching permissions:', error);
          return;
        }

        setRole(data?.role);
        setPermissions(data?.permissions);
      } catch (error) {
        console.error('Error in permissions hook:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchPermissions();
  }, []);

  // Check if user is admin
  const isAdmin = role === 'admin';

  // Function to check if user can create a specific resource
  const canCreate = (resource: keyof Permission): boolean => {
    if (loading) return false;
    if (isAdmin) return true;

    switch (resource) {
      case 'createBooking':
        return !!permissions?.createBooking;
      case 'uploadDocuments':
        return !!permissions?.uploadDocuments;
      case 'managePayments':
        return !!permissions?.managePayments;
      default:
        return false;
    }
  };

  // Function to check if user can edit a resource (only admins)
  const canEdit = (resource: string): boolean => {
    if (loading) return false;
    return isAdmin;
  };

  // Function to check if user can delete a resource (only admins)
  const canDelete = (resource: string): boolean => {
    if (loading) return false;
    return isAdmin;
  };

  // Function to check if user can view a specific resource
  const canView = (resource: keyof Permission): boolean => {
    if (loading) return false;
    if (isAdmin) return true;

    switch (resource) {
      case 'viewBookings':
        return !!permissions?.viewBookings;
      case 'viewDocuments':
        return !!permissions?.viewDocuments;
      case 'accessReports':
        return !!permissions?.accessReports;
      default:
        return false;
    }
  };

  return {
    isAdmin,
    permissions,
    loading,
    canCreate,
    canEdit,
    canDelete,
    canView
  };
} 