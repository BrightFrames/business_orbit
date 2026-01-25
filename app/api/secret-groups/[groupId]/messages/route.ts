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

      // Store Message and get user details in same transaction
      const res = await client.query(
        `INSERT INTO secret_group_messages (group_id, sender_id, content)
         VALUES ($1, $2, $3)
         RETURNING id, group_id, sender_id, content, created_at`,
        [groupId, user.id, content.trim()]
      );

      const insertedRow = res.rows[0];

      // Get sender details
      const userRes = await client.query(
        'SELECT name, profile_photo_url FROM users WHERE id = $1',
        [user.id]
      );
      const userData = userRes.rows[0];

      // Format message for frontend with proper camelCase field names
      const message = {
        id: String(insertedRow.id),
        groupId: String(insertedRow.group_id),
        senderId: String(insertedRow.sender_id),
        senderName: userData?.name || 'User',
        senderAvatarUrl: userData?.profile_photo_url || null,
        content: insertedRow.content,
        timestamp: new Date(insertedRow.created_at).toISOString()
      };

      // Award Points: "Active in a Secret Group Chat" 15 pts (per day limit handled in awards.ts)
      // Requirement: >= 2 meaningful messages (or 1 validated)
      // We check if they have at least 2 messages today (including this one)
      const countRes = await client.query(
        `SELECT COUNT(*) as count FROM secret_group_messages 
         WHERE group_id = $1 AND sender_id = $2 
         AND created_at > CURRENT_DATE`,
        [groupId, user.id]
      );
      const msgCount = parseInt(countRes.rows[0]?.count || '0');

      let reward = { awarded: false, points: 0, newTotal: 0 };

      if (msgCount >= 2) {
        // Daily limit in awardOrbitPoints will ensure they only get it once per day
        reward = await awardOrbitPoints(user.id, 'secret_group_activity', 'Secret group chat activity');
        // We only return the points info if it was actually awarded? 
        // Or we just return the result of the attempt.
      } else {
        // Not enough messages yet
      }

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: message,
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

    console.log('[SecretGroupMessage] GET - User:', user.id, 'GroupId:', groupId);

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

      console.log('[SecretGroupMessage] GET - isMember:', isMember, 'isAdmin:', isAdmin, 'admin_id:', groupAdmin.rows[0]?.admin_id);

      if (!isMember && !isAdmin) {
        console.log('[SecretGroupMessage] GET - Forbidden for user:', user.id);
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Get messages with proper field names for frontend
      const messages = await client.query(
        `SELECT 
           m.id, 
           m.group_id as "groupId",
           m.sender_id as "senderId",
           u.name as "senderName", 
           u.profile_photo_url as "senderAvatarUrl",
           m.content, 
           m.created_at as "timestamp"
         FROM secret_group_messages m
         JOIN users u ON m.sender_id = u.id
         WHERE m.group_id = $1
         ORDER BY m.created_at ASC
         LIMIT 50`,
        [groupId]
      );

      console.log('[SecretGroupMessage] GET - Returning', messages.rows.length, 'messages');

      return NextResponse.json({
        success: true,
        messages: messages.rows
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
