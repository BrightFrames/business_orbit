import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/config/database'

// GET: Get chapter statistics
export async function GET(request: NextRequest) {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_chapters,
        COUNT(DISTINCT location_city) as unique_cities,
        COUNT(cm.user_id) as total_memberships
      FROM chapters c
      LEFT JOIN chapter_memberships cm ON c.id = cm.chapter_id
    `)
    
    const stats = result.rows[0]
    const chapterStats = {
      total_chapters: parseInt(stats.total_chapters),
      unique_cities: parseInt(stats.unique_cities),
      total_memberships: parseInt(stats.total_memberships)
    }
    
    return NextResponse.json({
      success: true,
      stats: chapterStats
    })
  } catch (error: any) {
    console.error('Chapter stats API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get chapter statistics'
    }, { status: 500 })
  }
}


