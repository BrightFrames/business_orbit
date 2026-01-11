import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/config/database'
import { verifyToken } from '@/lib/utils/auth'

export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('token')?.value
        if (!token) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const userId = verifyToken(token)
        if (!userId) {
            return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type') // 'upcoming' or 'past'

        const client = await pool.connect()
        try {
            let query = `
        SELECT 
          c.id,
          c.scheduled_at,
          c.duration_minutes,
          c.status,
          c.meeting_link,
          c.notes,
          CASE 
            WHEN c.expert_id = $1 THEN 'expert'
            ELSE 'client'
          END as role,
          u_expert.name as expert_name,
          u_expert.profile_photo_url as expert_photo,
          u_client.name as client_name,
          u_client.profile_photo_url as client_photo
        FROM consultations c
        JOIN users u_expert ON c.expert_id = u_expert.id
        JOIN users u_client ON c.client_id = u_client.id
        WHERE (c.expert_id = $1 OR c.client_id = $1)
      `

            if (type === 'upcoming') {
                query += ` AND c.scheduled_at >= NOW()`
                query += ` ORDER BY c.scheduled_at ASC`
            } else if (type === 'past') {
                query += ` AND c.scheduled_at < NOW()`
                query += ` ORDER BY c.scheduled_at DESC`
            } else {
                query += ` ORDER BY c.scheduled_at DESC`
            }

            const result = await client.query(query, [userId])

            return NextResponse.json({
                success: true,
                consultations: result.rows
            })

        } finally {
            client.release()
        }
    } catch (error: any) {
        console.error('Error fetching consultations:', error)
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch consultations'
        }, { status: 500 })
    }
}
