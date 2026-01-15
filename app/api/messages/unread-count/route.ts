import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/utils/auth';
import dmService from '@/lib/services/dm-service';

export async function GET(request: NextRequest) {
    const token = request.cookies.get('token')?.value;

    if (!token) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = verifyToken(token);
    if (!userId) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    try {
        const unreadCount = await dmService.getUnreadCount(userId);
        return NextResponse.json({ success: true, unreadCount });
    } catch (error) {
        console.error('Error fetching unread message count:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
