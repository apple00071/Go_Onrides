'use client';

import { useEffect, useState, useCallback } from 'react';
import { getSupabaseClient } from './supabase';
import type { Permission } from '@/types/database';
import { defaultPermissions } from './permissions';

interface UsePermissionsReturn {
  isAdmin: boolean;
  canEdit: boolean;
  hasPermission: (permission: keyof Permission) => boolean;
  loading: boolean;
  error: string | null;
  permissions: Permission | null;
}

export function usePermissions(): UsePermissionsReturn {
  const [isAdmin, setIsAdmin] = useState(false);
  const [permissions, setPermissions] = useState<Permission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    try {
      const supabase = getSupabaseClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;
      if (!session) {
        setError('No active session');
        setLoading(false);
        return null;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, permissions')
        .eq('id', session.user.id)
        .single();

      if (profileError) throw profileError;
      if (!profile) throw new Error('Profile not found');

      // Ensure all permissions have a default value
      const userPermissions = {
        ...defaultPermissions,
        ...(profile.permissions || {})
      };

      const isUserAdmin = profile.role === 'admin';
      setIsAdmin(isUserAdmin);
      setPermissions(userPermissions);
      
      return { isUserAdmin, userPermissions };
    } catch (error) {
      console.error('Error checking permissions:', error);
      setError(error instanceof Error ? error.message : 'Failed to check permissions');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasPermission = useCallback((permission: keyof Permission): boolean => {
    // If user is admin, they have all permissions
    if (isAdmin) return true;
    
    // If permissions aren't loaded yet, default to false
    if (!permissions) return false;
    
    // Check if the specific permission is granted
    // Default to false if the permission key doesn't exist
    return permissions[permission] === true;
  }, [isAdmin, permissions]);

  // canEdit is a convenience property that checks for any edit permission
  const canEdit = useCallback((): boolean => {
    if (isAdmin) return true;
    if (!permissions) return false;
    
    return Object.entries(permissions).some(
      ([key, value]) => key.startsWith('create') || key.startsWith('manage') || key.startsWith('edit')
    );
  }, [isAdmin, permissions]);

  return {
    isAdmin,
    canEdit: canEdit(),
    hasPermission,
    loading,
    error,
    permissions
  };
}