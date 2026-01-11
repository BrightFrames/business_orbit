import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/config/database'
import { verifyToken } from '@/lib/utils/auth'

export async function POST(request: NextRequest) {
    try {
        const token = request.cookies.get('token')?.value
        if (!token) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const userId = verifyToken(token)
        if (!userId) {
            return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 })
        }

        const body = await request.json()
        const { expertId, scheduledAt, notes } = body

        if (!expertId || !scheduledAt) {
            return NextResponse.json({
                success: false,
                error: 'Missing required fields'
            }, { status: 400 })
        }

        const meetingDate = new Date(scheduledAt)
        if (isNaN(meetingDate.getTime()) || meetingDate < new Date()) {
            return NextResponse.json({
                success: false,
                error: 'Invalid date'
            }, { status: 400 })
        }

        const client = await pool.connect()
        try {
            await client.query('BEGIN')

            // Check if expert exists and is available
            const expertCheck = await client.query(
                'SELECT id, is_available FROM consultation_profiles WHERE user_id = $1',
                [expertId]
            )

            if (expertCheck.rows.length === 0 || !expertCheck.rows[0].is_available) {
                return NextResponse.json({
                    success: false,
                    error: 'Expert not available'
                }, { status: 404 })
            }

            // Create booking
            const result = await client.query(
                `INSERT INTO consultations 
         (expert_id, client_id, scheduled_at, notes, status)
         VALUES ($1, $2, $3, $4, 'confirmed')
         RETURNING id, status, scheduled_at`,
                [expertId, userId, meetingDate, notes]
            )

            // Create a notification for the expert
            await client.query(
                `INSERT INTO notifications (user_id, type, title, message, link)
         VALUES ($1, 'system', 'New Consultation Booking', 'You have a new consultation booked.', '/product/consultations/calendar')`,
                [expertId]
            )

            await client.query('COMMIT')

            return NextResponse.json({
                success: true,
                booking: result.rows[0]
            })

        } catch (error) {
            await client.query('ROLLBACK')
            throw error
        } finally {
            client.release()
        }

    } catch (error: any) {
        console.error('Booking failed:', error)
        return NextResponse.json({
            success: false,
            error: 'Booking failed',
            details: error.message
        }, { status: 500 })
    }
}
