import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/config/database'
import { getUserFromToken } from '@/lib/utils/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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


// POST: Seed or Reset Chapters (Admin utility)
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user || !user.is_admin) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
        message: 'Admin access required'
      }, { status: 401 });
    }
    const AVAILABLE_CHAPTERS = [
      "Mumbai", "Delhi", "Bengaluru", "Chennai", "Kolkata", "Hyderabad", "Pune", "Ahmedabad",
      "Chandigarh", "Indore", "Bhubaneswar", "Noida", "Gurugram", "Jaipur", "Lucknow", "Kanpur",
      "Nagpur", "Visakhapatnam", "Surat", "Vadodara"
    ];

    console.log('[AdminChapters] Seeding/Resetting chapters...');

    // Insert chapters using ON CONFLICT to avoid duplicates
    let createdCount = 0;
    for (const city of AVAILABLE_CHAPTERS) {
      const name = `${city} Chapter`;
      const result = await pool.query(
        'INSERT INTO chapters (name, location_city) VALUES ($1, $2) ON CONFLICT (name, location_city) DO NOTHING RETURNING id',
        [name, city]
      );
      if (result.rows.length > 0) {
        createdCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully seeded chapters. ${createdCount} new chapters created.`,
      seeded_count: createdCount
    });
  } catch (error: any) {
    console.error('Chapter seeding API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error.message || 'Failed to seed chapters'
    }, { status: 500 });
  }
}
