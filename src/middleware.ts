import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

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

      // Redirect based on role
      let redirectPath;
      if (profile?.role === 'admin' || profile?.role === 'worker') {
        redirectPath = '/dashboard';
      } else {
        redirectPath = '/dashboard';
      }

      const redirectUrl = new URL(redirectPath, req.url);
      console.log('Middleware - Redirecting to:', redirectUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // Handle role-based access to dashboard routes
    if (session && user && isProtectedRoute) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const currentPath = req.nextUrl.pathname;

      // Prevent workers from accessing admin routes
      if (profile?.role === 'worker' && 
          (currentPath.startsWith('/dashboard/admin') || 
           currentPath.startsWith('/dashboard/settings'))) {
        console.log('Middleware - Worker attempting to access admin route, redirecting...');
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }

      // Redirect workers to their dashboard if they try to access the main dashboard
      if (profile?.role === 'worker' && currentPath === '/dashboard') {
        console.log('Middleware - Worker accessing main dashboard...');
        return NextResponse.next();
      }

      // Allow admins to access all routes
      if (profile?.role === 'admin') {
        return NextResponse.next();
      }
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

export const config = {
  matcher: [
    '/login',
    '/signup',
    '/dashboard/:path*',
    '/customers/:path*'
  ],
}; 