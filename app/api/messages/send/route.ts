import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/utils/auth';
import { dmService } from '@/lib/services/dm-service';

export async function POST(request: NextRequest) {
    try {
        const user = await getUserFromToken(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { conversationId, content } = await request.json();
        if (!conversationId || !content) {
            return NextResponse.json({ error: 'conversationId and content required' }, { status: 400 });
        }

        const message = await dmService.storeMessage(conversationId, user.id, content);

        // Note: In real setup, you'd also emit a socket event here if using HTTP fallback

        return NextResponse.json({ success: true, message });
    } catch (error: any) {
        console.error('Send message error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
