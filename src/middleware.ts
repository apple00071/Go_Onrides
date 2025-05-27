import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Create a Supabase client configured to use cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  try {
    // Refresh session if expired - required for Server Components
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Get authenticated user data
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Log for debugging
    console.log('Middleware - Current path:', req.nextUrl.pathname);
    console.log('Middleware - Session:', session ? 'Present' : 'None');
    console.log('Middleware - User:', user ? 'Authenticated' : 'Not authenticated');

    // Define protected and auth routes
    const isProtectedRoute = 
      req.nextUrl.pathname.startsWith('/dashboard') ||
      req.nextUrl.pathname.startsWith('/customers');

    const isAuthRoute = 
      req.nextUrl.pathname === '/login' ||
      req.nextUrl.pathname === '/signup';

    // Handle protected routes - require both session and authenticated user
    if ((!session || !user) && isProtectedRoute) {
      console.log('Middleware - Redirecting to login (no session or user)');
      const redirectUrl = new URL('/login', req.url);
      return NextResponse.redirect(redirectUrl);
    }

    // Handle auth routes (login/signup)
    if (session && user && isAuthRoute) {
      console.log('Middleware - Has authenticated session, checking profile');
      // Fetch user profile to determine redirect
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      console.log('Middleware - User profile:', profile);

      // Redirect based on role - matching the login form logic
      const redirectPath = profile?.role === 'admin' ? '/dashboard/settings' : '/dashboard';
      const redirectUrl = new URL(redirectPath, req.url);

      console.log('Middleware - Redirecting to:', redirectUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }

    return res;
  } catch (error) {
    console.error('Middleware error:', error);
    // On error, redirect to login for safety
    if (req.nextUrl.pathname !== '/login') {
      const redirectUrl = new URL('/login', req.url);
      return NextResponse.redirect(redirectUrl);
    }
    return res;
  }
}

// Specify which routes this middleware should run for
export const config = {
  matcher: [
    '/login',
    '/signup',
    '/dashboard/:path*',
    '/customers/:path*'
  ],
}; 