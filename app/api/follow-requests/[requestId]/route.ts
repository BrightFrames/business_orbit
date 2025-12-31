import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/config/database'
import { getUserFromToken } from '@/lib/utils/auth'

// Accept or decline a follow request
export async function PATCH(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    // Check authentication
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { requestId } = params
    const { action } = await request.json()

    if (!action || (action !== 'accept' && action !== 'decline')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Action must be either accept or decline' 
      }, { status: 400 })
    }

    // Get the follow request
    const requestResult = await pool.query(`
      SELECT 
        fr.id,
        fr.requester_id,
        fr.target_id,
        fr.status,
        u.name as requester_name
      FROM follow_requests fr
      JOIN users u ON fr.requester_id = u.id
      WHERE fr.id = $1 AND fr.target_id = $2
    `, [requestId, user.id])

    if (requestResult.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Follow request not found' 
      }, { status: 404 })
    }

    const followRequest = requestResult.rows[0]

    if (followRequest.status !== 'pending') {
      return NextResponse.json({ 
        success: false, 
        error: 'Follow request has already been processed' 
      }, { status: 400 })
    }

    // Update the follow request status
    await pool.query(
      'UPDATE follow_requests SET status = $1, updated_at = NOW() WHERE id = $2',
      [action === 'accept' ? 'accepted' : 'declined', requestId]
    )

    // If accepted, create the follow relationship
    if (action === 'accept') {
      await pool.query(
        'INSERT INTO user_follows (follower_id, following_id, created_at) VALUES ($1, $2, NOW())',
        [followRequest.requester_id, followRequest.target_id]
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: `Follow request ${action === 'accept' ? 'accepted' : 'declined'} successfully` 
    })

  } catch (error: any) {
    console.error('Error processing follow request:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to process follow request' 
    }, { status: 500 })
  }
}

// Delete a follow request (cancel sent request)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    // Check authentication
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { requestId } = params

    // Get the follow request
    const requestResult = await pool.query(
      'SELECT id, requester_id, status FROM follow_requests WHERE id = $1',
      [requestId]
    )

    if (requestResult.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Follow request not found' 
      }, { status: 404 })
    }

    const followRequest = requestResult.rows[0]

    // Check if user is the requester
    if (followRequest.requester_id !== user.id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized to delete this request' 
      }, { status: 403 })
    }

    // Delete the follow request
    await pool.query('DELETE FROM follow_requests WHERE id = $1', [requestId])

    return NextResponse.json({ 
      success: true, 
      message: 'Follow request cancelled successfully' 
    })

  } catch (error: any) {
    console.error('Error deleting follow request:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete follow request' 
    }, { status: 500 })
  }
}


