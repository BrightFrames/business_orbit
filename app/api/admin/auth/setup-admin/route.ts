import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/config/database'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    // Find user by email
    const userResult = await pool.query(
      'SELECT id, name, email, is_admin FROM users WHERE email = $1',
      [email]
    )

    if (userResult.rowCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const user = userResult.rows[0]

    // If already admin, return current status
    if (user.is_admin) {
      return NextResponse.json({ 
        success: true, 
        message: 'User is already an admin',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          is_admin: user.is_admin
        }
      })
    }

    // Make user admin
    const updateResult = await pool.query(
      'UPDATE users SET is_admin = true WHERE id = $1 RETURNING id, name, email, is_admin',
      [user.id]
    )

    return NextResponse.json({ 
      success: true, 
      message: 'User has been made admin',
      user: updateResult.rows[0]
    })

  } catch (error) {
    console.error('Setup admin error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET endpoint to list all users and their admin status
export async function GET() {
  try {
    const result = await pool.query(
      'SELECT id, name, email, is_admin, created_at FROM users ORDER BY created_at DESC LIMIT 20'
    )

    return NextResponse.json({ 
      success: true, 
      users: result.rows 
    })

  } catch (error) {
    console.error('List users error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


