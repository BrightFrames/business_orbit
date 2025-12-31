import { NextRequest, NextResponse } from "next/server";
import pool from '@/lib/config/database';

// Alias: GET /api/admin/events/{eventId}/attendees
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await context.params;
    const id = Number(eventId);
    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ error: 'Invalid eventId' }, { status: 400 });
    }

    const attendeesQuery = `
      SELECT u.id, u.name, u.email
      FROM rsvps r
      JOIN users u ON r.user_id = u.id
      WHERE r.event_id = $1
      ORDER BY u.name ASC
    `;
    const attendeesResult = await pool.query(attendeesQuery, [id]);

    return NextResponse.json({ attendees: attendeesResult.rows }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching attendees (alias):", error);
    return NextResponse.json({ error: "Failed to fetch attendees" }, { status: 500 });
  }
}


