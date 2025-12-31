import { NextRequest, NextResponse } from "next/server";
import pool from '@/lib/config/database';

// Alias: PUT /api/admin/events/{eventId}
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await context.params;
    const id = Number(eventId);
    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ error: 'Invalid eventId' }, { status: 400 });
    }

    const { title, description, date, event_type, meeting_link, venue_address, status } = await req.json();

    if (!title || !date || !event_type) {
      return NextResponse.json(
        { error: "ID, title, date, and event type are required" },
        { status: 400 }
      );
    }

    const query = `
      UPDATE events
      SET title=$1, description=$2, date=$3, event_type=$4, meeting_link=$5, venue_address=$6, status=$7
      WHERE id=$8
      RETURNING *
    `;
    const values = [title, description || "", date, event_type, meeting_link || null, venue_address || null, status || "pending", id];

    const result = await pool.query(query, values);
    return NextResponse.json(result.rows[0], { status: 200 });
  } catch (error: any) {
    console.error("Error updating event (alias):", error);
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
  }
}


