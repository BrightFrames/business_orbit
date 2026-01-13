import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/utils/auth';
import { proxyToBackend } from '@/lib/utils/proxy-api';
import pool from '@/lib/config/database';

export async function GET(request: NextRequest) {
  console.log('[API] GET /api/auth/me start');

  // In production on Vercel, proxy to backend (Vercel doesn't have database access)
  // Also proxy if no database connection is available locally
  const shouldProxy = process.env.VERCEL || !pool;
  console.log(`[API] Auth check: VERCEL=${!!process.env.VERCEL}, Database Pool=${!!pool}, Should Proxy=${shouldProxy}`);

  // Prevent proxy loop in development
  if (shouldProxy && process.env.NODE_ENV === 'development' && !process.env.VERCEL) {
    console.error('[API] Critical Error: Database connection missing in development. Cannot proxy to self.');
    return NextResponse.json(
      { error: 'Database connection failed in development. Please check if DATABASE_URL is set in .env file.' },
      { status: 500 }
    );
  }

  if (shouldProxy) {
    console.log('[API] Proxying auth request to backend');
    return proxyToBackend(request, '/api/auth/me');
  }
  try {
    console.log('[API] Processing auth request locally');
    const user = await getUserFromToken(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Access token required or invalid. Please log in again.' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        profilePhotoUrl: user.profile_photo_url,
        profilePhotoId: user.profile_photo_id,
        bannerUrl: user.banner_url,
        bannerId: user.banner_id,
        skills: user.skills,
        description: user.description,
        profession: user.profession,
        interest: user.interest,
        createdAt: user.created_at,
        isAdmin: user.is_admin || false,
        location: user.location || 'Not specified',
        rewardScore: user.orbit_points || 0,
        mutualConnections: user.mutual_connections || 0,
        isPremium: user.is_premium || false
      }
    });
  } catch (error: any) {
    // If it's a token-related error, return 401 to trigger re-authentication
    if (error.message === 'Access token required' ||
      error.message === 'Invalid token' ||
      error.message === 'User not found') {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
