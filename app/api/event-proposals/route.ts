import { NextRequest, NextResponse } from "next/server";
import pool from '@/lib/config/database';

// GET all proposals
export async function GET(req: NextRequest) {
  try {
    if (!pool) {
      return NextResponse.json({ error: "Database connection not available" }, { status: 500 });
    }

    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    
    let query = 'SELECT * FROM event_proposals';
    const params: any[] = [];
    
    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, params);
    return NextResponse.json(result.rows, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching proposals:", error);
    return NextResponse.json({ error: "Failed to fetch proposals" }, { status: 500 });
  }
}

// Approve proposal and create event
export async function POST(req: NextRequest) {
  try {
    // Check if database pool is available
    if (!pool) {
      console.error("Database pool is not initialized. Check DATABASE_URL environment variable.");
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }

    const { proposalId, userId } = await req.json();
    
    if (!proposalId) {
      return NextResponse.json({ error: "Proposal ID is required" }, { status: 400 });
    }
    
    // Get the proposal
    const proposalResult = await pool.query(
      'SELECT * FROM event_proposals WHERE id = $1',
      [proposalId]
    );
    
    if (proposalResult.rows.length === 0) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }
    
    const proposal = proposalResult.rows[0];
    
    // Prepare event data
    const eventType = proposal.mode?.toLowerCase() === 'online' ? 'online' : 'physical';
    // For physical events, venue_address should be empty/null (not description)
    // Description goes in description field, venue_address is separate
    const venueAddress = null; // Physical events don't have venue address from proposals
    
    // Get the user_id from proposal - this is critical for hosting tab
    // If user_id is not in proposal, try to find user by email
    let hostId = proposal.user_id || null;
    
    // If user_id is null but we have email, try to find user by email
    if (!hostId && proposal.email) {
      try {
        const userResult = await pool.query(
          'SELECT id FROM users WHERE email = $1 LIMIT 1',
          [proposal.email]
        );
        if (userResult.rows.length > 0) {
          hostId = userResult.rows[0].id;
          // Update the proposal with the found user_id for future reference
          await pool.query(
            'UPDATE event_proposals SET user_id = $1 WHERE id = $2',
            [hostId, proposalId]
          );
        }
      } catch (userError) {
        console.error('Error finding user by email:', userError);
        // Continue without host_id if we can't find user
      }
    }
    
    // Try to create event with host_id, fallback to without host_id if column doesn't exist
    let eventResult;
    try {
      const createEventQuery = `
        INSERT INTO events (title, description, date, event_type, venue_address, status, host_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      
      eventResult = await pool.query(createEventQuery, [
        proposal.event_title,
        proposal.description || '',
        proposal.event_date,
        eventType,
        venueAddress,
        'approved', // Auto-approve when created by admin
        hostId // Set host_id from proposal's user_id or found user
      ]);
    } catch (dbError: any) {
      // If host_id column doesn't exist, try without it
      if (dbError?.code === '42703' && dbError?.message?.includes('host_id')) {
        const createEventQueryWithoutHostId = `
          INSERT INTO events (title, description, date, event_type, venue_address, status)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `;
        
        eventResult = await pool.query(createEventQueryWithoutHostId, [
          proposal.event_title,
          proposal.description || '',
          proposal.event_date,
          eventType,
          venueAddress,
          'approved'
        ]);
      } else {
        // Re-throw if it's a different error
        throw dbError;
      }
    }
    
    // Update proposal status
    await pool.query(
      'UPDATE event_proposals SET status = $1 WHERE id = $2',
      ['approved', proposalId]
    );
    
    return NextResponse.json({ 
      success: true, 
      event: eventResult.rows[0] 
    }, { status: 200 });
    
  } catch (error: any) {
    console.error("Error approving proposal:", error);
    
    // Provide more detailed error message for debugging
    let errorMessage = "Failed to approve proposal";
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

// Reject proposal
export async function DELETE(req: NextRequest) {
  try {
    // Check if database pool is available
    if (!pool) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }

    const url = new URL(req.url);
    const proposalId = url.searchParams.get('id');
    
    if (!proposalId) {
      return NextResponse.json({ error: "Proposal ID is required" }, { status: 400 });
    }
    
    await pool.query(
      'UPDATE event_proposals SET status = $1 WHERE id = $2',
      ['rejected', proposalId]
    );
    
    return NextResponse.json({ success: true }, { status: 200 });
    
  } catch (error: any) {
    console.error("Error rejecting proposal:", error);
    return NextResponse.json({ error: "Failed to reject proposal" }, { status: 500 });
  }
}

