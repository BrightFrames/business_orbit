import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/config/database'
import { createUserSecretGroups } from '@/lib/utils/chapters'
import { proxyToBackend } from '@/lib/utils/proxy-api'

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  // In production, proxy to backend if database is not available
  if (process.env.VERCEL || !pool) {
    const { id } = await ctx.params
    const url = new URL(req.url)
    return proxyToBackend(req, `/api/users/${id}/secret-groups${url.search}`)
  }

  try {
    const { id } = await ctx.params
    
    // Validate user ID
    if (!id || typeof id !== 'string' || !/^\d+$/.test(id)) {
      return NextResponse.json({ 
        error: 'Invalid user ID',
        groups: []
      }, { status: 400 })
    }
    
    const userIdNum = parseInt(id)
    
    // First, try to get secret groups from memberships (actual database groups)
    const membershipResult = await pool.query(
      `SELECT g.id, g.name, g.description, g.admin_id, g.admin_name, g.created_at,
              (SELECT COUNT(m2.user_id)::int FROM secret_group_memberships m2 WHERE m2.group_id = g.id) AS member_count
       FROM secret_group_memberships m
       JOIN secret_groups g ON g.id = m.group_id
       WHERE m.user_id = $1
       ORDER BY g.created_at DESC`,
      [userIdNum]
    )
    
    // If user has memberships, return them
    if (membershipResult.rows.length > 0) {
      return NextResponse.json({ groups: membershipResult.rows })
    }
    
    // If no memberships, fall back to user preferences from onboarding
    const preferencesResult = await pool.query(
      'SELECT secret_groups FROM user_preferences WHERE user_id = $1',
      [userIdNum]
    )
    
    if (preferencesResult.rows.length === 0) {
      return NextResponse.json({ 
        groups: [],
        message: 'No secret groups found. Complete onboarding to join secret groups.'
      })
    }
    
    const { secret_groups } = preferencesResult.rows[0]
    
    // Create secret groups data from user preferences (onboarding selections)
    const userSecretGroups = createUserSecretGroups(secret_groups || [])
    
    // Convert to the format expected by the component
    const formattedGroups = userSecretGroups.map((group) => ({
      id: group.id,
      name: group.name,
      description: null,
      admin_id: null,
      admin_name: null,
      created_at: new Date().toISOString(),
      member_count: group.memberCount
    }))
    
    return NextResponse.json({ groups: formattedGroups })
  } catch (e: any) {
    console.error('Error fetching user secret groups:', e)
    return NextResponse.json({ 
      error: 'Failed to load user groups', 
      details: e?.message,
      groups: []
    }, { status: 500 })
  }
}






