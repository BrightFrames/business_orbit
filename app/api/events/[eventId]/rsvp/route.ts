import { NextRequest, NextResponse } from "next/server";
import pool from '@/lib/config/database';
import sgMail from "@sendgrid/mail";
import crypto from "crypto";
import { getUserFromToken } from "@/lib/utils/auth";

sgMail.setApiKey(process.env.SENDGRID_API_KEY || "");

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const { eventId } = await context.params;
    const parsedEventId = parseInt(eventId, 10);

    if (isNaN(parsedEventId)) {
      return NextResponse.json(
        { success: false, message: "Invalid event ID" },
        { status: 400 }
      );
    }

    // Check if event exists and is approved
    const eventRes = await pool.query("SELECT * FROM events WHERE id = $1 AND status = 'approved'", [
      parsedEventId,
    ]);
    const event = eventRes.rows[0];

    if (!event) {
      return NextResponse.json(
        { success: false, message: "Event not found or not approved" },
        { status: 404 }
      );
    }

    // Check if already RSVPed
    const existing = await pool.query(
      "SELECT 1 FROM rsvps WHERE event_id = $1 AND user_id = $2",
      [parsedEventId, user.id]
    );

    if (existing.rows.length > 0) {
      console.log(`[RSVP] User ${user.id} already joined event ${parsedEventId}`);
      return NextResponse.json(
        { success: true, message: "You have already joined this event.", alreadyJoined: true },
        { status: 200 }
      );
    }

    // Insert RSVP
    await pool.query(
      "INSERT INTO rsvps (user_id, event_id) VALUES ($1, $2)",
      [user.id, parsedEventId]
    );

    // Send Confirmation Email
    const ticketNumber = crypto.randomBytes(4).toString('hex').toUpperCase();
    const token = crypto.randomBytes(12).toString('hex');
    const qrPayload = encodeURIComponent(`event:${event.id};user:${user.id};ticket:${ticketNumber}`);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrPayload}`;

    let subject = "";
    let text = "";

    if (event.event_type === "physical") {
      subject = `Your Ticket for ${event.title}`;
      text = `Hi ${user.name},\n\nHere are your ticket details:\nEvent: ${event.title}\nVenue: ${event.venue_address}\nDate: ${event.date}\nTicket#: ${ticketNumber}\nQR: ${qrUrl}\n\nPlease bring this email for entry.`;
    } else {
      subject = `Your Link for ${event.title}`;
      const baseLink = String(event.meeting_link || '').trim();
      const separator = baseLink.includes('?') ? '&' : '?';
      const uniqueLink = baseLink ? `${baseLink}${separator}attendee=${encodeURIComponent(String(user.id))}&token=${token}` : '';
      text = `Hi ${user.name},\n\nHere is your link to join:\n${uniqueLink || baseLink}\nDate: ${event.date}\n\nJoin on time!`;
    }

    if (process.env.SENDGRID_API_KEY) {
      try {
        await sgMail.send({
          to: user.email,
          from: "no-reply@businessorbit.app",
          subject,
          text,
        });
      } catch (err) {
        console.error("SendGrid error:", err);
      }
    }

    return NextResponse.json({
      success: true,
      message: "RSVP confirmed! Check your email for details.",
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
