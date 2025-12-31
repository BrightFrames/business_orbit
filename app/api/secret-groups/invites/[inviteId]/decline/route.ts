import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/config/database'
import { getUserFromToken } from '@/lib/utils/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { inviteId } = await params

    // Ensure table exists
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

    // Update invite status to declined (case-insensitive email matching)
    const result = await pool.query(
      `UPDATE secret_group_invites 
       SET status = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
         AND (LOWER(recipient_email) = LOWER($3) OR recipient_user_id = $4)
         AND status = 'pending'
       RETURNING *`,
      ['declined', inviteId, user.email, user.id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Invite not found or already processed'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Invite declined successfully'
    })

  } catch (error: any) {
    console.error('Error declining secret group invite:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to decline invite',
      details: error.message
    }, { status: 500 })
  }
}

