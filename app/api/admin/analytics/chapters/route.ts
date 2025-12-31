import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/config/database'
import { getUserFromToken } from '@/lib/utils/auth'
import { proxyToBackend } from '@/lib/utils/proxy-api'

export async function GET(request: NextRequest) {
  // In production on Vercel, proxy to backend
  if (process.env.VERCEL || !pool) {
    const url = new URL(request.url);
    return proxyToBackend(request, `/api/admin/analytics/chapters${url.search}`);
  }
  try {
    // Check if user is admin
    const user = await getUserFromToken(request)
    if (!user || !user.is_admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get total members count
    const totalMembersResult = await pool.query(`
      SELECT COUNT(DISTINCT u.id) as total_members
      FROM users u
      JOIN chapter_memberships cm ON u.id = cm.user_id
      WHERE u.is_admin = false
    `)

    // Get total chapters count
    const totalChaptersResult = await pool.query(`
      SELECT COUNT(*) as total_chapters
      FROM chapters
    `)

    // Get chapter-wise member counts
    const chapterStatsResult = await pool.query(`
      SELECT 
        c.id,
        c.name as chapter_name,
        c.location_city,
        COUNT(cm.user_id) as member_count
      FROM chapters c
      LEFT JOIN chapter_memberships cm ON c.id = cm.chapter_id
      GROUP BY c.id, c.name, c.location_city
      ORDER BY member_count DESC
    `)

    // Get recent members (last 30 days)
    const recentMembersResult = await pool.query(`
      SELECT COUNT(DISTINCT u.id) as recent_members
      FROM users u
      JOIN chapter_memberships cm ON u.id = cm.user_id
      WHERE u.is_admin = false 
      AND cm.joined_at >= NOW() - INTERVAL '30 days'
    `)

    const stats = {
      totalMembers: parseInt(totalMembersResult.rows[0]?.total_members || 0),
      totalChapters: parseInt(totalChaptersResult.rows[0]?.total_chapters || 0),
      recentMembers: parseInt(recentMembersResult.rows[0]?.recent_members || 0),
      chaptersWithMembers: chapterStatsResult.rows.map(row => ({
        chapterId: row.id,
        chapterName: row.chapter_name,
        location: row.location_city,
        memberCount: parseInt(row.member_count || 0)
      }))
    }

    return NextResponse.json({
      success: true,
      stats
    })

  } catch (error) {
    console.error('Chapter stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}



