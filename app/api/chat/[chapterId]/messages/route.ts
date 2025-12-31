import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/config/database'
import { getUserFromToken } from '@/lib/utils/auth'
import { chatService } from '@/lib/services/chat-service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chapterId: string }> }
) {
  try {
    const { chapterId } = await params
    const url = new URL(request.url)
    const limitParam = url.searchParams.get('limit')
    const cursor = url.searchParams.get('cursor')
    const limit = Math.min(Math.max(parseInt(limitParam || '50', 10) || 50, 1), 100)

    if (!chapterId) {
      return NextResponse.json({ success: false, error: 'chapterId required' }, { status: 400 })
    }

    // Enforce auth and membership
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const membership = await pool.query(
      'SELECT 1 FROM chapter_memberships WHERE user_id = $1 AND chapter_id = $2 LIMIT 1',
      [user.id, chapterId]
    )
    if (membership.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    // Get messages from PostgreSQL
    const result = await chatService.getMessages(chapterId, limit, cursor || undefined)
    
    return NextResponse.json({ 
      success: true, 
      messages: result.messages, 
      nextCursor: result.nextCursor 
    })
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('GET /api/chat/[chapterId]/messages error', error?.message || error)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chapterId: string }> }
) {
  try {
    const { chapterId } = await params
    const { content } = await request.json()

    if (!chapterId) {
      return NextResponse.json({ success: false, error: 'chapterId required' }, { status: 400 })
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Message content is required' }, { status: 400 })
    }

    if (content.length > 4000) {
      return NextResponse.json({ success: false, error: 'Message too long' }, { status: 400 })
    }

    // Enforce auth and membership
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const membership = await pool.query(
      'SELECT 1 FROM chapter_memberships WHERE user_id = $1 AND chapter_id = $2 LIMIT 1',
      [user.id, chapterId]
    )
    if (membership.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    // Store message in PostgreSQL
    const message = await chatService.storeMessage({
      chapterId: String(chapterId),
      senderId: String(user.id),
      senderName: user.name || 'User',
      senderAvatarUrl: user.profile_photo_url || null,
      content: content.trim(),
    })

    return NextResponse.json({ success: true, message })
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('POST /api/chat/[chapterId]/messages error', error?.message || error)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}

