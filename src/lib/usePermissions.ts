'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient } from './supabase';
import type { Permission } from '@/types/database';

export interface UsePermissionsResult {
  isAdmin: boolean;
  canEdit: boolean;
  hasPermission: (permission: string) => boolean;
  permissions: Record<string, boolean>;
  loading: boolean;
}

export function usePermissions(): UsePermissionsResult {
  const [isAdmin, setIsAdmin] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
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
      setCanEdit(profile?.role === 'admin' || (profile?.permissions?.editBookings === true));
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

  return {
    isAdmin,
    canEdit,
    hasPermission,
    permissions,
    loading
  };
} 