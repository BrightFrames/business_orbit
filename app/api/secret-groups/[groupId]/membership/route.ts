import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/config/database'
import { getUserFromToken } from '@/lib/utils/auth'

export async function POST(req: NextRequest, ctx: { params: Promise<{ groupId: string }> }) {
  try {
    const user = await getUserFromToken(req)
    if (!user?.id) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

    const { groupId } = await ctx.params

    // Ensure group exists
    const g = await pool.query(`SELECT id FROM secret_groups WHERE id = $1`, [groupId])
    if (g.rowCount === 0) return NextResponse.json({ success: false, message: 'Group not found' }, { status: 404 })

    await pool.query(
      `INSERT INTO secret_group_memberships (user_id, group_id)
       VALUES ($1, $2) ON CONFLICT (user_id, group_id) DO NOTHING`,
      [user.id, groupId]
    )

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: 'Failed to join group', details: e?.message }, { status: 500 })
  }
}






