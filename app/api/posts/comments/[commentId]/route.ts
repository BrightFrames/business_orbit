import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/config/database';
import { verifyToken } from '@/lib/utils/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
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

    const userId = decoded;
    const { commentId } = await params;

    if (!commentId) {
      return NextResponse.json(
        { success: false, error: 'Comment ID is required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      // Check if the comment exists and belongs to the user
      const checkQuery = `
        SELECT id, user_id FROM post_comments WHERE id = $1
      `;
      const checkResult = await client.query(checkQuery, [commentId]);

      if (checkResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Comment not found' },
          { status: 404 }
        );
      }

      if (checkResult.rows[0].user_id !== userId) {
        return NextResponse.json(
          { success: false, error: 'You can only delete your own comments' },
          { status: 403 }
        );
      }

      // Delete the comment (cascade will handle replies)
      const deleteQuery = `DELETE FROM post_comments WHERE id = $1`;
      await client.query(deleteQuery, [commentId]);

      return NextResponse.json({
        success: true,
        data: { message: 'Comment deleted successfully' }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete comment' },
      { status: 500 }
    );
  }
}

