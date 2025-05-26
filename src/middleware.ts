import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  try {
    // Refresh session if expired - required for Server Components
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    // Log for debugging
    console.log('Middleware - Current path:', req.nextUrl.pathname);
    console.log('Middleware - Session:', session ? 'Present' : 'None');
    if (session) {
      console.log('Middleware - User ID:', session.user.id);
    }

    // Define protected and auth routes
    const isProtectedRoute = 
      req.nextUrl.pathname.startsWith('/dashboard') ||
      req.nextUrl.pathname.startsWith('/admin') ||
      req.nextUrl.pathname.startsWith('/customers');

    const isAuthRoute = 
      req.nextUrl.pathname === '/login' ||
      req.nextUrl.pathname === '/signup';

    // Handle protected routes
    if (!session && isProtectedRoute) {
      console.log('Middleware - Redirecting to login (no session)');
      const redirectUrl = new URL('/login', req.url);
      return NextResponse.redirect(redirectUrl);
    }

    // Handle auth routes (login/signup)
    if (session && isAuthRoute) {
      console.log('Middleware - Has session, checking profile');
      // Fetch user profile to determine redirect
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      console.log('Middleware - User profile:', profile);

      const redirectUrl = new URL(
        profile?.role === 'admin' ? '/admin' : '/dashboard',
        req.url
      );

      console.log('Middleware - Redirecting to:', redirectUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // Set auth cookies in response
    if (session) {
      res.cookies.set(
        'sb-access-token',
        session.access_token,
        {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7 // 1 week
        }
      );

      if (session.refresh_token) {
        res.cookies.set(
          'sb-refresh-token',
          session.refresh_token,
          {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7 // 1 week
          }
        );
      }
    }

    return res;
  } catch (error) {
    console.error('Middleware error:', error);
    return res;
  }
}

// Specify which routes this middleware should run for
export const config = {
  matcher: [
    '/login',
    '/signup',
    '/dashboard/:path*',
    '/admin/:path*',
    '/customers/:path*',
  ],
}; 