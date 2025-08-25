import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'worker';
  created_at?: string;
  updated_at?: string;
}

interface UserLog {
  user_id: string;
  action_type: string;
  entity_type: string;
  entity_id: string;
  user_email: string;
  details: {
    login_method: string;
    success: boolean;
  };
}

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

    const supabase = getSupabaseClient();
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    let profile: UserProfile | null = null;
        
    // Try username first (case-insensitive)
    const { data: usernameResult, error: usernameError } = await adminSupabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();

    if (!usernameError && usernameResult) {
      profile = usernameResult as UserProfile;
      console.log('Found profile by username:', {
        username: profile.username,
        email: profile.email,
        role: profile.role
      });
    }

    // If not found by username, try email
    if (!profile) {
      const { data: emailResult, error: emailError } = await adminSupabase
        .from('profiles')
        .select('*')
        .eq('email', username)
        .single();

      if (!emailError && emailResult) {
        profile = emailResult as UserProfile;
        console.log('Found profile by email:', {
          username: profile.username,
          email: profile.email,
          role: profile.role
        });
      }
    }

    if (!profile) {
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
      // Log failed login attempt
      await adminSupabase
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
        } as UserLog);

      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Log successful login
    await adminSupabase
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
      } as UserLog);

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