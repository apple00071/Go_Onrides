import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export const dynamic = 'force-dynamic';

// Helper function to create admin client
function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required environment variables for Supabase admin client');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Define all valid permission keys
type PermissionKey = keyof typeof defaultPermissions;

// Define all valid permission keys with their default values
const defaultPermissions = {
  // Booking Permissions
  createBooking: false,
  viewBookings: true,
  manageBookings: false,
  
  // Customer Permissions
  createCustomer: false,
  viewCustomers: true,
  manageCustomers: false,
  
  // Vehicle Permissions
  createVehicle: false,
  viewVehicles: true,
  manageVehicles: false,
  
  // Maintenance Permissions
  createMaintenance: false,
  viewMaintenance: true,
  manageMaintenance: false,
  
  // Invoice & Payment Permissions
  createInvoice: false,
  viewInvoices: true,
  managePayments: false,
  
  // Report Permissions
  accessReports: false,
  exportReports: false,
  
  // Return Permissions
  manageReturns: false,
  viewReturns: true,
  
  // Notification Permissions
  manageNotifications: false,
  viewNotifications: true,
  
  // Settings Permission
  manageSettings: false
};

// Create an array of all valid permission keys
const VALID_PERMISSIONS = Object.keys(defaultPermissions) as PermissionKey[];

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const adminSupabase = createAdminClient();
    const { permissions: incomingPermissions } = await request.json();

    // Create regular client for user session checks
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Check if user is authenticated and is admin
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('No active session');
      return NextResponse.json(
        { error: 'Unauthorized: No active session' },
        { status: 401 }
      );
    }

    // Check if the target user exists
    const { data: targetUser, error: userError } = await adminSupabase
      .from('profiles')
      .select('id, permissions')
      .eq('id', params.id)
      .single();

    if (userError || !targetUser) {
      console.error('User not found:', params.id, userError);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get current user's role and permissions
    const { data: currentUser } = await supabase
      .from('profiles')
      .select('role, permissions')
      .eq('id', session.user.id)
      .single();

    // Only allow admins to update permissions
    if (currentUser?.role !== 'admin') {
      console.error('Insufficient permissions for user:', session.user.id);
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Validate and sanitize incoming permissions
    const updatedPermissions: Record<string, boolean> = { ...defaultPermissions };
    
    // Only update permissions that exist in our default permissions
    Object.entries(incomingPermissions).forEach(([key, value]) => {
      if (key in updatedPermissions) {
        updatedPermissions[key] = Boolean(value);
      }
    });

    // Log the update for auditing
    console.log('Updating permissions for user:', params.id, {
      from: targetUser.permissions,
      to: updatedPermissions,
      updated_by: session.user.id
    });

    // Update the user's permissions in the database
    const { data: updatedUser, error: updateError } = await adminSupabase
      .from('profiles')
      .update({ 
        permissions: updatedPermissions,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating permissions:', updateError);
      return NextResponse.json(
        { error: `Failed to update permissions: ${updateError.message}` },
        { status: 500 }
      );
    }

    console.log('Permissions updated successfully for user:', params.id);
    return NextResponse.json({ 
      success: true, 
      data: updatedUser,
      message: 'Permissions updated successfully'
    });

  } catch (error) {
    console.error('Error updating user permissions:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while updating permissions' },
      { status: 500 }
    );
  }
}
