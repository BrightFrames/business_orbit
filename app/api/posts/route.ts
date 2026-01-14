import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/config/database';
import { verifyToken } from '@/lib/utils/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor'); // timestamp string
    const limit = parseInt(searchParams.get('limit') || '10');
    const userIdParam = searchParams.get('userId');

    // Verify Auth for Feed Filtering
    const token = request.cookies.get('token')?.value;
    let currentUserId: number | null = null;

    if (token) {
      const decoded = verifyToken(token);
      if (typeof decoded === 'number') {
        currentUserId = decoded;
      }
    }

    const client = await pool.connect();
    try {
      // Build WHERE clause
      const conditions = ["p.status = 'published'"];
      const values: any[] = [];
      let paramCount = 1;

      if (userIdParam) {
        // Profile Feed: Show specific user's posts
        conditions.push(`p.user_id = $${paramCount}`);
        values.push(parseInt(userIdParam));
        paramCount++;
      } else {
        // Main Feed: Show My Posts + Following
        if (!currentUserId) {
          return NextResponse.json(
            { success: false, error: 'Authentication required for feed' },
            { status: 401 }
          );
        }

        conditions.push(`(p.user_id = $${paramCount} OR p.user_id IN (SELECT following_id FROM user_follows WHERE follower_id = $${paramCount}))`);
        values.push(currentUserId);
        paramCount++;
      }

      if (cursor) {
        conditions.push(`p.published_at < $${paramCount}`);
        values.push(cursor);
        paramCount++;
      }

      // Add limit to values
      values.push(limit);
      const limitParamIndex = paramCount;

      // Primary Feed Query (Optimization: No JOINs for heavy data, correlated subqueries for counts)
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
          (SELECT COUNT(*)::integer FROM post_engagements WHERE post_id = p.id AND engagement_type = 'like') as likes,
          (SELECT COUNT(*)::integer FROM post_comments WHERE post_id = p.id) as comments,
          (SELECT COUNT(*)::integer FROM post_engagements WHERE post_id = p.id AND engagement_type = 'share') as shares
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE ${conditions.join(' AND ')}
        ORDER BY p.published_at DESC, p.created_at DESC
        LIMIT $${limitParamIndex}
      `;

      const postsResult = await client.query(postsQuery, values);

      // Secondary Query: Fetch Media (Lazy/Batch loading optimization)
      // We fetch media here to prevent N+1 on frontend, but it's a separate efficient batch query.
      const postIds = postsResult.rows.map(post => post.id);
      let postsWithMedia = postsResult.rows.map(post => ({ ...post, media: [] }));

      if (postIds.length > 0) {
        const mediaQuery = `
          SELECT post_id, id, media_type, cloudinary_url, file_name, file_size, mime_type
          FROM post_media
          WHERE post_id = ANY($1)
          ORDER BY created_at ASC
        `;
        const mediaResult = await client.query(mediaQuery, [postIds]);

        // Group media by post_id
        const mediaByPostId = mediaResult.rows.reduce((acc: any, media: any) => {
          if (!acc[media.post_id]) acc[media.post_id] = [];
          acc[media.post_id].push(media);
          return acc;
        }, {});

        // Attach media to posts
        postsWithMedia = postsWithMedia.map(post => ({
          ...post,
          media: mediaByPostId[post.id] || []
        }));
      }

      // Calculate next cursor
      let nextCursor = null;
      if (postsResult.rows.length === limit) {
        const lastPost = postsResult.rows[postsResult.rows.length - 1];
        nextCursor = lastPost.published_at;
      }

      return NextResponse.json({
        success: true,
        data: postsWithMedia,
        pagination: {
          nextCursor,
          limit
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Feed error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // ... (Keep existing POST logic)
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
      await client.query('BEGIN');

      const now = new Date();
      const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;

      let status = 'published';
      let publishedAt: Date | null = now;

      if (scheduledDate && scheduledDate > now) {
        status = 'scheduled';
        publishedAt = null;
      }

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

      if (media && media.length > 0) {
        for (const mediaItem of media) {
          const mediaQuery = `
            INSERT INTO post_media (post_id, media_type, cloudinary_public_id, cloudinary_url, file_name, file_size, mime_type)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
          `;

          await client.query(mediaQuery, [
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

      await client.query('COMMIT');

      const userQuery = `SELECT id, name, profile_photo_url FROM users WHERE id = $1`;
      const userResult = await client.query(userQuery, [userId]);
      const user = userResult.rows[0];

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
      await client.query('ROLLBACK');
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

export async function PATCH(request: NextRequest) {
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
    const body = await request.json();
    const { postId, content } = body;

    if (!postId || !content || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Post ID and content are required' },
        { status: 400 }
      );
    }

    // We only allow editing content for now, not media or schedule
    if (content.length > 2000) {
      return NextResponse.json(
        { success: false, error: 'Content too long (max 2000 characters)' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      // Verify ownership
      const checkQuery = `SELECT user_id FROM posts WHERE id = $1`;
      const checkResult = await client.query(checkQuery, [postId]);

      if (checkResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Post not found' },
          { status: 404 }
        );
      }

      if (checkResult.rows[0].user_id !== userId) {
        return NextResponse.json(
          { success: false, error: 'You can only edit your own posts' },
          { status: 403 }
        );
      }

      // Update
      const updateQuery = `
        UPDATE posts 
        SET content = $1, updated_at = NOW() 
        WHERE id = $2
        RETURNING id, content, updated_at
      `;
      const updateResult = await client.query(updateQuery, [content.trim(), postId]);

      return NextResponse.json({
        success: true,
        data: updateResult.rows[0]
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Update post error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update post' },
      { status: 500 }
    );
  }
}
