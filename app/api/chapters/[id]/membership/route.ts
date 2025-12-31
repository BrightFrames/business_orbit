import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/config/database'
import { getUserFromToken } from '@/lib/utils/auth'

// GET: Get user's membership information for a specific chapter
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: chapterId } = await params
    
    // Validate chapter ID
    if (!chapterId || typeof chapterId !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Invalid chapter ID',
        message: 'Chapter ID is required'
      }, { status: 400 })
    }

    // Get authenticated user
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required'
      }, { status: 401 })
    }

    // Get the user's membership for this chapter
    const result = await pool.query(
      'SELECT joined_at FROM chapter_memberships WHERE user_id = $1 AND chapter_id = $2',
      [user.id, chapterId]
    )
    
    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Membership not found',
        message: 'You are not a member of this chapter'
      }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true,
      joined_at: result.rows[0].joined_at,
      is_member: true
    })
  } catch (error: any) {
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fetch membership',
      message: 'Database error occurred while fetching membership'
    }, { status: 500 })
  }
}

// DELETE: Remove user from a specific chapter
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: chapterId } = await params
    
    // Validate chapter ID
    if (!chapterId || typeof chapterId !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Invalid chapter ID',
        message: 'Chapter ID is required'
      }, { status: 400 })
    }

    // For now, we'll need to get user ID from request body since we removed auth
    const body = await request.json()
    const { userId } = body
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID required',
        message: 'User ID is required to leave a chapter'
      }, { status: 400 })
    }

    // Delete the chapter membership
    const result = await pool.query(
      'DELETE FROM chapter_memberships WHERE user_id = $1 AND chapter_id = $2 RETURNING *',
      [userId, chapterId]
    )
    
    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Membership not found',
        message: 'You are not a member of this chapter or the chapter does not exist'
      }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Successfully left the chapter',
      deleted_membership: result.rows[0]
    })
  } catch (error: any) {
    return NextResponse.json({ 
      success: false,
      error: 'Failed to leave chapter',
      message: 'Database error occurred while leaving the chapter'
    }, { status: 500 })
  }
}


