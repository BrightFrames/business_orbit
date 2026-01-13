import pool from '@/lib/config/database';

export const REWARD_POINTS = {
    COMPLETE_PROFILE: 100,
    DAILY_LOGIN: 5,
    CHAPTER_CHAT_POST: 10,
    REPLY_TO_POST: 5,
    SECRET_GROUP_ACTIVITY: 15, // Per day
    SEND_THANK_YOU: 20,
    RECEIVE_THANK_YOU: 50,
    EVENT_FEEDBACK: 25,
};

export type PointAction =
    | 'complete_profile'
    | 'daily_login'
    | 'chapter_chat_post'
    | 'reply_to_post'
    | 'secret_group_activity'
    | 'send_thank_you'
    | 'receive_thank_you'
    | 'event_feedback';

/**
 * Awards Orbit Points to a user.
 * Handles daily limits for specific actions.
 */
export async function awardOrbitPoints(
    userId: number,
    action: PointAction,
    description: string = ''
): Promise<{ awarded: boolean; points: number; newTotal: number }> {
    try {
        const points = REWARD_POINTS[getKeyForAction(action)];
        if (!points) throw new Error(`Invalid action type: ${action}`);

        // Check daily limits
        if (await isDailyLimitReached(userId, action)) {
            console.log(`[Rewards] Daily limit reached for user ${userId} on action ${action}`);
            const currentPoints = await getUserPoints(userId);
            return { awarded: false, points: 0, newTotal: currentPoints };
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Record transaction
            await client.query(
                `INSERT INTO point_transactions (user_id, points, action_type, description) 
         VALUES ($1, $2, $3, $4)`,
                [userId, points, action, description]
            );

            // Update user points
            const res = await client.query(
                `UPDATE users 
         SET orbit_points = COALESCE(orbit_points, 0) + $1 
         WHERE id = $2 
         RETURNING orbit_points`,
                [points, userId]
            );

            await client.query('COMMIT');

            const newTotal = res.rows[0]?.orbit_points || 0;
            console.log(`[Rewards] Awarded ${points} points to user ${userId} for ${action}. New total: ${newTotal}`);
            return { awarded: true, points, newTotal };

        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('[Rewards] Failed to award points:', error);
        // Fail silently to not disrupt the main flow, or rethrow if critical
        // For rewards, typically we don't want to crash the request if reward fails
        const currentPoints = await getUserPoints(userId);
        return { awarded: false, points: 0, newTotal: currentPoints };
    }
}

async function isDailyLimitReached(userId: number, action: PointAction): Promise<boolean> {
    // DAILY_LOGIN: Max 1 per day
    if (action === 'daily_login') {
        const res = await pool.query(
            `SELECT 1 FROM point_transactions 
       WHERE user_id = $1 AND action_type = $2 
       AND created_at > CURRENT_DATE LIMIT 1`,
            [userId, action]
        );
        return res.rowCount !== null && res.rowCount > 0;
    }

    // SECRET_GROUP_ACTIVITY: Max 1 per day (specifically for the "activity" reward)
    // Logic: "15 pts (per day with activity)" -> implied once per day if they are active
    if (action === 'secret_group_activity') {
        const res = await pool.query(
            `SELECT 1 FROM point_transactions 
       WHERE user_id = $1 AND action_type = $2 
       AND created_at > CURRENT_DATE LIMIT 1`,
            [userId, action]
        );
        return res.rowCount !== null && res.rowCount > 0;
    }

    // PROFILE_COMPLETE: Max 1 lifetime
    if (action === 'complete_profile') {
        const res = await pool.query(
            `SELECT 1 FROM point_transactions 
       WHERE user_id = $1 AND action_type = $2 LIMIT 1`,
            [userId, action]
        );
        return res.rowCount !== null && res.rowCount > 0;
    }

    // Other actions might not have limits or limits are higher. 
    // Per spec "Daily Login" and "Secret Group" have explicit daily constraints.
    // Others like "Post", "Reply" seem unlimited per the prompt table, or maybe implicit limits apply?
    // Assuming unlimited for now as per prompt "Orbit Points Awarded" column doesn't specify limit except for Secret Group.

    return false;
}

async function getUserPoints(userId: number): Promise<number> {
    const res = await pool.query('SELECT orbit_points FROM users WHERE id = $1', [userId]);
    return res.rows[0]?.orbit_points || 0;
}

function getKeyForAction(action: PointAction): keyof typeof REWARD_POINTS {
    switch (action) {
        case 'complete_profile': return 'COMPLETE_PROFILE';
        case 'daily_login': return 'DAILY_LOGIN';
        case 'chapter_chat_post': return 'CHAPTER_CHAT_POST';
        case 'reply_to_post': return 'REPLY_TO_POST';
        case 'secret_group_activity': return 'SECRET_GROUP_ACTIVITY';
        case 'send_thank_you': return 'SEND_THANK_YOU';
        case 'receive_thank_you': return 'RECEIVE_THANK_YOU';
        case 'event_feedback': return 'EVENT_FEEDBACK';
    }
}
