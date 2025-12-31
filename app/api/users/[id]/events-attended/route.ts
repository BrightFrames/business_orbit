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

    const res = await pool.query(
      `SELECT e.id, e.title, e.date, e.event_type, e.status
       FROM rsvps r
       JOIN events e ON e.id = r.event_id
       WHERE r.user_id = $1 AND e.status IN ('approved','completed')
       ORDER BY e.date DESC`,
      [userId]
    )

    return NextResponse.json({ success: true, events: res.rows })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: 'Failed to load events', details: e?.message }, { status: 500 })
  }
}




