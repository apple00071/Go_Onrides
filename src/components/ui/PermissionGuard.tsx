'use client';

import React from 'react';
import { usePermissions } from '@/lib/usePermissions';
import type { Permission } from '@/types/database';

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
  const { hasPermission } = usePermissions();

  const getPermissionKey = (resource: string, type: PermissionType): keyof Permission => {
    switch (type) {
      case 'create':
        return `create${resource.charAt(0).toUpperCase() + resource.slice(1)}` as keyof Permission;
      case 'edit':
      case 'delete':
        return `manage${resource.charAt(0).toUpperCase() + resource.slice(1)}s` as keyof Permission;
      case 'view':
        return `view${resource.charAt(0).toUpperCase() + resource.slice(1)}s` as keyof Permission;
      default:
        throw new Error(`Invalid permission type: ${type}`);
    }
  };

  const permissionKey = getPermissionKey(resource, type);
  const hasAccess = hasPermission(permissionKey);

  if (!hasAccess) return fallback;

  return <>{children}</>;
} 