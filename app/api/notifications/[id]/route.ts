import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/config/database';
import { getUserFromToken } from '@/lib/utils/auth';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getUserFromToken(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: notificationId } = await params;

        if (notificationId === 'mark-all-read') {
            await pool.query(
                `UPDATE notifications SET is_read = TRUE WHERE user_id = $1`,
                [user.id]
            );
        } else {
            await pool.query(
                `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`,
                [notificationId, user.id]
            );
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Error updating notification:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
