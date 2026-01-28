"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.awardOrbitPoints = awardOrbitPoints;
exports.checkAndAwardProfileCompletion = checkAndAwardProfileCompletion;
exports.checkPairwiseLimit = checkPairwiseLimit;
exports.validateCredibility = validateCredibility;
const database_1 = __importDefault(require("@/lib/config/database"));
// Simple in-memory cache for reward configurations
// Map<action_type, { config: RewardConfig, expiresAt: number }>
const configCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
async function getRewardConfig(action) {
    const cached = configCache.get(action);
    if (cached && Date.now() < cached.expiresAt) {
        return cached.config;
    }
    try {
        const res = await database_1.default.query('SELECT points, daily_limit, is_active, category FROM reward_configurations WHERE action_type = $1', [action]);
        if (res.rows.length === 0)
            return null;
        const config = {
            points: res.rows[0].points,
            daily_limit: res.rows[0].daily_limit,
            is_active: res.rows[0].is_active,
            category: res.rows[0].category
        };
        configCache.set(action, {
            config,
            expiresAt: Date.now() + CACHE_DURATION
        });
        return config;
    }
    catch (error) {
        console.error(`[Rewards] Failed to fetch config for ${action}:`, error);
        return null; // Fail safe
    }
}
/**
 * Awards Orbit Points to a user.
 * Handles daily limits dynamically based on database configuration.
 */
async function awardOrbitPoints(userId, action, description = '', sourceId = null, client = null) {
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
                // console.log(`[Rewards] Daily limit reached for user ${userId} on action ${action}`);
                const currentPoints = await getUserPoints(userId);
                return { awarded: false, points: 0, newTotal: currentPoints };
            }
        }
        // Use provided client or create a new one
        const dbClient = client || await database_1.default.connect();
        const shouldRelease = !client; // Only release if we created it
        try {
            if (shouldRelease) {
                await dbClient.query('BEGIN');
            }
            // Record transaction
            await dbClient.query(`INSERT INTO point_transactions (user_id, points, action_type, description, source_id, category) 
                 VALUES ($1, $2, $3, $4, $5, $6)`, [userId, points, action, description, sourceId, config.category]);
            // Update user points
            const res = await dbClient.query(`UPDATE users 
                 SET orbit_points = COALESCE(orbit_points, 0) + $1 
                 WHERE id = $2 
                 RETURNING orbit_points`, [points, userId]);
            if (shouldRelease) {
                await dbClient.query('COMMIT');
            }
            const newTotal = res.rows[0]?.orbit_points || 0;
            // console.log(`[Rewards] Awarded ${points} points to user ${userId} for ${action}. New total: ${newTotal}`);
            return { awarded: true, points, newTotal };
        }
        catch (e) {
            if (shouldRelease) {
                await dbClient.query('ROLLBACK');
            }
            throw e;
        }
        finally {
            if (shouldRelease) {
                // @ts-ignore
                dbClient.release();
            }
        }
    }
    catch (error) {
        console.error('[Rewards] Failed to award points:', error);
        // Fail silently to not disrupt the main flow
        const currentPoints = await getUserPoints(userId);
        return { awarded: false, points: 0, newTotal: currentPoints };
    }
}
async function isDailyLimitReached(userId, action, limit) {
    // Check how many times this action was performed today
    const res = await database_1.default.query(`SELECT COUNT(*) as count FROM point_transactions 
         WHERE user_id = $1 AND action_type = $2 
         AND created_at > CURRENT_DATE`, [userId, action]);
    const count = parseInt(res.rows[0]?.count || '0');
    return count >= limit;
}
async function getUserPoints(userId) {
    const res = await database_1.default.query('SELECT orbit_points FROM users WHERE id = $1', [userId]);
    return res.rows[0]?.orbit_points || 0;
}
/**
 * Checks if the user profile is complete and awards points if not already awarded.
 * Criteria: Profile photo, description, profession, and at least one skill.
 */
async function checkAndAwardProfileCompletion(userId) {
    try {
        // 1. Check if already awarded (indefinitely - no time limit check, just existence of transaction)
        const checkRes = await database_1.default.query('SELECT 1 FROM point_transactions WHERE user_id = $1 AND action_type = $2 LIMIT 1', [userId, 'complete_profile']);
        if (checkRes.rows.length > 0) {
            return; // Already awarded
        }
        // 2. Fetch user profile fields
        const userRes = await database_1.default.query('SELECT profile_photo_url, profession, skills, description FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length === 0)
            return;
        const user = userRes.rows[0];
        // 3. Validate completion
        // Note: location is not in schema, so we skip it.
        const hasPhoto = !!user.profile_photo_url && user.profile_photo_url.length > 0;
        const hasBio = !!user.description && user.description.length > 0;
        const hasProfession = !!user.profession && user.profession.length > 0;
        const hasSkills = user.skills && Array.isArray(user.skills) && user.skills.length > 0;
        const isComplete = hasPhoto && hasBio && hasProfession && hasSkills;
        if (isComplete) {
            console.log(`[Rewards] User ${userId} has a complete profile. Awarding points.`);
            await awardOrbitPoints(userId, 'complete_profile', 'Profile completion bonus');
        }
    }
    catch (error) {
        console.error('[Rewards] Failed to check profile completion:', error);
    }
}
async function checkPairwiseLimit(senderId, receiverId, days = 7) {
    // Check if a thank you note was sent in the last N days
    const noteRes = await database_1.default.query(`SELECT COUNT(*) as count FROM thank_you_notes
         WHERE sender_id = $1 AND receiver_id = $2
         AND created_at > NOW() - INTERVAL '${days} days'`, [senderId, receiverId]);
    return parseInt(noteRes.rows[0]?.count || '0') > 0;
}
async function validateCredibility(userId) {
    // Arbitrary threshold: points > 50 OR account age > 7 days (not implementing age check yet for simplicity)
    const points = await getUserPoints(userId);
    return points >= 50;
}
