import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const requestData = await request.json();
    let { email, username, password, role } = requestData;

    // Validate required fields
    if (!username || !password || !role) {
      return NextResponse.json(
        { error: 'Username, password and role are required' },
        { status: 400 }
      );
    }

    // Generate email if not provided
    if (!email) {
      email = `${username.toLowerCase()}@goonriders.com`;
    }

    // Create admin client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get the current user's session
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Check if the current user is an admin
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (!adminProfile || adminProfile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Not authorized - only admins can create users' },
        { status: 403 }
      );
    }

    // Create auth user
    console.log('Creating auth user:', { email, username });
    
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (createError) {
      console.error('Auth creation error:', createError);
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      );
    }

    if (!authData?.user) {
      return NextResponse.json(
        { error: 'Failed to create user - no user data returned' },
        { status: 500 }
      );
    }

    // Set default permissions
    const defaultPermissions = {
      can_create_bookings: role === 'admin',
      can_view_bookings: true,
      can_edit_bookings: role === 'admin',
      can_delete_bookings: role === 'admin',
      can_manage_users: role === 'admin',
      can_view_reports: role === 'admin'
    };

    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert([{
        id: authData.user.id,
        email: authData.user.email,
        username,
        role,
        permissions: defaultPermissions,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: session.user.id
      }]);

    if (profileError) {
      console.error('Profile creation error:', profileError);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      );
    }

    // Update user metadata
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      authData.user.id,
      { user_metadata: { username, role } }
    );

    if (updateError) {
      console.error('Failed to update user metadata:', updateError);
    }

    return NextResponse.json({ 
      message: 'User created successfully',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        username,
        role,
        permissions: defaultPermissions
      }
    });

  } catch (error) {
    console.error('Error in user creation:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 