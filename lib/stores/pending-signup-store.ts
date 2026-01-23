/**
 * In-memory store for pending signups awaiting OTP verification.
 * 
 * Stores signup data temporarily until email is verified via OTP.
 * Auto-expires entries after 10 minutes.
 */

export interface PendingSignupData {
    name: string;
    email: string;
    phone: string;
    passwordHash: string;
    skills: string[];
    description: string;
    profession: string;
    interest: string;
    gender: 'male' | 'female' | 'other' | null;
    profilePhotoUrl: string | null;
    profilePhotoId: string | null;
    bannerUrl: string | null;
    bannerId: string | null;
    createdAt: number;
    expiresAt: number;
}

// In-memory store: sessionToken -> PendingSignupData
const pendingSignups = new Map<string, PendingSignupData>();

// Cleanup interval (run every 2 minutes)
const CLEANUP_INTERVAL = 2 * 60 * 1000; // 2 minutes
const EXPIRY_TIME = 10 * 60 * 1000; // 10 minutes

// Generate a secure session token
export function generateSessionToken(): string {
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
export function storePendingSignup(sessionToken: string, data: Omit<PendingSignupData, 'createdAt' | 'expiresAt'>): void {
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
export function getPendingSignup(sessionToken: string): PendingSignupData | null {
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
export function removePendingSignup(sessionToken: string): boolean {
    return pendingSignups.delete(sessionToken);
}

/**
 * Get pending signup by email (for checking duplicates)
 */
export function getPendingSignupByEmail(email: string): PendingSignupData | null {
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
export function getSessionTokenByEmail(email: string): string | null {
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
function cleanupExpired(): void {
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
export function clearAllPendingSignups(): void {
    pendingSignups.clear();
}

export function getPendingSignupsCount(): number {
    return pendingSignups.size;
}
