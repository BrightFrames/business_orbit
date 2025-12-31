import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/config/database'
import { getUserFromToken } from '@/lib/utils/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { group_id, recipient_emails, recipient_user_ids } = body

    if (!group_id) {
      return NextResponse.json({ success: false, error: 'Group ID is required' }, { status: 400 })
    }

    // Verify user is admin of the group or is a member (allow members to invite too)
    const groupCheck = await pool.query(
      `SELECT g.admin_id, 
              EXISTS(SELECT 1 FROM secret_group_memberships m WHERE m.group_id = g.id AND m.user_id = $2) as is_member
       FROM secret_groups g
       WHERE g.id = $1`,
      [group_id, user.id]
    )

    if (groupCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Group not found' }, { status: 404 })
    }

    const group = groupCheck.rows[0]
    // Handle type comparison (admin_id might be string or number)
    const isAdmin = Number(group.admin_id) === Number(user.id) || group.admin_id === user.id
    const isMember = group.is_member === true

    // Allow admin or members to send invites
    if (!isAdmin && !isMember) {
      console.error('User not authorized to send invites:', { 
        userId: user.id, 
        adminId: group.admin_id, 
        isAdmin, 
        isMember,
        adminIdType: typeof group.admin_id,
        userIdType: typeof user.id
      })
      return NextResponse.json({ success: false, error: 'Only group admin or members can send invites' }, { status: 403 })
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

    const invites = []

    // Send invites to user IDs
    if (recipient_user_ids && Array.isArray(recipient_user_ids) && recipient_user_ids.length > 0) {
      for (const userId of recipient_user_ids) {
        // Get user email
        const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [userId])
        if (userResult.rows.length > 0) {
          const email = userResult.rows[0].email
          
          // Check if invite already exists (case-insensitive email check)
          const existing = await pool.query(
            `SELECT id FROM secret_group_invites 
             WHERE group_id = $1 
               AND (LOWER(recipient_email) = LOWER($2) OR recipient_user_id = $3) 
               AND status = $4`,
            [group_id, email, userId, 'pending']
          )

          if (existing.rows.length === 0) {
            const result = await pool.query(
              `INSERT INTO secret_group_invites (group_id, sender_id, recipient_email, recipient_user_id, status)
               VALUES ($1, $2, $3, $4, 'pending')
               RETURNING *`,
              [group_id, user.id, email, userId]
            )
            console.log('Created invite for user:', { userId, email, group_id, inviteId: result.rows[0].id })
            invites.push(result.rows[0])
          } else {
            console.log('Invite already exists for user:', { userId, email, group_id })
          }
        }
      }
    }

    // Send invites to emails
    if (recipient_emails && Array.isArray(recipient_emails) && recipient_emails.length > 0) {
      for (const email of recipient_emails) {
        const trimmedEmail = email.trim()
        if (!trimmedEmail) continue

        // Check if user exists with this email
        const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [trimmedEmail])
        const recipientUserId = userResult.rows.length > 0 ? userResult.rows[0].id : null

        // Check if invite already exists (case-insensitive email check)
        const existing = await pool.query(
          `SELECT id FROM secret_group_invites 
           WHERE group_id = $1 
             AND LOWER(recipient_email) = LOWER($2) 
             AND status = $3`,
          [group_id, trimmedEmail, 'pending']
        )

        if (existing.rows.length === 0) {
          const result = await pool.query(
            `INSERT INTO secret_group_invites (group_id, sender_id, recipient_email, recipient_user_id, status)
             VALUES ($1, $2, $3, $4, 'pending')
             RETURNING *`,
            [group_id, user.id, trimmedEmail, recipientUserId]
          )
          console.log('Created invite for email:', { email: trimmedEmail, recipientUserId, group_id, inviteId: result.rows[0].id })
          invites.push(result.rows[0])
        } else {
          console.log('Invite already exists for email:', { email: trimmedEmail, group_id })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully sent ${invites.length} invite(s)`,
      invites
    })

  } catch (error: any) {
    console.error('Error sending secret group invites:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to send invites',
      details: error.message
    }, { status: 500 })
  }
}

