import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/config/database';
import { verifyToken } from '@/lib/utils/auth';

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
      const commentsQuery = `
        SELECT 
          c.id,
          c.content,
          c.created_at,
          c.updated_at,
          c.parent_comment_id,
          u.id as user_id,
          u.name as user_name,
          u.profile_photo_url
        FROM post_comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.post_id = $1
        ORDER BY c.created_at ASC
      `;
      
      const commentsResult = await client.query(commentsQuery, [postId]);
      
      return NextResponse.json({
        success: true,
        data: commentsResult.rows
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

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
    const { postId, content, parentCommentId } = body;

    if (!postId || !content) {
      return NextResponse.json(
        { success: false, error: 'Post ID and content are required' },
        { status: 400 }
      );
    }

    if (content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Content cannot be empty' },
        { status: 400 }
      );
    }

    if (content.length > 1000) {
      return NextResponse.json(
        { success: false, error: 'Content too long (max 1000 characters)' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      const commentQuery = `
        INSERT INTO post_comments (post_id, user_id, content, parent_comment_id)
        VALUES ($1, $2, $3, $4)
        RETURNING id, content, created_at, parent_comment_id
      `;
      
      const commentResult = await client.query(commentQuery, [
        postId,
        userId,
        content.trim(),
        parentCommentId || null
      ]);

      const comment = commentResult.rows[0];

      // Get user info for response
      const userQuery = `SELECT id, name, profile_photo_url FROM users WHERE id = $1`;
      const userResult = await client.query(userQuery, [userId]);
      const user = userResult.rows[0];

      const responseData = {
        ...comment,
        user_id: user.id,
        user_name: user.name,
        profile_photo_url: user.profile_photo_url,
        updated_at: comment.created_at
      };

      return NextResponse.json({
        success: true,
        data: responseData
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}
