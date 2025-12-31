import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/config/database';

export async function GET(req: NextRequest) {
  try {
    // Check if database pool is available
    if (!pool) {
      console.error("Database pool is not initialized. Check DATABASE_URL environment variable.");
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }

    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Convert userId to integer
    const userIdInt = parseInt(userId, 10);
    if (isNaN(userIdInt)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    // Simple approach: Get all approved proposals for this user, then find matching events
    // This is more reliable than complex JOINs
    
    let result = { rows: [] };
    
    try {
      // Step 1: Get all approved proposals for this user
      const proposalsResult = await pool.query(
        `SELECT id, event_title, event_date, name, email, created_at 
         FROM event_proposals 
         WHERE user_id = $1 AND status = 'approved' 
         ORDER BY created_at DESC`,
        [userIdInt]
      );
      
      console.log(`[Hosting API] Found ${proposalsResult.rows.length} approved proposals for user ${userIdInt}`);
      
      if (proposalsResult.rows.length > 0) {
        // Step 2: Find events matching these proposals
        // Try query with host_id first
        let eventsQuery = `
          SELECT DISTINCT
            e.id,
            e.title,
            e.description,
            e.date,
            e.event_type,
            e.status,
            e.venue_address,
            e.host_id,
            COUNT(DISTINCT r.id) AS rsvp_count,
            ep.name AS creator_name,
            ep.email AS creator_email,
            u.name AS host_name,
            u.email AS host_email
          FROM events e
          LEFT JOIN rsvps r ON e.id = r.event_id
          LEFT JOIN event_proposals ep ON ep.user_id = $1 AND ep.status = 'approved'
            AND (LOWER(TRIM(e.title)) = LOWER(TRIM(ep.event_title)) 
                 OR ABS(EXTRACT(EPOCH FROM (e.date - ep.event_date))) < 3600)
          LEFT JOIN users u ON e.host_id = u.id
          WHERE e.status = 'approved'
            AND (
              e.host_id = $1
              OR EXISTS (
                SELECT 1 FROM event_proposals ep2 
                WHERE ep2.user_id = $1 
                  AND ep2.status = 'approved'
                  AND (
                    LOWER(TRIM(e.title)) = LOWER(TRIM(ep2.event_title))
                    OR (LOWER(TRIM(e.title)) LIKE '%' || LOWER(TRIM(ep2.event_title)) || '%')
                    OR (LOWER(TRIM(ep2.event_title)) LIKE '%' || LOWER(TRIM(e.title)) || '%')
                  )
                  AND DATE(e.date) = DATE(ep2.event_date)
              )
            )
          GROUP BY e.id, ep.name, ep.email, u.name, u.email
          ORDER BY e.date ASC
        `;
        
        try {
          result = await pool.query(eventsQuery, [userIdInt]);
          console.log(`[Hosting API] Events query result: ${result.rows.length} events for user ${userIdInt}`);
        } catch (queryError: any) {
          // If host_id column doesn't exist, use simpler query
          if (queryError?.code === '42703' && queryError?.message?.includes('host_id')) {
            console.log(`[Hosting API] host_id column doesn't exist, using proposal-only query`);
            const simpleQuery = `
              SELECT DISTINCT
                e.id,
                e.title,
                e.description,
                e.date,
                e.event_type,
                e.status,
                e.venue_address,
                COUNT(DISTINCT r.id) AS rsvp_count,
                ep.name AS creator_name,
                ep.email AS creator_email,
                NULL AS host_name,
                NULL AS host_email
              FROM events e
              LEFT JOIN rsvps r ON e.id = r.event_id
              INNER JOIN event_proposals ep ON ep.user_id = $1 AND ep.status = 'approved'
                AND (
                  LOWER(TRIM(e.title)) = LOWER(TRIM(ep.event_title))
                  OR (LOWER(TRIM(e.title)) LIKE '%' || LOWER(TRIM(ep.event_title)) || '%')
                  OR (LOWER(TRIM(ep.event_title)) LIKE '%' || LOWER(TRIM(e.title)) || '%')
                )
                AND DATE(e.date) = DATE(ep.event_date)
              WHERE e.status = 'approved'
              GROUP BY e.id, ep.name, ep.email
              ORDER BY e.date ASC
            `;
            result = await pool.query(simpleQuery, [userIdInt]);
            console.log(`[Hosting API] Simple query result: ${result.rows.length} events for user ${userIdInt}`);
          } else {
            throw queryError;
          }
        }
      }
    } catch (dbError: any) {
      console.error('[Hosting API] Database error:', dbError);
      // Return empty array on error
      result = { rows: [] };
    }
    
    console.log(`[Hosting API] Returning ${result.rows.length} events for user ${userIdInt}`);
    return NextResponse.json(result.rows, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching hosting events:', error);
    
    // Provide more detailed error message for debugging
    let errorMessage = 'Failed to fetch hosting events';
    if (error?.code === '42P01') {
      errorMessage = "Database table not found. Please run migrations.";
    } else if (error?.code === '42703') {
      errorMessage = "Database column not found. Please run migrations.";
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

