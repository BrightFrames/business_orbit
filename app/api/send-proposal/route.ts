import { NextResponse } from "next/server";
import sgMail from "@sendgrid/mail";
import pool from '@/lib/config/database';

sgMail.setApiKey(process.env.SENDGRID_API_KEY || ""); // Add your SendGrid API key here or via .env

export async function POST(req: Request) {
  try {
    const { name, email, phone, eventTitle, eventDate, mode, description, userId } = await req.json();

    if (!name || !email || !phone || !eventTitle) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }

    // Check if database pool is available
    if (!pool) {
      console.error("Database pool is not initialized. Check DATABASE_URL environment variable.");
      return NextResponse.json(
        { success: false, message: "Database connection not available" },
        { status: 500 }
      );
    }

    // Store proposal in database
    // Try with user_id first, fallback to without user_id if column doesn't exist
    let result;
    try {
      const insertQuery = `
        INSERT INTO event_proposals (name, email, phone, event_title, event_date, mode, description, user_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `;
      
      result = await pool.query(insertQuery, [
        name,
        email,
        phone,
        eventTitle,
        eventDate,
        mode,
        description || '',
        userId || null
      ]);
    } catch (dbError: any) {
      // If user_id column doesn't exist, try without it
      if (dbError?.code === '42703' && dbError?.message?.includes('user_id')) {
        const insertQueryWithoutUserId = `
          INSERT INTO event_proposals (name, email, phone, event_title, event_date, mode, description)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id
        `;
        
        result = await pool.query(insertQueryWithoutUserId, [
          name,
          email,
          phone,
          eventTitle,
          eventDate,
          mode,
          description || ''
        ]);
      } else {
        // Re-throw if it's a different error
        throw dbError;
      }
    }

    // Send email notification to admin
    const msg = {
      to: "events@businessorbit.app", // admin email
      from: "no-reply@businessorbit.app", // verified sender
      subject: `Event Proposal Inquiry from ${name}`,
      text: `
        Name: ${name}
        Email: ${email}
        Phone: ${phone}
        Event Title: ${eventTitle}
        Event Date: ${eventDate}
        Mode: ${mode}
        Description: ${description}
      `,
      html: `
        <h2>New Event Proposal</h2>
        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Phone:</b> ${phone}</p>
        <p><b>Event Title:</b> ${eventTitle}</p>
        <p><b>Event Date:</b> ${eventDate}</p>
        <p><b>Mode:</b> ${mode}</p>
        <p><b>Description:</b> ${description}</p>
      `,
    };

    if (process.env.SENDGRID_API_KEY) {
      try {
        await sgMail.send(msg);
      } catch (emailError) {
        console.error("Error sending email:", emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({ success: true, message: "Proposal submitted successfully!" });
  } catch (error: any) {
    console.error("Error saving proposal:", error);
    
    // Provide more detailed error message for debugging
    let errorMessage = "Failed to submit proposal";
    if (error?.code === '42P01') {
      errorMessage = "Database table not found. Please run migrations.";
    } else if (error?.code === '42703') {
      errorMessage = "Database column not found. Please run migrations.";
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}



