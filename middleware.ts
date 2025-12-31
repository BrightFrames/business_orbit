import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 1) Auth gate for product pages
  if (pathname.startsWith('/product')) {
    const token = request.cookies.get('token')?.value;
    // Public marketing routes under /product (do NOT require auth)
    const publicProductPaths = ['/product', '/product/', '/product/auth'];
    const isPublic = publicProductPaths.some((p) => pathname.startsWith(p));

    // Admin routes are protected by the admin page component itself
    // No middleware redirect needed - let the page handle authentication

    // If already logged in and visiting the auth page, redirect to profile
    if (pathname === '/product/auth' && token) {
      return NextResponse.redirect(new URL('/product/profile', request.url));
    }

    if (!isPublic && !token) {
      const url = new URL('/product/auth', request.url);
      // Optional: include return path
      url.searchParams.set('redirect', pathname + search);
      return NextResponse.redirect(url);
    }
  }

  // 2) Handle /admin route - redirect to auth page for security
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return NextResponse.redirect(new URL('/product/auth?admin=true', request.url));
  }

  // 3) 404 for specific root paths and their subpaths (keep product versions only)
  const rootSegmentsTo404 = new Set([
    'auth',
    'invite',
    'onboarding',
    'subscription',
    'connections',
    'navigator',
    'chapters',
    'groups',
    'events',
    'profile',
    'consultation',
    'rewards',
    'feed',
  ]);

  // If path is not under /product and first segment is one of the 404 targets, rewrite to not-found
  if (!pathname.startsWith('/product/')) {
    const firstSeg = pathname.split('/')[1] || '';
    if (rootSegmentsTo404.has(firstSeg)) {
      return NextResponse.rewrite(new URL('/not-found', request.url));
    }
  }

  return NextResponse.next();
}

// Only run for these exact root paths
export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/auth',
    '/auth/:path*',
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
  ],
};
