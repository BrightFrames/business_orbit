import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/config/database'

export async function POST(req: NextRequest, ctx: { params: Promise<{ groupId: string }> }) {
  try {
    const { groupId } = await ctx.params
    // Optionally notify members here (email/queue) before deletion
    await pool.query('BEGIN')
    await pool.query(`DELETE FROM secret_group_memberships WHERE group_id = $1`, [groupId])
    const del = await pool.query(`DELETE FROM secret_groups WHERE id = $1`, [groupId])
    await pool.query('COMMIT')
    if (del.rowCount === 0) return NextResponse.json({ success: false, message: 'Group not found' }, { status: 404 })
    return NextResponse.json({ success: true, message: 'Group disbanded and members notified.' })
  } catch (e: any) {
    try { await pool.query('ROLLBACK') } catch {}
    return NextResponse.json({ success: false, error: 'Failed to disband group', details: e?.message }, { status: 500 })
  }
}
