"use strict";
/**
 * In-memory store for pending signups awaiting OTP verification.
 *
 * Stores signup data temporarily until email is verified via OTP.
 * Auto-expires entries after 10 minutes.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSessionToken = generateSessionToken;
exports.storePendingSignup = storePendingSignup;
exports.getPendingSignup = getPendingSignup;
exports.removePendingSignup = removePendingSignup;
exports.getPendingSignupByEmail = getPendingSignupByEmail;
exports.getSessionTokenByEmail = getSessionTokenByEmail;
exports.clearAllPendingSignups = clearAllPendingSignups;
exports.getPendingSignupsCount = getPendingSignupsCount;
// In-memory store: sessionToken -> PendingSignupData
const pendingSignups = new Map();
// Cleanup interval (run every 2 minutes)
const CLEANUP_INTERVAL = 2 * 60 * 1000; // 2 minutes
const EXPIRY_TIME = 10 * 60 * 1000; // 10 minutes
// Generate a secure session token
function generateSessionToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `signup_${token}_${Date.now()}`;
}
/**
 * Store pending signup data
 */
function storePendingSignup(sessionToken, data) {
    const now = Date.now();
    pendingSignups.set(sessionToken, {
        ...data,
        createdAt: now,
        expiresAt: now + EXPIRY_TIME,
    });
}
/**
 * Retrieve pending signup data
 */
function getPendingSignup(sessionToken) {
    const data = pendingSignups.get(sessionToken);
    if (!data) {
        return null;
    }
    // Check if expired
    if (Date.now() > data.expiresAt) {
        pendingSignups.delete(sessionToken);
        return null;
    }
    return data;
}
/**
 * Remove pending signup data (after successful verification or expiry)
 */
function removePendingSignup(sessionToken) {
    return pendingSignups.delete(sessionToken);
}
/**
 * Get pending signup by email (for checking duplicates)
 */
function getPendingSignupByEmail(email) {
    for (const [token, data] of pendingSignups.entries()) {
        if (data.email.toLowerCase() === email.toLowerCase()) {
            // Check if expired
            if (Date.now() > data.expiresAt) {
                pendingSignups.delete(token);
                continue;
            }
            return data;
        }
    }
    return null;
}
/**
 * Get session token by email
 */
function getSessionTokenByEmail(email) {
    for (const [token, data] of pendingSignups.entries()) {
        if (data.email.toLowerCase() === email.toLowerCase()) {
            // Check if expired
            if (Date.now() > data.expiresAt) {
                pendingSignups.delete(token);
                continue;
            }
            return token;
        }
    }
    return null;
}
/**
 * Cleanup expired entries
 */
function cleanupExpired() {
    const now = Date.now();
    for (const [token, data] of pendingSignups.entries()) {
        if (now > data.expiresAt) {
            pendingSignups.delete(token);
        }
    }
}
// Start cleanup interval (only in Node.js environment)
if (typeof setInterval !== 'undefined') {
    setInterval(cleanupExpired, CLEANUP_INTERVAL);
}
// Export for testing
function clearAllPendingSignups() {
    pendingSignups.clear();
}
function getPendingSignupsCount() {
    return pendingSignups.size;
}
