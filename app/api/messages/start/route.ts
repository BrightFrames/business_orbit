import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/utils/auth';
import { dmService } from '@/lib/services/dm-service';

export async function POST(request: NextRequest) {
    try {
        const user = await getUserFromToken(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { targetUserId } = await request.json();
        if (!targetUserId) {
            return NextResponse.json({ error: 'targetUserId required' }, { status: 400 });
        }

        const conversationId = await dmService.getOrCreateConversation(user.id, parseInt(targetUserId));
        return NextResponse.json({ success: true, conversationId });
    } catch (error: any) {
        console.error('Start conversation error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
