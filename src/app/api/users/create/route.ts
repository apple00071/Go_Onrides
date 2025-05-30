import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const requestData = await request.json();
    const { email, password, role, permissions } = requestData;

    // Initialize Supabase client with service role
    const supabase = createRouteHandlerClient(
      { cookies },
      {
        supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      }
    );

    // First check if the requesting user is an admin
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

    // Create the user
    const { data: userData, error: createUserError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role
      }
    });

    if (createUserError) {
      throw createUserError;
    }

    if (!userData.user) {
      throw new Error('Failed to create user');
    }

    // Create the user's profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userData.user.id,
        email,
        role,
        permissions
      });

    if (profileError) {
      // If profile creation fails, try to delete the auth user
      await supabase.auth.admin.deleteUser(userData.user.id);
      throw profileError;
    }

    return NextResponse.json({ 
      message: 'User created successfully',
      user: userData.user
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