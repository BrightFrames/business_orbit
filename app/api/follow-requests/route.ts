import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/config/database'
import { getUserFromToken } from '@/lib/utils/auth'

// Send a follow request
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { targetUserId } = await request.json()

    if (!targetUserId) {
      return NextResponse.json({ 
        success: false, 
        error: 'targetUserId is required' 
      }, { status: 400 })
    }

    if (user.id === targetUserId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Cannot send follow request to yourself' 
      }, { status: 400 })
    }

    // Check if target user exists
    const targetUser = await pool.query(
      'SELECT id, name FROM users WHERE id = $1 AND is_admin = false',
      [targetUserId]
    )

    if (targetUser.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 })
    }

    // Check if already following
    const existingFollow = await pool.query(
      'SELECT id FROM user_follows WHERE follower_id = $1 AND following_id = $2',
      [user.id, targetUserId]
    )

    if (existingFollow.rows.length > 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Already following this user' 
      }, { status: 400 })
    }

    // Check if request already exists
    const existingRequest = await pool.query(
      'SELECT id, status FROM follow_requests WHERE requester_id = $1 AND target_id = $2',
      [user.id, targetUserId]
    )

    if (existingRequest.rows.length > 0) {
      const request = existingRequest.rows[0]
      if (request.status === 'pending') {
        return NextResponse.json({ 
          success: false, 
          error: 'Follow request already sent' 
        }, { status: 400 })
      } else if (request.status === 'accepted') {
        return NextResponse.json({ 
          success: false, 
          error: 'Already following this user' 
        }, { status: 400 })
      } else if (request.status === 'declined') {
        // Allow resending if previously declined
        await pool.query(
          'UPDATE follow_requests SET status = $1, updated_at = NOW() WHERE id = $2',
          ['pending', request.id]
        )
        return NextResponse.json({ 
          success: true, 
          message: `Follow request sent to ${targetUser.rows[0].name}` 
        })
      }
    }

    // Create follow request
    await pool.query(
      'INSERT INTO follow_requests (requester_id, target_id, status) VALUES ($1, $2, $3)',
      [user.id, targetUserId, 'pending']
    )

    return NextResponse.json({ 
      success: true, 
      message: `Follow request sent to ${targetUser.rows[0].name}` 
    })

  } catch (error: any) {
    console.error('Error sending follow request:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to send follow request' 
    }, { status: 500 })
  }
}

// Get follow requests (received and sent)
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'received' // 'received' or 'sent'

    if (type === 'received') {
      // Get received follow requests
      const result = await pool.query(`
        SELECT 
          fr.id,
          fr.requester_id,
          fr.status,
          fr.created_at,
          u.name,
          u.profile_photo_url
        FROM follow_requests fr
        JOIN users u ON fr.requester_id = u.id
        WHERE fr.target_id = $1 AND fr.status = 'pending'
        ORDER BY fr.created_at DESC
      `, [user.id])

      const requests = result.rows.map((row: any) => ({
        id: row.id,
        requesterId: row.requester_id,
        requesterName: row.name,
        requesterPhoto: row.profile_photo_url,
        status: row.status,
        createdAt: row.created_at
      }))

      return NextResponse.json({ 
        success: true, 
        requests,
        count: requests.length 
      })
    } else {
      // Get sent follow requests
      const result = await pool.query(`
        SELECT 
          fr.id,
          fr.target_id,
          fr.status,
          fr.created_at,
          u.name,
          u.profile_photo_url
        FROM follow_requests fr
        JOIN users u ON fr.target_id = u.id
        WHERE fr.requester_id = $1
        ORDER BY fr.created_at DESC
      `, [user.id])

      const requests = result.rows.map((row: any) => ({
        id: row.id,
        targetId: row.target_id,
        targetName: row.name,
        targetPhoto: row.profile_photo_url,
        status: row.status,
        createdAt: row.created_at
      }))

      return NextResponse.json({ 
        success: true, 
        requests,
        count: requests.length 
      })
    }

  } catch (error: any) {
    console.error('Error fetching follow requests:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch follow requests' 
    }, { status: 500 })
  }
}


