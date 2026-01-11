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

    console.log(`[Search] Query: "${q}", Category: "${category}", Limit: ${limit}`);

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
      console.error('[Search] Database pool is null');
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

      // If category is null, we should probably search everything or return nothing
      // The current implementation returns nothing if category is null.

      // Only search for the selected category
      if (category === 'chapter') {
        console.log('[Search] Searching chapters...');
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
        console.log(`[Search] Found ${chapters.length} chapters`);
      } else if (category === 'people') {
        console.log('[Search] Searching people...');
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
        console.log(`[Search] Found ${people.length} people`);
      } else if (category === 'events') {
        console.log('[Search] Searching events...');
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
        console.log(`[Search] Found ${events.length} events`);
      } else {
        console.log('[Search] No category specified, searching across all categories in parallel...');

        // Parallel queries for all categories
        const [peopleResult, chaptersResult, eventsResult] = await Promise.all([
          client.query(`
            SELECT id, name, profession, profile_photo_url
            FROM users
            WHERE name ILIKE $1 OR profession ILIKE $1
            ORDER BY name LIMIT $2
          `, [`%${q}%`, limit]),
          client.query(`
            SELECT id, name, location_city
            FROM chapters
            WHERE name ILIKE $1 OR location_city ILIKE $1
            ORDER BY name LIMIT $2
          `, [`%${q}%`, limit]),
          client.query(`
            SELECT id, title, date, event_type, venue_address
            FROM events
            WHERE title ILIKE $1 OR COALESCE(venue_address, '') ILIKE $1
            ORDER BY date DESC LIMIT $2
          `, [`%${q}%`, limit])
        ]);

        people = peopleResult.rows;
        chapters = chaptersResult.rows;
        events = eventsResult.rows;

        console.log(`[Search] Global search results: People=${people.length}, Chapters=${chapters.length}, Events=${events.length}`);
      }

      return NextResponse.json({
        success: true,
        query: q,
        chapters: chapters,
        people: people,
        events: events
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        }
      })
    } finally {
      client.release()
    }
  } catch (error: any) {
    console.error('[Search] Error:', error);
    return NextResponse.json({ success: false, error: 'Search failed', details: error.message }, { status: 500 })
  }
}


