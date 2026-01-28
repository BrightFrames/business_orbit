"use strict";
/**
 * Database-backed Rate Limiter for Serverless Environments
 *
 * Uses PostgreSQL (Supabase) for persistent storage across instances.
 * Implements sliding window algorithm with automatic cleanup.
 *
 * SETUP REQUIRED:
 * Run this SQL in your Supabase SQL editor:
 *
 * CREATE TABLE IF NOT EXISTS rate_limits (
 *   id SERIAL PRIMARY KEY,
 *   key VARCHAR(255) NOT NULL,
 *   count INTEGER DEFAULT 1,
 *   window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 *   UNIQUE(key)
 * );
 *
 * CREATE INDEX idx_rate_limits_key ON rate_limits(key);
 * CREATE INDEX idx_rate_limits_window ON rate_limits(window_start);
 *
 * -- Auto-cleanup old entries (run as cron or periodically)
 * DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '5 minutes';
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DB_RATE_LIMITS = void 0;
exports.checkRateLimitDB = checkRateLimitDB;
exports.buildDBRateLimitKey = buildDBRateLimitKey;
exports.cleanupRateLimits = cleanupRateLimits;
const database_1 = __importDefault(require("../config/database"));
/**
 * Check rate limit using database storage (serverless-safe)
 *
 * Uses UPSERT with atomic increment to prevent race conditions.
 * Works across multiple serverless instances.
 */
async function checkRateLimitDB(key, config) {
    const windowSeconds = config.windowSeconds || 60;
    const windowStart = new Date(Date.now() - windowSeconds * 1000);
    try {
        // Atomic upsert with sliding window
        // If key exists and window is still valid, increment
        // If key doesn't exist or window expired, create/reset
        const result = await database_1.default.query(`
      INSERT INTO rate_limits (key, count, window_start)
      VALUES ($1, 1, NOW())
      ON CONFLICT (key) DO UPDATE SET
        count = CASE
          WHEN rate_limits.window_start < $2 THEN 1
          ELSE rate_limits.count + 1
        END,
        window_start = CASE
          WHEN rate_limits.window_start < $2 THEN NOW()
          ELSE rate_limits.window_start
        END
      RETURNING count, window_start
    `, [key, windowStart]);
        const { count, window_start } = result.rows[0];
        const resetTime = new Date(new Date(window_start).getTime() + windowSeconds * 1000);
        const blocked = count > config.limit;
        if (blocked) {
            console.log(`[RateLimitDB] BLOCKED key=${key} count=${count} limit=${config.limit}`);
        }
        return {
            success: !blocked,
            remaining: Math.max(0, config.limit - count),
            resetTime,
            blocked,
        };
    }
    catch (error) {
        // If rate_limits table doesn't exist, fall back to allowing request
        // This prevents the app from breaking if migration hasn't run
        console.error('[RateLimitDB] Error checking rate limit:', error);
        return {
            success: true,
            remaining: config.limit,
            resetTime: new Date(Date.now() + windowSeconds * 1000),
            blocked: false,
        };
    }
}
/**
 * Rate limit configurations
 */
exports.DB_RATE_LIMITS = {
    // Standard API endpoints
    standard: { limit: 100, windowSeconds: 60 },
    // Write operations (follow, post, etc.)
    write: { limit: 30, windowSeconds: 60 },
    // Rapid-fire protection (prevents button spam)
    rapidFire: { limit: 5, windowSeconds: 2 },
    // Sensitive operations
    sensitive: { limit: 10, windowSeconds: 60 },
};
/**
 * Build rate limit key
 */
function buildDBRateLimitKey(userId, ip, endpoint, method = 'GET') {
    const userPart = userId ? `u:${userId}` : `ip:${ip || 'unknown'}`;
    return `rl:${userPart}:${method}:${endpoint}`;
}
/**
 * Cleanup old rate limit entries
 * Call this periodically (e.g., via cron job)
 */
async function cleanupRateLimits() {
    try {
        const result = await database_1.default.query(`
      DELETE FROM rate_limits 
      WHERE window_start < NOW() - INTERVAL '5 minutes'
    `);
        return result.rowCount || 0;
    }
    catch (error) {
        console.error('[RateLimitDB] Cleanup error:', error);
        return 0;
    }
}
