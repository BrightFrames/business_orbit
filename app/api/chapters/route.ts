import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/config/database'
import { getUserFromToken } from '@/lib/utils/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// GET: list all chapters (admin or public)
export async function GET() {
  try {
    const result = await pool.query(`
      SELECT 
        c.id, 
        c.name, 
        c.location_city, 
        c.created_at,
        COUNT(cm.user_id) as member_count
      FROM chapters c
      LEFT JOIN chapter_memberships cm ON c.id = cm.chapter_id
      GROUP BY c.id, c.name, c.location_city, c.created_at
      ORDER BY c.location_city, c.name
    `)

    // Convert member_count to number
    const chapters = result.rows.map(row => ({
      ...row,
      member_count: parseInt(row.member_count) || 0
    }))

    return NextResponse.json({
      success: true,
      chapters,
      count: chapters.length
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch chapters',
      message: 'Database error occurred while fetching chapters'
    }, { status: 500 })
  }
}

// POST: admin create new chapter
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)
    if (!user || !user.is_admin) {
      console.warn(`[Chapters] Unauthorized create attempt by user: ${user?.email || 'unauthenticated'}`);
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
        message: 'Admin access required'
      }, { status: 401 })
    }

    const body = await request.json()
    const { name, location_city } = body

    console.log(`[Chapters] Create request by ${user.email}: name="${name}", city="${location_city}"`);

    // Validate input
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      console.error('[Chapters] Validation failed: name is required');
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        message: 'Chapter name is required'
      }, { status: 400 })
    }

    if (!location_city || typeof location_city !== 'string' || location_city.trim().length === 0) {
      console.error('[Chapters] Validation failed: location_city is required');
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        message: 'Location city is required'
      }, { status: 400 })
    }

    // Sanitize input
    const sanitizedName = name.trim()
    const sanitizedLocation = location_city.trim()

    // Check for duplicate chapter
    const existingChapter = await pool.query(
      'SELECT id FROM chapters WHERE LOWER(name) = LOWER($1) AND LOWER(location_city) = LOWER($2)',
      [sanitizedName, sanitizedLocation]
    )

    if (existingChapter.rows.length > 0) {
      console.warn(`[Chapters] Duplicate chapter attempt: "${sanitizedName}" in "${sanitizedLocation}"`);
      return NextResponse.json({
        success: false,
        error: 'Duplicate chapter',
        message: 'A chapter with this name and location already exists'
      }, { status: 409 })
    }

    console.log(`[Chapters] Inserting into DB: "${sanitizedName}", "${sanitizedLocation}"`);
    const result = await pool.query(
      'INSERT INTO chapters (name, location_city) VALUES ($1, $2) RETURNING id, name, location_city, created_at',
      [sanitizedName, sanitizedLocation]
    )

    console.log(`[Chapters] Successfully created chapter with ID: ${result.rows[0].id}`);
    return NextResponse.json({
      success: true,
      chapter: result.rows[0],
      message: 'Chapter created successfully'
    }, { status: 201 })
  } catch (error: any) {
    console.error('[Chapters] POST error:', error);
    // Handle specific database errors
    if (error.code === '23505') { // Unique constraint violation
      return NextResponse.json({
        success: false,
        error: 'Duplicate chapter',
        message: 'A chapter with this name and location already exists'
      }, { status: 409 })
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to create chapter',
      message: error.message || 'Database error occurred while creating chapter'
    }, { status: 500 })
  }
}