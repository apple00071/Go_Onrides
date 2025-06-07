import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import type { Database } from '@/types/database';

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500 // Max 500 users per interval
});

// Create a Supabase client with the service role key for admin operations
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase environment variables');
}

const adminSupabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    }
  }
);

export async function POST(request: Request) {
  try {
    // Apply rate limiting
    try {
      await limiter.check(request, 5); // 5 requests per minute per IP
    } catch {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const { username, password } = await request.json();
    console.log('Login attempt for username:', username);

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Use admin client for profile lookup to bypass RLS
    let profile;
    let profileError;

    try {
      console.log('Searching for profile with username:', username);
      
      // Try username first (case-insensitive)
      const usernameResult = await adminSupabase
        .from('profiles')
        .select('*')
        .ilike('username', username)
        .single();

      console.log('Username search result:', {
        error: usernameResult.error,
        data: usernameResult.data ? 'Found' : 'Not found'
      });

      if (!usernameResult.error && usernameResult.data) {
        profile = usernameResult.data;
        console.log('Found profile by username:', {
          username: profile.username,
          email: profile.email,
          id: profile.id,
          role: profile.role
        });
      } else {
        // If username not found, try email (case-insensitive)
        console.log('Trying email lookup for:', username);
        const emailResult = await adminSupabase
          .from('profiles')
          .select('*')
          .ilike('email', username)
          .single();

        console.log('Email search result:', {
          error: emailResult.error,
          data: emailResult.data ? 'Found' : 'Not found'
        });

        if (!emailResult.error && emailResult.data) {
          profile = emailResult.data;
          console.log('Found profile by email:', {
            email: profile.email,
            id: profile.id,
            role: profile.role
          });
        } else {
          profileError = emailResult.error;
          console.log('Profile lookup failed:', profileError);
        }
      }
    } catch (error) {
      console.error('Database query error:', error);
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 }
      );
    }

    if (!profile) {
      console.error('No profile found for username/email:', username);
      return NextResponse.json(
        { error: 'Invalid username/email or password' },
        { status: 401 }
      );
    }

    try {
      // Use the route handler client for authentication
      const supabase = createRouteHandlerClient<Database>({ cookies });

      // Sign in with the email from the profile
      console.log('Attempting sign in with email:', profile.email);
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password
      });

      if (signInError) {
        console.error('Sign in error:', signInError);
        return NextResponse.json(
          { error: 'Invalid username/email or password' },
          { status: 401 }
        );
      }

      if (!authData?.user) {
        console.error('No user data returned after successful sign in');
        return NextResponse.json(
          { error: 'Authentication failed' },
          { status: 401 }
        );
      }

      console.log('Sign in successful for user:', authData.user.id);

      // Log successful login using admin client to bypass RLS
      try {
        await adminSupabase.from('user_logs').insert({
          user_id: authData.user.id,
          action_type: 'login',
          entity_type: 'user',
          entity_id: authData.user.id,
          user_email: profile.email,
          details: {
            login_method: 'password',
            success: true
          }
        });
      } catch (logError) {
        // Don't fail the login if logging fails
        console.error('Failed to log login attempt:', logError);
      }

      return NextResponse.json({
        user: {
          id: authData.user.id,
          username: profile.username,
          email: profile.email,
          role: profile.role,
          permissions: profile.permissions
        },
        session: {
          access_token: authData.session?.access_token,
          refresh_token: authData.session?.refresh_token,
          expires_at: authData.session?.expires_at
        }
      });
    } catch (error) {
      console.error('Authentication error:', error);
      return NextResponse.json(
        { error: 'Authentication service error' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
} 