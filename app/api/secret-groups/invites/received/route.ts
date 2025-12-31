import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/config/database'
import { getUserFromToken } from '@/lib/utils/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Ensure secret_group_invites table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS secret_group_invites (
        id SERIAL PRIMARY KEY,
        group_id UUID NOT NULL REFERENCES secret_groups(id) ON DELETE CASCADE,
        sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        recipient_email VARCHAR(255),
        recipient_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Get pending invites for this user (by email or user_id)
    // Use LOWER for case-insensitive email matching
    const result = await pool.query(
      `SELECT 
        sgi.id,
        sgi.group_id,
        sgi.status,
        sgi.created_at,
        sg.name as group_name,
        sg.description as group_description,
        u.name as sender_name,
        u.email as sender_email
       FROM secret_group_invites sgi
       JOIN secret_groups sg ON sg.id = sgi.group_id
       JOIN users u ON u.id = sgi.sender_id
       WHERE (LOWER(sgi.recipient_email) = LOWER($1) OR sgi.recipient_user_id = $2)
         AND sgi.status = 'pending'
       ORDER BY sgi.created_at DESC`,
      [user.email, user.id]
    )

    console.log('Fetched invites for user:', { 
      userEmail: user.email, 
      userId: user.id, 
      inviteCount: result.rows.length 
    })

    return NextResponse.json({
      success: true,
      invites: result.rows
    })

  } catch (error: any) {
    console.error('Error fetching secret group invites:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch invites',
      details: error.message
    }, { status: 500 })
  }
}

