import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/config/database'

export async function POST(req: NextRequest, ctx: { params: Promise<{ inviteToken: string }> }) {
  try {
    const { inviteToken } = await ctx.params
    const upd = await pool.query(`UPDATE group_invites SET status = 'declined' WHERE token = $1`, [inviteToken])
    if (upd.rowCount === 0) return NextResponse.json({ success: false, message: 'Invite not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: 'Failed to decline invite', details: e?.message }, { status: 500 })
  }
}
