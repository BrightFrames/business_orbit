import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/config/database'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: chapterId } = await params
    
    // Validate chapter ID (UUID format)
    if (!chapterId || typeof chapterId !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Invalid chapter ID',
        message: 'Chapter ID is required'
      }, { status: 400 })
    }
    
    // Test database connection first
    const client = await pool.connect()
    try {
      const result = await client.query(
        `SELECT u.id, u.name, u.email, u.profile_photo_url
         FROM chapter_memberships cm
         JOIN users u ON u.id = cm.user_id
         WHERE cm.chapter_id = $1
         ORDER BY cm.joined_at DESC, u.name`,
        [chapterId]
      )
      
      return NextResponse.json({ 
        success: true,
        members: result.rows,
        count: result.rows.length
      })
    } finally {
      client.release()
    }
  } catch (error: any) {
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fetch chapter members',
      message: 'Database error occurred while fetching chapter members'
    }, { status: 500 })
  }
}