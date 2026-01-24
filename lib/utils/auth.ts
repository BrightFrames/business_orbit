import jwt from 'jsonwebtoken';
import pool from '../config/database';
import { NextRequest, NextResponse } from 'next/server';

// Helper function to generate JWT token
export const generateToken = (userId: number): string => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Helper function to set JWT cookie
export const setTokenCookie = (res: NextResponse, token: string): void => {
  res.cookies.set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  });
};

// Simple in-memory cache to reduce DB load
// CRITICAL: This cache prevents repeated DB queries for user data
// Each serverless instance has its own cache, but it still reduces load significantly
// Map<userId, { user: UserData, timestamp: number }>
const userCache = new Map<number, { user: any, timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes - extended for better cost reduction

export const invalidateUserCache = (userId: number) => {
  userCache.delete(userId);
  // console.log(`[Auth] Invalidated cache for userId: ${userId}`);
};

// Authentication middleware for Next.js API routes
export const authenticateToken = async (req: NextRequest) => {
  const token = req.cookies.get('token')?.value;

  if (!token) {
    throw new Error('Access token required');
  }

  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is not set');
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { userId: number };

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
    const dbPromise = pool.query(
      'SELECT id, name, email, phone, profile_photo_url, profile_photo_id, banner_url, banner_id, skills, description, profession, interest, orbit_points, last_active_at, created_at, is_admin FROM users WHERE id = $1',
      [decoded.userId]
    );

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database query timed out after 5000ms')), 5000)
    );

    const result: any = await Promise.race([dbPromise, timeoutPromise]);

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
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// Helper function to get user from token (for use in API routes)
export const getUserFromToken = async (req: NextRequest) => {
  try {
    return await authenticateToken(req);
  } catch (error) {
    return null;
  }
};

// Lightweight token verifier for server actions and API routes that only need the user id
export const verifyToken = (token: string): number | null => {
  try {
    if (!process.env.JWT_SECRET) {
      return null;
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { userId: number };
    return decoded.userId;
  } catch (_err) {
    return null;
  }
};
