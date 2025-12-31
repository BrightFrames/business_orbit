import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/config/database';
import { verifyToken } from '@/lib/utils/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;
    const userIdParam = searchParams.get('userId');

    const client = await pool.connect();
    try {
      // Get posts with user info and engagement counts
      const postsQuery = `
        SELECT 
          p.id,
          p.content,
          p.published_at,
          p.created_at,
          p.status,
          u.id as user_id,
          u.name as user_name,
          u.profile_photo_url,
          u.profession,
          COALESCE(like_count.likes, 0) as likes,
          COALESCE(comment_count.comments, 0) as comments,
          COALESCE(share_count.shares, 0) as shares
        FROM posts p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN (
          SELECT post_id, COUNT(*) as likes
          FROM post_engagements 
          WHERE engagement_type = 'like'
          GROUP BY post_id
        ) like_count ON p.id = like_count.post_id
        LEFT JOIN (
          SELECT post_id, COUNT(*) as comments
          FROM post_comments 
          GROUP BY post_id
        ) comment_count ON p.id = comment_count.post_id
        LEFT JOIN (
          SELECT post_id, COUNT(*) as shares
          FROM post_engagements 
          WHERE engagement_type = 'share'
          GROUP BY post_id
        ) share_count ON p.id = share_count.post_id
        WHERE p.status = 'published'${userIdParam ? ' AND p.user_id = $3' : ''}
        ORDER BY p.published_at DESC, p.created_at DESC
        LIMIT $1 OFFSET $2
      `;

      const postsResult = await client.query(
        postsQuery,
        userIdParam ? [limit, offset, parseInt(userIdParam)] : [limit, offset]
      );

      // Get media for each post
      const postsWithMedia = await Promise.all(
        postsResult.rows.map(async (post: any) => {
          const mediaQuery = `
            SELECT id, media_type, cloudinary_url, file_name, file_size, mime_type
            FROM post_media
            WHERE post_id = $1
            ORDER BY created_at ASC
          `;
          const mediaResult = await client.query(mediaQuery, [post.id]);
          
          return {
            ...post,
            media: mediaResult.rows
          };
        })
      );

      // Get total count for pagination
      const countQuery = `SELECT COUNT(*) FROM posts WHERE status = 'published'${userIdParam ? ' AND user_id = $1' : ''}`;
      const countResult = await client.query(
        countQuery,
        userIdParam ? [parseInt(userIdParam)] : []
      );
      const totalCount = parseInt(countResult.rows[0].count);

      return NextResponse.json({
        success: true,
        data: postsWithMedia,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch posts' },
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
    const { content, scheduledAt, media } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400 }
      );
    }

    if (content.length > 2000) {
      return NextResponse.json(
        { success: false, error: 'Content too long (max 2000 characters)' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN'); // Start transaction
      
      const now = new Date();
      const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;
      
      // Check daily post limit for immediate posts (not scheduled) - COMMENTED OUT
      // if (!scheduledDate || scheduledDate <= now) {
      //   const today = new Date();
      //   today.setHours(0, 0, 0, 0);
      //   const tomorrow = new Date(today);
      //   tomorrow.setDate(tomorrow.getDate() + 1);
      //   
      //   const dailyPostQuery = `
      //     SELECT COUNT(*) as post_count
      //     FROM posts 
      //     WHERE user_id = $1 
      //     AND created_at >= $2 
      //     AND created_at < $3
      //     AND status IN ('published', 'scheduled')
      //   `;
      //   
      //   const dailyPostResult = await client.query(dailyPostQuery, [
      //     (decoded as any).userId,
      //     today,
      //     tomorrow
      //   ]);
      //   
      //   const dailyPostCount = parseInt(dailyPostResult.rows[0].post_count);
      //   
      //   if (dailyPostCount >= 1) {
      //     return NextResponse.json(
      //       { 
      //         success: false, 
      //         error: 'Daily post limit reached. You can only post once per day to encourage thoughtful content.',
      //         code: 'DAILY_LIMIT_REACHED'
      //       },
      //       { status: 429 }
      //     );
      //   }
      // }
      
      // Determine status based on scheduled date
      let status = 'published';
      let publishedAt: Date | null = now;
      
      if (scheduledDate && scheduledDate > now) {
        status = 'scheduled';
        publishedAt = null;
      }

      // Create post
      const postQuery = `
        INSERT INTO posts (user_id, content, scheduled_at, published_at, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, content, published_at, created_at, status
      `;

      const postResult = await client.query(postQuery, [
        userId,
        content.trim(),
        scheduledDate,
        publishedAt,
        status
      ]);

      const post = postResult.rows[0];

      // Add media if provided
      if (media && media.length > 0) {
        for (const mediaItem of media) {
          const mediaQuery = `
            INSERT INTO post_media (post_id, media_type, cloudinary_public_id, cloudinary_url, file_name, file_size, mime_type)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
          `;
          
          const mediaResult = await client.query(mediaQuery, [
            post.id,
            mediaItem.media_type,
            mediaItem.cloudinary_public_id,
            mediaItem.cloudinary_url,
            mediaItem.file_name,
            mediaItem.file_size,
            mediaItem.mime_type
          ]);
        }
      }

      await client.query('COMMIT'); // Commit transaction

      // Get user info for response
      const userQuery = `SELECT id, name, profile_photo_url FROM users WHERE id = $1`;
      const userResult = await client.query(userQuery, [userId]);
      const user = userResult.rows[0];

      // Get the saved media from database for response
      let savedMedia = [];
      if (media && media.length > 0) {
        const mediaQuery = `
          SELECT id, media_type, cloudinary_url, file_name, file_size, mime_type
          FROM post_media
          WHERE post_id = $1
          ORDER BY created_at ASC
        `;
        const mediaResult = await client.query(mediaQuery, [post.id]);
        savedMedia = mediaResult.rows;
      }

      return NextResponse.json({
        success: true,
        data: {
          ...post,
          user_id: user.id,
          user_name: user.name,
          profile_photo_url: user.profile_photo_url,
          likes: 0,
          comments: 0,
          shares: 0,
          media: savedMedia
        }
      });
    } catch (error) {
      await client.query('ROLLBACK'); // Rollback transaction on error
      throw error;
    } finally {
      client.release();
    }
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to create post' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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
      // Check if the post exists and belongs to the user
      const checkQuery = `
        SELECT id, user_id FROM posts WHERE id = $1
      `;
      const checkResult = await client.query(checkQuery, [postId]);

      if (checkResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Post not found' },
          { status: 404 }
        );
      }

      if (checkResult.rows[0].user_id !== userId) {
        return NextResponse.json(
          { success: false, error: 'You can only delete your own posts' },
          { status: 403 }
        );
      }

      // Delete the post (cascade will handle related data)
      const deleteQuery = `DELETE FROM posts WHERE id = $1`;
      await client.query(deleteQuery, [postId]);

      return NextResponse.json({
        success: true,
        data: { message: 'Post deleted successfully' }
      });
    } finally {
      client.release();
    }
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to delete post' },
      { status: 500 }
    );
  }
}
