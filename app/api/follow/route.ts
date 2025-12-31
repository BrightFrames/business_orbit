import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/config/database'
import { getUserFromToken } from '@/lib/utils/auth'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { targetUserId, action } = await request.json()

    if (!targetUserId || !action) {
      return NextResponse.json({ 
        success: false, 
        error: 'targetUserId and action are required' 
      }, { status: 400 })
    }

    if (action !== 'follow' && action !== 'unfollow') {
      return NextResponse.json({ 
        success: false, 
        error: 'Action must be either follow or unfollow' 
      }, { status: 400 })
    }

    if (user.id === targetUserId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Cannot follow yourself' 
      }, { status: 400 })
    }

    // Convert to integers to ensure proper data types
    const userId = parseInt(String(user.id))
    const targetId = parseInt(String(targetUserId))

    // Check if target user exists
    const targetUser = await pool.query(
      'SELECT id, name FROM users WHERE id = $1 AND is_admin = false',
      [targetId]
    )

    if (targetUser.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 })
    }

    if (action === 'follow') {
      // Check if already following
      const existingFollow = await pool.query(
        'SELECT id FROM user_follows WHERE follower_id = $1 AND following_id = $2',
        [userId, targetId]
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
        [userId, targetId]
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
        [userId, targetId, 'pending']
      )

      return NextResponse.json({ 
        success: true, 
        message: `Follow request sent to ${targetUser.rows[0].name}` 
      })
    } else {
      // Unfollow - remove from both tables
      const followResult = await pool.query(
        'DELETE FROM user_follows WHERE follower_id = $1 AND following_id = $2',
        [userId, targetId]
      )

      const requestResult = await pool.query(
        'DELETE FROM follow_requests WHERE requester_id = $1 AND target_id = $2',
        [userId, targetId]
      )

      if (followResult.rowCount === 0 && requestResult.rowCount === 0) {
        return NextResponse.json({ 
          success: false, 
          error: 'Not following this user' 
        }, { status: 400 })
      }

      return NextResponse.json({ 
        success: true, 
        message: `Unfollowed ${targetUser.rows[0].name}` 
      })
    }

  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to process follow action' 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const checkStatus = url.searchParams.get('checkStatus')
    const userIds = url.searchParams.get('userIds')

    // If checking status for specific users
    if (checkStatus === 'true' && userIds) {
      const userIdArray = userIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
      
      if (userIdArray.length === 0) {
        return NextResponse.json({ success: true, followStatus: {} })
      }

      const userId = parseInt(String(user.id))
      const followStatus: Record<number, 'following' | 'pending' | 'not-following'> = {}

      // Check direct follows
      const followResult = await pool.query(
        'SELECT following_id FROM user_follows WHERE follower_id = $1 AND following_id = ANY($2)',
        [userId, userIdArray]
      )

      // Check follow requests
      const requestResult = await pool.query(
        'SELECT target_id, status FROM follow_requests WHERE requester_id = $1 AND target_id = ANY($2)',
        [userId, userIdArray]
      )

      // Initialize all as not-following
      userIdArray.forEach(id => {
        followStatus[id] = 'not-following'
      })

      // Update based on direct follows
      followResult.rows.forEach((row: any) => {
        followStatus[row.following_id] = 'following'
      })

      // Update based on follow requests
      requestResult.rows.forEach((row: any) => {
        if (row.status === 'pending') {
          followStatus[row.target_id] = 'pending'
        } else if (row.status === 'accepted') {
          followStatus[row.target_id] = 'following'
        }
      })

      return NextResponse.json({ 
        success: true, 
        followStatus 
      })
    }

    // Get user's following list (default behavior)
    const result = await pool.query(`
      SELECT uf.following_id, u.name, u.profile_photo_url
      FROM user_follows uf
      JOIN users u ON uf.following_id = u.id
      WHERE uf.follower_id = $1
      ORDER BY uf.created_at DESC
    `, [user.id])

    const following = result.rows.map((row: any) => ({
      id: row.following_id,
      name: row.name,
      profilePhotoUrl: row.profile_photo_url
    }))

    return NextResponse.json({ 
      success: true, 
      following,
      count: following.length 
    })

  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch following list' 
    }, { status: 500 })
  }
}