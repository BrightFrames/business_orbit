import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/utils/auth';
import { proxyToBackend } from '@/lib/utils/proxy-api';
import pool from '@/lib/config/database';

export async function GET(request: NextRequest) {
  // In production on Vercel, proxy to backend (Vercel doesn't have database access)
  if (process.env.VERCEL || !pool) {
    return proxyToBackend(request, '/api/auth/me');
  }
  try {
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
        isAdmin: user.is_admin || false
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
