"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.getUserFromToken = exports.authenticateToken = exports.invalidateUserCache = exports.setTokenCookie = exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = __importDefault(require("../config/database"));
// Helper function to generate JWT token
const generateToken = (userId) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET environment variable is not set');
    }
    return jsonwebtoken_1.default.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};
exports.generateToken = generateToken;
// Helper function to set JWT cookie
const setTokenCookie = (res, token) => {
    // Domain setting for cross-subdomain cookie sharing
    // In production, use .businessorbit.org to allow admin.businessorbit.org to share cookies
    const cookieDomain = process.env.NODE_ENV === 'production' ? '.businessorbit.org' : undefined;
    res.cookies.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax', // Changed from 'strict' to allow cross-subdomain
        domain: cookieDomain,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/'
    });
};
exports.setTokenCookie = setTokenCookie;
// Simple in-memory cache to reduce DB load
// CRITICAL: This cache prevents repeated DB queries for user data
// Each serverless instance has its own cache, but it still reduces load significantly
// Map<userId, { user: UserData, timestamp: number }>
const userCache = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes - extended for better cost reduction
const invalidateUserCache = (userId) => {
    userCache.delete(userId);
    // console.log(`[Auth] Invalidated cache for userId: ${userId}`);
};
exports.invalidateUserCache = invalidateUserCache;
// Authentication middleware for Next.js API routes
const authenticateToken = async (req) => {
    const token = req.cookies.get('token')?.value;
    if (!token) {
        throw new Error('Access token required');
    }
    try {
        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET environment variable is not set');
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        // Check cache first
        const cached = userCache.get(decoded.userId);
        if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
            // console.log(`[Auth] Returning cached user for userId: ${decoded.userId}`);
            return cached.user;
        }
        // Get user from database
        console.log(`[Auth] Verifying token for userId: ${decoded.userId}`);
        const start = Date.now();
        // Add 5 second timeout to the query
        const dbPromise = database_1.default.query('SELECT id, name, email, phone, profile_photo_url, profile_photo_id, banner_url, banner_id, skills, description, profession, interest, orbit_points, last_active_at, created_at, is_admin FROM users WHERE id = $1', [decoded.userId]);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Database query timed out after 5000ms')), 5000));
        const result = await Promise.race([dbPromise, timeoutPromise]);
        console.log(`[Auth] Database query took ${Date.now() - start}ms`);
        if (result.rows.length === 0) {
            throw new Error('User not found');
        }
        const user = result.rows[0];
        // Store in cache
        userCache.set(decoded.userId, {
            user,
            timestamp: Date.now()
        });
        return user;
    }
    catch (error) {
        throw new Error('Invalid token');
    }
};
exports.authenticateToken = authenticateToken;
// Helper function to get user from token (for use in API routes)
const getUserFromToken = async (req) => {
    try {
        return await (0, exports.authenticateToken)(req);
    }
    catch (error) {
        return null;
    }
};
exports.getUserFromToken = getUserFromToken;
// Lightweight token verifier for server actions and API routes that only need the user id
const verifyToken = (token) => {
    try {
        if (!process.env.JWT_SECRET) {
            return null;
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        return decoded.userId;
    }
    catch (_err) {
        return null;
    }
};
exports.verifyToken = verifyToken;
