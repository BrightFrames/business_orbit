import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/config/database'

// Force dynamic rendering to prevent build-time analysis
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Prevent execution during build time
    if (process.env.NEXT_PHASE === 'phase-production-build' || 
        process.env.NEXT_PHASE === 'phase-development-build' ||
        process.env.npm_lifecycle_event === 'build') {
      return NextResponse.json({
        success: true,
        query: '',
        chapters: [],
        people: [],
        events: []
      })
    }

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    const category = searchParams.get('category') as 'people' | 'chapter' | 'events' | null
    const limitParam = parseInt(searchParams.get('limit') || '5')
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 25) : 5

    if (!q) {
      return NextResponse.json({
        success: true,
        query: q,
        chapters: [],
        people: [],
        events: []
      })
    }

    if (!pool) {
      return NextResponse.json({ 
        success: false, 
        error: 'Database not available' 
      }, { status: 503 })
    }

    const client = await pool.connect()
    try {
      let chapters: any[] = []
      let people: any[] = []
      let events: any[] = []

      // Only search for the selected category
      if (category === 'chapter') {
        // Chapters by location/name
        const chaptersQuery = `
          SELECT id, name, location_city
          FROM chapters
          WHERE name ILIKE $1 OR location_city ILIKE $1
          ORDER BY location_city, name
          LIMIT $2
        `
        const chaptersResult = await client.query(chaptersQuery, [
          `%${q}%`,
          limit
        ])
        chapters = chaptersResult.rows
      } else if (category === 'people') {
        // People (users) by name/profession
        const peopleQuery = `
          SELECT id, name, profession, profile_photo_url
          FROM users
          WHERE name ILIKE $1 OR profession ILIKE $1
          ORDER BY name
          LIMIT $2
        `
        const peopleResult = await client.query(peopleQuery, [
          `%${q}%`,
          limit
        ])
        people = peopleResult.rows
      } else if (category === 'events') {
        // Events by title/venue
        const eventsQuery = `
          SELECT id, title, date, event_type, venue_address
          FROM events
          WHERE title ILIKE $1 OR COALESCE(venue_address, '') ILIKE $1
          ORDER BY date DESC
          LIMIT $2
        `
        const eventsResult = await client.query(eventsQuery, [
          `%${q}%`,
          limit
        ])
        events = eventsResult.rows
      }

      return NextResponse.json({
        success: true,
        query: q,
        chapters: chapters,
        people: people,
        events: events
      })
    } finally {
      client.release()
    }
  } catch {
    return NextResponse.json({ success: false, error: 'Search failed' }, { status: 500 })
  }
}


