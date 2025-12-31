import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/config/database'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const email = String(url.searchParams.get('email') || '').trim().toLowerCase()
    if (!email) return NextResponse.json({ invites: [] })

    const res = await pool.query(
      `SELECT token, group_id, email, status, created_at
       FROM group_invites
       WHERE LOWER(email) = $1 AND status = 'pending'
       ORDER BY created_at DESC`,
      [email]
    )
    return NextResponse.json({ invites: res.rows })
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to load invites', details: e?.message }, { status: 500 })
  }
}
