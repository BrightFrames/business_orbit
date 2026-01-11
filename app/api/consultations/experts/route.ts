import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/config/database'

// GET: List all experts
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const expertise = searchParams.get('expertise')

        // Build query
        let query = `
      SELECT 
        cp.id, 
        cp.hourly_rate, 
        cp.currency, 
        cp.expertise, 
        cp.bio,
        cp.is_available,
        u.id as user_id,
        u.name,
        u.profile_photo_url,
        u.profession
      FROM consultation_profiles cp
      JOIN users u ON cp.user_id = u.id
      WHERE cp.is_available = true
    `
        const params: any[] = []

        if (expertise) {
            query += ` AND $1 = ANY(cp.expertise)`
            params.push(expertise)
        }

        query += ` ORDER BY u.name ASC`

        const client = await pool.connect()
        try {
            const result = await client.query(query, params)

            return NextResponse.json({
                success: true,
                experts: result.rows
            })
        } finally {
            client.release()
        }
    } catch (error: any) {
        console.error('Error fetching experts:', error)
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch experts'
        }, { status: 500 })
    }
}
