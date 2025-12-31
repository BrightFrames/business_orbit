import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/config/database';
import { getUserFromToken } from '@/lib/utils/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const user = await getUserFromToken(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Access token required' },
        { status: 401 }
      );
    }

    const { userId: userIdParam } = await params;
    const userId = parseInt(userIdParam);
    
    // Check if user is accessing their own preferences
    if (user.id !== userId) {
      return NextResponse.json(
        { error: 'You can only access your own preferences' },
        { status: 403 }
      );
    }

    const result = await pool.query(
      'SELECT * FROM user_preferences WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        preferences: null,
        onboardingCompleted: false
      });
    }

    return NextResponse.json({
      preferences: result.rows[0],
      onboardingCompleted: result.rows[0].onboarding_completed
    });

  } catch (error: any) {
    console.error('Get preferences error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
