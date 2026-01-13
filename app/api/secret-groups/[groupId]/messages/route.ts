import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/config/database';
import { getUserFromToken } from '@/lib/utils/auth';
import { awardOrbitPoints } from '@/lib/utils/rewards';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const user = await getUserFromToken(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content } = await request.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      // Verify membership
      const membership = await client.query(
        'SELECT 1 FROM secret_group_memberships WHERE group_id = $1 AND user_id = $2',
        [groupId, user.id]
      );

      const groupAdmin = await client.query(
        'SELECT admin_id FROM secret_groups WHERE id = $1',
        [groupId]
      );

      const isAdmin = groupAdmin.rows[0]?.admin_id === user.id;
      const isMember = membership.rowCount && membership.rowCount > 0;

      if (!isMember && !isAdmin) {
        return NextResponse.json({ error: 'Forbidden: Not a member of this secret group' }, { status: 403 });
      }

      await client.query('BEGIN');

      // Store Message
      const res = await client.query(
        `INSERT INTO secret_group_messages (group_id, sender_id, content)
         VALUES ($1, $2, $3)
         RETURNING id, created_at`,
        [groupId, user.id, content.trim()]
      );

      const message = res.rows[0];

      // Award Points: "Active in a Secret Group Chat" 15 pts (per day limit handled in awards.ts)
      const reward = await awardOrbitPoints(user.id, 'secret_group_activity', 'Secret group chat activity');

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        data: message,
        pointsAwarded: reward.points,
        newPointsTotal: reward.newTotal
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('[SecretGroupMessage] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const user = await getUserFromToken(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await pool.connect();
    try {
      // Check membership
      const membership = await client.query(
        'SELECT 1 FROM secret_group_memberships WHERE group_id = $1 AND user_id = $2',
        [groupId, user.id]
      );
      const groupAdmin = await client.query(
        'SELECT admin_id FROM secret_groups WHERE id = $1',
        [groupId]
      );

      const isAdmin = groupAdmin.rows[0]?.admin_id === user.id;
      const isMember = membership.rowCount && membership.rowCount > 0;

      if (!isMember && !isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Get messages
      const messages = await client.query(
        `SELECT m.id, m.content, m.created_at, m.sender_id, u.name as sender_name, u.profile_photo_url as sender_avatar
                 FROM secret_group_messages m
                 JOIN users u ON m.sender_id = u.id
                 WHERE m.group_id = $1
                 ORDER BY m.created_at ASC
                 LIMIT 50`,
        [groupId]
      );

      return NextResponse.json({
        success: true,
        data: messages.rows
      });
    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('[SecretGroupMessage] GET Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
