'use client';

import React from 'react';
import { usePermissions } from '@/lib/usePermissions';
import type { Permission } from '@/lib/usePermissions';

type PermissionType = 'create' | 'edit' | 'delete' | 'view';

interface PermissionGuardProps {
  resource: string;
  type: PermissionType;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Component that conditionally renders children based on user permissions
 * @example
 * <PermissionGuard resource="booking" type="create">
 *   <button>Create Booking</button>
 * </PermissionGuard>
 */
export default function PermissionGuard({
  resource,
  type,
  children,
  fallback = null
}: PermissionGuardProps) {
  const { hasPermission, loading } = usePermissions();
  
  // If still loading permissions, don't render anything
  if (loading) return null;
  
  let hasAccess = false;
  const resourceName = resource.toLowerCase();
  
  // Map the permission type to the actual permission string
  const permissionMap: Record<PermissionType, (resource: string) => Permission> = {
    create: (r) => `manage${r.charAt(0).toUpperCase() + r.slice(1)}s` as Permission,
    edit: (r) => `manage${r.charAt(0).toUpperCase() + r.slice(1)}s` as Permission,
    delete: (r) => `manage${r.charAt(0).toUpperCase() + r.slice(1)}s` as Permission,
    view: (r) => `view${r.charAt(0).toUpperCase() + r.slice(1)}s` as Permission,
  };

  try {
    const permissionString = permissionMap[type](resourceName);
    hasAccess = hasPermission(permissionString);
  } catch (error) {
    console.error(`Invalid permission mapping for resource: ${resourceName}, type: ${type}`);
    hasAccess = false;
  }
  
  if (hasAccess) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
} 