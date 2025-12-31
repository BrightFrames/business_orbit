import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/config/database'
import { getUserFromToken } from '@/lib/utils/auth'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all members with their chapter information grouped by user (excluding current user)
    const result = await pool.query(`
      SELECT 
        u.id,
        u.name,
        u.profile_photo_url,
        u.email,
        u.created_at as user_joined_at,
        ARRAY_AGG(
          JSON_BUILD_OBJECT(
            'chapter_id', c.id,
            'chapter_name', c.name,
            'location_city', c.location_city,
            'joined_at', cm.joined_at
          ) ORDER BY cm.joined_at DESC
        ) as chapters
      FROM users u
      JOIN chapter_memberships cm ON u.id = cm.user_id
      JOIN chapters c ON cm.chapter_id = c.id
      WHERE u.is_admin = false AND u.id != $1
      GROUP BY u.id, u.name, u.profile_photo_url, u.email, u.created_at
      ORDER BY u.created_at DESC
      LIMIT 50
    `, [user.id])

    const members = result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      profilePhotoUrl: row.profile_photo_url,
      userJoinedAt: row.user_joined_at,
      chapters: row.chapters || []
    }))

    return NextResponse.json({ 
      success: true, 
      members,
      total: members.length 
    })

  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch members' 
    }, { status: 500 })
  }
}
