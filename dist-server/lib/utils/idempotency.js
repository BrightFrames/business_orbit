"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkIdempotency = checkIdempotency;
exports.storeIdempotency = storeIdempotency;
exports.generateIdempotencyKey = generateIdempotencyKey;
exports.cleanupIdempotencyKeys = cleanupIdempotencyKeys;
exports.withIdempotency = withIdempotency;
const database_1 = __importDefault(require("@/lib/config/database"));
/**
 * Check if a request with this idempotency key has already been processed
 *
 * @param key - Unique idempotency key (e.g., "follow:userId:targetId")
 * @param ttlHours - How long to remember the key (default: 24 hours)
 * @returns { isNew: true } if this is a new request, { isNew: false, cachedResponse } if duplicate
 */
async function checkIdempotency(key, ttlHours = 24) {
    try {
        // Check if key exists and is not expired
        const existing = await database_1.default.query(`
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
    }
    catch (error) {
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
async function storeIdempotency(key, response, ttlHours = 24) {
    try {
        await database_1.default.query(`
      INSERT INTO idempotency_keys (key, response, expires_at)
      VALUES ($1, $2, NOW() + INTERVAL '${ttlHours} hours')
      ON CONFLICT (key) DO UPDATE SET
        response = $2,
        expires_at = NOW() + INTERVAL '${ttlHours} hours'
    `, [key, JSON.stringify(response)]);
    }
    catch (error) {
        console.error('[Idempotency] Store error:', error);
    }
}
/**
 * Generate an idempotency key for common actions
 */
function generateIdempotencyKey(action, userId, targetId) {
    const base = `idem:${action}:${userId}`;
    return targetId ? `${base}:${targetId}` : base;
}
/**
 * Cleanup expired idempotency keys
 */
async function cleanupIdempotencyKeys() {
    try {
        const result = await database_1.default.query(`
      DELETE FROM idempotency_keys WHERE expires_at < NOW()
    `);
        return result.rowCount || 0;
    }
    catch (error) {
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
async function withIdempotency(key, action, ttlHours = 24) {
    // Check if already processed
    const check = await checkIdempotency(key, ttlHours);
    if (!check.isNew && check.cachedResponse) {
        return {
            result: check.cachedResponse,
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
