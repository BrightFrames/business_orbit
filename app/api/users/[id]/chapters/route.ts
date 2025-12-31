import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/config/database'
import { createUserChapters } from '@/lib/utils/chapters'
import { proxyToBackend } from '@/lib/utils/proxy-api'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // In production, proxy to backend if database is not available
  if (process.env.VERCEL || !pool) {
    const { id: userId } = await params
    const url = new URL(request.url)
    return proxyToBackend(request, `/api/users/${userId}/chapters${url.search}`)
  }

  try {
    const { id: userId } = await params
    
    // Validate user ID
    if (!userId || typeof userId !== 'string' || !/^\d+$/.test(userId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid user ID',
        message: 'User ID must be a valid number'
      }, { status: 400 })
    }
    
    const userIdNum = parseInt(userId)
    
    // First, try to get chapters from memberships (actual database chapters)
    const membershipResult = await pool.query(
      `SELECT c.id, c.name, c.location_city,
              COUNT(cm2.user_id) AS member_count
       FROM chapter_memberships cm
       JOIN chapters c ON c.id = cm.chapter_id
       LEFT JOIN chapter_memberships cm2 ON cm2.chapter_id = c.id
       WHERE cm.user_id = $1
       GROUP BY c.id, c.name, c.location_city
       ORDER BY c.location_city, c.name`,
      [userIdNum]
    )
    
    // If user has memberships, return them
    if (membershipResult.rows.length > 0) {
      return NextResponse.json({ 
        success: true,
        chapters: membershipResult.rows,
        count: membershipResult.rows.length
      })
    }
    
    // If no memberships, fall back to user preferences from onboarding
    const preferencesResult = await pool.query(
      'SELECT chapters, secret_groups FROM user_preferences WHERE user_id = $1',
      [userIdNum]
    )
    
    if (preferencesResult.rows.length === 0) {
      return NextResponse.json({ 
        success: true,
        chapters: [],
        count: 0,
        message: 'No chapters found. Complete onboarding to join chapters.'
      })
    }
    
    const { chapters, secret_groups } = preferencesResult.rows[0]
    
    // Create chapter data from user preferences (onboarding selections)
    const userChapters = createUserChapters(chapters || [], secret_groups || [])
    
    // Convert to the format expected by the component
    const formattedChapters = userChapters.map((chapter, index) => ({
      id: chapter.id,
      name: chapter.name,
      location_city: chapter.location.split(',')[0], // Extract city from "City, India"
      member_count: chapter.memberCount
    }))
    
    return NextResponse.json({ 
      success: true,
      chapters: formattedChapters,
      count: formattedChapters.length
    })
  } catch (error: any) {
    console.error('Error fetching user chapters:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fetch user chapters',
      message: 'Database error occurred while fetching user chapters'
    }, { status: 500 })
  }
}