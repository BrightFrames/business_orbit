import { NextResponse } from 'next/server'
import pool from '@/lib/config/database'

export async function GET() {
    try {
        const client = await pool.connect()
        try {
            // Fetch top 5 users by orbit_points
            // JOIN with chapter_memberships to get their primary chapter (just taking the first one found)
            const result = await client.query(`
        SELECT u.name, u.orbit_points as score,
        (
          SELECT c.name 
          FROM chapter_memberships cm 
          JOIN chapters c ON c.id = cm.chapter_id 
          WHERE cm.user_id = u.id 
          LIMIT 1
        ) as chapter_name
        FROM users u
        WHERE u.orbit_points > 0
        ORDER BY u.orbit_points DESC
        LIMIT 5
      `)

            const performers = result.rows.map(row => ({
                name: row.name,
                score: row.score,
                chapter: row.chapter_name || 'No Chapter'
            }))

            return NextResponse.json({
                success: true,
                performers
            })
        } finally {
            client.release()
        }
    } catch (error) {
        console.error('Error fetching top performers:', error)
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch top performers'
        }, { status: 500 })
    }
}
