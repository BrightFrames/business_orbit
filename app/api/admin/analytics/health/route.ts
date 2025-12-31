import { NextRequest, NextResponse } from 'next/server'
import { getUserFromToken } from '@/lib/utils/auth'
import pool from '@/lib/config/database'

export async function GET(request: NextRequest) {
  try {
    // Test authentication
    const user = await getUserFromToken(request)
    
    // Test database connection
    let dbStatus = 'unknown'
    try {
      await pool.query('SELECT 1')
      dbStatus = 'connected'
    } catch (dbError) {
      dbStatus = 'failed'
    }
    
    // Test if chapter_messages table exists
    let tableExists = false
    try {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'chapter_messages'
        )
      `)
      tableExists = result.rows[0].exists
    } catch (tableError) {
      // Ignore table check error
    }
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      auth: {
        user: user ? {
          id: user.id,
          name: user.name,
          email: user.email,
          is_admin: user.is_admin
        } : null,
        hasToken: !!request.cookies.get('token')?.value
      },
      database: {
        status: dbStatus,
        chapter_messages_table_exists: tableExists
      }
    })
    
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}


