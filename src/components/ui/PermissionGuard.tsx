'use client';

import React from 'react';
import { usePermissions } from '@/lib/usePermissions';
import type { Permission } from '@/types/database';

type PermissionType = 'create' | 'edit' | 'delete' | 'view';

interface PermissionGuardProps {
  resource: keyof Permission | string;
  type: PermissionType;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Component that conditionally renders children based on user permissions
 * @example
 * <PermissionGuard resource="createBooking" type="create">
 *   <button>Create Booking</button>
 * </PermissionGuard>
 */
export default function PermissionGuard({
  resource,
  type,
  children,
  fallback = null
}: PermissionGuardProps) {
  const { canCreate, canEdit, canDelete, canView, loading } = usePermissions();
  
  // If still loading permissions, don't render anything
  if (loading) return null;
  
  let hasPermission = false;
  
  switch (type) {
    case 'create':
      hasPermission = canCreate(resource as keyof Permission);
      break;
    case 'edit':
      hasPermission = canEdit(resource);
      break;
    case 'delete':
      hasPermission = canDelete(resource);
      break;
    case 'view':
      hasPermission = canView(resource as keyof Permission);
      break;
    default:
      hasPermission = false;
  }
  
  if (hasPermission) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
} 