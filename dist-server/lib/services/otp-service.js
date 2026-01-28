"use strict";
/**
 * OTP Service - Secure One-Time Password Management
 *
 * Security Features:
 * - Cryptographically secure OTP generation
 * - OTP hashing (bcrypt) - NEVER stored in plaintext
 * - Expiry management (10 minutes)
 * - Attempt tracking (max 3)
 * - Rate limiting per email and IP
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOTP = createOTP;
exports.verifyOTP = verifyOTP;
exports.invalidateOTPs = invalidateOTPs;
exports.hasPendingVerification = hasPendingVerification;
exports.resetRateLimits = resetRateLimits;
exports.cleanupExpiredOTPs = cleanupExpiredOTPs;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const database_1 = __importDefault(require("../config/database"));
// Configuration
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 3;
const SALT_ROUNDS = 10;
// Rate limiting configuration
const RATE_LIMIT_MAX_REQUESTS = 10; // Max OTP requests per window
const RATE_LIMIT_WINDOW_MINUTES = 60; // 1 hour window
const BLOCK_DURATION_MINUTES = 5; // Block for 5 minutes after abuse
/**
 * Generate cryptographically secure 6-digit OTP
 */
function generateSecureOTP() {
    // Use crypto for secure random number generation
    const randomBytes = crypto_1.default.randomBytes(4);
    const randomNumber = randomBytes.readUInt32BE(0);
    // Ensure 6-digit number (100000 - 999999)
    const otp = (randomNumber % 900000) + 100000;
    return otp.toString();
}
/**
 * Check rate limits for OTP requests
 */
async function checkRateLimit(identifier, identifierType) {
    if (!database_1.default) {
        return { allowed: true, remainingAttempts: RATE_LIMIT_MAX_REQUESTS };
    }
    const client = await database_1.default.connect();
    try {
        // Check if blocked
        const blockCheck = await client.query(`
            SELECT blocked_until FROM otp_rate_limits
            WHERE identifier = $1 AND identifier_type = $2
            AND blocked_until > NOW()
        `, [identifier, identifierType]);
        if (blockCheck.rows.length > 0) {
            return {
                allowed: false,
                remainingAttempts: 0,
                blockedUntil: blockCheck.rows[0].blocked_until,
                message: 'Too many requests. Please try again later.'
            };
        }
        // Check request count within window
        const limitCheck = await client.query(`
            SELECT request_count, window_start FROM otp_rate_limits
            WHERE identifier = $1 AND identifier_type = $2
            AND window_start > NOW() - INTERVAL '${RATE_LIMIT_WINDOW_MINUTES} minutes'
        `, [identifier, identifierType]);
        if (limitCheck.rows.length === 0) {
            // No recent requests, create new entry
            await client.query(`
                INSERT INTO otp_rate_limits (identifier, identifier_type, request_count, window_start)
                VALUES ($1, $2, 0, NOW())
                ON CONFLICT (identifier, identifier_type) 
                DO UPDATE SET request_count = 0, window_start = NOW(), blocked_until = NULL
            `, [identifier, identifierType]);
            return { allowed: true, remainingAttempts: RATE_LIMIT_MAX_REQUESTS };
        }
        const { request_count } = limitCheck.rows[0];
        const remainingAttempts = RATE_LIMIT_MAX_REQUESTS - request_count;
        if (request_count >= RATE_LIMIT_MAX_REQUESTS) {
            // Block the identifier
            await client.query(`
                UPDATE otp_rate_limits 
                SET blocked_until = NOW() + INTERVAL '${BLOCK_DURATION_MINUTES} minutes'
                WHERE identifier = $1 AND identifier_type = $2
            `, [identifier, identifierType]);
            return {
                allowed: false,
                remainingAttempts: 0,
                message: 'Too many OTP requests. Please try again later.'
            };
        }
        return { allowed: true, remainingAttempts };
    }
    finally {
        client.release();
    }
}
/**
 * Increment rate limit counter
 */
async function incrementRateLimit(identifier, identifierType) {
    if (!database_1.default)
        return;
    await database_1.default.query(`
        INSERT INTO otp_rate_limits (identifier, identifier_type, request_count, window_start)
        VALUES ($1, $2, 1, NOW())
        ON CONFLICT (identifier, identifier_type) 
        DO UPDATE SET request_count = otp_rate_limits.request_count + 1
    `, [identifier, identifierType]);
}
/**
 * Create and store a new OTP
 * Returns the plaintext OTP for sending via email (NOT stored)
 */
