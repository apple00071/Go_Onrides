import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Create service role client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Try to find user by username or email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.eq.${username},email.eq.${username}`)
      .single();

    if (profileError || !profile) {
      console.error('Profile lookup error:', profileError);
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Attempt to sign in
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: password
    });

    if (authError) {
      console.error('Auth error:', authError);
      // Log failed login attempt
      await supabase
        .from('user_logs')
        .insert({
          user_id: profile.id,
          action_type: 'login_attempt',
          entity_type: 'auth',
          entity_id: profile.id,
          user_email: profile.email,
          details: {
            login_method: 'password',
            success: false
          }
        });

      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Log successful login
    await supabase
      .from('user_logs')
      .insert({
        user_id: profile.id,
        action_type: 'login',
        entity_type: 'auth',
        entity_id: profile.id,
        user_email: profile.email,
        details: {
          login_method: 'password',
          success: true
        }
      });

    return NextResponse.json({
      user: authData.user,
      session: authData.session,
      profile: {
        id: profile.id,
        username: profile.username,
        email: profile.email,
        role: profile.role
      }
    });
  } catch (error) {
    console.error('Error in login:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
} 