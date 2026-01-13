import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/config/database';
import { getUserFromToken } from '@/lib/utils/auth';

export async function PATCH(request: NextRequest) {
    try {
        const user = await getUserFromToken(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await pool.query(
            `UPDATE notifications 
             SET is_read = TRUE 
             WHERE user_id = $1 AND is_read = FALSE`,
            [user.id]
        );

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Error marking all notifications as read:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
