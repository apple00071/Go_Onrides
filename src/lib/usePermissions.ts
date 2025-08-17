'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from './supabase';
import type { Permission } from '@/types/database';

interface UsePermissionsReturn {
  isAdmin: boolean;
  canEdit: boolean;
  hasPermission: (permission: keyof Permission) => boolean;
  loading: boolean;
  error: string | null;
}

export function usePermissions(): UsePermissionsReturn {
  const [isAdmin, setIsAdmin] = useState(false);
  const [permissions, setPermissions] = useState<Permission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkPermissions() {
      try {
        const supabase = getSupabaseClient();
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;
        if (!session) {
          setError('No active session');
          setLoading(false);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, permissions')
          .eq('id', session.user.id)
          .single();

        if (profileError) throw profileError;
        if (!profile) throw new Error('Profile not found');

        const isUserAdmin = profile.role === 'admin';
        setIsAdmin(isUserAdmin);
        setPermissions(profile.permissions || {});

      } catch (error) {
        console.error('Error checking permissions:', error);
        setError(error instanceof Error ? error.message : 'Failed to check permissions');
      } finally {
        setLoading(false);
      }
    }

    checkPermissions();
  }, []);

  const hasPermission = (permission: keyof Permission): boolean => {
    // Admins have all permissions
    if (isAdmin) return true;

    // Check if the permission exists in the user's permissions
    return Boolean(permissions?.[permission]);
  };

  return {
    isAdmin,
    canEdit: isAdmin, // Only admins can edit
    hasPermission,
    loading,
    error
  };
} 