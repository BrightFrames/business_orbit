import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/config/database';
import { getUserFromToken } from '@/lib/utils/auth';
import { createUserChapters, createUserSecretGroups } from '@/lib/utils/chapters';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Access token required' },
        { status: 401 }
      );
    }

    // Get user preferences (chapters and secret groups)
    const preferencesResult = await pool.query(
      'SELECT chapters, secret_groups FROM user_preferences WHERE user_id = $1',
      [user.id]
    );

    if (preferencesResult.rows.length === 0) {
      return NextResponse.json({
        chapters: [],
        secretGroups: [],
        message: 'No chapters or secret groups found. Complete onboarding to join chapters.'
      });
    }

    const { chapters, secret_groups } = preferencesResult.rows[0];

    // Create chapter data with location-based naming
    const userChapters = createUserChapters(chapters || [], secret_groups || []);
    const userSecretGroups = createUserSecretGroups(secret_groups || []);

    return NextResponse.json({
      chapters: userChapters,
      secretGroups: userSecretGroups,
      totalChapters: userChapters.length,
      totalSecretGroups: userSecretGroups.length
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


