import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/config/database'
import { getUserFromToken } from '@/lib/utils/auth'

// POST: link user to chapters by location names (matching admin-created chapters)
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
    
    if (locations.length < 1) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        message: 'At least 1 location is required'
      }, { status: 400 })
    }

    // Sanitize locations
    const sanitizedLocations = locations.map((loc: string) => loc.trim()).filter(loc => loc.length > 0)
    
    if (sanitizedLocations.length < 1) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        message: 'At least 1 valid location is required'
      }, { status: 400 })
    }

    // Find chapters that match the user's selected locations (case-insensitive)
    const result = await pool.query(
      'SELECT id, name, location_city FROM chapters WHERE LOWER(location_city) = ANY($1::text[])',
      [sanitizedLocations.map(loc => loc.toLowerCase())]
    )
    
    if (result.rows.length === 0) {
      return NextResponse.json({ 
        success: false,
        error: 'No matching chapters',
        message: 'No chapters found for the selected locations. Admin needs to create chapters for these cities first.',
        details: {
          requested: sanitizedLocations,
          suggestion: 'Ask admin to create chapters for: ' + sanitizedLocations.join(', ')
        }
      }, { status: 404 })
    }
    
    // Check if some locations were not found (but allow partial success)
    const foundLocations = result.rows.map(row => row.location_city)
    const missingLocations = sanitizedLocations.filter(loc => 
      !foundLocations.some(found => found.toLowerCase() === loc.toLowerCase())
    )
    
    if (missingLocations.length > 0 && result.rows.length < sanitizedLocations.length) {
      // Some locations not found, but we have at least 1 valid chapter
      // Continue with the found chapters, but log a warning
      console.warn('Some locations not found:', missingLocations)
    }

    // Insert memberships (upsert style avoiding duplicates)
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      
      let insertedCount = 0
      for (const row of result.rows) {
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
        chapters: result.rows.map(row => ({
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