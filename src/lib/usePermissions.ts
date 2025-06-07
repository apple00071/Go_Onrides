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

export function usePermissions(): UsePermissionsResult {
  const [isAdmin, setIsAdmin] = useState(false);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setLoading(false);
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, permissions')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;

      setIsAdmin(profile?.role === 'admin');
      setPermissions(profile?.permissions || {});
    } catch (error) {
      console.error('Error checking permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permission: string): boolean => {
    return isAdmin || permissions[permission] === true;
  };

  const canCreate = (resource: keyof Permission): boolean => {
    return isAdmin || permissions[resource] === true;
  };

  const canEdit = (resource: string): boolean => {
    return isAdmin || permissions[`edit${resource.charAt(0).toUpperCase()}${resource.slice(1)}`] === true;
  };

  const canDelete = (resource: string): boolean => {
    return isAdmin || permissions[`delete${resource.charAt(0).toUpperCase()}${resource.slice(1)}`] === true;
  };

  const canView = (resource: keyof Permission): boolean => {
    return isAdmin || permissions[resource] === true;
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