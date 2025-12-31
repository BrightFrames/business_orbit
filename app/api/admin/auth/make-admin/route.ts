import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/config/database'
import { getUserFromToken } from '@/lib/utils/auth'

export async function POST(request: NextRequest) {
  try {
    // Check if current user is admin
    const currentUser = await getUserFromToken(request)
    if (!currentUser || !currentUser.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { userId } = await request.json()
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Make user admin
    const result = await pool.query(
      'UPDATE users SET is_admin = true WHERE id = $1 RETURNING id, name, email, is_admin',
      [userId]
    )

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      user: result.rows[0] 
    })

  } catch (error) {
    console.error('Make admin error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}