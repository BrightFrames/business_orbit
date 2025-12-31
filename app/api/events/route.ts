import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/config/database'; 

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const searchQuery = url.searchParams.get('search') || '';
    const dateQuery = url.searchParams.get('date') || '';
    const userId = url.searchParams.get('userId');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    // Build SELECT with RSVP count and optional is_registered flag
    let queryText = `
      SELECT 
        e.id,
        e.title,
        e.description,
        e.date,
        e.event_type,
        e.status,
        e.meeting_link,
        e.venue_address,
        COUNT(DISTINCT r.id) AS rsvp_count
        ${userId ? ", (COUNT(DISTINCT ur.user_id) > 0) AS is_registered" : ''}
      FROM events e
      LEFT JOIN rsvps r ON e.id = r.event_id
      ${userId ? 'LEFT JOIN rsvps ur ON e.id = ur.event_id AND ur.user_id = $1' : ''}
      WHERE e.status = 'approved'
    `;
    const queryParams: any[] = [];
    if (userId) {
      queryParams.push(Number(userId));
    }

    if (searchQuery) {
      queryText += ` AND (e.title ILIKE $${queryParams.length + 1} OR e.description ILIKE $${queryParams.length + 1} OR e.venue_address ILIKE $${queryParams.length + 1})`;
      queryParams.push(`%${searchQuery}%`);
    }

    if (dateQuery) {
      // Expecting YYYY-MM-DD; compare on date portion only
      queryText += ` AND DATE(e.date) = $${queryParams.length + 1}`;
      queryParams.push(dateQuery);
    }

    queryText += `
      GROUP BY e.id
      ORDER BY e.date ASC
      LIMIT $${queryParams.length + 1}
    `;
    queryParams.push(limit);

    const result = await pool.query(queryText, queryParams);
    
    return NextResponse.json(result.rows, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch events', details: err.message }, { status: 500 });
  }
}
