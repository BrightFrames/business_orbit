import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/config/database';
import { getUserFromToken } from '@/lib/utils/auth';
import { awardOrbitPoints } from '@/lib/utils/rewards';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ eventId: string }> }
) {
    try {
        const { eventId } = await params;
        const user = await getUserFromToken(request);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { rating, feedback } = await request.json();

        if (!rating || rating < 1 || rating > 5) {
            return NextResponse.json(
                { error: 'Valid rating (1-5) is required' },
                { status: 400 }
            );
        }

        // Check if user attended event (optional check, but good practice)
        // For now, we assume they can leave feedback if they passed frontend checks
        // Or we could check RSVPs table if needed.

        const client = await pool.connect();
        try {
            // Check for existing feedback
            const existing = await client.query(
                'SELECT 1 FROM event_feedback WHERE event_id = $1 AND user_id = $2',
                [eventId, user.id]
            );

            if (existing.rowCount && existing.rowCount > 0) {
                return NextResponse.json(
                    { error: 'Feedback already submitted for this event' },
                    { status: 409 }
                );
            }

            await client.query('BEGIN');

            // Submit Feedback
            await client.query(
                `INSERT INTO event_feedback (event_id, user_id, rating, feedback)
         VALUES ($1, $2, $3, $4)`,
                [eventId, user.id, rating, feedback]
            );

            // Award Points: 25 pts
            const reward = await awardOrbitPoints(user.id, 'event_feedback', `Feedback for event ${eventId}`);

            await client.query('COMMIT');

            return NextResponse.json({
                success: true,
                pointsAwarded: reward.points,
                message: 'Feedback submitted successfully'
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error: any) {
        console.error('[EventFeedback] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error?.message },
            { status: 500 }
        );
    }
}
