import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const host = request.headers.get('host') || '';

  // Detect admin subdomain
  const isAdminSubdomain = host.startsWith('admin.') || host.includes('admin.localhost');

  // ============================================
  // ADMIN SUBDOMAIN RULES
  // ============================================
  if (isAdminSubdomain) {
    // Allow static assets, API routes, and Next.js internals
    const systemPaths = ['/_next', '/favicon', '/api'];
    const isSystemPath = systemPaths.some(p => pathname.startsWith(p));

    if (isSystemPath) {
      return NextResponse.next();
    }

    // Allow only admin routes on admin subdomain
    const adminPaths = ['/product/admin'];
    const isAdminPath = adminPaths.some(p => pathname.startsWith(p));

    // Redirect root to admin dashboard
    if (pathname === '/' || pathname === '') {
      return NextResponse.redirect(new URL('/product/admin', request.url));
    }

    // Block non-admin routes on admin subdomain
    if (!isAdminPath) {
      return NextResponse.rewrite(new URL('/not-found', request.url));
    }

    // Admin auth check - admin pages handle their own auth
    return NextResponse.next();
  }

  // ============================================
  // MAIN DOMAIN RULES
  // ============================================

  // Block admin routes on main domain - return 404
  if (pathname.startsWith('/product/admin') || pathname.startsWith('/admin')) {
    return NextResponse.rewrite(new URL('/not-found', request.url));
  }

  // 1) Auth gate for product pages and profile
  if (pathname.startsWith('/product') || pathname.startsWith('/profile')) {
    const token = request.cookies.get('token')?.value;
    // Public marketing routes under /product (do NOT require auth)
    const isPublic =
      pathname === '/product' ||
      pathname === '/product/' ||
      pathname.startsWith('/product/auth');

    if (!isPublic && !token) {
      const url = new URL('/product/auth', request.url);
      url.searchParams.set('redirect', pathname + search);
      return NextResponse.redirect(url);
    }
  }

  // 2) 404 for specific root paths and their subpaths (keep product versions only)
  const rootSegmentsTo404 = new Set([
    'auth',
    'invite',
    'onboarding',
    'subscription',
    'connections',
    'navigator',
    'reward',
    'feed',
  ]);

  if (!pathname.startsWith('/product/')) {
    const firstSeg = pathname.split('/')[1] || '';
    if (rootSegmentsTo404.has(firstSeg)) {
      return NextResponse.rewrite(new URL('/not-found', request.url));
    }
  }

  return NextResponse.next();
}

// Matcher config for middleware
export const config = {
  matcher: [
    // Admin routes
    '/admin',
    '/admin/:path*',
    '/product/admin',
    '/product/admin/:path*',
    // Auth routes
    '/auth',
    '/auth/:path*',
    // Other protected routes
    '/invite',
    '/invite/:path*',
    '/onboarding',
    '/onboarding/:path*',
    '/subscription',
    '/subscription/:path*',
    '/connections',
    '/connections/:path*',
    '/navigator',
    '/navigator/:path*',
    '/chapters',
    '/chapters/:path*',
    '/groups',
    '/groups/:path*',
    '/events',
    '/events/:path*',
    '/profile',
    '/profile/:path*',
    '/consultation',
    '/consultation/:path*',
    '/rewards',
    '/rewards/:path*',
    '/feed',
    '/feed/:path*',
    '/product/:path*',
    // Root path for admin subdomain redirect
    '/',
  ],
};

