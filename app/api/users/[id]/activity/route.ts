import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/config/database'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = parseInt(String(id))
    if (!userId || Number.isNaN(userId)) {
      return NextResponse.json({ success: false, error: 'Invalid user id' }, { status: 400 })
    }

    // Run queries in parallel
    const [
      chaptersJoined,
      secretGroupsJoined,
      connectionsRes,
      incomingReqRes,
      outgoingReqRes,
      chapterMsgCount,
      groupMsgCount,
      postsCount,
      eventsAttended
    ] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS count FROM chapter_memberships WHERE user_id = $1', [userId]),
      pool.query('SELECT COUNT(*)::int AS count FROM secret_group_memberships WHERE user_id = $1', [userId]).catch(() => ({ rows: [{ count: 0 }] } as any)),
      pool.query('SELECT COUNT(*)::int AS count FROM user_follows WHERE follower_id = $1', [userId]),
      pool.query("SELECT COUNT(*)::int AS count FROM follow_requests WHERE target_id = $1 AND status = 'pending'", [userId]),
      pool.query("SELECT COUNT(*)::int AS count FROM follow_requests WHERE requester_id = $1 AND status = 'pending'", [userId]),
      pool.query('SELECT COUNT(*)::int AS count FROM chapter_messages WHERE sender_id = $1', [userId]).catch(() => ({ rows: [{ count: 0 }] } as any)),
      pool.query('SELECT COUNT(*)::int AS count FROM secret_group_messages WHERE sender_id = $1', [userId]).catch(() => ({ rows: [{ count: 0 }] } as any)),
      pool.query('SELECT COUNT(*)::int AS count FROM posts WHERE user_id = $1', [userId]),
      pool.query("SELECT COUNT(*)::int AS count FROM rsvps r JOIN events e ON e.id = r.event_id WHERE r.user_id = $1 AND e.status IN ('approved','completed')", [userId])
    ])

    const stats = {
      chaptersJoined: chaptersJoined.rows[0]?.count ?? 0,
      groupsJoined: secretGroupsJoined.rows[0]?.count ?? 0,
      connections: connectionsRes.rows[0]?.count ?? 0,
      connectionRequestsIncoming: incomingReqRes.rows[0]?.count ?? 0,
      connectionRequestsOutgoing: outgoingReqRes.rows[0]?.count ?? 0,
      totalMessages: (chapterMsgCount.rows[0]?.count ?? 0) + (groupMsgCount.rows[0]?.count ?? 0),
      posts: postsCount.rows[0]?.count ?? 0,
      eventsAttended: eventsAttended.rows[0]?.count ?? 0,
    }

    return NextResponse.json({ success: true, stats })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: 'Failed to load activity', details: e?.message }, { status: 500 })
  }
}




