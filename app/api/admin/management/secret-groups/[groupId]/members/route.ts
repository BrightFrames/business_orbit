import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/config/database'

export async function GET(req: NextRequest, ctx: { params: Promise<{ groupId: string }> }) {
  try {
    const { groupId } = await ctx.params
    const res = await pool.query(
      `SELECT u.id, u.name, u.email
       FROM secret_group_memberships m
       JOIN users u ON u.id = m.user_id
       WHERE m.group_id = $1
       ORDER BY u.name ASC`,
      [groupId]
    )
    return NextResponse.json({ members: res.rows })
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to load members', details: e?.message }, { status: 500 })
  }
}
