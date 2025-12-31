import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/config/database'
import { getUserFromToken } from '@/lib/utils/auth'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ chapterId: string; messageId: string }> }
) {
  try {
    const { chapterId, messageId } = await params
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check ownership or admin
    const msgRes = await pool.query('SELECT sender_id FROM chapter_messages WHERE id = $1 AND chapter_id = $2', [messageId, chapterId])
    if (msgRes.rowCount === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const isOwner = Number(msgRes.rows[0].sender_id) === Number(user.id)
    const adminRes = await pool.query('SELECT is_admin FROM users WHERE id = $1', [user.id])
    const isAdmin = !!adminRes.rows[0]?.is_admin
    if (!isOwner && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await pool.query('DELETE FROM chapter_messages WHERE id = $1 AND chapter_id = $2', [messageId, chapterId])
    return NextResponse.json({ success: true })
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('DELETE message error', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}


