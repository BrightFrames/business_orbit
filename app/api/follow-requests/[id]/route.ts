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
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const requestId = parseInt(id);
        const userId = parseInt(String(user.id));

        if (isNaN(requestId)) {
            return NextResponse.json({ success: false, error: 'Invalid request ID' }, { status: 400 });
        }

        const { action } = await request.json();
        if (!['accept', 'decline'].includes(action)) {
            return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
        }

        // Check if the request exists and is targeted at the current user
        const reqRes = await pool.query(
            'SELECT requester_id, target_id, status FROM follow_requests WHERE id = $1',
            [requestId]
        );

        if (reqRes.rowCount === 0) {
            return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
        }

        const followReq = reqRes.rows[0];

        // Ensure the current user is the target of the request
        if (followReq.target_id !== userId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
        }

        if (followReq.status !== 'pending') {
            return NextResponse.json({ success: false, error: `Request already ${followReq.status}` }, { status: 400 });
        }

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            if (action === 'accept') {
                // Update request status
                await client.query(
                    'UPDATE follow_requests SET status = $1, updated_at = NOW() WHERE id = $2',
                    ['accepted', requestId]
                );

                // Add to user_follows
                // NOTE: The request is "requester asking to follow target".
                // So upon acceptance, requester becomes follower, target becomes following.
                // follower_id = followReq.requester_id, following_id = followReq.target_id (which is current user)
                // Wait, normally "Follow Request" is "I want to follow you".
                // So if A asks to follow B. A is requester, B is target.
                // B accepts. A follows B.
                // So user_follows: follower_id = A (requester), following_id = B (target).

                await client.query(
                    'INSERT INTO user_follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [followReq.requester_id, followReq.target_id]
                );

                // Reverse connection? No, usually one way.
            } else if (action === 'decline') {
                await client.query(
                    'UPDATE follow_requests SET status = $1, updated_at = NOW() WHERE id = $2',
                    ['declined', requestId]
                );
            }

            await client.query('COMMIT');

            return NextResponse.json({ success: true });
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error(`PATCH /api/follow-requests/[id] error:`, error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getUserFromToken(request);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const requestId = parseInt(id);

        if (isNaN(requestId)) {
            return NextResponse.json({ success: false, error: 'Invalid request ID' }, { status: 400 });
        }

        // Get the follow request
        const requestResult = await pool.query(
            'SELECT id, requester_id, status FROM follow_requests WHERE id = $1',
            [requestId]
        );

        if (requestResult.rows.length === 0) {
            return NextResponse.json({ success: false, error: 'Follow request not found' }, { status: 404 });
        }

        const followRequest = requestResult.rows[0];

        // Check if user is the requester (only requester can cancel)
        if (followRequest.requester_id !== user.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized to delete this request' }, { status: 403 });
        }

        // Delete the follow request
        await pool.query('DELETE FROM follow_requests WHERE id = $1', [requestId]);

        return NextResponse.json({ success: true, message: 'Follow request cancelled successfully' });

    } catch (error) {
        console.error('DELETE /api/follow-requests/[id] error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
