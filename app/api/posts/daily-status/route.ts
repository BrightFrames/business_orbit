import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/config/database';
import { verifyToken } from '@/lib/utils/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const userId = decoded; // verifyToken returns userId directly, not an object

    const client = await pool.connect();
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Check daily post count
      const dailyPostQuery = `
        SELECT COUNT(*) as post_count
        FROM posts 
        WHERE user_id = $1 
        AND created_at >= $2 
        AND created_at < $3
        AND status IN ('published', 'scheduled')
      `;
      
      const dailyPostResult = await client.query(dailyPostQuery, [
        userId,
        today,
        tomorrow
      ]);
      
      const dailyPostCount = parseInt(dailyPostResult.rows[0].post_count);
      const canPost = dailyPostCount < 1;
      
      // Calculate time until next post is allowed (next day)
      const nextPostTime = new Date(tomorrow);
      
      return NextResponse.json({
        success: true,
        data: {
          canPost,
          dailyPostCount,
          maxPostsPerDay: 1,
          remainingPosts: Math.max(0, 1 - dailyPostCount),
          nextPostAllowedAt: nextPostTime.toISOString(),
          message: canPost 
            ? 'You can post today!' 
            : 'Daily post limit reached. You can post again tomorrow.'
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error checking daily post status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check daily post status' },
      { status: 500 }
    );
  }
}
