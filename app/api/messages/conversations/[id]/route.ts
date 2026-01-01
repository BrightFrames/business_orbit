import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/utils/auth';
import { dmService } from '@/lib/services/dm-service';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getUserFromToken(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: conversationId } = await params;
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50');
        const cursor = searchParams.get('cursor') || undefined;

        const { messages, hasMore } = await dmService.getMessages(conversationId, limit, cursor);

        // Mark messages as read asynchronously
        dmService.markAsRead(conversationId, user.id).catch(err => {
            console.error('Mark as read error:', err);
        });

        return NextResponse.json({ success: true, messages, hasMore });
    } catch (error: any) {
        console.error('Get messages error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