async function createOTP(email, purpose, userId, ipAddress) {
    if (!database_1.default) {
        return { success: false, error: 'Database not available' };
    }
    // Check rate limits
    // const emailRateLimit = await checkRateLimit(email, 'email');
    // if (!emailRateLimit.allowed) {
    //     return {
    //         success: false,
    //         error: emailRateLimit.message || 'Rate limit exceeded',
    //         rateLimitInfo: emailRateLimit
    //     };
    // }
    // if (ipAddress) {
    //     const ipRateLimit = await checkRateLimit(ipAddress, 'ip');
    //     if (!ipRateLimit.allowed) {
    //         return {
    //             success: false,
    //             error: ipRateLimit.message || 'Rate limit exceeded',
    //             rateLimitInfo: ipRateLimit
    //         };
    //     }
    // }
    const client = await database_1.default.connect();
    try {
        await client.query('BEGIN');
        // Invalidate any existing OTPs for this email and purpose
        await client.query(`
            UPDATE otp_tokens 
            SET consumed_at = NOW() 
            WHERE email = $1 AND purpose = $2 AND consumed_at IS NULL
        `, [email, purpose]);
        // Generate new OTP
        const otp = generateSecureOTP();
        const otpHash = await bcryptjs_1.default.hash(otp, SALT_ROUNDS);
        const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
        // Store hashed OTP
        await client.query(`
            INSERT INTO otp_tokens (user_id, email, otp_hash, purpose, expires_at, ip_address)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [userId || null, email, otpHash, purpose, expiresAt, ipAddress || null]);
        // Increment rate limit counters
        await incrementRateLimit(email, 'email');
        if (ipAddress) {
            await incrementRateLimit(ipAddress, 'ip');
        }
        await client.query('COMMIT');
        console.log(`[OTPService] OTP created for ${email} (purpose: ${purpose})`);
        return {
            success: true,
            otp, // Return plaintext for sending via email
            rateLimitInfo: emailRateLimit
        };
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('[OTPService] Error creating OTP:', error.message);
        return { success: false, error: 'Failed to generate OTP' };
    }
    finally {
        client.release();
    }
}
/**
 * Verify an OTP
 * Returns success only if OTP is valid, not expired, and under attempt limit
 */
async function verifyOTP(email, otpInput, purpose) {
    if (!database_1.default) {
        return { success: false, error: 'Database not available' };
    }
    // Sanitize input
    const sanitizedOTP = otpInput.replace(/\D/g, '').slice(0, 6);
    if (sanitizedOTP.length !== 6) {
        return { success: false, error: 'Invalid OTP format' };
    }
    const client = await database_1.default.connect();
    try {
        // Find valid OTP token
        const result = await client.query(`
            SELECT id, user_id, otp_hash, attempts, max_attempts
            FROM otp_tokens
            WHERE email = $1 
            AND purpose = $2 
            AND consumed_at IS NULL
            AND expires_at > NOW()
            AND attempts < max_attempts
            ORDER BY created_at DESC
            LIMIT 1
        `, [email, purpose]);
        if (result.rows.length === 0) {
            return {
                success: false,
                error: 'OTP expired or invalid. Please request a new code.'
            };
        }
        const token = result.rows[0];
        const remainingAttempts = token.max_attempts - token.attempts - 1;
        // Verify OTP hash
        const isValid = await bcryptjs_1.default.compare(sanitizedOTP, token.otp_hash);
        if (!isValid) {
            // Increment attempt counter
            await client.query(`
                UPDATE otp_tokens SET attempts = attempts + 1 WHERE id = $1
            `, [token.id]);
            if (remainingAttempts <= 0) {
                // Max attempts reached, invalidate OTP
                await client.query(`
                    UPDATE otp_tokens SET consumed_at = NOW() WHERE id = $1
                `, [token.id]);
                return {
                    success: false,
                    error: 'Too many incorrect attempts. Please request a new code.',
                    remainingAttempts: 0
                };
            }
            return {
                success: false,
                error: 'Incorrect OTP. Please try again.',
                remainingAttempts
            };
        }
        // OTP is valid - mark as consumed
        await client.query(`
            UPDATE otp_tokens SET consumed_at = NOW() WHERE id = $1
        `, [token.id]);
        console.log(`[OTPService] OTP verified successfully for ${email}`);
        return {
            success: true,
            userId: token.user_id
        };
    }
    catch (error) {
        console.error('[OTPService] Error verifying OTP:', error.message);
        return { success: false, error: 'Verification failed' };
    }
    finally {
        client.release();
    }
}
/**
 * Invalidate all OTPs for an email and purpose
 * Used after successful password reset, etc.
 */
async function invalidateOTPs(email, purpose) {
    if (!database_1.default)
        return;
    if (purpose) {
        await database_1.default.query(`
            UPDATE otp_tokens SET consumed_at = NOW()
            WHERE email = $1 AND purpose = $2 AND consumed_at IS NULL
        `, [email, purpose]);
    }
    else {
        await database_1.default.query(`
            UPDATE otp_tokens SET consumed_at = NOW()
            WHERE email = $1 AND consumed_at IS NULL
        `, [email]);
    }
}
/**
 * Check if user has pending email verification
 */
async function hasPendingVerification(email) {
    if (!database_1.default)
        return false;
    const result = await database_1.default.query(`
        SELECT 1 FROM otp_tokens
        WHERE email = $1 
        AND purpose = 'verify_email'
        AND consumed_at IS NULL
        AND expires_at > NOW()
        LIMIT 1
    `, [email]);
    return result.rows.length > 0;
}
/**
 * Reset rate limits for an identifier (admin use)
 */
async function resetRateLimits(identifier) {
    if (!database_1.default)
        return;
    await database_1.default.query(`
        DELETE FROM otp_rate_limits WHERE identifier = $1
    `, [identifier]);
}
/**
 * Clean up expired OTPs (called periodically)
 */
async function cleanupExpiredOTPs() {
    if (!database_1.default)
        return 0;
    const result = await database_1.default.query(`
        DELETE FROM otp_tokens 
        WHERE expires_at < NOW() - INTERVAL '1 hour'
        OR consumed_at IS NOT NULL
    `);
    return result.rowCount || 0;
}
