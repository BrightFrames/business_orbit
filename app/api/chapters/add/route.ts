import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/config/database'
import { getUserFromToken } from '@/lib/utils/auth'

// Typed result row shapes
interface ChapterRow {
  id: number
  name: string
  location_city: string
}

interface CityRow {
  location_city: string
}

// POST: Add user to chapters by location names (no limit on number of locations)
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required'
      }, { status: 401 })
    }

    const body = await request.json()
    const { locations } = body
    
    // Validate input
    if (!Array.isArray(locations)) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        message: 'Locations must be an array'
      }, { status: 400 })
    }
    
    if (locations.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        message: 'At least one location is required'
      }, { status: 400 })
    }

    // Sanitize locations
    const sanitizedLocations = locations.map((loc: string) => loc.trim()).filter(loc => loc.length > 0)
    
    if (sanitizedLocations.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        message: 'At least one valid location is required'
      }, { status: 400 })
    }

    // Check current chapter count for the user
    const currentMembershipsResult = await pool.query(
      'SELECT COUNT(*) as count FROM chapter_memberships WHERE user_id = $1',
      [user.id]
    )
    const currentChapterCount = parseInt(currentMembershipsResult.rows[0].count || '0')
    
    // Check if adding more chapters would exceed the limit
    const newTotalCount = currentChapterCount + sanitizedLocations.length
    if (newTotalCount > 5) {
      return NextResponse.json({
        success: false,
        error: 'Chapter limit exceeded',
        message: 'You cannot join more than 5 chapters',
        currentCount: currentChapterCount,
        attemptCount: sanitizedLocations.length,
        maxAllowed: 5
      }, { status: 400 })
    }

    // Find chapters that match the user's selected locations (case-insensitive)
    const result = await pool.query(
      'SELECT id, name, location_city FROM chapters WHERE LOWER(location_city) = ANY($1::text[])',
      [sanitizedLocations.map(loc => loc.toLowerCase())]
    )
    const chapterRows = result.rows as ChapterRow[]
    
    if (chapterRows.length === 0) {
      // Get all available chapters to show in error message
      const allChaptersResult = await pool.query('SELECT DISTINCT location_city FROM chapters ORDER BY location_city')
      const cityRows = allChaptersResult.rows as CityRow[]
      const availableCities = cityRows.map((row: CityRow) => row.location_city)
      
      return NextResponse.json({ 
        success: false,
        error: 'No matching chapters',
        message: 'No chapters found for the selected locations',
        details: {
          requested: sanitizedLocations,
          available_cities: availableCities,
          suggestion: `Available cities: ${availableCities.join(', ')}`
        }
      }, { status: 404 })
    }
    
    // Insert memberships (upsert style avoiding duplicates)
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      
      let insertedCount = 0
      for (const row of chapterRows) {
        const insertResult = await client.query(
          `INSERT INTO chapter_memberships (user_id, chapter_id)
           VALUES ($1, $2)
           ON CONFLICT (user_id, chapter_id) DO NOTHING
           RETURNING *`,
          [user.id, row.id]
        )
        if (insertResult.rows.length > 0) {
          insertedCount++
        }
      }
      
      await client.query('COMMIT')
      
      return NextResponse.json({ 
        success: true,
        message: `Successfully joined ${insertedCount} chapters`,
        memberships: insertedCount,
        chapters: chapterRows.map((row: ChapterRow) => ({
          id: row.id,
          name: row.name,
          location_city: row.location_city
        }))
      })
    } catch (error: any) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error: any) {
    // Handle specific database errors
    if (error.code === '23503') { // Foreign key constraint violation
      return NextResponse.json({
        success: false,
        error: 'Invalid user or chapter',
        message: 'User or chapter does not exist'
      }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: false,
      error: 'Failed to create memberships',
      message: 'Database error occurred while creating chapter memberships'
    }, { status: 500 })
  }
}