import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { Permission } from '@/types/database';

// Initialize Supabase Admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { email, role } = await request.json();

    // Validate input
    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 }
      );
    }

    // Generate a random password
    const tempPassword = Math.random().toString(36).slice(-8);

    // Create default permissions based on role
    const defaultPermissions: Permission = {
      createBooking: role === 'admin',
      viewBookings: true,
      uploadDocuments: role === 'admin',
      viewDocuments: true,
      managePayments: role === 'admin',
      accessReports: role === 'admin'
    };

    // Create the user in auth.users
    const { data: authData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true
    });

    if (signUpError) {
      return NextResponse.json(
        { error: signUpError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'No user data returned from signup' },
        { status: 400 }
      );
    }

    // Create the user profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        email,
        role,
        permissions: defaultPermissions
      });

    if (profileError) {
      // If profile creation fails, delete the auth user to maintain consistency
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: profileError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 