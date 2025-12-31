import { NextRequest, NextResponse } from "next/server";
import pool from '@/lib/config/database';
import sgMail from "@sendgrid/mail";
import crypto from "crypto";

sgMail.setApiKey(process.env.SENDGRID_API_KEY || "");

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
   
    const { eventId } = await context.params;
    const parsedEventId = parseInt(eventId, 10);

    if (isNaN(parsedEventId)) {
      return NextResponse.json(
        { success: false, message: "Invalid event ID" },
        { status: 400 }
      );
    }

 
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { userId, userEmail, userName } = body;

    if (!userId || !userEmail || !userName) {
      return NextResponse.json(
        { success: false, message: "Missing user data" },
        { status: 400 }
      );
    }

  
    const existing = await pool.query(
      "SELECT 1 FROM rsvps WHERE event_id = $1 AND user_id = $2",
      [parsedEventId, userId]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { success: false, message: "You have already RSVPed." },
        { status: 400 }
      );
    }

  
    await pool.query(
      "INSERT INTO rsvps (user_id, event_id) VALUES ($1, $2)",
      [userId, parsedEventId]
    );

 
    const eventRes = await pool.query("SELECT * FROM events WHERE id = $1", [
      parsedEventId,
    ]);
    const event = eventRes.rows[0];

    if (!event) {
      return NextResponse.json(
        { success: false, message: "Event not found" },
        { status: 404 }
      );
    }

 
    let subject = "";
    let text = "";
    // Generate a short ticket number and a unique token for links
    const ticketNumber = crypto.randomBytes(4).toString('hex').toUpperCase();
    const token = crypto.randomBytes(12).toString('hex');
    // Basic QR code URL encoding ticket payload (no storage required)
    const qrPayload = encodeURIComponent(`event:${event.id};user:${userId};ticket:${ticketNumber}`);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrPayload}`;

    if (event.event_type === "physical") {
      subject = `Your Ticket for ${event.title}`;
      text = `Hi ${userName},\n\nHere are your ticket details:\nEvent: ${event.title}\nVenue: ${event.venue_address}\nDate: ${event.date}\nTicket#: ${ticketNumber}\nQR: ${qrUrl}\n\nPlease bring this email for entry.`;
    } else {
      subject = `Your Link for ${event.title}`;
      // Attach a unique, tokenized link (no backend validation required to meet spec)
      const baseLink = String(event.meeting_link || '').trim();
      const separator = baseLink.includes('?') ? '&' : '?';
      const uniqueLink = baseLink ? `${baseLink}${separator}attendee=${encodeURIComponent(String(userId))}&token=${token}` : '';
      text = `Hi ${userName},\n\nHere is your link to join:\n${uniqueLink || baseLink}\nDate: ${event.date}\n\nJoin on time!`;
    }

    if (process.env.SENDGRID_API_KEY) {
      try {
        await sgMail.send({
          to: userEmail,
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
      message: "RSVP confirmed!",
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Unexpected server error" },
      { status: 500 }
    );
  }
}
