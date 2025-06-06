import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500 // Max 500 users per interval
});

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

    // Remove console.logs for security
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username/email and password are required' },
        { status: 400 }
      );
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Check if the input is an email
    const isEmail = username.includes('@');

    if (isEmail) {
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: username,
        password
      });

      if (signInError) {
        return NextResponse.json(
          { error: 'Invalid credentials' }, // Generic error message for security
          { status: 401 }
        );
      }

      // Log successful login
      await supabase.from('user_logs').insert({
        user_id: authData.user.id,
        action_type: 'login',
        entity_type: 'user',
        entity_id: authData.user.id,
        user_email: authData.user.email
      });

      return NextResponse.json({
        user: {
          id: authData.user.id,
          email: authData.user.email,
          role: authData.user.user_metadata?.role
        },
        session: {
          access_token: authData.session?.access_token,
          expires_at: authData.session?.expires_at
        }
      });
    }

    // Username login flow
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, id, username')
      .eq('username', username)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Invalid credentials' }, // Generic error message for security
        { status: 401 }
      );
    }

    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password
    });

    if (signInError) {
      return NextResponse.json(
        { error: 'Invalid credentials' }, // Generic error message for security
        { status: 401 }
      );
    }

    // Log successful login
    await supabase.from('user_logs').insert({
      user_id: authData.user.id,
      action_type: 'login',
      entity_type: 'user',
      entity_id: authData.user.id,
      user_email: profile.email
    });

    return NextResponse.json({
      user: {
        id: authData.user.id,
        email: profile.email,
        role: authData.user.user_metadata?.role
      },
      session: {
        access_token: authData.session?.access_token,
        expires_at: authData.session?.expires_at
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
} 