import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/config/database';
import { verifyToken } from '@/lib/utils/auth';

export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('token')?.value;
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = verifyToken(token);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch notifications
        const result = await pool.query(
            `SELECT * FROM notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 50`,
            [userId]
        );

        // Get unread count
        const countResult = await pool.query(
            `SELECT COUNT(*) FROM notifications 
       WHERE user_id = $1 AND is_read = FALSE`,
            [userId]
        );

        return NextResponse.json({
            notifications: result.rows,
            unreadCount: parseInt(countResult.rows[0].count)
        });

    } catch (error: any) {
        console.error('Error fetching notifications:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
