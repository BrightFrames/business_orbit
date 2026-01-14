import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/config/database';
import { verifyToken } from '@/lib/utils/auth';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> } // Params must be awaited in newer Next.js versions or treated as promise
) {
    try {
        const { id } = await params;
        const token = request.cookies.get('token')?.value;
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = verifyToken(token);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await pool.query(
            `UPDATE notifications 
             SET is_read = TRUE 
             WHERE id = $1 AND user_id = $2`,
            [id, userId]
        );

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Error marking notification as read:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
