/**
 * Idempotency Key Utility
 * 
 * Prevents duplicate database writes when the same request is sent multiple times.
 * Uses PostgreSQL to store processed request keys with TTL.
 * 
 * SETUP REQUIRED:
 * Run this SQL in your Supabase SQL editor:
 * 
 * CREATE TABLE IF NOT EXISTS idempotency_keys (
 *   id SERIAL PRIMARY KEY,
 *   key VARCHAR(255) NOT NULL UNIQUE,
 *   response JSONB,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 *   expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '24 hours'
 * );
 * 
 * CREATE INDEX idx_idempotency_key ON idempotency_keys(key);
 * CREATE INDEX idx_idempotency_expires ON idempotency_keys(expires_at);
 * 
 * -- Auto-cleanup (run periodically)
 * DELETE FROM idempotency_keys WHERE expires_at < NOW();
 */

import pool from '@/lib/config/database';

interface IdempotencyResult {
    isNew: boolean;
    cachedResponse?: any;
}

/**
 * Check if a request with this idempotency key has already been processed
 * 
 * @param key - Unique idempotency key (e.g., "follow:userId:targetId")
 * @param ttlHours - How long to remember the key (default: 24 hours)
 * @returns { isNew: true } if this is a new request, { isNew: false, cachedResponse } if duplicate
 */
export async function checkIdempotency(
    key: string,
    ttlHours: number = 24
): Promise<IdempotencyResult> {
    try {
        // Check if key exists and is not expired
        const existing = await pool.query(`
      SELECT response FROM idempotency_keys 
      WHERE key = $1 AND expires_at > NOW()
    `, [key]);

        if (existing.rows.length > 0) {
            console.log(`[Idempotency] DUPLICATE request detected: ${key}`);
            return {
                isNew: false,
                cachedResponse: existing.rows[0].response,
            };
        }

        return { isNew: true };
    } catch (error) {
        // If table doesn't exist or query fails, treat as new request
        console.error('[Idempotency] Check error:', error);
        return { isNew: true };
    }
}

/**
 * Store the response for an idempotency key
 * 
 * @param key - Unique idempotency key
 * @param response - The response to cache
 * @param ttlHours - How long to remember (default: 24 hours)
 */
export async function storeIdempotency(
    key: string,
    response: any,
    ttlHours: number = 24
): Promise<void> {
    try {
        await pool.query(`
      INSERT INTO idempotency_keys (key, response, expires_at)
      VALUES ($1, $2, NOW() + INTERVAL '${ttlHours} hours')
      ON CONFLICT (key) DO UPDATE SET
        response = $2,
        expires_at = NOW() + INTERVAL '${ttlHours} hours'
    `, [key, JSON.stringify(response)]);
    } catch (error) {
        console.error('[Idempotency] Store error:', error);
    }
}

/**
 * Generate an idempotency key for common actions
 */
export function generateIdempotencyKey(
    action: 'follow' | 'unfollow' | 'post' | 'join-group' | 'rsvp',
    userId: number | string,
    targetId?: number | string
): string {
    const base = `idem:${action}:${userId}`;
    return targetId ? `${base}:${targetId}` : base;
}

/**
 * Cleanup expired idempotency keys
 */
export async function cleanupIdempotencyKeys(): Promise<number> {
    try {
        const result = await pool.query(`
      DELETE FROM idempotency_keys WHERE expires_at < NOW()
    `);
        return result.rowCount || 0;
    } catch (error) {
        console.error('[Idempotency] Cleanup error:', error);
        return 0;
    }
}

/**
 * Helper: Wrap an action with idempotency check
 * 
 * Usage:
 * ```typescript
 * const result = await withIdempotency(
 *   generateIdempotencyKey('follow', userId, targetId),
 *   async () => {
 *     // Your database write operation
 *     await db.insert(...)
 *     return { success: true }
 *   }
 * )
 * ```
 */
export async function withIdempotency<T>(
    key: string,
    action: () => Promise<T>,
    ttlHours: number = 24
): Promise<{ result: T; wasCached: boolean }> {
    // Check if already processed
    const check = await checkIdempotency(key, ttlHours);

    if (!check.isNew && check.cachedResponse) {
        return {
            result: check.cachedResponse as T,
            wasCached: true,
        };
    }

    // Execute action
    const result = await action();

    // Store result
    await storeIdempotency(key, result, ttlHours);

    return {
        result,
        wasCached: false,
    };
}
