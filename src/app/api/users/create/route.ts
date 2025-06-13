import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const requestData = await request.json();
    const { email, username, password, role, permissions } = requestData;

    if (!username || !password || !role) {
      return NextResponse.json(
        { error: 'Username, password and role are required' },
        { status: 400 }
      );
    }

    // First check if the requesting user is an admin using the normal client
    const supabase = createRouteHandlerClient({ cookies });
    
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Verify admin status
    const { data: adminCheck, error: adminCheckError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (adminCheckError || adminCheck?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      );
    }

    // Check if username already exists
    const { data: existingUser, error: existingUserError } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 400 }
      );
    }

    // Create a new Supabase client with the service role key for admin operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Create the user using the admin client
    const { data: userData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role,
        username
      }
    });

    if (createUserError) {
      throw createUserError;
    }

    if (!userData.user) {
      throw new Error('Failed to create user');
    }

    // Create the user's profile using the admin client
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userData.user.id,
        email,
        username,
        role,
        permissions
      });

    if (profileError) {
      // If profile creation fails, try to delete the auth user
      await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
      throw profileError;
    }

    return NextResponse.json({ 
      message: 'User created successfully',
      user: {
        id: userData.user.id,
        username,
        role
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to create user'
      },
      { status: 500 }
    );
  }
} 