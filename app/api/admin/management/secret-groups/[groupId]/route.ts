import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/config/database'

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ groupId: string }> }) {
  try {
    const { groupId } = await ctx.params
    const body = await req.json().catch(() => ({}))
    const name = body?.name !== undefined ? String(body.name).trim() : undefined
    const description = body?.description !== undefined ? (body.description === null ? null : String(body.description)) : undefined

    if (name !== undefined && !name) {
      return NextResponse.json({ success: false, message: 'Group name cannot be empty' }, { status: 400 })
    }

    if (name === undefined && description === undefined) {
      return NextResponse.json({ success: false, message: 'No fields to update' }, { status: 400 })
    }

    const fields: string[] = []
    const values: any[] = []
    let idx = 1
    if (name !== undefined) { fields.push(`name = $${idx++}`); values.push(name) }
    if (description !== undefined) { fields.push(`description = $${idx++}`); values.push(description) }
    values.push(groupId)

    const q = `UPDATE secret_groups SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, name, description, created_at`
    const res = await pool.query(q, values)
    if (res.rowCount === 0) return NextResponse.json({ success: false, message: 'Group not found' }, { status: 404 })

    const m = await pool.query(`SELECT COUNT(user_id)::int AS member_count FROM secret_group_memberships WHERE group_id = $1`, [groupId])
    const group = { ...res.rows[0], member_count: m.rows[0]?.member_count || 0 }
    return NextResponse.json({ success: true, group })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: 'Failed to update group', details: e?.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ groupId: string }> }) {
  try {
    const { groupId } = await ctx.params
    const del = await pool.query(`DELETE FROM secret_groups WHERE id = $1`, [groupId])
    if (del.rowCount === 0) return NextResponse.json({ success: false, message: 'Group not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: 'Failed to delete group', details: e?.message }, { status: 500 })
  }
}
