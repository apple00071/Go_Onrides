import { getSupabaseServerClient } from './supabase/server';
import type { Permission } from '@/types/database';

export async function checkUserPermission(
  userId: string, 
  permission: keyof Permission
): Promise<boolean> {
  try {
    const supabase = await getSupabaseServerClient();
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role, permissions')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      console.error('Error fetching user profile:', error);
      return false;
    }

    // Admin has all permissions
    if (profile.role === 'admin') {
      return true;
    }

    // Check specific permission
    return profile.permissions?.[permission] === true;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

export async function requirePermission(
  userId: string, 
  permission: keyof Permission
): Promise<{ hasPermission: boolean; error?: string }> {
  const hasPermission = await checkUserPermission(userId, permission);
  
  if (!hasPermission) {
    return {
      hasPermission: false,
      error: `Insufficient permissions. Required: ${permission}`
    };
  }

  return { hasPermission: true };
}

export async function getUserPermissions(userId: string): Promise<Permission | null> {
  try {
    const supabase = await getSupabaseServerClient();
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role, permissions')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return profile.permissions;
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return null;
  }
} 