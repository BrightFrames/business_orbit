"use strict";
/**
 * Simple in-memory rate limiter for serverless environments
 * Uses a sliding window approach with automatic cleanup
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RATE_LIMITS = void 0;
exports.checkRateLimit = checkRateLimit;
exports.buildRateLimitKey = buildRateLimitKey;
exports.getClientIp = getClientIp;
// In-memory store (works per serverless instance)
const rateLimitStore = new Map();
// Cleanup old entries every 60 seconds
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 60000;
function cleanup() {
    const now = Date.now();
    if (now - lastCleanup > CLEANUP_INTERVAL) {
        lastCleanup = now;
        for (const [key, entry] of rateLimitStore.entries()) {
            if (entry.resetTime < now) {
                rateLimitStore.delete(key);
            }
        }
    }
}
/**
 * Check rate limit for a given key (userId, IP, or combination)
 *
 * @param key - Unique identifier (e.g., "userId:2" or "ip:192.168.1.1" or "userId:2:POST:/api/follow")
 * @param config - Rate limit configuration
 * @returns RateLimitResult with success status and remaining requests
 */
function checkRateLimit(key, config) {
    cleanup();
    const now = Date.now();
    const windowMs = config.windowMs || 60000; // Default 1 minute
    let entry = rateLimitStore.get(key);
    // If no entry or window expired, create new entry
    if (!entry || entry.resetTime < now) {
        entry = {
            count: 1,
            resetTime: now + windowMs
        };
        rateLimitStore.set(key, entry);
        return {
            success: true,
            remaining: config.limit - 1,
            resetTime: entry.resetTime
        };
    }
    // Check if limit exceeded
    if (entry.count >= config.limit) {
        console.log(`[RateLimit] BLOCKED key=${key} count=${entry.count} limit=${config.limit}`);
        return {
            success: false,
            remaining: 0,
            resetTime: entry.resetTime
        };
    }
    // Increment counter
    entry.count++;
    return {
        success: true,
        remaining: config.limit - entry.count,
        resetTime: entry.resetTime
    };
}
/**
 * Rate limit configurations for different endpoint types
 */
exports.RATE_LIMITS = {
    // General API endpoints - 60 requests per minute
    general: { limit: 60, windowMs: 60000 },
    // Write operations - 20 per minute (follow, post, etc.)
    write: { limit: 20, windowMs: 60000 },
    // Sensitive operations - 5 per minute (password reset, etc.)
    sensitive: { limit: 5, windowMs: 60000 },
    // Rapid-fire protection - 3 per second (same action)
    rapidFire: { limit: 3, windowMs: 1000 },
};
/**
 * Build a rate limit key from request context
 */
function buildRateLimitKey(userId, ip, endpoint, method = 'GET') {
    const userPart = userId ? `user:${userId}` : `ip:${ip || 'unknown'}`;
    return `${userPart}:${method}:${endpoint}`;
}
/**
 * Extract client IP from Next.js request
 */
function getClientIp(request) {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return request.headers.get('x-real-ip') || null;
}
