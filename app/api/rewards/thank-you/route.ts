import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/config/database';
import { getUserFromToken } from '@/lib/utils/auth';
import { awardOrbitPoints, checkPairwiseLimit, validateCredibility } from '@/lib/utils/rewards';

export async function POST(request: NextRequest) {
    try {
        const user = await getUserFromToken(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { receiverId, message, isPublic } = await request.json();

        if (!receiverId || !message) {
            return NextResponse.json(
                { error: 'Receiver ID and message are required' },
                { status: 400 }
            );
        }

        if (user.id === receiverId) {
            return NextResponse.json(
                { error: 'Cannot send thank you note to yourself' },
                { status: 400 }
            );
        }

        // 1. Validate Credibility (Anti-Abuse)
        const isCredible = await validateCredibility(user.id);
        if (!isCredible) {
            return NextResponse.json(
                { error: 'You need more reputation (50+ points) to send Thank You notes.' },
                { status: 403 }
            );
        }

        // 2. Pairwise Limit Check
        const hasSentRecently = await checkPairwiseLimit(user.id, receiverId, 7);
        if (hasSentRecently) {
            return NextResponse.json(
                { error: 'You can only send one Thank You note to the same person every 7 days.' },
                { status: 429 }
            );
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 3. Create Thank You Note
            const insertQuery = `
        INSERT INTO thank_you_notes (sender_id, receiver_id, message, is_public)
        VALUES ($1, $2, $3, $4)
        RETURNING id, created_at
      `;
            const res = await client.query(insertQuery, [
                user.id,
                receiverId,
                message,
                isPublic ?? true
            ]);

            const note = res.rows[0];

            // 4. Award Points (Transactional)
            // Sender: 20 pts
            await awardOrbitPoints(
                user.id,
                'send_thank_you',
                `Sent thank you note to user ${receiverId}`,
                note.id,
                client
            );

            // Receiver: 50 pts
            await awardOrbitPoints(
                receiverId,
                'receive_thank_you',
                `Received thank you note from user ${user.id}`,
                note.id,
                client
            );

            await client.query('COMMIT');

            return NextResponse.json({
                success: true,
                data: note,
                message: 'Thank you note sent successfully'
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error: any) {
        console.error('[ThankYou] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error?.message },
            { status: 500 }
        );
    }
}
