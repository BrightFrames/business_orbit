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

    // Ensure tables exist
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

    await pool.query(`
      CREATE TABLE IF NOT EXISTS secret_group_memberships (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        group_id UUID NOT NULL REFERENCES secret_groups(id) ON DELETE CASCADE,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, group_id)
      )
    `)

    // Get the invite (case-insensitive email matching)
    const inviteResult = await pool.query(
      `SELECT * FROM secret_group_invites 
       WHERE id = $1 
         AND (LOWER(recipient_email) = LOWER($2) OR recipient_user_id = $3)
         AND status = 'pending'`,
      [inviteId, user.email, user.id]
    )

    if (inviteResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Invite not found or already processed'
      }, { status: 404 })
    }

    const invite = inviteResult.rows[0]

    // Start transaction
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Update invite status
      await client.query(
        'UPDATE secret_group_invites SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['accepted', inviteId]
      )

      // Add user to group membership
      await client.query(
        `INSERT INTO secret_group_memberships (user_id, group_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, group_id) DO NOTHING`,
        [user.id, invite.group_id]
      )

      await client.query('COMMIT')

      return NextResponse.json({
        success: true,
        message: 'Invite accepted and joined group successfully'
      })

    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

  } catch (error: any) {
    console.error('Error accepting secret group invite:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to accept invite',
      details: error.message
    }, { status: 500 })
  }
}
