import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/config/database'
import { getUserFromToken } from '@/lib/utils/auth'
import { groupChatService } from '@/lib/services/group-chat-service'

export async function GET(request: NextRequest, ctx: { params: Promise<{ groupId: string }> }) {
  try {
    const { groupId } = await ctx.params
    const url = new URL(request.url)
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 1), 100)
    const cursor = url.searchParams.get('cursor') || undefined

    if (!groupId) return NextResponse.json({ success: false, error: 'groupId required' }, { status: 400 })

    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const mem = await pool.query('SELECT 1 FROM secret_group_memberships WHERE user_id = $1 AND group_id = $2 LIMIT 1', [user.id, groupId])
    if (mem.rowCount === 0) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

    await groupChatService.ensureTable()
    const result = await groupChatService.getMessages(groupId, limit, cursor)
    return NextResponse.json({ success: true, messages: result.messages, nextCursor: result.nextCursor })
  } catch (e: any) {
    console.error('GET group messages error', e?.message || e)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ groupId: string }> }) {
  try {
    const { groupId } = await ctx.params
    const body = await request.json().catch(() => ({})) as { content?: string }
    const content = (body?.content || '').trim()
    if (!groupId) return NextResponse.json({ success: false, error: 'groupId required' }, { status: 400 })
    if (!content) return NextResponse.json({ success: false, error: 'Message content is required' }, { status: 400 })
    if (content.length > 4000) return NextResponse.json({ success: false, error: 'Message too long' }, { status: 400 })

    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const mem = await pool.query('SELECT 1 FROM secret_group_memberships WHERE user_id = $1 AND group_id = $2 LIMIT 1', [user.id, groupId])
    if (mem.rowCount === 0) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

    await groupChatService.ensureTable()
    const saved = await groupChatService.storeMessage({ groupId: String(groupId), senderId: String(user.id), content })
    return NextResponse.json({ success: true, message: saved })
  } catch (e: any) {
    console.error('POST group message error', e?.message || e)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}





