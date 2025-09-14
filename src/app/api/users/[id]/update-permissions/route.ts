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

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const adminSupabase = createAdminClient();
    const { permissions } = await request.json();

    // Create regular client for user session checks
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Check if user is authenticated and is admin
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Validate and prepare permissions
    const validPermissions: Record<string, boolean> = {};
    
    // Initialize all permissions to false
    VALID_PERMISSIONS.forEach(permission => {
      validPermissions[permission] = false;
    });

    // Update with provided permissions
    if (permissions && typeof permissions === 'object') {
      Object.entries(permissions).forEach(([key, value]) => {
        if (VALID_PERMISSIONS.includes(key)) {
          validPermissions[key] = Boolean(value);
        }
      });
    }

    // Update user permissions
    const { data: updatedUser, error: updateError } = await adminSupabase
      .from('profiles')
      .update({ 
        permissions: validPermissions,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update user permissions' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      user: updatedUser 
    });

  } catch (error) {
    console.error('Error updating user permissions:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while updating permissions' },
      { status: 500 }
    );
  }
}
