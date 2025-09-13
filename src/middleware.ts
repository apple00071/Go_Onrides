import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Cache auth state in memory
const AUTH_CACHE_DURATION = 5 * 60; // 5 minutes
const authCache = new Map<string, { data: any; timestamp: number }>();

// List of paths that don't need frequent auth checks
const MINIMAL_AUTH_PATHS = [
  '/dashboard',
  '/dashboard/bookings',
  '/dashboard/customers',
  '/dashboard/vehicles',
  '/dashboard/maintenance',
  '/dashboard/payments',
  '/dashboard/invoices',
  '/dashboard/reports',
  '/dashboard/notifications',
  '/dashboard/returns',
  '/dashboard/workers'
];

// List of paths that need strict auth (admin areas, sensitive operations)
const STRICT_AUTH_PATHS = [
  '/dashboard/admin',
  '/dashboard/settings',
  '/login',
  '/signup'
];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  
  // Skip auth check for static assets and API routes
  if (
    req.nextUrl.pathname.startsWith('/_next') ||
    req.nextUrl.pathname.startsWith('/static') ||
    req.nextUrl.pathname.startsWith('/api') ||
    req.nextUrl.pathname.startsWith('/favicon')
  ) {
    return res;
  }

  // Get the current path
  const currentPath = req.nextUrl.pathname;

  // Check if this is a minimal auth path
  const isMinimalAuthPath = MINIMAL_AUTH_PATHS.some(path => 
    currentPath.startsWith(path)
  );

  // Check if this is a strict auth path
  const isStrictAuthPath = STRICT_AUTH_PATHS.some(path => 
    currentPath.startsWith(path)
  );

  // For minimal auth paths, check cache first
  if (isMinimalAuthPath) {
    const token = req.cookies.get('supabase-auth-token')?.value;
    const cacheKey = `auth-${token}`;
    const cached = authCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) / 1000 < AUTH_CACHE_DURATION) {
      // Use cached auth state
      if (cached.data.session && cached.data.user) {
        return res;
      }
    }
  }

  try {
    const supabase = createMiddlewareClient({ req, res });
    
    // Get session data
    const { data: { session } } = await supabase.auth.getSession();
    const { data: { user } } = await supabase.auth.getUser();

    // Cache successful auth for minimal auth paths
    if (isMinimalAuthPath && session && user) {
      const token = req.cookies.get('supabase-auth-token')?.value;
      const cacheKey = `auth-${token}`;
      authCache.set(cacheKey, {
        data: { session, user },
        timestamp: Date.now()
      });
    }

    // Handle auth routes (login/signup)
    if (session && user && (currentPath === '/login' || currentPath === '/signup')) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Handle protected routes
    if (!session || !user) {
      if (currentPath !== '/login') {
        return NextResponse.redirect(new URL('/login', req.url));
      }
      return res;
    }

    // For strict auth paths, always check role
    if (isStrictAuthPath) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin' && currentPath.startsWith('/dashboard/admin')) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    return res;
  } catch (error) {
    console.error('Middleware error:', error);
    // On error, only redirect to login if not already on login page
    if (currentPath !== '/login') {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    return res;
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|favicon.ico).*)',
  ],
};
