import { NextRequest, NextResponse } from 'next/server'
import { getUserFromToken } from '@/lib/utils/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)
    
    // Return admin status even if user is not authenticated
    return NextResponse.json({ 
      success: true, 
      user: user ? {
        id: user.id,
        name: user.name,
        email: user.email,
        is_admin: user.is_admin
      } : null,
      isAdmin: user?.is_admin || false,
      authenticated: !!user
    })
    
  } catch (error) {
    console.error('Check admin error:', error)
    return NextResponse.json({ 
      success: true, 
      user: null,
      isAdmin: false,
      authenticated: false,
      error: 'Authentication check failed'
    })
  }
}

