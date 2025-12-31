import { NextRequest, NextResponse } from "next/server";
import pool from '@/lib/config/database';
import sgMail from "@sendgrid/mail";
import { proxyToBackend } from '@/lib/utils/proxy-api';

sgMail.setApiKey(process.env.SENDGRID_API_KEY || "");

// ---------------- GET /api/admin/events ----------------
export async function GET(req: NextRequest) {
  // In production on Vercel, proxy to backend
  if (process.env.VERCEL || !pool) {
    const url = new URL(req.url);
    return proxyToBackend(req, `/api/admin/management/events${url.search}`);
  }
  try {
    const url = new URL(req.url);
    const eventId = url.searchParams.get("id");

    if (eventId) {
      // Get single event with attendees
      const attendeesQuery = `
        SELECT u.id, u.name, u.email
        FROM rsvps r
        JOIN users u ON r.user_id = u.id
        WHERE r.event_id = $1
      `;
      const attendeesResult = await pool.query(attendeesQuery, [eventId]);

      const eventQuery = "SELECT * FROM events WHERE id = $1";
      const eventResult = await pool.query(eventQuery, [eventId]);

      return NextResponse.json({
        event: eventResult.rows[0],
        attendees: attendeesResult.rows,
      });
    } else {
      // Get all events with RSVP count (optimized query)
      // Filter out cancelled events at database level for better performance
      // Use subquery for RSVP count instead of GROUP BY for better performance
      // This approach is much faster than LEFT JOIN with GROUP BY
      const allEventsQuery = `
        SELECT 
          e.id,
          e.title,
          e.description,
          e.date,
          e.event_type,
          e.status,
          e.meeting_link,
          e.venue_address,
          COALESCE(rsvp_counts.count, 0)::int AS rsvp_count
        FROM events e
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int as count
          FROM rsvps r
          WHERE r.event_id = e.id
        ) rsvp_counts ON true
        WHERE LOWER(e.status) != 'cancelled'
        ORDER BY e.date ASC
      `;
      const result = await pool.query(allEventsQuery);
      return NextResponse.json(result.rows, { status: 200 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch admin events" }, { status: 500 });
  }
}

// ---------------- POST /api/admin/events ----------------
export async function POST(req: NextRequest) {
  // In production on Vercel, proxy to backend
  if (process.env.VERCEL || !pool) {
    return proxyToBackend(req, '/api/admin/management/events');
  }
  try {
    const { title, description, date, event_type, meeting_link, venue_address, status } = await req.json();

    if (!title || !date || !event_type) {
      return NextResponse.json(
        { error: "Title, date, and event type are required" },
        { status: 400 }
      );
    }

    const query = `
      INSERT INTO events 
        (title, description, date, event_type, meeting_link, venue_address, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [
      title,
      description || "",
      date,
      event_type,
      meeting_link || null,
      venue_address || null,
      status || "pending",
    ];

    const result = await pool.query(query, values);
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}

// ---------------- PUT /api/admin/events ----------------
export async function PUT(req: NextRequest) {
  // In production on Vercel, proxy to backend
  if (process.env.VERCEL || !pool) {
    return proxyToBackend(req, '/api/admin/management/events');
  }
  try {
    const { id, title, description, date, event_type, meeting_link, venue_address, status } =
      await req.json();

    if (!id || !title || !date || !event_type) {
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

    // If cancelling, notify all RSVPs via email (best-effort)
    if ((status || "").toLowerCase() === 'cancelled') {
      try {
        const attendees = await pool.query(
          `SELECT u.email, u.name, e.title, e.date FROM rsvps r
           JOIN users u ON u.id = r.user_id
           JOIN events e ON e.id = r.event_id
           WHERE r.event_id = $1`,
          [id]
        );
        if (process.env.SENDGRID_API_KEY) {
          const msgs = attendees.rows.map((row: any) => ({
            to: row.email,
            from: "no-reply@businessorbit.app",
            subject: `Event Cancelled: ${row.title}`,
            text: `Hi ${row.name || 'there'},\n\nWe’re sorry to inform you that the event "${row.title}" scheduled on ${row.date} has been cancelled.\n\nWe apologize for the inconvenience.`,
          }));
          // Send sequentially to avoid API rate spikes; keep it simple & robust
          for (const msg of msgs) {
            // Fire and forget; ignore individual send failures
            await sgMail.send(msg).catch(() => {});
          }
        }
      } catch (e) {
      }
    }

    return NextResponse.json(result.rows[0], { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
  }
}
