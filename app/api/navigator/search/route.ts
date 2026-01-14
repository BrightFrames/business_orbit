import { NextRequest, NextResponse } from 'next/server';
import { NavigatorService, NavigatorSearchRequest } from '@/lib/services/navigator-service';
import { getUserFromToken } from '@/lib/utils/auth';

export async function POST(request: NextRequest) {
    try {
        // 1. Auth Check
        const user = await getUserFromToken(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Input Validation
        const body = await request.json();

        if (!body.search_intent || typeof body.search_intent !== 'string') {
            return NextResponse.json({ error: 'Valid search_intent is required' }, { status: 400 });
        }

        const searchRequest: NavigatorSearchRequest = {
            search_intent: body.search_intent,
            requesting_user_id: user.id,
            filters: body.filters,
            limit: Math.min(body.limit || 20, 100), // Hard cap at 100
            custom_message_template: body.custom_message_template
        };

        // 3. Execute Search
        const result = await NavigatorService.search(searchRequest);

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 429 });
        }

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('[NavigatorAI] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error?.message },
            { status: 500 }
        );
    }
}
