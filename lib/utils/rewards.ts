import pool from '@/lib/config/database';

export type PointAction =
    | 'complete_profile'
    | 'daily_login'
    | 'chapter_chat_post'
    | 'reply_to_post'
    | 'secret_group_activity'
    | 'send_thank_you'
    | 'receive_thank_you'
    | 'event_feedback';

interface RewardConfig {
    points: number;
    daily_limit: number | null;
    is_active: boolean;
}

// Simple in-memory cache for reward configurations
// Map<action_type, { config: RewardConfig, expiresAt: number }>
const configCache = new Map<string, { config: RewardConfig, expiresAt: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getRewardConfig(action: PointAction): Promise<RewardConfig | null> {
    const cached = configCache.get(action);
    if (cached && Date.now() < cached.expiresAt) {
        return cached.config;
    }

    try {
        const res = await pool.query(
            'SELECT points, daily_limit, is_active FROM reward_configurations WHERE action_type = $1',
            [action]
        );

        if (res.rows.length === 0) return null;

        const config = {
            points: res.rows[0].points,
            daily_limit: res.rows[0].daily_limit,
            is_active: res.rows[0].is_active
        };

        configCache.set(action, {
            config,
            expiresAt: Date.now() + CACHE_DURATION
        });

        return config;
    } catch (error) {
        console.error(`[Rewards] Failed to fetch config for ${action}:`, error);
        return null; // Fail safe
    }
}

/**
 * Awards Orbit Points to a user.
 * Handles daily limits dynamically based on database configuration.
 */
export async function awardOrbitPoints(
    userId: number,
    action: PointAction,
    description: string = ''
): Promise<{ awarded: boolean; points: number; newTotal: number }> {
    try {
        const config = await getRewardConfig(action);

        // If config not found or inactive, don't award
        if (!config || !config.is_active || config.points <= 0) {
            // console.log(`[Rewards] Action ${action} is disabled or has 0 points.`);
            const currentPoints = await getUserPoints(userId);
            return { awarded: false, points: 0, newTotal: currentPoints };
        }

        const points = config.points;

        // Check daily limits if applicable
        if (config.daily_limit !== null) {
            if (await isDailyLimitReached(userId, action, config.daily_limit)) {
                console.log(`[Rewards] Daily limit reached for user ${userId} on action ${action}`);
                const currentPoints = await getUserPoints(userId);
                return { awarded: false, points: 0, newTotal: currentPoints };
            }
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
        // Fail silently to not disrupt the main flow
        const currentPoints = await getUserPoints(userId);
        return { awarded: false, points: 0, newTotal: currentPoints };
    }
}

async function isDailyLimitReached(userId: number, action: PointAction, limit: number): Promise<boolean> {
    // Check how many times this action was performed today
    const res = await pool.query(
        `SELECT COUNT(*) as count FROM point_transactions 
         WHERE user_id = $1 AND action_type = $2 
         AND created_at > CURRENT_DATE`,
        [userId, action]
    );

    const count = parseInt(res.rows[0]?.count || '0');
    return count >= limit;
}

async function getUserPoints(userId: number): Promise<number> {
    const res = await pool.query('SELECT orbit_points FROM users WHERE id = $1', [userId]);
    return res.rows[0]?.orbit_points || 0;
}
