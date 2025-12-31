import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/config/database';
import { verifyToken } from '@/lib/utils/auth';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { postId, engagementType } = body;

    if (!postId || !engagementType) {
      return NextResponse.json(
        { success: false, error: 'Post ID and engagement type are required' },
        { status: 400 }
      );
    }

    if (!['like', 'comment', 'share'].includes(engagementType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid engagement type' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      // Check if engagement already exists
      const existingQuery = `
        SELECT id FROM post_engagements 
        WHERE post_id = $1 AND user_id = $2 AND engagement_type = $3
      `;
      const existingResult = await client.query(existingQuery, [postId, userId, engagementType]);

      if (existingResult.rows.length > 0) {
        // Remove existing engagement (toggle off)
        const deleteQuery = `
          DELETE FROM post_engagements 
          WHERE post_id = $1 AND user_id = $2 AND engagement_type = $3
        `;
        await client.query(deleteQuery, [postId, userId, engagementType]);
        
        return NextResponse.json({
          success: true,
          data: { action: 'removed', engagementType }
        });
      } else {
        // Add new engagement
        const insertQuery = `
          INSERT INTO post_engagements (post_id, user_id, engagement_type)
          VALUES ($1, $2, $3)
        `;
        await client.query(insertQuery, [postId, userId, engagementType]);
        
        return NextResponse.json({
          success: true,
          data: { action: 'added', engagementType }
        });
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error handling engagement:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to handle engagement' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');

    if (!postId) {
      return NextResponse.json(
        { success: false, error: 'Post ID is required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      // Get engagement counts for the post
      const countsQuery = `
        SELECT 
          engagement_type,
          COUNT(*) as count
        FROM post_engagements 
        WHERE post_id = $1
        GROUP BY engagement_type
      `;
      
      const countsResult = await client.query(countsQuery, [postId]);
      
      const counts = {
        likes: 0,
        comments: 0,
        shares: 0
      };

      countsResult.rows.forEach((row: any) => {
        counts[row.engagement_type as keyof typeof counts] = parseInt(row.count);
      });

      return NextResponse.json({
        success: true,
        data: counts
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching engagement counts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch engagement counts' },
      { status: 500 }
    );
  }
}
