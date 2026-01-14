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

        const client = await pool.connect()
        try {
            const result = await client.query(
                `SELECT * FROM consultation_profiles WHERE user_id = $1`,
                [userId]
            )

            if (result.rows.length === 0) {
                return NextResponse.json({
                    success: true,
                    profile: null
                })
            }

            return NextResponse.json({
                success: true,
                profile: result.rows[0]
            })
        } finally {
            client.release()
        }
    } catch (error: any) {
        console.error('Error fetching profile:', error)
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch profile'
        }, { status: 500 })
    }
}

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
        const {
            hourly_rate,
            currency,
            expertise,
            bio,
            is_available,
            availability_days,
            start_time,
            end_time
        } = body

        // Validate required fields if needed, but we allow partial updates conceptually
        // For simplicity, we assume the frontend sends everything or we use defaults.
        // But strict UPSERT requires values.

        const client = await pool.connect()
        try {
            const query = `
                INSERT INTO consultation_profiles (
                    user_id, hourly_rate, currency, expertise, bio, is_available, 
                    availability_days, start_time, end_time, updated_at
                )
                VALUES ($1, $2, $3, $4::varchar[], $5, $6, $7::integer[], $8, $9, NOW())
                ON CONFLICT (user_id) DO UPDATE SET
                    hourly_rate = EXCLUDED.hourly_rate,
                    currency = EXCLUDED.currency,
                    expertise = EXCLUDED.expertise,
                    bio = EXCLUDED.bio,
                    is_available = EXCLUDED.is_available,
                    availability_days = EXCLUDED.availability_days,
                    start_time = EXCLUDED.start_time,
                    end_time = EXCLUDED.end_time,
                    updated_at = NOW()
                RETURNING *
            `

            const values = [
                userId,
                hourly_rate || 0.00,
                currency || 'USD',
                expertise || [],
                bio || '',
                is_available !== undefined ? is_available : true,
                availability_days || [1, 2, 3, 4, 5],
                start_time || '09:00',
                end_time || '17:00'
            ]

            const result = await client.query(query, values)

            return NextResponse.json({
                success: true,
                profile: result.rows[0]
            })

        } finally {
            client.release()
        }
    } catch (error: any) {
        console.error('Error saving profile:', error)
        return NextResponse.json({
            success: false,
            error: 'Failed to save profile',
            details: error.message
        }, { status: 500 })
    }
}
